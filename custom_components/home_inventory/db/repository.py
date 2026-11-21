"""Pure SQLite data-access functions for items.

No Home Assistant / aiohttp imports here, so this module is unit-testable with
plain pytest. HTTP handlers in ``api/items.py`` call these via
``hass.async_add_executor_job``.
"""
import json
import logging
import sqlite3
import calendar
from datetime import date, datetime, timedelta

_LOGGER = logging.getLogger(__name__)


def normalize_batch_input(quantity, exp_obj):
    """
    Returns a tuple (add_total_qty, add_batch_qty, batch_date)
    - add_total_qty: how much to add to item_locations.quantity overall
    - add_batch_qty: how much to add for the batch record
    - batch_date: target batch date (string or None) if we have one
    """
    batch_qty = None
    batch_date = None
    if isinstance(exp_obj, dict):
        batch_qty = exp_obj.get("quantity")
        batch_date = exp_obj.get("date")
        if batch_date is not None:
            batch_date = str(batch_date).strip() or None

    # If batch_qty not provided, fallback to top-level quantity
    if batch_qty is None:
        batch_qty = quantity

    # Ensure numeric or None
    try:
        batch_qty = int(batch_qty) if batch_qty is not None else None
    except Exception:
        batch_qty = None

    try:
        add_total = int(quantity) if quantity is not None else None
    except Exception:
        add_total = None

    # If both missing, no stock change
    if add_total is None and batch_qty is None:
        return 0, 0, batch_date

    # Heuristic: if only batch_qty provided, also add that to total
    if add_total is None and batch_qty is not None:
        add_total = batch_qty
    # if only top-level quantity provided, use it also as batch qty when no exp_obj
    if batch_qty is None and add_total is not None and exp_obj is None:
        batch_qty = add_total
        batch_date = None

    return (add_total or 0), (batch_qty or 0), batch_date


def _load_exp_list(raw):
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return value if isinstance(value, list) else []
    except Exception:
        return []

# Helper: normalize date value for compare
def _norm_date(d):
    if d is None:
        return None
    if isinstance(d, str):
        d = d.strip()
        return d or None
    return None


_BARCODE_MATCH_SQL = (
    "(im.barcode = ? OR im.id IN "
    "(SELECT item_id FROM item_variant_barcodes WHERE barcode = ?))"
)


def _variant_barcode_owner(cur, barcode):
    """``(item_id, variant)`` owning ``barcode`` as a variant barcode, or None."""
    cur.execute(
        "SELECT item_id, variant FROM item_variant_barcodes WHERE barcode = ?",
        (barcode,),
    )
    return cur.fetchone()


def _variant_barcode_conflict(cur, barcode, item_id):
    """Error text if ``barcode`` is a variant barcode of a different item, else None."""
    owner = _variant_barcode_owner(cur, barcode)
    if owner and owner[0] != item_id:
        return f"Barcode {barcode} already exists for a variant of a different item"
    return None


def _set_variant_barcode(cur, item_id, variant, barcode):
    """Set (or clear, when ``barcode`` is empty) the barcode of ``(item_id, variant)``.

    Returns an error string or None.
    """
    barcode = (barcode or "").strip() or None
    if barcode is None:
        cur.execute(
            "DELETE FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
            (item_id, variant),
        )
        return None
    cur.execute("SELECT id FROM items_master WHERE barcode = ?", (barcode,))
    master = cur.fetchone()
    if master and master[0] != item_id:
        return f"Barcode {barcode} already exists for a different item"
    owner = _variant_barcode_owner(cur, barcode)
    if owner and (owner[0] != item_id or owner[1] != variant):
        return f"Barcode {barcode} already exists for a different variant"
    cur.execute(
        "SELECT id FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
        (item_id, variant),
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE item_variant_barcodes SET barcode = ? WHERE id = ?", (barcode, row[0]))
    else:
        cur.execute(
            "INSERT INTO item_variant_barcodes (item_id, variant, barcode) VALUES (?, ?, ?)",
            (item_id, variant, barcode),
        )
    return None


def _delete_favorites(cur, item_id):
    """Drop favorites of a master about to be deleted (API connections don't enable foreign_keys)."""
    cur.execute("DELETE FROM item_favorites WHERE item_id = ?", (item_id,))


def _move_favorites(cur, old_item_id, new_item_id):
    """Carry favorites from a master being replaced (rename/merge) to its successor."""
    cur.execute(
        "UPDATE OR IGNORE item_favorites SET item_id = ? WHERE item_id = ?",
        (new_item_id, old_item_id),
    )
    _delete_favorites(cur, old_item_id)


def list_favorite_ids(db_path, user_id):
    """Item master ids marked as favorite by ``user_id``, newest first."""
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            "SELECT item_id FROM item_favorites WHERE user_id = ? ORDER BY created_at DESC, item_id",
            (user_id,),
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def set_favorite(db_path, user_id, item_id, favorite):
    """Add or remove a favorite (idempotent). Returns False if the item master does not exist."""
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM items_master WHERE id = ?", (item_id,))
        if cur.fetchone() is None:
            return False
        if favorite:
            cur.execute(
                "INSERT OR IGNORE INTO item_favorites (user_id, item_id) VALUES (?, ?)",
                (user_id, item_id),
            )
        else:
            cur.execute(
                "DELETE FROM item_favorites WHERE user_id = ? AND item_id = ?",
                (user_id, item_id),
            )
        conn.commit()
        return True
    finally:
        conn.close()


# ---------------------------------------------------------------- trash

# Restore order (parents first)
TRASH_TABLES = (
    "rooms", "cupboards", "shelves", "organizers",
    "items_master", "item_locations", "item_variant_barcodes", "item_favorites",
)
_IMAGE_COLUMNS = {
    "rooms": "image", "cupboards": "image", "shelves": "image", "organizers": "image",
    "items_master": "default_image", "item_locations": "image",
}
_CHUNK = 500


def _rows(cur, sql, params=()):
    """Rows of ``sql`` as dicts keyed by column name (``SELECT *`` keeps future columns)."""
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _rows_in(cur, table, column, ids):
    """``SELECT * FROM table WHERE column IN ids``, chunked to stay under SQLite's variable limit."""
    ids = list(dict.fromkeys(ids))
    out = []
    for i in range(0, len(ids), _CHUNK):
        chunk = ids[i:i + _CHUNK]
        out += _rows(
            cur,
            f"SELECT * FROM {table} WHERE {column} IN ({','.join('?' * len(chunk))}) ORDER BY id",
            chunk,
        )
    return out


def _snapshot_subtree(cur, kind, entity_id):
    """Rows a user delete of ``kind``/``entity_id`` removes, as ``{table: [row dicts]}``.

    Masters are included only when the delete leaves them without locations (same
    rule as ``_cascade_delete_locations``), with their variant barcodes and favorites.
    Returns None for an unknown kind/id.
    """
    try:
        entity_id = int(entity_id)
    except (TypeError, ValueError):
        return None
    snap = {t: [] for t in TRASH_TABLES}
    if kind == "room":
        snap["rooms"] = _rows(cur, "SELECT * FROM rooms WHERE id = ?", (entity_id,))
        if not snap["rooms"]:
            return None
        snap["cupboards"] = _rows_in(cur, "cupboards", "room_id", [entity_id])
    elif kind == "cupboard":
        snap["cupboards"] = _rows(cur, "SELECT * FROM cupboards WHERE id = ?", (entity_id,))
        if not snap["cupboards"]:
            return None
    elif kind == "shelf":
        snap["shelves"] = _rows(cur, "SELECT * FROM shelves WHERE id = ?", (entity_id,))
        if not snap["shelves"]:
            return None
    elif kind == "organizer":
        snap["organizers"] = _rows(cur, "SELECT * FROM organizers WHERE id = ?", (entity_id,))
        if not snap["organizers"]:
            return None
    elif kind == "item_master":
        if not _rows(cur, "SELECT id FROM items_master WHERE id = ?", (entity_id,)):
            return None
    elif kind == "item_location":
        snap["item_locations"] = _rows(cur, "SELECT * FROM item_locations WHERE id = ?", (entity_id,))
        if not snap["item_locations"]:
            return None
    else:
        return None

    if kind in ("room", "cupboard"):
        snap["shelves"] = _rows_in(cur, "shelves", "cupboard_id", [c["id"] for c in snap["cupboards"]])
    if kind in ("room", "cupboard", "shelf"):
        shelf_ids = [s["id"] for s in snap["shelves"]]
        snap["organizers"] = _rows_in(cur, "organizers", "shelf_id", shelf_ids)
        snap["item_locations"] = _rows_in(cur, "item_locations", "shelf_id", shelf_ids)
    elif kind == "organizer":
        snap["item_locations"] = _rows_in(cur, "item_locations", "organizer_id", [entity_id])
    elif kind == "item_master":
        snap["item_locations"] = _rows_in(cur, "item_locations", "item_id", [entity_id])

    # Masters left without locations
    per_item = {}
    for loc in snap["item_locations"]:
        per_item[loc["item_id"]] = per_item.get(loc["item_id"], 0) + 1
    if kind == "item_master":
        per_item.setdefault(entity_id, 0)
    orphaned = [
        item_id for item_id, n in per_item.items()
        if kind == "item_master"
        or cur.execute("SELECT COUNT(*) FROM item_locations WHERE item_id = ?", (item_id,)).fetchone()[0] == n
    ]
    snap["items_master"] = _rows_in(cur, "items_master", "id", orphaned)
    snap["item_variant_barcodes"] = _rows_in(cur, "item_variant_barcodes", "item_id", orphaned)
    snap["item_favorites"] = []
    for i in range(0, len(orphaned), _CHUNK):
        chunk = orphaned[i:i + _CHUNK]
        snap["item_favorites"] += _rows(
            cur,
            f"SELECT * FROM item_favorites WHERE item_id IN ({','.join('?' * len(chunk))})"
            " ORDER BY item_id, user_id",
            chunk,
        )
    return snap


def _snapshot_images(snap):
    """Distinct image paths referenced by the snapshot rows."""
    images = []
    for table, col in _IMAGE_COLUMNS.items():
        images += [r.get(col) for r in snap[table]]
    return list(dict.fromkeys(i for i in images if i))


def _snapshot_summary(kind, snap):
    """Counts shown in the delete confirmation / bin entry (descendants, not the entry itself)."""
    return {
        "cupboards": len(snap["cupboards"]) - (1 if kind == "cupboard" else 0),
        "shelves": len(snap["shelves"]),
        "organizers": len(snap["organizers"]),
        "locations": len(snap["item_locations"]),
        "items": len(snap["items_master"]),
        "images": len(_snapshot_images(snap)),
    }


def _breadcrumb(cur, kind, entity_id):
    """``(label, path)`` of the entity at delete time; ``path`` is the parent breadcrumb."""
    if kind == "room":
        row = cur.execute("SELECT name, NULL FROM rooms WHERE id = ?", (entity_id,)).fetchone()
    elif kind == "cupboard":
        row = cur.execute('''
            SELECT c.name, r.name FROM cupboards c
            LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
        ''', (entity_id,)).fetchone()
    elif kind == "shelf":
        row = cur.execute('''
            SELECT s.name, r.name || ' / ' || c.name FROM shelves s
            LEFT JOIN cupboards c ON s.cupboard_id = c.id
            LEFT JOIN rooms r ON c.room_id = r.id WHERE s.id = ?
        ''', (entity_id,)).fetchone()
    elif kind == "organizer":
        row = cur.execute('''
            SELECT o.name, r.name || ' / ' || c.name || ' / ' || s.name FROM organizers o
            LEFT JOIN shelves s ON o.shelf_id = s.id
            LEFT JOIN cupboards c ON s.cupboard_id = c.id
            LEFT JOIN rooms r ON c.room_id = r.id WHERE o.id = ?
        ''', (entity_id,)).fetchone()
    elif kind == "item_master":
        row = cur.execute("SELECT name, NULL FROM items_master WHERE id = ?", (entity_id,)).fetchone()
    else:  # item_location
        row = cur.execute('''
            SELECT im.name || COALESCE(' (' || NULLIF(il.variant, '') || ')', ''),
                   r.name || ' / ' || c.name || ' / ' || s.name || COALESCE(' / ' || o.name, '')
            FROM item_locations il
            LEFT JOIN items_master im ON il.item_id = im.id
            LEFT JOIN shelves s ON il.shelf_id = s.id
            LEFT JOIN cupboards c ON s.cupboard_id = c.id
            LEFT JOIN rooms r ON c.room_id = r.id
            LEFT JOIN organizers o ON il.organizer_id = o.id
            WHERE il.id = ?
        ''', (entity_id,)).fetchone()
    if not row:
        return f"{kind} {entity_id}", None
    return row[0] or f"{kind} {entity_id}", row[1]


def _write_trash_entry(cur, kind, entity_id, snap, user_id):
    """Insert the bin entry for ``snap``; returns the new ``trash_id``."""
    label, path = _breadcrumb(cur, kind, entity_id)
    cur.execute(
        "INSERT INTO trash_entries (kind, entity_id, label, path, summary, payload, images, deleted_by)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            kind, int(entity_id), label, path,
            json.dumps(_snapshot_summary(kind, snap)),
            json.dumps({t: snap[t] for t in TRASH_TABLES if snap[t]}),
            json.dumps(_snapshot_images(snap)),
            user_id,
        ),
    )
    return cur.lastrowid


def _trash_snapshot(cur, kind, entity_id, user_id):
    """Snapshot the subtree into the bin, inside the caller's transaction.

    Must run before the rows are deleted. Returns the ``trash_id`` or None if not found.
    """
    snap = _snapshot_subtree(cur, kind, entity_id)
    if snap is None:
        return None
    return _write_trash_entry(cur, kind, entity_id, snap, user_id)


def _trash_image_refs(cur, filename, exclude_id=None):
    """Bin entries (other than ``exclude_id``) still referencing image ``filename``."""
    cur.execute(
        "SELECT COUNT(*) FROM trash_entries WHERE images LIKE ? AND id != ?",
        (f"%{filename}%", exclude_id if exclude_id is not None else -1),
    )
    return cur.fetchone()[0]


# parent links checked before a restore: table -> ((column, parent table), ...)
_TRASH_PARENTS = {
    "cupboards": (("room_id", "rooms"),),
    "shelves": (("cupboard_id", "cupboards"),),
    "organizers": (("shelf_id", "shelves"),),
    "item_locations": (
        ("item_id", "items_master"), ("shelf_id", "shelves"), ("organizer_id", "organizers"),
    ),
    "item_variant_barcodes": (("item_id", "items_master"),),
    "item_favorites": (("item_id", "items_master"),),
}
# tables with a per-parent unique name
_TRASH_NAME_SCOPE = {"rooms": None, "cupboards": "room_id", "shelves": "cupboard_id", "organizers": "shelf_id"}
_RETENTION_FALLBACK_DAYS = 7


def _trash_ts(value):
    """SQLite ``CURRENT_TIMESTAMP`` (UTC) -> datetime, or None."""
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        return None


def _iso_utc(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None


def list_trash(db_path, retention_days=_RETENTION_FALLBACK_DAYS):
    """Bin entries, newest first, with ``expires_at`` = ``deleted_at`` + ``retention_days`` (UTC ISO)."""
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        rows = _rows(
            cur,
            "SELECT id, kind, entity_id, label, path, summary, deleted_at FROM trash_entries"
            " ORDER BY deleted_at DESC, id DESC",
        )
    finally:
        conn.close()
    out = []
    for r in rows:
        deleted = _trash_ts(r["deleted_at"])
        try:
            summary = json.loads(r["summary"])
        except ValueError:
            summary = {}
        out.append({
            "id": r["id"],
            "kind": r["kind"],
            "entity_id": r["entity_id"],
            "label": r["label"],
            "path": r["path"],
            "summary": summary,
            "deleted_at": _iso_utc(deleted),
            "expires_at": _iso_utc(deleted + timedelta(days=retention_days)) if deleted else None,
        })
    return out


def _image_name(path):
    return path.split("?")[0].rsplit("/", 1)[-1]


def _image_referenced(cur, name):
    """True if a live row or a bin entry still references image file ``name``."""
    for table, col in _IMAGE_COLUMNS.items():
        try:
            cur.execute(f"SELECT 1 FROM {table} WHERE {col} LIKE ? LIMIT 1", (f"%{name}%",))
        except sqlite3.OperationalError:  # table has no such column (e.g. rooms)
            continue
        if cur.fetchone():
            return True
    return _trash_image_refs(cur, name) > 0


def trash_entry_exists(db_path, trash_id):
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute("SELECT 1 FROM trash_entries WHERE id = ?", (int(trash_id),)).fetchone() is not None
    finally:
        conn.close()


def purge_trash(db_path, *, trash_id=None, older_than=None, all=False):
    """Permanently remove bin entries: one by id, those deleted before ``older_than`` (naive UTC
    datetime), or all. Returns the image paths no longer referenced by live rows or by any
    remaining entry (the caller deletes the files)."""
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        if all:
            where, params = "1=1", ()
        elif trash_id is not None:
            where, params = "id = ?", (int(trash_id),)
        elif older_than is not None:
            where, params = "deleted_at < ?", (older_than.strftime("%Y-%m-%d %H:%M:%S"),)
        else:
            return []
        cur.execute(f"SELECT id, images FROM trash_entries WHERE {where}", params)
        entries = cur.fetchall()
        if not entries:
            return []
        images = []
        for _id, raw in entries:
            try:
                images += json.loads(raw)
            except ValueError:
                pass
        cur.executemany("DELETE FROM trash_entries WHERE id = ?", [(e[0],) for e in entries])
        free = [
            img for img in dict.fromkeys(images)
            if img and not _image_referenced(cur, _image_name(img))
        ]
        conn.commit()
        return free
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _find_trash_parent(cur, table, row_id, exclude_id):
    """``(trash_id, label)`` of a bin entry whose snapshot contains ``table`` row ``row_id``."""
    cur.execute("SELECT id, label, payload FROM trash_entries WHERE id != ? ORDER BY id DESC", (exclude_id,))
    for tid, label, raw in cur.fetchall():
        try:
            rows = json.loads(raw).get(table, [])
        except ValueError:
            continue
        if any(r.get("id") == row_id for r in rows):
            return tid, label
    return None, None


def _table_columns(cur, table):
    return {r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()}


def _insert_row(cur, table, row):
    cols = _table_columns(cur, table)
    data = {k: v for k, v in row.items() if k in cols}
    cur.execute(
        f"INSERT INTO {table} ({','.join(data)}) VALUES ({','.join('?' * len(data))})",
        list(data.values()),
    )


def _free_name(cur, table, name, scope_col, scope_val):
    """``name`` or ``name (2)``, ``name (3)``... not yet used under the same parent."""
    n, candidate = 1, name
    while True:
        if scope_col:
            cur.execute(f"SELECT 1 FROM {table} WHERE name = ? AND {scope_col} = ?", (candidate, scope_val))
        else:
            cur.execute(f"SELECT 1 FROM {table} WHERE name = ?", (candidate,))
        if not cur.fetchone():
            return candidate
        n += 1
        candidate = f"{name} ({n})"


def _barcode_taken(cur, barcode):
    cur.execute(
        "SELECT 1 FROM items_master WHERE barcode = ? UNION SELECT 1 FROM item_variant_barcodes WHERE barcode = ?",
        (barcode, barcode),
    )
    return cur.fetchone() is not None


def restore_trash_entry(db_path, trash_id):
    """Put a bin entry back, keeping the original ids, in one transaction.

    Returns ``{"restored": kind, "entity_id": id, "warnings": [...]}``, or
    ``{"error": "not_found"}``, or ``{"error": "parent_missing", "parent_table", "parent_id",
    "parent_trash_id", "parent_label"}`` (nothing changed). Name/barcode conflicts are
    resolved and reported as ``warnings`` (dicts with a ``code``).
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        entry = _rows(cur, "SELECT * FROM trash_entries WHERE id = ?", (int(trash_id),))
        if not entry:
            return {"error": "not_found"}
        entry = entry[0]
        payload = json.loads(entry["payload"])
        payload_ids = {t: {r["id"] for r in payload.get(t, []) if "id" in r} for t in TRASH_TABLES}

        # Every parent must exist now (or be restored by this same entry)
        for table in TRASH_TABLES:
            for row in payload.get(table, []):
                for col, parent in _TRASH_PARENTS.get(table, ()):
                    pid = row.get(col)
                    if pid is None or pid in payload_ids[parent]:
                        continue
                    cur.execute(f"SELECT 1 FROM {parent} WHERE id = ?", (pid,))
                    if cur.fetchone():
                        continue
                    ptid, plabel = _find_trash_parent(cur, parent, pid, entry["id"])
                    return {
                        "error": "parent_missing", "parent_table": parent, "parent_id": pid,
                        "parent_trash_id": ptid, "parent_label": plabel,
                    }

        warnings = []
        item_map = {}  # snapshot master id -> id the restored rows attach to
        for table in TRASH_TABLES:
            for row in payload.get(table, []):
                row = dict(row)
                if table in ("item_locations", "item_variant_barcodes", "item_favorites"):
                    row["item_id"] = item_map.get(row["item_id"], row["item_id"])

                if table == "items_master":
                    cur.execute(
                        "SELECT id FROM items_master WHERE id = ? OR (name = ? AND COALESCE(aliases, '') = ?)",
                        (row["id"], row["name"], row.get("aliases") or ""),
                    )
                    existing = cur.fetchone()
                    if existing:
                        item_map[row["id"]] = existing[0]
                        if existing[0] != row["id"]:
                            warnings.append({"code": "item_merged", "name": row["name"]})
                        continue
                    if row.get("barcode") and _barcode_taken(cur, row["barcode"]):
                        warnings.append({"code": "barcode_dropped", "name": row["name"], "barcode": row["barcode"]})
                        row["barcode"] = None
                elif table in _TRASH_NAME_SCOPE:
                    scope_col = _TRASH_NAME_SCOPE[table]
                    name = _free_name(cur, table, row["name"], scope_col, row.get(scope_col))
                    if name != row["name"]:
                        warnings.append({"code": "renamed", "table": table, "from": row["name"], "to": name})
                        row["name"] = name
                elif table == "item_variant_barcodes":
                    cur.execute(
                        "SELECT 1 FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
                        (row["item_id"], row["variant"]),
                    )
                    if cur.fetchone() or _barcode_taken(cur, row["barcode"]):
                        warnings.append({"code": "variant_barcode_skipped", "variant": row["variant"], "barcode": row["barcode"]})
                        continue
                elif table == "item_favorites":
                    cur.execute(
                        "INSERT OR IGNORE INTO item_favorites (user_id, item_id, created_at)"
                        " VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
                        (row["user_id"], row["item_id"], row.get("created_at")),
                    )
                    continue
                elif table == "item_locations":
                    cur.execute("SELECT 1 FROM item_locations WHERE id = ?", (row["id"],))
                    if cur.fetchone():
                        continue
                _insert_row(cur, table, row)

        cur.execute("DELETE FROM trash_entries WHERE id = ?", (entry["id"],))
        conn.commit()
        return {"restored": entry["kind"], "entity_id": entry["entity_id"], "warnings": warnings}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def create_item_location(
    db_path,
    *,
    room,
    cupboard,
    shelf,
    organizer,
    name,
    aliases,
    image,
    barcode,
    min_quantity,
    track_quantity,
    exp_obj,
    add_total_qty,
    add_batch_qty,
    batch_date,
    variant=None,
    merge_location_id=None,
    new_row=False,
):
    """Create an item location (finding/creating its master).

    For tracked items, quantity is merged into an existing row when
    ``merge_location_id`` names one (must be the same item and place), or when
    exactly one row at the place has the same ``variant``; otherwise a new row
    is inserted. ``new_row=True`` skips merging and always inserts.

    Returns ``((location_id, master_item_id), None)`` or ``(None, error)``.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute(
            '''
            SELECT s.id
            FROM shelves s
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            WHERE r.name = ? AND c.name = ? AND s.name = ?
            ''',
            (room, cupboard, shelf)
        )
        row = cur.fetchone()
        if not row:
            return None, f"Shelf '{shelf}' not found."
        shelf_id = row[0]

        # B) Optional: organizer
        organizer_id = None
        if organizer:
            cur.execute(
                '''
                SELECT o.id
                FROM organizers o
                JOIN shelves s ON o.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE r.name = ? AND c.name = ? AND s.name = ? AND o.name = ?
                ''',
                (room, cupboard, shelf, organizer)
            )
            org_row = cur.fetchone()
            if org_row:
                organizer_id = org_row[0]
                _LOGGER.info(f"[ITEM CREATE] Found organizer_id={organizer_id} for '{organizer}'")
            else:
                return None, f"Organizer '{organizer}' not found."

        # C) Find or create master item
        master_item_id = None
        sql_conditions = []
        sql_params = []

        if barcode:
            sql_conditions.append("barcode = ?")
            sql_params.append(barcode)

        if name:
            if aliases:
                sql_conditions.append("(name = ? AND aliases = ?)")
                sql_params.extend([name, aliases])
            else:
                sql_conditions.append("(name = ? AND aliases IS NULL)")
                sql_params.append(name)

        existing = None
        scanned_variant = None
        if barcode:
            owner = _variant_barcode_owner(cur, barcode)
            if owner:
                # A variant barcode identifies the master and the variant
                cur.execute(
                    "SELECT id, name, track_quantity FROM items_master WHERE id = ?",
                    (owner[0],),
                )
                existing = cur.fetchone()
                scanned_variant = owner[1]
        if not existing and sql_conditions:
            sql_query = f"SELECT id, name, track_quantity FROM items_master WHERE {' OR '.join(sql_conditions)}"
            cur.execute(sql_query, sql_params)
            existing = cur.fetchone()

        if existing:
            master_item_id, existing_item_name, existing_tracking_qty = existing
            if track_quantity != existing_tracking_qty:
                _LOGGER.error(f"[ITEM CREATE] Can't reusing an item for both types (consumable or duplicatable): {existing_item_name} (ID={master_item_id})")
                return None, "Can't reusing an item for both types (consumable or duplicatable)"

            _LOGGER.info(f"[ITEM CREATE] Reusing existing item: {existing_item_name} (ID={master_item_id})")

            # Update default_image only if it doesn't exist yet
            if image:
                cur.execute("SELECT default_image FROM items_master WHERE id = ?", (master_item_id,))
                current_default = cur.fetchone()[0]

                if not current_default:
                    master_default_image = None
                    if isinstance(image, dict):
                        master_default_image = image.get('default_path')
                    else:
                        master_default_image = image

                    if master_default_image:
                        cur.execute(
                            "UPDATE items_master SET default_image = ? WHERE id = ?",
                            (master_default_image, master_item_id)
                        )
                        _LOGGER.info(f"[ITEM CREATE] Set default_image for existing item master {master_item_id}")
        else:
            if name:
                # Extract master image from image data
                master_default_image = None
                if image:
                    if isinstance(image, dict):
                        master_default_image = image.get('default_path')
                    else:
                        # Legacy: use same image for both
                        master_default_image = image

                cur.execute(
                    """
                    INSERT INTO items_master (name, aliases, default_image, barcode, min_quantity, track_quantity)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        name,
                        aliases,
                        master_default_image,
                        barcode,
                        min_quantity,
                        1 if track_quantity else 0
                    )
                )
                master_item_id = cur.lastrowid
                _LOGGER.info(f"[ITEM CREATE] Created new item master '{name}' (ID={master_item_id})")
            else:
                return None, "Failed to find or create item master."

        # Separate images for master and location
        location_image = None
        if image:
            # If image is a dict with both paths (from create_default_copy=true)
            if isinstance(image, dict):
                location_image = image.get('path')
            else:
                # Legacy string format - use as location image
                location_image = image

        # Guard: existing item not consumable but trying to add qty
        if existing and add_total_qty and add_total_qty > 0:
            _, existing_item_name, existing_track_qty = existing
            if not existing_track_qty:
                return None, (
                    f"The item '{existing_item_name}' is not consumable (track_quantity=False). "
                    f"Cannot add quantity."
                )

        # D) Find the row to merge into (only for tracked items; duplicatable items are always inserted)
        variant = (variant or "").strip() or scanned_variant
        if barcode and existing:
            # New barcode for a known item + a variant label: register it for that variant
            cur.execute("SELECT barcode FROM items_master WHERE id = ?", (master_item_id,))
            master_barcode = cur.fetchone()[0]
            if not variant and barcode != master_barcode:
                # No variant label: the code can only be the item's main barcode.
                if master_barcode:
                    return None, (
                        f"Item already has barcode {master_barcode}. "
                        f"Fill in a variant to register barcode {barcode}."
                    )
                cur.execute(
                    "SELECT 1 FROM items_master WHERE barcode = ? AND id != ?",
                    (barcode, master_item_id),
                )
                if cur.fetchone():
                    return None, f"Barcode {barcode} already exists for a different item"
                vb_err = _variant_barcode_conflict(cur, barcode, master_item_id)
                if vb_err:
                    return None, vb_err
                cur.execute(
                    "UPDATE items_master SET barcode = ? WHERE id = ?",
                    (barcode, master_item_id),
                )
            if (
                variant
                and barcode != master_barcode
                and not _variant_barcode_owner(cur, barcode)
            ):
                cur.execute(
                    "SELECT 1 FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
                    (master_item_id, variant),
                )
                if not cur.fetchone():
                    err = _set_variant_barcode(cur, master_item_id, variant, barcode)
                    if err:
                        return None, err
        loc = None
        if track_quantity and not new_row:
            if merge_location_id:
                cur.execute(
                    '''
                    SELECT id, quantity, expiration_dates
                    FROM item_locations
                    WHERE id = ? AND item_id = ? AND shelf_id = ? AND organizer_id IS ?
                    ''',
                    (merge_location_id, master_item_id, shelf_id, organizer_id)
                )
                loc = cur.fetchone()
                if not loc:
                    return None, "merge_location_id does not match this item and location."
            else:
                cur.execute(
                    '''
                    SELECT id, quantity, expiration_dates
                    FROM item_locations
                    WHERE item_id = ? AND shelf_id = ? AND organizer_id IS ? AND variant IS ?
                    ''',
                    (master_item_id, shelf_id, organizer_id, variant)
                )
                matches = cur.fetchall()
                loc = matches[0] if len(matches) == 1 else None


        batch_date_norm = _norm_date(batch_date)

        if loc:
            location_id, existing_qty, existing_exp_raw = loc
            _LOGGER.info(f"[ITEM CREATE] Existing location found id={location_id}")

            new_total = (existing_qty or 0) + (add_total_qty or 0)

            exp_list = _load_exp_list(existing_exp_raw)

            if track_quantity and (add_batch_qty or 0) > 0:
                # merge by date
                merged = False
                for batch in exp_list:
                    if _norm_date(batch.get("date")) == batch_date_norm:
                        batch["quantity"] = int(batch.get("quantity") or 0) + int(add_batch_qty or 0)
                        merged = True
                        break

                if not merged:
                    exp_list.append({
                        "quantity": int(add_batch_qty or 0),
                        "date": batch_date_norm
                    })

            elif track_quantity and (add_total_qty or 0) > 0 and exp_obj is None:
                # no explicit expiration_date provided → merge into null-date batch
                merged = False
                for batch in exp_list:
                    if _norm_date(batch.get("date")) is None:
                        batch["quantity"] = int(batch.get("quantity") or 0) + int(add_total_qty or 0)
                        merged = True
                        break
                if not merged:
                    exp_list.append({"quantity": int(add_total_qty or 0), "date": None})

            cur.execute(
                '''
                UPDATE item_locations
                SET quantity = ?, expiration_dates = ?
                WHERE id = ?
                ''',
                (new_total if track_quantity else None,
                json.dumps(exp_list, ensure_ascii=False) if track_quantity else None,
                location_id)
            )
            conn.commit()
            _LOGGER.info(f"[ITEM CREATE] Location updated. total={new_total}, batches={len(exp_list)}")
        else:
            # create new location row
            exp_list = None
            qty_to_store = None

            if track_quantity:
                qty_to_store = int(add_total_qty or 0)
                # build initial expiration list
                exp_list_data = []
                if (add_batch_qty or 0) > 0:
                    exp_list_data.append({
                        "quantity": int(add_batch_qty or 0),
                        "date": batch_date_norm
                    })
                elif (add_total_qty or 0) > 0:
                    exp_list_data.append({
                        "quantity": int(add_total_qty or 0),
                        "date": None
                    })
                exp_list = json.dumps(exp_list_data, ensure_ascii=False)

            cur.execute(
                '''
                INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, expiration_dates, image, variant)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''',
                (master_item_id, shelf_id, organizer_id, qty_to_store, exp_list, location_image, variant)
            )
            conn.commit()
            location_id = cur.lastrowid
            _LOGGER.info(f"[ITEM CREATE] New location created id={location_id}")

        return (location_id, master_item_id), None

    except sqlite3.IntegrityError as e:
        conn.rollback()
        _LOGGER.error(f"[ITEM CREATE] IntegrityError: {e}")
        return None, f"Integrity error (unique constraint failed): {e}"
    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM CREATE] Unexpected error: {e}\n{traceback.format_exc()}")
        return None, f"Unexpected error: {str(e)}"
    finally:
        try:
            cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


def update_item(
    db_path,
    item_id,
    data,
    *,
    location_id,
    name,
    aliases,
    barcode,
    new_image,
    min_quantity,
    track_quantity,
    expiration_dates,
    new_room,
    new_cupboard,
    new_shelf,
    new_organizer,
    variant=None,
    variant_barcode=None,
):
    """Update master/location with merge/split logic.

    ``data`` is the raw request body (used for ``"min_quantity" in data``).
    Returns ``(count, old_images_to_delete, error)``.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        old_images_to_delete = []

        # Get current item master data
        cur.execute(
            "SELECT name, aliases, barcode, default_image, track_quantity FROM items_master WHERE id = ?",
            (item_id,)
        )
        current_master = cur.fetchone()
        if not current_master:
            return 0, [], "Item master not found"

        current_name, current_aliases, current_barcode, current_image, current_track_qty = current_master

        # Determine if name/aliases changed
        name_changed = (
            (name is not None and name != current_name)
            or (aliases is not None and aliases != current_aliases)
        )

        new_master_id = item_id

        if name_changed:
            # Validate barcode
            final_barcode = barcode if barcode is not None else current_barcode
            final_name = name if name is not None else current_name
            final_aliases = aliases if aliases is not None else current_aliases

            if final_barcode:
                # Check if barcode matches name/aliases
                cur.execute(
                    "SELECT id, name, aliases, track_quantity FROM items_master WHERE barcode = ? AND id != ?",
                    (final_barcode, item_id)
                )
                barcode_item = cur.fetchone()
                if barcode_item:
                    bc_id, bc_name, bc_aliases, bc_track_qty = barcode_item
                    if bc_name != final_name or bc_aliases != final_aliases:
                        return 0, [], f"Barcode {final_barcode} already exists for different item: {bc_name}"

            # Search for similar item_master
            sql_conditions = []
            sql_params = []

            if final_name:
                if final_aliases:
                    sql_conditions.append("(name = ? AND aliases = ?)")
                    sql_params.extend([final_name, final_aliases])
                else:
                    sql_conditions.append("(name = ? AND aliases IS NULL)")
                    sql_params.append(final_name)

            existing_master = None
            if sql_conditions:
                sql_query = f"SELECT id, track_quantity FROM items_master WHERE {' OR '.join(sql_conditions)} AND id != ?"
                sql_params.append(item_id)
                cur.execute(sql_query, sql_params)
                existing_master = cur.fetchone()

            if existing_master:
                existing_id, existing_track_qty = existing_master

                # Check if track_quantity matches
                final_track_qty = track_quantity if track_quantity is not None else current_track_qty
                if final_track_qty != existing_track_qty:
                    return 0, [], "Cannot merge items with different track_quantity types"

                # Merge into existing master
                _LOGGER.info(f"[ITEM PATCH] Merging item {item_id} into existing master {existing_id}")
                new_master_id = existing_id

                # Update location(s) to point to new master
                if location_id:
                    cur.execute(
                        "UPDATE item_locations SET item_id = ? WHERE id = ?",
                        (new_master_id, location_id)
                    )
                else:
                    cur.execute(
                        "UPDATE item_locations SET item_id = ? WHERE item_id = ?",
                        (new_master_id, item_id)
                    )

                # Variant barcodes follow the rows that moved
                cur.execute(
                    """
                    UPDATE OR IGNORE item_variant_barcodes SET item_id = ?
                    WHERE item_id = ? AND variant IN
                        (SELECT variant FROM item_locations WHERE item_id = ? AND variant IS NOT NULL)
                    """,
                    (new_master_id, item_id, new_master_id),
                )

                # Check if old master has any remaining locations
                cur.execute("SELECT COUNT(*) FROM item_locations WHERE item_id = ?", (item_id,))
                remaining = cur.fetchone()[0]

                if remaining == 0:
                    if current_image and location_id:
                        cur.execute("SELECT image FROM item_locations WHERE id = ?", (location_id,))
                        loc_img = cur.fetchone()
                        if not loc_img or loc_img[0] != current_image:
                            old_images_to_delete.append(current_image)

                    cur.execute("DELETE FROM item_variant_barcodes WHERE item_id = ?", (item_id,))
                    _move_favorites(cur, item_id, new_master_id)
                    cur.execute("DELETE FROM items_master WHERE id = ?", (item_id,))
                    _LOGGER.info(f"[ITEM PATCH] Deleted old master {item_id} (no remaining locations)")

            else:
                # Create new master
                _LOGGER.info(f"[ITEM PATCH] Creating new master for item with new name/aliases")

                final_track_qty = track_quantity if track_quantity is not None else current_track_qty
                final_image = new_image if new_image is not None else current_image
                final_min_qty = min_quantity if "min_quantity" in data else None

                cur.execute(
                    """
                    INSERT INTO items_master (name, aliases, default_image, barcode, min_quantity, track_quantity)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (final_name, final_aliases, final_image, final_barcode, final_min_qty, 1 if final_track_qty else 0)
                )
                new_master_id = cur.lastrowid

                # Update location(s)
                if location_id:
                    cur.execute(
                        "UPDATE item_locations SET item_id = ? WHERE id = ?",
                        (new_master_id, location_id)
                    )
                else:
                    cur.execute(
                        "UPDATE item_locations SET item_id = ? WHERE item_id = ?",
                        (new_master_id, item_id)
                    )

                # Check if old master should be deleted
                cur.execute("SELECT COUNT(*) FROM item_locations WHERE item_id = ?", (item_id,))
                remaining = cur.fetchone()[0]

                if remaining == 0:
                    if current_image and location_id:
                        cur.execute("SELECT image FROM item_locations WHERE id = ?", (location_id,))
                        loc_img = cur.fetchone()
                        if not loc_img or loc_img[0] != current_image:
                            old_images_to_delete.append(current_image)

                    _move_favorites(cur, item_id, new_master_id)
                    cur.execute("DELETE FROM items_master WHERE id = ?", (item_id,))
                    _LOGGER.info(f"[ITEM PATCH] Deleted old master {item_id}")

        # Update master data if not merged
        if new_master_id == item_id:
            updates = []
            params = []

            if name is not None:
                updates.append("name = ?")
                params.append(name)

            if aliases is not None:
                updates.append("aliases = ?")
                params.append(aliases)

            if barcode is not None:
                check_name = name if name is not None else current_name
                check_aliases = aliases if aliases is not None else current_aliases
                cur.execute(
                    "SELECT id, name, aliases FROM items_master WHERE barcode = ? AND id != ?",
                    (barcode, item_id)
                )
                conflict = cur.fetchone()
                if conflict:
                    if conflict[1] != check_name or conflict[2] != check_aliases:
                        return 0, [], f"Barcode {barcode} already exists for different item"
                vb_err = _variant_barcode_conflict(cur, barcode, new_master_id)
                if vb_err:
                    return 0, [], vb_err

                updates.append("barcode = ?")
                params.append(barcode)

            # Note: default_image is NOT updated here - only via EditItemMasterModal
            # When editing from a specific location, only item_locations.image should change

            if "min_quantity" in data:
                updates.append("min_quantity = ?")
                params.append(min_quantity)

            if track_quantity is not None:
                updates.append("track_quantity = ?")
                params.append(1 if track_quantity else 0)

            if updates:
                params.append(item_id)
                sql = f"UPDATE items_master SET {', '.join(updates)} WHERE id = ?"
                _LOGGER.debug(f"[ITEM PATCH] Executing: {sql} with params: {params}")
                cur.execute(sql, params)

        # Update location data
        if location_id:
            loc_updates = []
            loc_params = []

            if track_quantity is not None and not track_quantity:
                loc_updates.append("quantity = ?")
                loc_params.append(None)
                loc_updates.append("expiration_dates = ?")
                loc_params.append(None)
            else:
                if expiration_dates is not None:
                    try:
                        batches = json.loads(expiration_dates) if isinstance(expiration_dates, str) else expiration_dates
                        total_quantity = sum(batch.get("quantity", 0) for batch in batches) if isinstance(batches, list) else None
                        loc_updates.append("quantity = ?")
                        loc_params.append(total_quantity)
                    except:
                        pass

                    loc_updates.append("expiration_dates = ?")
                    loc_params.append(expiration_dates if isinstance(expiration_dates, str) else json.dumps(expiration_dates))

            if new_room and new_cupboard and new_shelf:
                cur.execute(
                    '''
                    SELECT s.id FROM shelves s
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    WHERE r.name = ? AND c.name = ? AND s.name = ?
                    ''',
                    (new_room, new_cupboard, new_shelf)
                )
                shelf_row = cur.fetchone()
                if not shelf_row:
                    return 0, old_images_to_delete, "Destination shelf not found"

                new_shelf_id = shelf_row[0]
                loc_updates.append("shelf_id = ?")
                loc_params.append(new_shelf_id)

                if new_organizer:
                    cur.execute(
                        '''
                        SELECT o.id FROM organizers o
                        WHERE o.shelf_id = ? AND o.name = ?
                        ''',
                        (new_shelf_id, new_organizer)
                    )
                    org_row = cur.fetchone()
                    if org_row:
                        loc_updates.append("organizer_id = ?")
                        loc_params.append(org_row[0])
                    else:
                        return 0, old_images_to_delete, f"Organizer '{new_organizer}' not found"
                else:
                    loc_updates.append("organizer_id = ?")
                    loc_params.append(None)

            if new_image is not None:
                loc_updates.append("image = ?")
                loc_params.append(new_image)

            cur.execute("SELECT variant FROM item_locations WHERE id = ?", (location_id,))
            row_variant = cur.fetchone()
            old_variant = row_variant[0] if row_variant else None
            final_variant = old_variant
            if "variant" in data:
                final_variant = (variant or "").strip() or None
                loc_updates.append("variant = ?")
                loc_params.append(final_variant)

            if loc_updates:
                loc_params.append(location_id)
                loc_sql = f"UPDATE item_locations SET {', '.join(loc_updates)} WHERE id = ?"
                _LOGGER.debug(f"[ITEM PATCH] Executing: {loc_sql} with params: {loc_params}")
                cur.execute(loc_sql, loc_params)

            if "variant" in data and old_variant and final_variant != old_variant:
                # Rename: the label's barcode follows unless other rows still use the old label
                cur.execute(
                    "SELECT 1 FROM item_locations WHERE item_id = ? AND variant = ? AND id != ?",
                    (new_master_id, old_variant, location_id),
                )
                if not cur.fetchone():
                    if final_variant:
                        cur.execute(
                            "SELECT 1 FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
                            (new_master_id, final_variant),
                        )
                        if cur.fetchone():
                            cur.execute(
                                "DELETE FROM item_variant_barcodes WHERE item_id = ? AND variant = ?",
                                (new_master_id, old_variant),
                            )
                        else:
                            cur.execute(
                                "UPDATE item_variant_barcodes SET variant = ? WHERE item_id = ? AND variant = ?",
                                (final_variant, new_master_id, old_variant),
                            )

            if "variant_barcode" in data:
                if not final_variant:
                    if (variant_barcode or "").strip():
                        conn.rollback()
                        return 0, [], "A variant label is required to set a variant barcode"
                else:
                    vb_err = _set_variant_barcode(cur, new_master_id, final_variant, variant_barcode)
                    if vb_err:
                        conn.rollback()
                        return 0, [], vb_err

        conn.commit()
        return 1, old_images_to_delete, None

    except sqlite3.IntegrityError as e:
        conn.rollback()
        _LOGGER.error(f"[ITEM PATCH] IntegrityError: {e}")
        return 0, [], f"Database constraint error: {str(e)}"
    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM PATCH] Error: {e}\n{traceback.format_exc()}")
        return 0, [], str(e)
    finally:
        conn.close()


def _low_stock_payload(db_path, location_id, require_positive):
    """Low-stock event payload evaluated on the item's total across all rows, or None.

    ``location_id`` is the row that triggered the check; its place/variant go in the payload.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        '''
        SELECT
            im.id, im.name, im.min_quantity, im.track_quantity, im.aliases,
            (SELECT SUM(t.quantity) FROM item_locations t WHERE t.item_id = im.id),
            il.quantity, il.variant,
            r.name as room_name, c.name as cupboard_name, s.name as shelf_name
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        WHERE il.id = ?
        ''',
        (location_id,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    item_id_db, name, min_qty, track_qty, aliases, total, row_qty, variant, room, cupboard, shelf = row

    if not (track_qty and total is not None and min_qty is not None):
        return None
    if require_positive and total <= 0:
        return None
    if total > min_qty:
        return None
    return {
        "item_id": item_id_db,
        "name": name,
        "aliases": aliases,
        "quantity": total,
        "total_quantity": total,
        "location_quantity": row_qty,
        "min_quantity": min_qty,
        "room": room,
        "cupboard": cupboard,
        "shelf": shelf,
        "variant": variant,
        "location": f"{room} / {cupboard} / {shelf}"
    }


def get_low_stock_info(db_path, location_id):
    """Return low-stock event payload (total-based, total > 0) for a location's item, or None."""
    return _low_stock_payload(db_path, location_id, True)


def delete_item_location(db_path, location_id, user_id=None):
    """Returns (count, images, error, trash_id); the deleted rows are snapshotted into the bin."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        trash_id = None
        cur.execute(
            '''
            SELECT il.item_id, il.image, im.default_image, im.name
            FROM item_locations il
            JOIN items_master im ON il.item_id = im.id
            WHERE il.id = ?
            ''',
            (location_id,)
        )
        loc = cur.fetchone()
        if not loc:
            return 0, [], "Location not found", None

        item_master_id, location_image, master_image, item_name = loc
        trash_id = _trash_snapshot(cur, "item_location", location_id, user_id)

        cur.execute(
            "SELECT COUNT(*) FROM item_locations WHERE item_id = ?",
            (item_master_id,)
        )
        location_count = cur.fetchone()[0]

        images_to_delete = []

        if location_count == 1:
            _LOGGER.info(
                f"[ITEM DELETE] Last location for item '{item_name}' (ID={item_master_id}), "
                f"deleting item_master"
            )

            # Collect images
            if location_image:
                images_to_delete.append(location_image)
            if master_image and master_image != location_image:
                images_to_delete.append(master_image)

            # Delete location
            cur.execute("DELETE FROM item_locations WHERE id = ?", (location_id,))

            # Delete master
            cur.execute("DELETE FROM item_variant_barcodes WHERE item_id = ?", (item_master_id,))
            _delete_favorites(cur, item_master_id)
            cur.execute("DELETE FROM items_master WHERE id = ?", (item_master_id,))

            conn.commit()
            _LOGGER.info(f"[ITEM DELETE] Deleted item_master {item_master_id} and location {location_id}")
            return 1, images_to_delete, None, trash_id

        else:
            # Multiple locations - delete only this location
            _LOGGER.info(
                f"[ITEM DELETE] Deleting location {location_id} "
                f"(item '{item_name}' has {location_count} locations)"
            )

            # Only delete location-specific image
            if location_image:
                images_to_delete.append(location_image)

            # Delete location
            cur.execute("DELETE FROM item_locations WHERE id = ?", (location_id,))

            conn.commit()
            _LOGGER.info(f"[ITEM DELETE] Deleted location {location_id}")
            return 1, images_to_delete, None, trash_id

    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM DELETE] Error: {e}\n{traceback.format_exc()}")
        return 0, [], str(e), None
    finally:
        conn.close()


def update_item_master(db_path, item_id, data, *, name, aliases, barcode, default_image, min_quantity):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        old_images_to_delete = []

        # Get current master data
        cur.execute(
            "SELECT name, aliases, barcode, default_image, min_quantity FROM items_master WHERE id = ?",
            (item_id,)
        )
        current = cur.fetchone()
        if not current:
            return 0, [], "Item master not found"

        current_name, current_aliases, current_barcode, current_image, current_min = current

        # Build update
        updates = []
        params = []

        if name is not None:
            updates.append("name = ?")
            params.append(name)

        if aliases is not None:
            updates.append("aliases = ?")
            params.append(aliases)

        if barcode is not None:
            # Check for barcode conflicts
            check_name = name if name is not None else current_name
            check_aliases = aliases if aliases is not None else current_aliases
            cur.execute(
                "SELECT id, name, aliases FROM items_master WHERE barcode = ? AND id != ?",
                (barcode, item_id)
            )
            conflict = cur.fetchone()
            if conflict:
                if conflict[1] != check_name or conflict[2] != check_aliases:
                    return 0, [], f"Barcode {barcode} already exists for different item"
            vb_err = _variant_barcode_conflict(cur, barcode, int(item_id))
            if vb_err:
                return 0, [], vb_err

            updates.append("barcode = ?")
            params.append(barcode)

        if default_image is not None:
            if current_image and current_image != default_image:
                old_images_to_delete.append(current_image)
            updates.append("default_image = ?")
            params.append(default_image)

        if "min_quantity" in data:
            updates.append("min_quantity = ?")
            params.append(min_quantity)

        if updates:
            params.append(item_id)
            sql = f"UPDATE items_master SET {', '.join(updates)} WHERE id = ?"
            _LOGGER.debug(f"[ITEM_MASTER PATCH] Executing: {sql} with params: {params}")
            cur.execute(sql, params)

        conn.commit()
        return 1, old_images_to_delete, None

    except sqlite3.IntegrityError as e:
        conn.rollback()
        _LOGGER.error(f"[ITEM_MASTER PATCH] IntegrityError: {e}")
        return 0, [], f"Database constraint error: {str(e)}"
    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM_MASTER PATCH] Error: {e}\n{traceback.format_exc()}")
        return 0, [], str(e)
    finally:
        conn.close()


def delete_item_master(db_path, item_id, user_id=None):
    """Returns (count, images, location_info, error, trash_id); snapshotted into the bin first."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Get master item info
        cur.execute(
            "SELECT name, default_image FROM items_master WHERE id = ?",
            (item_id,)
        )
        master = cur.fetchone()
        if not master:
            return 0, [], [], "Item master not found", None

        master_name, master_image = master
        trash_id = _trash_snapshot(cur, "item_master", item_id, user_id)

        # Get all locations and their images
        cur.execute(
            '''
            SELECT
                il.id,
                il.image,
                r.name as room_name,
                c.name as cupboard_name,
                s.name as shelf_name,
                o.name as organizer_name
            FROM item_locations il
            JOIN shelves s ON il.shelf_id = s.id
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            LEFT JOIN organizers o ON il.organizer_id = o.id
            WHERE il.item_id = ?
            ''',
            (item_id,)
        )
        locations = cur.fetchall()

        images_to_delete = []
        location_info = []

        # Collect images and location info
        for loc in locations:
            loc_id, loc_image, room, cupboard, shelf, organizer = loc

            # Collect location image
            if loc_image:
                images_to_delete.append(loc_image)

            # Format location info
            location_str = f"{room} / {cupboard} / {shelf}"
            if organizer:
                location_str += f" / {organizer}"
            location_info.append(location_str)

        # Add master image if exists
        if master_image:
            images_to_delete.append(master_image)

        # Delete all locations (cascade)
        cur.execute("DELETE FROM item_locations WHERE item_id = ?", (item_id,))
        cur.execute("DELETE FROM item_variant_barcodes WHERE item_id = ?", (item_id,))
        _delete_favorites(cur, item_id)

        # Delete master item
        cur.execute("DELETE FROM items_master WHERE id = ?", (item_id,))

        conn.commit()
        _LOGGER.info(
            f"[ITEM_MASTER DELETE] Deleted item '{master_name}' (ID={item_id}) "
            f"with {len(locations)} locations"
        )

        return 1, images_to_delete, location_info, None, trash_id

    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM_MASTER DELETE] Error: {e}\n{traceback.format_exc()}")
        return 0, [], [], str(e), None
    finally:
        conn.close()


def _consume_from_batches(raw, amount):
    """Remove ``amount`` units from the expiration batches (earliest date first,
    undated last) and return the new JSON string. Keeps the batches in sync with
    ``item_locations.quantity``; returns ``raw`` unchanged when there are none."""
    batches = _load_exp_list(raw)
    if not batches:
        return raw
    batches.sort(key=lambda b: (_norm_date(b.get("date")) is None, _norm_date(b.get("date")) or ""))
    remaining = amount
    for b in batches:
        take = min(b.get("quantity") or 0, remaining)
        b["quantity"] = (b.get("quantity") or 0) - take
        remaining -= take
    batches = [b for b in batches if (b.get("quantity") or 0) > 0]
    return json.dumps(batches) if batches else None


def consume_item(db_path, item_id, location_id):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Find the specific location
    cur.execute("""
        SELECT 
            il.id as location_id,
            il.quantity,
            il.expiration_dates,
            im.id as item_id,
            im.name,
            im.aliases,
            im.min_quantity,
            im.track_quantity,
            r.name as room_name,
            c.name as cupboard_name,
            s.name as shelf_name,
            o.name as organizer_name
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON il.organizer_id = o.id
        WHERE il.id = ? AND im.id = ?
    """, (location_id, item_id))

    location = cur.fetchone()

    if not location:
        conn.close()
        return None, "Item location not found"

    if not location['track_quantity']:
        conn.close()
        return None, "Item does not have quantity tracking enabled"

    if location['quantity'] is None or location['quantity'] <= 0:
        conn.close()
        return None, "Item quantity is already 0 or not set"

    new_quantity = location['quantity'] - 1

    # Update the quantity
    cur.execute("""
        UPDATE item_locations 
        SET quantity = ?, expiration_dates = ?
        WHERE id = ?
    """, (new_quantity, _consume_from_batches(location['expiration_dates'], 1), location_id))

    conn.commit()

    # Check low stock
    cur.execute("SELECT SUM(quantity) FROM item_locations WHERE item_id = ?", (item_id,))
    total_quantity = cur.fetchone()[0] or 0
    is_low_stock = (
        location['min_quantity'] is not None and
        total_quantity > 0 and
        total_quantity <= location['min_quantity']
    )

    location_str = f"{location['room_name']} / {location['cupboard_name']} / {location['shelf_name']}"
    if location['organizer_name']:
        location_str += f" / {location['organizer_name']}"

    result = {
        'location_id': location['location_id'],
        'item_id': location['item_id'],
        'name': location['name'],
        'aliases': location['aliases'],
        'old_quantity': location['quantity'],
        'new_quantity': new_quantity,
        'min_quantity': location['min_quantity'],
        'total_quantity': total_quantity,
        'is_low_stock': is_low_stock,
        'room': location['room_name'],
        'cupboard': location['cupboard_name'],
        'shelf': location['shelf_name'],
        'organizer': location['organizer_name'],
        'location': location_str
    }

    conn.close()
    return result, None


def consume_items(db_path, item_id, location_id, amount):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            il.id as location_id,
            il.quantity,
            il.expiration_dates,
            im.id as item_id,
            im.name,
            im.aliases,
            im.min_quantity,
            im.track_quantity,
            r.name as room_name,
            c.name as cupboard_name,
            s.name as shelf_name,
            o.name as organizer_name
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON il.organizer_id = o.id
        WHERE il.id = ? AND im.id = ?
    """, (location_id, item_id))

    location = cur.fetchone()

    if not location:
        conn.close()
        return None, "Item location not found"

    if not location['track_quantity']:
        conn.close()
        return None, "Item does not have quantity tracking enabled"

    if location['quantity'] is None or location['quantity'] < amount:
        conn.close()
        return None, f"Insufficient quantity. Available: {location['quantity']}, Requested: {amount}"

    new_quantity = location['quantity'] - amount

    cur.execute("""
        UPDATE item_locations 
        SET quantity = ?, expiration_dates = ?
        WHERE id = ?
    """, (new_quantity, _consume_from_batches(location['expiration_dates'], amount), location_id))

    conn.commit()

    cur.execute("SELECT SUM(quantity) FROM item_locations WHERE item_id = ?", (item_id,))
    total_quantity = cur.fetchone()[0] or 0
    is_low_stock = (
        location['min_quantity'] is not None and
        total_quantity > 0 and
        total_quantity <= location['min_quantity']
    )

    location_str = f"{location['room_name']} / {location['cupboard_name']} / {location['shelf_name']}"
    if location['organizer_name']:
        location_str += f" / {location['organizer_name']}"

    result = {
        'location_id': location['location_id'],
        'item_id': location['item_id'],
        'name': location['name'],
        'aliases': location['aliases'],
        'old_quantity': location['quantity'],
        'new_quantity': new_quantity,
        'amount_consumed': amount,
        'min_quantity': location['min_quantity'],
        'total_quantity': total_quantity,
        'is_low_stock': is_low_stock,
        'room': location['room_name'],
        'cupboard': location['cupboard_name'],
        'shelf': location['shelf_name'],
        'organizer': location['organizer_name'],
        'location': location_str
    }

    conn.close()
    return result, None


# ---------------------------------------------------------------- rooms


def list_rooms(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT r.id, r.name, r.image, COUNT(DISTINCT il.id)
        FROM rooms r
        LEFT JOIN cupboards c ON r.id = c.room_id
        LEFT JOIN shelves s ON c.id = s.cupboard_id
        LEFT JOIN item_locations il ON s.id = il.shelf_id
        GROUP BY r.id, r.name, r.image
        ORDER BY r.name
    ''')
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "image": r[2] or "", "itemCount": r[3]} for r in rows]


def create_room(db_path, name, image=None):
    """Raises sqlite3.IntegrityError if the name already exists."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("INSERT INTO rooms (name, image) VALUES (?, ?)", (name, image or None))
    conn.commit()
    rid = cur.lastrowid
    conn.close()
    return rid


def _update_named_with_image(db_path, table, row_id, name, new_image):
    """Shared UPDATE for tables with (name, image).

    ``new_image=None`` leaves the image untouched; ``""`` clears it.
    Returns (rowcount, old_image_to_delete_or_None).
    Raises sqlite3.IntegrityError on duplicate name.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    old_image = None
    if new_image is not None:
        cur.execute(f"SELECT image FROM {table} WHERE id = ?", (row_id,))
        row = cur.fetchone()
        if row:
            old_image = row[0]

    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if new_image is not None:
        updates.append("image = ?")
        params.append(new_image or None)

    if not updates:
        conn.close()
        return 0, None

    params.append(row_id)
    _LOGGER.info(f"Updating {table} {row_id}: name={name!r}, image={new_image!r}")
    try:
        cur.execute(f"UPDATE {table} SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        count = cur.rowcount
    finally:
        conn.close()

    changed = new_image is not None and old_image and old_image != new_image
    return count, old_image if changed else None


def update_room(db_path, room_id, name, new_image=None):
    """Returns (rowcount, old_image_to_delete_or_None). Raises IntegrityError on duplicate name."""
    return _update_named_with_image(db_path, "rooms", room_id, name, new_image)


def _cascade_delete_locations(cur, where_sql, params, trash_id=None):
    """Delete item_locations matched by ``where_sql`` (on alias ``il``), and any item
    master left without locations. Returns the images no longer referenced by live rows
    or by bin entries other than ``trash_id`` (location images + orphaned masters' default
    images), i.e. the files now owned only by that bin entry."""
    cur.execute(f"SELECT il.id, il.item_id, il.image FROM item_locations il WHERE {where_sql}", params)
    rows = cur.fetchall()
    images = [r[2] for r in rows if r[2]]
    loc_ids = [r[0] for r in rows]
    item_ids = {r[1] for r in rows}

    for i in range(0, len(loc_ids), 500):
        chunk = loc_ids[i:i + 500]
        cur.execute(f"DELETE FROM item_locations WHERE id IN ({','.join('?' * len(chunk))})", chunk)

    for item_id in item_ids:
        cur.execute("SELECT COUNT(*) FROM item_locations WHERE item_id = ?", (item_id,))
        if cur.fetchone()[0]:
            continue
        cur.execute("SELECT default_image FROM items_master WHERE id = ?", (item_id,))
        row = cur.fetchone()
        if row and row[0]:
            images.append(row[0])
        cur.execute("DELETE FROM item_variant_barcodes WHERE item_id = ?", (item_id,))
        _delete_favorites(cur, item_id)
        cur.execute("DELETE FROM items_master WHERE id = ?", (item_id,))

    # Never report a file still referenced by a surviving location/master or another bin entry
    kept = []
    for img in dict.fromkeys(images):
        name = img.split("?")[0].rsplit("/", 1)[-1]
        cur.execute(
            "SELECT (SELECT COUNT(*) FROM item_locations WHERE image LIKE ?)"
            " + (SELECT COUNT(*) FROM items_master WHERE default_image LIKE ?)",
            (f"%{name}%", f"%{name}%"),
        )
        if cur.fetchone()[0] == 0 and _trash_image_refs(cur, name, trash_id) == 0:
            kept.append(img)
    return kept


def delete_preview(db_path, kind, entity_id):
    """What a cascading delete would remove, without deleting anything.

    ``kind``: room | cupboard | shelf | organizer | item_master | item_location. Returns None for an
    unknown kind/id, else counts of cupboards, shelves, organizers, item locations,
    item masters that would be deleted (all their locations go) and photos, plus
    ``locations_list`` (up to 20 "room / cupboard / shelf[ / organizer]" strings, item_master only).
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        snap = _snapshot_subtree(cur, kind, entity_id)
        if snap is None:
            return None
        result = _snapshot_summary(kind, snap)
        result["locations_list"] = []
        if kind == "item_master":
            result["locations_list"] = [
                " / ".join(p for p in r if p)
                for r in cur.execute('''
                    SELECT r.name, c.name, s.name, o.name FROM item_locations il
                    JOIN shelves s ON il.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    LEFT JOIN organizers o ON il.organizer_id = o.id
                    WHERE il.item_id = ? LIMIT 20
                ''', (entity_id,)).fetchall()
            ]
        return result
    finally:
        conn.close()


def delete_room(db_path, room_id, user_id=None):
    """Returns (rowcount, images, trash_id). The subtree is snapshotted into the bin first
    (same transaction); ``images`` = the room's own image plus all descendants' (cupboards,
    shelves, organizers, item locations, and masters left without locations), now kept on
    disk for the bin. Cascades explicitly: API connections don't enable foreign_keys."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        trash_id = _trash_snapshot(cur, "room", room_id, user_id)
        cur.execute('''
            SELECT image FROM rooms WHERE id = ?
            UNION ALL
            SELECT c.image FROM cupboards c WHERE c.room_id = ?
            UNION ALL
            SELECT s.image FROM shelves s
            JOIN cupboards c ON s.cupboard_id = c.id
            WHERE c.room_id = ?
            UNION ALL
            SELECT o.image FROM organizers o
            JOIN shelves s ON o.shelf_id = s.id
            JOIN cupboards c ON s.cupboard_id = c.id
            WHERE c.room_id = ?
        ''', (room_id,) * 4)
        images = [row[0] for row in cur.fetchall() if row[0]]

        images += _cascade_delete_locations(
            cur,
            "il.shelf_id IN (SELECT s.id FROM shelves s JOIN cupboards c ON s.cupboard_id = c.id WHERE c.room_id = ?)",
            (room_id,),
            trash_id,
        )
        cur.execute("DELETE FROM organizers WHERE shelf_id IN (SELECT s.id FROM shelves s JOIN cupboards c ON s.cupboard_id = c.id WHERE c.room_id = ?)", (room_id,))
        cur.execute("DELETE FROM shelves WHERE cupboard_id IN (SELECT id FROM cupboards WHERE room_id = ?)", (room_id,))
        cur.execute("DELETE FROM cupboards WHERE room_id = ?", (room_id,))
        cur.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
        count = cur.rowcount
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return count, images, trash_id


# ------------------------------------------------------------ cupboards


def list_cupboards(db_path, room):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT c.id, c.name, c.image, COUNT(DISTINCT il.id)
        FROM cupboards c
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN shelves s ON c.id = s.cupboard_id
        LEFT JOIN item_locations il ON s.id = il.shelf_id
        WHERE r.name = ?
        GROUP BY c.id, c.name, c.image
        ORDER BY c.name
    ''', (room,))
    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        image = r[2] if r[2] else ""
        cupboard = {
            "id": r[0],
            "name": r[1],
            "image": image,
            "itemCount": r[3]
        }
        _LOGGER.debug(f"Cupboard fetched - ID: {r[0]}, Name: {r[1]}, Image: '{image}'")
        result.append(cupboard)

    return result


def create_cupboard(db_path, room, name, image):
    """Returns new id, or None if room not found. Raises IntegrityError on duplicate."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT id FROM rooms WHERE name = ?", (room,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    room_id = row[0]

    cur.execute("INSERT INTO cupboards (name, room_id, image) VALUES (?, ?, ?)", (name, room_id, image))
    conn.commit()
    cupboard_id = cur.lastrowid
    conn.close()
    return cupboard_id


def update_cupboard(db_path, cupboard_id, name, new_image):
    """Returns (rowcount, old_image_to_delete_or_None)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    old_image = None
    if new_image is not None:
        cur.execute("SELECT image FROM cupboards WHERE id = ?", (cupboard_id,))
        row = cur.fetchone()
        if row:
            old_image = row[0]

    updates = []
    params = []

    if name is not None:
        updates.append("name = ?")
        params.append(name)
        _LOGGER.info(f"Updating name to: {name}")

    if new_image is not None:
        updates.append("image = ?")
        params.append(new_image)
        _LOGGER.info(f"Updating image to: '{new_image}'")

    if not updates:
        conn.close()
        _LOGGER.warning("No updates provided")
        return 0, None

    params.append(cupboard_id)
    sql = f"UPDATE cupboards SET {', '.join(updates)} WHERE id = ?"

    _LOGGER.info(f"Executing SQL: {sql} with params: {params}")
    cur.execute(sql, params)
    conn.commit()
    count = cur.rowcount
    conn.close()

    return count, old_image if (new_image is not None and old_image != new_image) else None


def delete_cupboard(db_path, cupboard_id, user_id=None):
    """Returns (rowcount, images, trash_id). Snapshots + cascades like delete_room."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        trash_id = _trash_snapshot(cur, "cupboard", cupboard_id, user_id)
        cur.execute('''
            SELECT image FROM cupboards WHERE id = ?
            UNION ALL
            SELECT image FROM shelves WHERE cupboard_id = ?
            UNION ALL
            SELECT o.image FROM organizers o
            JOIN shelves s ON o.shelf_id = s.id
            WHERE s.cupboard_id = ?
        ''', (cupboard_id,) * 3)
        images = [row[0] for row in cur.fetchall() if row[0]]

        images += _cascade_delete_locations(
            cur,
            "il.shelf_id IN (SELECT id FROM shelves WHERE cupboard_id = ?)",
            (cupboard_id,),
            trash_id,
        )
        cur.execute("DELETE FROM organizers WHERE shelf_id IN (SELECT id FROM shelves WHERE cupboard_id = ?)", (cupboard_id,))
        cur.execute("DELETE FROM shelves WHERE cupboard_id = ?", (cupboard_id,))
        cur.execute("DELETE FROM cupboards WHERE id = ?", (cupboard_id,))
        count = cur.rowcount
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return count, images, trash_id


# --------------------------------------------------------------- shelves


def list_shelves(db_path, room, cupboard):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT s.id, s.name, s.image, COUNT(DISTINCT o.id), COUNT(DISTINCT il.id)
        FROM shelves s
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON s.id = o.shelf_id
        LEFT JOIN item_locations il ON s.id = il.shelf_id
        WHERE r.name = ? AND c.name = ?
        GROUP BY s.id, s.name, s.image
        ORDER BY s.name
    ''', (room, cupboard))
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r[0], "name": r[1], "image": r[2] or "", "organizerCount": r[3], "itemCount": r[4]}
        for r in rows
    ]


def create_shelf(db_path, room, cupboard, name, image=None):
    """Returns new id, or None if cupboard not found. Raises IntegrityError on duplicate."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT c.id FROM cupboards c
        JOIN rooms r ON c.room_id = r.id
        WHERE r.name = ? AND c.name = ?
    ''', (room, cupboard))

    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    cupboard_id = row[0]

    try:
        cur.execute(
            "INSERT INTO shelves (name, cupboard_id, image) VALUES (?, ?, ?)",
            (name, cupboard_id, image or None),
        )
        conn.commit()
        shelf_id = cur.lastrowid
    finally:
        conn.close()
    return shelf_id


def update_shelf(db_path, shelf_id, name, new_image=None):
    """Returns (rowcount, old_image_to_delete_or_None). Raises IntegrityError on duplicate name."""
    return _update_named_with_image(db_path, "shelves", shelf_id, name, new_image)


def delete_shelf(db_path, shelf_id, user_id=None):
    """Returns (rowcount, images, trash_id). Snapshots + cascades like delete_room."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        trash_id = _trash_snapshot(cur, "shelf", shelf_id, user_id)
        cur.execute('''
            SELECT image FROM shelves WHERE id = ?
            UNION ALL
            SELECT image FROM organizers WHERE shelf_id = ?
        ''', (shelf_id,) * 2)
        images = [row[0] for row in cur.fetchall() if row[0]]

        images += _cascade_delete_locations(cur, "il.shelf_id = ?", (shelf_id,), trash_id)
        cur.execute("DELETE FROM organizers WHERE shelf_id = ?", (shelf_id,))
        cur.execute("DELETE FROM shelves WHERE id = ?", (shelf_id,))
        count = cur.rowcount
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return count, images, trash_id


# ---------------------------------------------------------- deep links


def resolve_location(db_path, target, location_id):
    """Resolve a cupboard/shelf id to its names, for QR/NFC deep links.

    Returns {"room", "cupboard"[, "shelf"]} or None if not found / bad target.
    """
    if target == "cupboard":
        sql = '''
            SELECT r.name, c.name FROM cupboards c
            JOIN rooms r ON c.room_id = r.id
            WHERE c.id = ?
        '''
    elif target == "shelf":
        sql = '''
            SELECT r.name, c.name, s.name FROM shelves s
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            WHERE s.id = ?
        '''
    else:
        return None

    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(sql, (location_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return None

    result = {"room": row[0], "cupboard": row[1]}
    if target == "shelf":
        result["shelf"] = row[2]
    return result


# ------------------------------------------------------------ organizers


def list_organizers(db_path, room, cupboard, shelf):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT o.id, o.name, o.image, COUNT(DISTINCT il.id)
        FROM organizers o
        JOIN shelves s ON o.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN item_locations il ON o.id = il.organizer_id
        WHERE r.name = ? AND c.name = ? AND s.name = ?
        GROUP BY o.id, o.name, o.image
        ORDER BY o.name
    ''', (room, cupboard, shelf))

    organizers = []
    for r in cur.fetchall():
        image = r[2] if r[2] else ""
        organizers.append({
            "id": r[0],
            "name": r[1],
            "image": image,
            "itemCount": r[3]
        })

    cur.execute('''
        SELECT COUNT(il.id)
        FROM item_locations il
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        WHERE r.name = ? AND c.name = ? AND s.name = ?
        AND il.organizer_id IS NULL
    ''', (room, cupboard, shelf))

    items_without_organizer = cur.fetchone()[0]
    conn.close()

    return {
        "organizers": organizers,
        "itemsWithoutOrganizer": items_without_organizer
    }


def create_organizer(db_path, room, cupboard, shelf, name, image):
    """Returns new id, or None if shelf not found. Raises IntegrityError on duplicate."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT s.id FROM shelves s
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        WHERE r.name = ? AND c.name = ? AND s.name = ?
    ''', (room, cupboard, shelf))

    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    shelf_id = row[0]

    cur.execute("INSERT INTO organizers (name, image, shelf_id) VALUES (?, ?, ?)",
               (name, image, shelf_id))
    conn.commit()
    organizer_id = cur.lastrowid
    conn.close()
    return organizer_id


def update_organizer(db_path, organizer_id, name, new_image, new_room, new_cupboard, new_shelf):
    """Returns (rowcount, old_image_to_delete_or_None, error_or_None)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    old_image = None
    if new_image is not None:
        cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
        row = cur.fetchone()
        if row:
            old_image = row[0]

    updates = []
    params = []

    if name is not None:
        updates.append("name = ?")
        params.append(name)

    if new_image is not None:
        updates.append("image = ?")
        params.append(new_image)
        _LOGGER.info(f"Updating organizer image to: '{new_image}'")

    if new_room and new_cupboard and new_shelf:
        _LOGGER.info(f"Moving organizer {organizer_id} to: {new_room}/{new_cupboard}/{new_shelf}")

        cur.execute('''
            SELECT s.id FROM shelves s
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            WHERE r.name = ? AND c.name = ? AND s.name = ?
        ''', (new_room, new_cupboard, new_shelf))

        shelf_row = cur.fetchone()
        if not shelf_row:
            conn.close()
            return 0, None, "Destination shelf not found"

        new_shelf_id = shelf_row[0]
        updates.append("shelf_id = ?")
        params.append(new_shelf_id)

        _LOGGER.info(f"Moving all items from organizer {organizer_id} to shelf_id {new_shelf_id}")
        cur.execute('''
            UPDATE item_locations
            SET shelf_id = ?
            WHERE organizer_id = ?
        ''', (new_shelf_id, organizer_id))
        items_moved = cur.rowcount
        _LOGGER.info(f"Moved {items_moved} items to new shelf")

    if not updates:
        conn.close()
        return 0, None, None

    params.append(organizer_id)
    sql = f"UPDATE organizers SET {', '.join(updates)} WHERE id = ?"

    _LOGGER.info(f"Executing: {sql} with params: {params}")
    cur.execute(sql, params)
    conn.commit()
    count = cur.rowcount
    conn.close()

    return count, old_image if (new_image is not None and old_image and old_image != new_image) else None, None


def hard_delete_organizer(db_path, organizer_id, user_id=None):
    """Returns (deleted, organizer_image, item_images, items_deleted_count, trash_id).

    The subtree is snapshotted into the bin first (same transaction); ``item_images``
    includes default images of masters left without locations."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        trash_id = _trash_snapshot(cur, "organizer", organizer_id, user_id)
        cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
        org_row = cur.fetchone()
        organizer_image = org_row[0] if org_row else None

        cur.execute("SELECT COUNT(*) FROM item_locations WHERE organizer_id = ?", (organizer_id,))
        items_count = cur.fetchone()[0]

        item_images = _cascade_delete_locations(cur, "il.organizer_id = ?", (organizer_id,), trash_id)
        cur.execute("DELETE FROM organizers WHERE id = ?", (organizer_id,))
        deleted = cur.rowcount > 0
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return deleted, organizer_image, item_images, items_count, trash_id


# ------------------------------------------------------------- all_items


def _variant_barcodes_by_item(cur):
    """``{item_id: [{"variant", "barcode"}, ...]}`` for all variant barcodes."""
    cur.execute("SELECT item_id, variant, barcode FROM item_variant_barcodes ORDER BY variant")
    result = {}
    for item_id, variant, bc in cur.fetchall():
        result.setdefault(item_id, []).append({"variant": variant, "barcode": bc})
    return result


def list_all_items(db_path, search, barcode, low_stock_only, expired_only):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    query = '''
        SELECT
            im.id as item_id,
            im.name,
            im.default_image,
            im.barcode,
            im.min_quantity,
            im.track_quantity,
            im.aliases,
            il.id as location_id,
            il.quantity,
            il.expiration_dates,
            il.image as location_image,
            r.name as room_name,
            c.name as cupboard_name,
            s.name as shelf_name,
            o.name as organizer_name,
            il.variant,
            (SELECT SUM(t.quantity) FROM item_locations t WHERE t.item_id = im.id) as item_total,
            r.image as room_image,
            c.image as cupboard_image,
            s.image as shelf_image,
            o.image as organizer_image
        FROM items_master im
        LEFT JOIN item_locations il ON im.id = il.item_id
        LEFT JOIN shelves s ON il.shelf_id = s.id
        LEFT JOIN cupboards c ON s.cupboard_id = c.id
        LEFT JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON il.organizer_id = o.id
    '''

    params = []
    conditions = []

    if search:
        conditions.append("(im.name LIKE ? OR im.aliases LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param])

    if barcode:
        conditions.append(_BARCODE_MATCH_SQL)
        params.extend([barcode, barcode])

    if low_stock_only:
        conditions.append("im.track_quantity = 1 AND im.min_quantity IS NOT NULL "
            "AND (SELECT SUM(t.quantity) FROM item_locations t WHERE t.item_id = im.id) <= im.min_quantity")

    if expired_only:
        conditions.append("il.expiration_dates IS NOT NULL")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY im.name, il.created_at DESC"

    cur.execute(query, params)
    rows = cur.fetchall()
    variant_barcodes = _variant_barcodes_by_item(cur)
    matched = _variant_barcode_owner(cur, barcode) if barcode else None
    conn.close()

    # Group results by item
    items_dict = {}
    for r in rows:
        item_id = r[0]

        if item_id not in items_dict:
            items_dict[item_id] = {
                "id": item_id,
                "name": r[1],
                "default_image": r[2] if r[2] else None,
                "barcode": r[3],
                "min_quantity": r[4],
                "track_quantity": bool(r[5]),
                "aliases": r[6],
                "locations": [],
                "total_quantity": 0,
                "variant_barcodes": variant_barcodes.get(item_id, []),
                "matched_variant": matched[1] if matched and matched[0] == item_id else None,
                "is_low_stock": bool(
                    r[5] and r[4] is not None and r[16] is not None and r[16] <= r[4]
                ),
            }

        # Add the location if it exists
        if r[7] is not None:  # location_id
            location = f"{r[11]} / {r[12]} / {r[13]}"
            if r[14]:
                location += f" / {r[14]}"

            expiration_dates_json = r[9]
            has_expired = False
            if expiration_dates_json and expired_only:
                try:
                    batches = json.loads(expiration_dates_json)
                    today = date.today().isoformat()
                    has_expired = any(
                        batch.get("date", "") <= today
                        for batch in batches if isinstance(batch, dict)
                    )
                except:
                    pass

            # Skip this location if filtering for expired and none are expired
            if expired_only and not has_expired:
                continue

            location_data = {
                "location_id": r[7],
                "quantity": r[8],
                "expiration_dates": r[9],
                "image": r[10] if r[10] else None,
                "variant": r[15],
                "room": r[11],
                "cupboard": r[12],
                "shelf": r[13],
                "organizer": r[14],
                "room_image": r[17] if r[17] else None,
                "cupboard_image": r[18] if r[18] else None,
                "shelf_image": r[19] if r[19] else None,
                "organizer_image": r[20] if r[20] else None,
                "location": location,
                "is_low_stock": items_dict[item_id]["is_low_stock"],
                "is_expired": has_expired  # ✅ FIX: Check if any batch is expired
            }

            items_dict[item_id]["locations"].append(location_data)

            if r[8] is not None:
                items_dict[item_id]["total_quantity"] += r[8]

    return list(items_dict.values())


def update_item_quantity(db_path, item_id, location_id, quantity, min_quantity, track_quantity, expiration_dates):
    """Returns rowcount of the last UPDATE executed (0 if nothing matched)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Update item_locations
    loc_updates = []
    loc_params = []

    if quantity is not None:
        loc_updates.append("quantity = ?")
        loc_params.append(quantity)

    if expiration_dates is not None:  # ✅ FIX: Use expiration_dates
        loc_updates.append("expiration_dates = ?")
        loc_params.append(expiration_dates)

    if loc_updates:
        loc_params.append(location_id)
        loc_sql = f"UPDATE item_locations SET {', '.join(loc_updates)} WHERE id = ?"
        cur.execute(loc_sql, loc_params)

    # Update items_master
    master_updates = []
    master_params = []

    if min_quantity is not None:
        master_updates.append("min_quantity = ?")
        master_params.append(min_quantity)

    if track_quantity is not None:
        master_updates.append("track_quantity = ?")
        master_params.append(1 if track_quantity else 0)

    if master_updates:
        master_params.append(item_id)
        master_sql = f"UPDATE items_master SET {', '.join(master_updates)} WHERE id = ?"
        cur.execute(master_sql, master_params)

    conn.commit()
    count = cur.rowcount
    conn.close()
    return count


def get_quantity_update_low_stock(db_path, location_id):
    """Low-stock payload after a quantity PATCH (total <= min, no `total > 0` guard)."""
    return _low_stock_payload(db_path, location_id, False)


def search_items(db_path, query, barcode):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    if barcode:
        # Exact search by barcode
        cur.execute('''
            SELECT
                im.id, im.name, im.default_image, im.barcode, im.aliases,
                COUNT(DISTINCT il.id) as location_count,
                COALESCE(SUM(il.quantity), 0) as total_quantity
            FROM items_master im
            LEFT JOIN item_locations il ON im.id = il.item_id
            WHERE ''' + _BARCODE_MATCH_SQL + '''
            GROUP BY im.id
        ''', (barcode, barcode))
    else:
        # Fuzzy search by name or alias
        search_param = f"%{query}%"
        cur.execute('''
            SELECT
                im.id, im.name, im.default_image, im.barcode, im.aliases,
                COUNT(DISTINCT il.id) as location_count,
                COALESCE(SUM(il.quantity), 0) as total_quantity
            FROM items_master im
            LEFT JOIN item_locations il ON im.id = il.item_id
            WHERE im.name LIKE ? OR im.aliases LIKE ?
            GROUP BY im.id
            ORDER BY im.name
            LIMIT 50
        ''', (search_param, search_param))

    rows = cur.fetchall()
    matched = _variant_barcode_owner(cur, barcode) if barcode else None
    conn.close()

    return [{
        "id": r[0],
        "name": r[1],
        "image": r[2] if r[2] else "",
        "barcode": r[3],
        "aliases": r[4],
        "location_count": r[5],
        "total_quantity": r[6],
        "matched_variant": matched[1] if matched and matched[0] == r[0] else None,
    } for r in rows]


# ---------------------------------------------------------------- upload


def count_default_image_refs(db_path, filename):
    """References that forbid deleting ``filename``: master default images + bin entries."""
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM items_master WHERE default_image LIKE ?",
            (f'%{filename}%',)
        )
        return cursor.fetchone()[0] + _trash_image_refs(cursor, filename)
    finally:
        conn.close()


def list_item_locations(db_path, item_id):
    """All locations of one master item (GET /items?item_id=)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT 
            il.id as location_id,
            im.id as item_id,
            im.name,
            COALESCE(il.image, im.default_image),
            im.barcode,
            im.min_quantity,
            im.track_quantity,
            im.aliases,
            il.quantity,
            il.expiration_dates,
            r.name as room_name,
            c.name as cupboard_name,
            s.name as shelf_name,
            o.name as organizer_name,
            il.variant
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON il.organizer_id = o.id
        WHERE im.id = ?
        ORDER BY il.created_at DESC
    ''', (item_id,))

    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        location = f"{r[10]} / {r[11]} / {r[12]}"
        if r[13]:
            location += f" / {r[13]}"

        item = {
            "location_id": r[0],
            "item_id": r[1],
            "name": r[2], 
            "image": r[3] if r[3] else "",
            "barcode": r[4],
            "min_quantity": r[5],
            "track_quantity": bool(r[6]),
            "aliases": r[7],
            "quantity": r[8],
            "expiration_date": r[9],
            "location": location,
            "room": r[10],
            "cupboard": r[11],
            "shelf": r[12],
            "organizer": r[13],
            "variant": r[14]
        }
        result.append(item)

    return result


def list_items_at_location(db_path, room, cupboard, shelf, organizer):
    """Items on a shelf (or organizer) by names (GET /items?room=&cupboard=&shelf=)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    if organizer:
        cur.execute('''
            SELECT 
                il.id as location_id,
                im.id as item_id,
                im.name,
                COALESCE(il.image, im.default_image),
                im.barcode,
                im.min_quantity,
                im.track_quantity,
                im.aliases,
                il.quantity,
                il.expiration_dates,
                r.name as room_name,
                c.name as cupboard_name,
                s.name as shelf_name,
                o.name as organizer_name,
            il.variant
            FROM item_locations il
            JOIN items_master im ON il.item_id = im.id
            JOIN shelves s ON il.shelf_id = s.id
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            JOIN organizers o ON il.organizer_id = o.id
            WHERE r.name = ? AND c.name = ? AND s.name = ? AND o.name = ?
            ORDER BY il.created_at DESC
        ''', (room, cupboard, shelf, organizer))
    else:
        cur.execute('''
            SELECT 
                il.id as location_id,
                im.id as item_id,
                im.name,
                COALESCE(il.image, im.default_image),
                im.barcode,
                im.min_quantity,
                im.track_quantity,
                im.aliases,
                il.quantity,
                il.expiration_dates,
                r.name as room_name,
                c.name as cupboard_name,
                s.name as shelf_name,
                NULL as organizer_name,
                il.variant
            FROM item_locations il
            JOIN items_master im ON il.item_id = im.id
            JOIN shelves s ON il.shelf_id = s.id
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            WHERE r.name = ? AND c.name = ? AND s.name = ? AND il.organizer_id IS NULL
            ORDER BY il.created_at DESC
        ''', (room, cupboard, shelf))

    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        location = f"{r[10]} / {r[11]} / {r[12]}"
        if r[13]:
            location += f" / {r[13]}"

        item = {
            "location_id": r[0],
            "item_id": r[1],
            "name": r[2], 
            "image": r[3] if r[3] else "",
            "barcode": r[4],
            "min_quantity": r[5],
            "track_quantity": bool(r[6]),
            "aliases": r[7],
            "quantity": r[8],
            "expiration_date": r[9],
            "location": location,
            "variant": r[14]
        }
        _LOGGER.debug(f"Item fetched - Location ID: {r[0]}, Item ID: {r[1]}, Name: {r[2]}, Location: '{location}'")
        result.append(item)

    return result


def list_item_masters(db_path, search, barcode):
    """Master items with location count / total quantity (GET /items_master)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    query = '''
        SELECT 
            im.id,
            im.name,
            im.aliases,
            im.default_image,
            im.barcode,
            im.min_quantity,
            im.track_quantity,
            COUNT(DISTINCT il.id) as location_count,
            COALESCE(SUM(il.quantity), 0) as total_quantity
        FROM items_master im
        LEFT JOIN item_locations il ON im.id = il.item_id
    '''

    params = []
    conditions = []

    if search:
        conditions.append("(im.name LIKE ? OR im.aliases LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param])

    if barcode:
        conditions.append(_BARCODE_MATCH_SQL)
        params.extend([barcode, barcode])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " GROUP BY im.id ORDER BY im.name"

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    return [{
        "id": r[0],
        "name": r[1],
        "aliases": r[2],
        "image": r[3] if r[3] else None,
        "barcode": r[4],
        "min_quantity": r[5],
        "track_quantity": bool(r[6]),
        "location_count": r[7],
        "total_quantity": r[8] if r[8] else None
    } for r in rows]


def count_items_master(db_path):
    """Number of unique items (sensor: total items)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM items_master")
    count = cur.fetchone()[0]
    conn.close()
    return count


def list_low_stock_sensor(db_path):
    """(count, items) for the low-stock sensor: one row per tracked item whose total quantity <= min."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT im.id, im.name, SUM(il.quantity) AS total, im.min_quantity
        FROM items_master im
        JOIN item_locations il ON il.item_id = im.id
        WHERE im.track_quantity = 1
        AND im.min_quantity IS NOT NULL
        GROUP BY im.id
        HAVING SUM(il.quantity) IS NOT NULL AND SUM(il.quantity) <= im.min_quantity
        ORDER BY total ASC
    ''')
    rows = cur.fetchall()

    items = []
    for item_id, name, total, min_qty in rows:
        cur.execute('''
            SELECT r.name, c.name, s.name, il.quantity, il.variant
            FROM item_locations il
            JOIN shelves s ON il.shelf_id = s.id
            JOIN cupboards c ON s.cupboard_id = c.id
            JOIN rooms r ON c.room_id = r.id
            WHERE il.item_id = ?
            ORDER BY il.created_at, il.id
        ''', (item_id,))
        locs = [{
            "room": lr, "cupboard": lc, "shelf": ls, "quantity": lq, "variant": lv,
            "location": f"{lr} / {lc} / {ls}",
        } for lr, lc, ls, lq, lv in cur.fetchall()]
        if not locs:
            continue
        if len(locs) == 1:
            location = locs[0]["location"]
        else:
            location = f"{len(locs)} locations"
        items.append({
            "id": item_id,
            "name": name,
            "quantity": total,
            "min_quantity": min_qty,
            "room": locs[0]["room"],
            "cupboard": locs[0]["cupboard"],
            "shelf": locs[0]["shelf"],
            "location": location,
            "locations": locs,
        })
    conn.close()

    return len(items), items


def list_tracked_sensor(db_path):
    """(count, items) for the tracked-items sensor: every location of items with a min_quantity."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT 
            im.id, im.name, il.quantity, im.min_quantity,
            r.name as room, c.name as cupboard, s.name as shelf,
            il.variant,
            (SELECT SUM(t.quantity) FROM item_locations t WHERE t.item_id = im.id) as item_total
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        WHERE im.track_quantity = 1
        AND im.min_quantity IS NOT NULL
        ORDER BY im.name
    ''')
    rows = cur.fetchall()
    conn.close()

    items = [{
        "id": r[0],
        "name": r[1],
        "quantity": r[2],
        "min_quantity": r[3],
        "room": r[4],
        "cupboard": r[5],
        "shelf": r[6],
        "location": f"{r[4]} / {r[5]} / {r[6]}",
        "variant": r[7],
        "total_quantity": r[8],
        "is_low": r[8] is not None and r[3] is not None and r[8] <= r[3]
    } for r in rows]

    return len(items), items


def expiry_threshold(today, value, unit):
    """Last day (inclusive) of the "expiring soon" window.

    ``unit`` is "days" or "months"; months are calendar months (day clamped to
    the target month length, e.g. Jan 31 + 1 month = Feb 28/29).
    """
    if unit == "months":
        month_index = today.month - 1 + int(value)
        year = today.year + month_index // 12
        month = month_index % 12 + 1
        day = min(today.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)
    return today + timedelta(days=int(value))


def list_expiring_batches(db_path, today, threshold):
    """Batches with a date <= ``threshold`` (already expired ones included).

    One row per batch with quantity > 0, sorted by date, with the full location.
    """
    base_sql = '''
        SELECT im.id, im.name, il.id, il.variant, il.expiration_dates,
               r.name, c.name, s.name, o.name
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON il.organizer_id = o.id
        WHERE il.expiration_dates IS NOT NULL AND il.expiration_dates != ''
    '''
    # Prefilter in SQLite: only rows holding at least one dated batch inside the
    # window are returned (a superset; exact checks stay in Python below).
    # Invalid JSON is kept (CASE) so json_each never raises on bad rows.
    prefilter = '''
        AND CASE WHEN json_valid(il.expiration_dates) THEN EXISTS (
            SELECT 1 FROM json_each(il.expiration_dates) je
            WHERE json_type(je.value) = 'object'
              AND replace(substr(json_extract(je.value, '$.date'), 1, 10), '/', '-') <= ?
        ) ELSE 1 END
    '''
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        try:
            cur.execute(base_sql + prefilter, (threshold.isoformat(),))
        except sqlite3.OperationalError:  # SQLite built without JSON1
            cur.execute(base_sql)
        rows = cur.fetchall()
    finally:
        conn.close()

    batches = []
    for item_id, name, loc_id, variant, exp_json, room, cupboard, shelf, organizer in rows:
        try:
            parsed = json.loads(exp_json)
        except (TypeError, ValueError):
            continue
        if not isinstance(parsed, list):
            continue
        location = f"{room} / {cupboard} / {shelf}"
        if organizer:
            location += f" / {organizer}"
        for batch in parsed:
            if not isinstance(batch, dict) or not batch.get("date"):
                continue
            try:
                batch_date = date.fromisoformat(str(batch["date"])[:10].replace("/", "-"))
            except ValueError:
                continue
            quantity = batch.get("quantity")
            if batch_date > threshold or (isinstance(quantity, (int, float)) and quantity <= 0):
                continue
            days_left = (batch_date - today).days
            batches.append({
                "id": item_id,
                "name": name,
                "variant": variant,
                "location_id": loc_id,
                "quantity": quantity,
                "date": batch_date.strftime("%Y/%m/%d"),
                "days_left": days_left,
                "expired": days_left < 0,
                "room": room,
                "cupboard": cupboard,
                "shelf": shelf,
                "organizer": organizer,
                "location": location,
            })
    batches.sort(key=lambda b: (b["date"], b["name"]))  # YYYY/MM/DD sorts chronologically  # YYYY/MM/DD sorts chronologically
    return batches
