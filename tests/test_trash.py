import json
import sqlite3

import pytest

from home_inventory.db import repository
from home_inventory.db.schema import ensure_trash_table

USER = "user-a"


def _setup(db_path, seed):
    """R1/C1/S1/O1 with master 1 (only here) and master 2 (R1 + R2)."""
    a = seed(db_path, "R1", "C1", "S1", "O1")
    b = seed(db_path, "R2", "C2", "S2")
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE rooms SET image='room.jpg' WHERE id=?", (a["room_id"],))
    conn.execute("UPDATE cupboards SET image='cup.jpg' WHERE id=?", (a["cupboard_id"],))
    conn.execute("UPDATE shelves SET image='shelf.jpg' WHERE id=?", (a["shelf_id"],))
    conn.execute("UPDATE organizers SET image='org.jpg' WHERE id=?", (a["organizer_id"],))
    conn.execute("INSERT INTO items_master (id, name, default_image) VALUES (1,'only','m1.jpg')")
    conn.execute("INSERT INTO items_master (id, name, default_image) VALUES (2,'both','m2.jpg')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, image, expiration_dates, variant)"
        " VALUES (1,?,?,3,'l1.jpg','[{\"quantity\": 3, \"date\": \"2030-01-01\"}]','red')",
        (a["shelf_id"], a["organizer_id"]),
    )
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (2,?,1,'l2a.jpg')", (a["shelf_id"],))
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (2,?,1,'l2b.jpg')", (b["shelf_id"],))
    conn.execute("INSERT INTO item_variant_barcodes (item_id, variant, barcode) VALUES (1,'red','111')")
    conn.execute("INSERT INTO item_variant_barcodes (item_id, variant, barcode) VALUES (2,'v','222')")
    conn.execute("INSERT INTO item_favorites (user_id, item_id) VALUES (?, 1)", (USER,))
    conn.execute("INSERT INTO item_favorites (user_id, item_id) VALUES (?, 2)", (USER,))
    conn.commit()
    conn.close()
    return a, b


def entries(q, db_path):
    rows = q(db_path, "SELECT id, kind, entity_id, label, path, summary, payload, images, deleted_by FROM trash_entries ORDER BY id")
    return [
        {
            "id": r[0], "kind": r[1], "entity_id": r[2], "label": r[3], "path": r[4],
            "summary": json.loads(r[5]), "payload": json.loads(r[6]), "images": json.loads(r[7]),
            "deleted_by": r[8],
        }
        for r in rows
    ]


def ids(payload, table):
    return sorted(r["id"] for r in payload.get(table, []))


def test_ensure_trash_table_idempotent(db_path):
    conn = sqlite3.connect(db_path)
    ensure_trash_table(conn)
    ensure_trash_table(conn)
    conn.close()


def test_room_snapshot_whole_tree(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    count, _, trash_id = repository.delete_room(db_path, a["room_id"], USER)
    assert count == 1
    [e] = entries(q, db_path)
    assert e["id"] == trash_id
    assert (e["kind"], e["entity_id"], e["label"], e["path"], e["deleted_by"]) == ("room", a["room_id"], "R1", None, USER)
    p = e["payload"]
    assert ids(p, "rooms") == [a["room_id"]]
    assert ids(p, "cupboards") == [a["cupboard_id"]]
    assert ids(p, "shelves") == [a["shelf_id"]]
    assert ids(p, "organizers") == [a["organizer_id"]]
    assert len(p["item_locations"]) == 2
    assert ids(p, "items_master") == [1]  # master 2 keeps its R2 location
    assert [r["barcode"] for r in p["item_variant_barcodes"]] == ["111"]
    assert [(r["user_id"], r["item_id"]) for r in p["item_favorites"]] == [(USER, 1)]
    assert set(e["images"]) == {"room.jpg", "cup.jpg", "shelf.jpg", "org.jpg", "l1.jpg", "l2a.jpg", "m1.jpg"}
    assert e["summary"] == {"cupboards": 1, "shelves": 1, "organizers": 1, "locations": 2, "items": 1, "images": 7}
    # Restore order is parents first
    assert list(p) == [t for t in repository.TRASH_TABLES if t in p]


def test_full_rows_captured(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    before = q(db_path, "SELECT * FROM item_locations WHERE item_id = 1")
    repository.hard_delete_organizer(db_path, a["organizer_id"], USER)
    [e] = entries(q, db_path)
    [loc] = e["payload"]["item_locations"]
    assert tuple(loc.values()) == before[0]
    assert loc["variant"] == "red" and json.loads(loc["expiration_dates"])[0]["quantity"] == 3


@pytest.mark.parametrize("kind", ["room", "cupboard", "shelf", "organizer", "item_master", "item_location"])
def test_each_kind_creates_one_entry(db_path, seed, q, kind):
    a, _ = _setup(db_path, seed)
    l1 = q(db_path, "SELECT id FROM item_locations WHERE item_id = 1")[0][0]
    calls = {
        "room": (lambda: repository.delete_room(db_path, a["room_id"], USER)[2], a["room_id"], "R1", None),
        "cupboard": (lambda: repository.delete_cupboard(db_path, a["cupboard_id"], USER)[2], a["cupboard_id"], "C1", "R1"),
        "shelf": (lambda: repository.delete_shelf(db_path, a["shelf_id"], USER)[2], a["shelf_id"], "S1", "R1 / C1"),
        "organizer": (lambda: repository.hard_delete_organizer(db_path, a["organizer_id"], USER)[4], a["organizer_id"], "O1", "R1 / C1 / S1"),
        "item_master": (lambda: repository.delete_item_master(db_path, 2, USER)[4], 2, "both", None),
        "item_location": (lambda: repository.delete_item_location(db_path, l1, USER)[3], l1, "only (red)", "R1 / C1 / S1 / O1"),
    }
    fn, entity_id, label, path = calls[kind]
    pv = repository.delete_preview(db_path, kind, entity_id)
    trash_id = fn()
    [e] = entries(q, db_path)
    assert e["id"] == trash_id
    assert (e["kind"], e["entity_id"], e["label"], e["path"]) == (kind, entity_id, label, path)
    assert e["summary"] == {k: v for k, v in pv.items() if k != "locations_list"}


def test_item_master_snapshot(db_path, seed, q):
    _setup(db_path, seed)
    repository.delete_item_master(db_path, 2, USER)
    [e] = entries(q, db_path)
    p = e["payload"]
    assert ids(p, "items_master") == [2]
    assert len(p["item_locations"]) == 2
    assert [r["barcode"] for r in p["item_variant_barcodes"]] == ["222"]
    assert [r["item_id"] for r in p["item_favorites"]] == [2]
    assert set(e["images"]) == {"l2a.jpg", "l2b.jpg", "m2.jpg"}


def test_item_location_not_last_keeps_master(db_path, seed, q):
    _setup(db_path, seed)
    l2a = q(db_path, "SELECT id FROM item_locations WHERE image = 'l2a.jpg'")[0][0]
    repository.delete_item_location(db_path, l2a, USER)
    [e] = entries(q, db_path)
    assert ids(e["payload"], "item_locations") == [l2a]
    assert "items_master" not in e["payload"]
    assert e["images"] == ["l2a.jpg"]
    assert q(db_path, "SELECT COUNT(*) FROM item_variant_barcodes WHERE item_id = 2")[0][0] == 1


def test_item_location_last_removes_variant_barcodes(db_path, seed, q):
    _setup(db_path, seed)
    l1 = q(db_path, "SELECT id FROM item_locations WHERE item_id = 1")[0][0]
    repository.delete_item_location(db_path, l1, USER)
    assert q(db_path, "SELECT COUNT(*) FROM item_variant_barcodes WHERE item_id = 1")[0][0] == 0
    [e] = entries(q, db_path)
    assert [r["barcode"] for r in e["payload"]["item_variant_barcodes"]] == ["111"]
    assert ids(e["payload"], "items_master") == [1]


def test_not_found_creates_no_entry(db_path, q):
    assert repository.delete_room(db_path, 999, USER)[2] is None
    assert repository.delete_item_master(db_path, 999, USER)[4] is None
    assert repository.delete_item_location(db_path, 999, USER)[3] is None
    assert repository.hard_delete_organizer(db_path, 999, USER)[4] is None
    assert entries(q, db_path) == []


def test_room_delete_is_atomic(db_path, seed, q, monkeypatch):
    a, _ = _setup(db_path, seed)

    def boom(*args, **kwargs):
        raise RuntimeError("forced")

    monkeypatch.setattr(repository, "_cascade_delete_locations", boom)
    with pytest.raises(RuntimeError):
        repository.delete_room(db_path, a["room_id"], USER)
    assert entries(q, db_path) == []
    assert q(db_path, "SELECT COUNT(*) FROM rooms WHERE id = ?", (a["room_id"],))[0][0] == 1


def test_item_master_delete_is_atomic(db_path, seed, q, monkeypatch):
    _setup(db_path, seed)

    def boom(*args, **kwargs):
        raise RuntimeError("forced")

    monkeypatch.setattr(repository, "_delete_favorites", boom)
    count, _, _, err, trash_id = repository.delete_item_master(db_path, 2, USER)
    assert (count, trash_id) == (0, None) and "forced" in err
    assert entries(q, db_path) == []
    assert q(db_path, "SELECT COUNT(*) FROM item_locations WHERE item_id = 2")[0][0] == 2


def test_trash_images_protected_from_replace(db_path, seed):
    a, _ = _setup(db_path, seed)
    assert repository.count_default_image_refs(db_path, "l1.jpg") == 0
    repository.delete_room(db_path, a["room_id"], USER)
    assert repository.count_default_image_refs(db_path, "l1.jpg") == 1
    assert repository.count_default_image_refs(db_path, "unrelated.jpg") == 0


def test_cascade_does_not_report_image_owned_by_other_entry(db_path, seed):
    a = seed(db_path, "R1", "C1", "S1")
    b = seed(db_path, "R2", "C2", "S2")
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (id, name) VALUES (1,'x')")
    conn.execute("INSERT INTO items_master (id, name) VALUES (2,'y')")
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (1,?,1,'shared.jpg')", (a["shelf_id"],))
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (2,?,1,'shared.jpg')", (b["shelf_id"],))
    conn.commit()
    conn.close()
    _, images, _ = repository.delete_room(db_path, a["room_id"], USER)
    assert images == []  # still used by the R2 location
    _, images, _ = repository.delete_room(db_path, b["room_id"], USER)
    assert images == []  # still owned by the first bin entry


# ---------------------------------------------------------------- restore / purge

TABLES = (
    "rooms", "cupboards", "shelves", "organizers", "items_master",
    "item_locations", "item_variant_barcodes", "item_favorites",
)


def dump(q, db_path):
    return {t: q(db_path, f"SELECT * FROM {t} ORDER BY 1, 2") for t in TABLES}


def query_one(db_path, sql):
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute(sql).fetchone()[0]
    finally:
        conn.close()


def _delete(db_path, a, kind):
    l1 = query_one(db_path, "SELECT id FROM item_locations WHERE item_id = 1")
    return {
        "room": lambda: repository.delete_room(db_path, a["room_id"], USER),
        "cupboard": lambda: repository.delete_cupboard(db_path, a["cupboard_id"], USER),
        "shelf": lambda: repository.delete_shelf(db_path, a["shelf_id"], USER),
        "organizer": lambda: repository.hard_delete_organizer(db_path, a["organizer_id"], USER),
        "item_master": lambda: repository.delete_item_master(db_path, 2, USER),
        "item_location": lambda: repository.delete_item_location(db_path, l1, USER),
    }[kind]()[-1]


@pytest.mark.parametrize("kind", ["room", "cupboard", "shelf", "organizer", "item_master", "item_location"])
def test_delete_restore_round_trip(db_path, seed, q, kind):
    a, _ = _setup(db_path, seed)
    before = dump(q, db_path)
    trash_id = _delete(db_path, a, kind)
    assert dump(q, db_path) != before
    result = repository.restore_trash_entry(db_path, trash_id)
    assert result["restored"] == kind and result["warnings"] == []
    assert dump(q, db_path) == before
    assert q(db_path, "SELECT COUNT(*) FROM trash_entries")[0][0] == 0


def test_restore_unknown(db_path):
    assert repository.restore_trash_entry(db_path, 99) == {"error": "not_found"}


def test_restore_cupboard_brings_content_back(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_cupboard(db_path, a["cupboard_id"], USER)[2]
    repository.restore_trash_entry(db_path, tid)
    assert q(db_path, "SELECT COUNT(*) FROM shelves WHERE cupboard_id = ?", (a["cupboard_id"],))[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM organizers")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM item_locations")[0][0] == 3
    assert q(db_path, "SELECT COUNT(*) FROM item_favorites")[0][0] == 2


def test_parent_missing_changes_nothing(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    cup_tid = repository.delete_cupboard(db_path, a["cupboard_id"], USER)[2]
    room_tid = repository.delete_room(db_path, a["room_id"], USER)[2]
    before = dump(q, db_path)
    result = repository.restore_trash_entry(db_path, cup_tid)
    assert result["error"] == "parent_missing"
    assert (result["parent_table"], result["parent_id"]) == ("rooms", a["room_id"])
    assert (result["parent_trash_id"], result["parent_label"]) == (room_tid, "R1")
    assert dump(q, db_path) == before
    assert q(db_path, "SELECT COUNT(*) FROM trash_entries")[0][0] == 2
    # restoring the parent first unblocks it
    assert "error" not in repository.restore_trash_entry(db_path, room_tid)
    assert "error" not in repository.restore_trash_entry(db_path, cup_tid)


def test_parent_missing_without_bin_entry(db_path, seed):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_shelf(db_path, a["shelf_id"], USER)[2]
    conn = sqlite3.connect(db_path)
    conn.execute("DELETE FROM cupboards WHERE id = ?", (a["cupboard_id"],))
    conn.commit()
    conn.close()
    result = repository.restore_trash_entry(db_path, tid)
    assert result["error"] == "parent_missing" and result["parent_trash_id"] is None


def test_restore_location_whose_master_is_in_bin(db_path, seed):
    _setup(db_path, seed)
    l2a = query_one(db_path, "SELECT id FROM item_locations WHERE image = 'l2a.jpg'")
    loc_tid = repository.delete_item_location(db_path, l2a, USER)[3]
    master_tid = repository.delete_item_master(db_path, 2, USER)[4]
    result = repository.restore_trash_entry(db_path, loc_tid)
    assert (result["error"], result["parent_table"], result["parent_trash_id"]) == (
        "parent_missing", "items_master", master_tid)


def test_name_conflicts_get_suffix(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_room(db_path, a["room_id"], USER)[2]
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO rooms (name) VALUES ('R1')")
    conn.execute("INSERT INTO rooms (name) VALUES ('R1 (2)')")
    conn.commit()
    conn.close()
    result = repository.restore_trash_entry(db_path, tid)
    assert q(db_path, "SELECT name FROM rooms WHERE id = ?", (a["room_id"],))[0][0] == "R1 (3)"
    assert result["warnings"] == [{"code": "renamed", "table": "rooms", "from": "R1", "to": "R1 (3)"}]


def test_shelf_name_conflict_is_per_parent(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_shelf(db_path, a["shelf_id"], USER)[2]
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO shelves (name, cupboard_id) VALUES ('S1', ?)", (a["cupboard_id"],))
    conn.commit()
    conn.close()
    repository.restore_trash_entry(db_path, tid)
    assert q(db_path, "SELECT name FROM shelves WHERE id = ?", (a["shelf_id"],))[0][0] == "S1 (2)"


def test_master_name_taken_attaches_to_newer_master(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_room(db_path, a["room_id"], USER)[2]  # master 1 'only' goes to the bin
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (id, name) VALUES (50, 'only')")
    conn.commit()
    conn.close()
    result = repository.restore_trash_entry(db_path, tid)
    assert result["warnings"] == [{"code": "item_merged", "name": "only"}]
    assert q(db_path, "SELECT COUNT(*) FROM items_master WHERE name = 'only'")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM item_locations WHERE item_id = 50")[0][0] == 1
    assert q(db_path, "SELECT item_id FROM item_favorites WHERE user_id = ? AND item_id = 50", (USER,))
    assert q(db_path, "SELECT barcode FROM item_variant_barcodes WHERE item_id = 50")[0][0] == "111"


def test_barcode_taken_restores_without_it(db_path, seed, q):
    _setup(db_path, seed)
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE items_master SET barcode = '999' WHERE id = 2")
    conn.commit()
    conn.close()
    tid = repository.delete_item_master(db_path, 2, USER)[4]
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name, barcode) VALUES ('other', '999')")
    conn.commit()
    conn.close()
    result = repository.restore_trash_entry(db_path, tid)
    assert q(db_path, "SELECT barcode FROM items_master WHERE id = 2")[0][0] is None
    assert result["warnings"] == [{"code": "barcode_dropped", "name": "both", "barcode": "999"}]


def test_variant_barcode_taken_is_skipped(db_path, seed, q):
    _setup(db_path, seed)
    tid = repository.delete_item_master(db_path, 2, USER)[4]
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (id, name, barcode) VALUES (60, 'other', '222')")
    conn.commit()
    conn.close()
    result = repository.restore_trash_entry(db_path, tid)
    assert q(db_path, "SELECT COUNT(*) FROM item_variant_barcodes WHERE item_id = 2")[0][0] == 0
    assert result["warnings"] == [{"code": "variant_barcode_skipped", "variant": "v", "barcode": "222"}]


def test_restore_is_atomic(db_path, seed, q, monkeypatch):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_room(db_path, a["room_id"], USER)[2]
    before = dump(q, db_path)
    real = repository._insert_row
    calls = {"n": 0}

    def boom(cur, table, row):
        calls["n"] += 1
        if calls["n"] == 4:
            raise RuntimeError("boom")
        return real(cur, table, row)

    monkeypatch.setattr(repository, "_insert_row", boom)
    with pytest.raises(RuntimeError):
        repository.restore_trash_entry(db_path, tid)
    assert dump(q, db_path) == before
    assert q(db_path, "SELECT COUNT(*) FROM trash_entries")[0][0] == 1


def test_list_trash_expiry(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    t1 = repository.delete_shelf(db_path, a["shelf_id"], USER)[2]
    t2 = repository.delete_cupboard(db_path, a["cupboard_id"], USER)[2]
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE trash_entries SET deleted_at = '2026-01-01 10:00:00' WHERE id = ?", (t1,))
    conn.execute("UPDATE trash_entries SET deleted_at = '2026-01-02 10:00:00' WHERE id = ?", (t2,))
    conn.commit()
    conn.close()
    listing = repository.list_trash(db_path, 3)
    assert [e["id"] for e in listing] == [t2, t1]  # newest first
    assert listing[0]["expires_at"] == "2026-01-05T10:00:00Z"
    assert listing[0]["deleted_at"] == "2026-01-02T10:00:00Z"
    assert (listing[1]["kind"], listing[1]["label"], listing[1]["path"]) == ("shelf", "S1", "R1 / C1")


def test_purge_by_id_returns_unreferenced_images(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    l2a = query_one(db_path, "SELECT id FROM item_locations WHERE image = 'l2a.jpg'")
    t_loc = repository.delete_item_location(db_path, l2a, USER)[3]
    t_room = repository.delete_room(db_path, a["room_id"], USER)[2]
    assert repository.purge_trash(db_path, trash_id=t_loc) == ["l2a.jpg"]
    assert repository.purge_trash(db_path, trash_id=t_loc) == []  # already gone
    images = repository.purge_trash(db_path, trash_id=t_room)
    assert set(images) == {"room.jpg", "cup.jpg", "shelf.jpg", "org.jpg", "l1.jpg", "m1.jpg"}


def test_purge_keeps_images_still_referenced(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    tid = repository.delete_room(db_path, a["room_id"], USER)[2]
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name, default_image) VALUES ('live', 'room.jpg')")  # live ref
    conn.execute("UPDATE item_locations SET image = 'l1.jpg' WHERE image = 'l2b.jpg'")  # shared with the room entry
    conn.commit()
    conn.close()
    other = repository.delete_item_master(db_path, 2, USER)[4]
    images = repository.purge_trash(db_path, trash_id=tid)
    assert "room.jpg" not in images and "cup.jpg" in images
    assert "l1.jpg" not in images  # still owned by the remaining entry
    assert "l1.jpg" in repository.purge_trash(db_path, trash_id=other)


def test_purge_older_than_and_all(db_path, seed, q):
    from datetime import datetime
    a, _ = _setup(db_path, seed)
    old = repository.delete_shelf(db_path, a["shelf_id"], USER)[2]
    new = repository.delete_item_master(db_path, 2, USER)[4]
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE trash_entries SET deleted_at = '2026-01-01 00:00:00' WHERE id = ?", (old,))
    conn.commit()
    conn.close()
    images = repository.purge_trash(db_path, older_than=datetime(2026, 6, 1))
    assert "shelf.jpg" in images
    assert [r[0] for r in q(db_path, "SELECT id FROM trash_entries")] == [new]
    assert repository.purge_trash(db_path) == []  # no criteria -> nothing
    assert "m2.jpg" in repository.purge_trash(db_path, all=True)
    assert q(db_path, "SELECT COUNT(*) FROM trash_entries")[0][0] == 0
