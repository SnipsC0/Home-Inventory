"""Pure SQLite data-access functions for items.

No Home Assistant / aiohttp imports here, so this module is unit-testable with
plain pytest. HTTP handlers in ``api/items.py`` call these via
``hass.async_add_executor_job``.
"""
import json
import logging
import sqlite3
from datetime import date

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
):
    """Create an item location (finding/creating its master).

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
        if sql_conditions:
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

        # D) Find existing location (only for tracked items - duplicatable items can be inserted multiple times)
        loc = None
        if track_quantity:
            cur.execute(
                '''
                SELECT id, quantity, expiration_dates
                FROM item_locations
                WHERE item_id = ? AND shelf_id = ? AND (
                    (organizer_id IS NULL AND ? IS NULL) OR (organizer_id = ?)
                )
                ''',
                (master_item_id, shelf_id, organizer_id, organizer_id)
            )
            loc = cur.fetchone()


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
                INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, expiration_dates, image)
                VALUES (?, ?, ?, ?, ?, ?)
                ''',
                (master_item_id, shelf_id, organizer_id, qty_to_store, exp_list, location_image)
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

                # Check if old master has any remaining locations
                cur.execute("SELECT COUNT(*) FROM item_locations WHERE item_id = ?", (item_id,))
                remaining = cur.fetchone()[0]

                if remaining == 0:
                    if current_image and location_id:
                        cur.execute("SELECT image FROM item_locations WHERE id = ?", (location_id,))
                        loc_img = cur.fetchone()
                        if not loc_img or loc_img[0] != current_image:
                            old_images_to_delete.append(current_image)

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

            if loc_updates:
                loc_params.append(location_id)
                loc_sql = f"UPDATE item_locations SET {', '.join(loc_updates)} WHERE id = ?"
                _LOGGER.debug(f"[ITEM PATCH] Executing: {loc_sql} with params: {loc_params}")
                cur.execute(loc_sql, loc_params)

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


def get_low_stock_info(db_path, location_id):
    """Return low-stock event payload for a location, or None."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        '''
        SELECT
            im.id, im.name, im.min_quantity, im.track_quantity, im.aliases,
            il.quantity,
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

    item_id_db, name, min_qty, track_qty, aliases, qty, room, cupboard, shelf = row

    if track_qty and qty is not None and min_qty is not None and qty > 0:
        if qty <= min_qty:
            return {
                "item_id": item_id_db,
                "name": name,
                "aliases": aliases,
                "quantity": qty,
                "min_quantity": min_qty,
                "room": room,
                "cupboard": cupboard,
                "shelf": shelf,
                "location": f"{room} / {cupboard} / {shelf}"
            }
    return None


def delete_item_location(db_path, location_id):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
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
            return 0, [], "Location not found"

        item_master_id, location_image, master_image, item_name = loc

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
            cur.execute("DELETE FROM items_master WHERE id = ?", (item_master_id,))

            conn.commit()
            _LOGGER.info(f"[ITEM DELETE] Deleted item_master {item_master_id} and location {location_id}")
            return 1, images_to_delete, None

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
            return 1, images_to_delete, None

    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM DELETE] Error: {e}\n{traceback.format_exc()}")
        return 0, [], str(e)
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


def delete_item_master(db_path, item_id):
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
            return 0, [], [], "Item master not found"

        master_name, master_image = master

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

        # Delete master item
        cur.execute("DELETE FROM items_master WHERE id = ?", (item_id,))

        conn.commit()
        _LOGGER.info(
            f"[ITEM_MASTER DELETE] Deleted item '{master_name}' (ID={item_id}) "
            f"with {len(locations)} locations"
        )

        return 1, images_to_delete, location_info, None

    except Exception as e:
        conn.rollback()
        import traceback
        _LOGGER.error(f"[ITEM_MASTER DELETE] Error: {e}\n{traceback.format_exc()}")
        return 0, [], [], str(e)
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

    # Găsim locația specifică
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

    # Actualizăm cantitatea
    cur.execute("""
        UPDATE item_locations 
        SET quantity = ?, expiration_dates = ?
        WHERE id = ?
    """, (new_quantity, _consume_from_batches(location['expiration_dates'], 1), location_id))

    conn.commit()

    # Verificăm low stock
    is_low_stock = (
        location['min_quantity'] is not None and 
        new_quantity > 0 and
        new_quantity <= location['min_quantity']
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

    is_low_stock = (
        location['min_quantity'] is not None and 
        new_quantity > 0 and
        new_quantity <= location['min_quantity']
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
        SELECT r.id, r.name, COUNT(DISTINCT il.id)
        FROM rooms r
        LEFT JOIN cupboards c ON r.id = c.room_id
        LEFT JOIN shelves s ON c.id = s.cupboard_id
        LEFT JOIN item_locations il ON s.id = il.shelf_id
        GROUP BY r.id, r.name
        ORDER BY r.name
    ''')
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "itemCount": r[2]} for r in rows]


def create_room(db_path, name):
    """Raises sqlite3.IntegrityError if the name already exists."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("INSERT INTO rooms (name) VALUES (?)", (name,))
    conn.commit()
    rid = cur.lastrowid
    conn.close()
    return rid


def update_room(db_path, room_id, name):
    """Returns rowcount. Raises sqlite3.IntegrityError on duplicate name."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    _LOGGER.info(f"Updating room {room_id} to name: {name}")
    cur.execute("UPDATE rooms SET name = ? WHERE id = ?", (name, room_id))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return count


def delete_room(db_path, room_id):
    """Returns (rowcount, images_to_delete)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    images_to_delete = []

    cur.execute('''
        SELECT image FROM cupboards 
        WHERE room_id = ? AND image IS NOT NULL AND image != ''
    ''', (room_id,))
    images_to_delete.extend([row[0] for row in cur.fetchall()])

    cur.execute('''
        SELECT il.image FROM item_locations il
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        WHERE c.room_id = ? AND il.image IS NOT NULL AND il.image != ''
    ''', (room_id,))
    images_to_delete.extend([row[0] for row in cur.fetchall()])

    cur.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
    conn.commit()
    count = cur.rowcount
    conn.close()

    return count, images_to_delete


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


def delete_cupboard(db_path, cupboard_id):
    """Returns (rowcount, images_to_delete)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    images_to_delete = []

    cur.execute('''
        SELECT image FROM cupboards
        WHERE id = ? AND image IS NOT NULL AND image != ''
    ''', (cupboard_id,))
    row = cur.fetchone()
    if row:
        images_to_delete.append(row[0])

    cur.execute('''
        SELECT il.image FROM item_locations il
        JOIN shelves s ON il.shelf_id = s.id
        WHERE s.cupboard_id = ? AND il.image IS NOT NULL AND il.image != ''
    ''', (cupboard_id,))
    images_to_delete.extend([row[0] for row in cur.fetchall()])

    cur.execute("DELETE FROM cupboards WHERE id = ?", (cupboard_id,))
    conn.commit()
    count = cur.rowcount
    conn.close()

    return count, images_to_delete


# --------------------------------------------------------------- shelves


def list_shelves(db_path, room, cupboard):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT s.id, s.name, COUNT(DISTINCT o.id), COUNT(DISTINCT il.id)
        FROM shelves s
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        LEFT JOIN organizers o ON s.id = o.shelf_id
        LEFT JOIN item_locations il ON s.id = il.shelf_id
        WHERE r.name = ? AND c.name = ?
        GROUP BY s.id, s.name
        ORDER BY s.name
    ''', (room, cupboard))
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "organizerCount": r[2], "itemCount": r[3]} for r in rows]


def create_shelf(db_path, room, cupboard, name):
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

    cur.execute("INSERT INTO shelves (name, cupboard_id) VALUES (?, ?)", (name, cupboard_id))
    conn.commit()
    shelf_id = cur.lastrowid
    conn.close()
    return shelf_id


def update_shelf(db_path, shelf_id, name):
    """Returns rowcount. Raises IntegrityError on duplicate name."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    _LOGGER.info(f"Updating shelf {shelf_id} to name: {name}")
    cur.execute("UPDATE shelves SET name = ? WHERE id = ?", (name, shelf_id))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return count


def delete_shelf(db_path, shelf_id):
    """Returns (rowcount, images_to_delete)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT image FROM item_locations
        WHERE shelf_id = ? AND image IS NOT NULL AND image != ''
    ''', (shelf_id,))
    images_to_delete = [row[0] for row in cur.fetchall()]

    cur.execute("DELETE FROM shelves WHERE id = ?", (shelf_id,))
    conn.commit()
    count = cur.rowcount
    conn.close()

    return count, images_to_delete


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


def hard_delete_organizer(db_path, organizer_id):
    """Returns (deleted, organizer_image, item_images, items_deleted_count)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
    org_row = cur.fetchone()
    organizer_image = org_row[0] if org_row else None

    cur.execute("SELECT id, image FROM item_locations WHERE organizer_id = ?", (organizer_id,))
    items_to_delete = cur.fetchall()

    cur.execute("DELETE FROM item_locations WHERE organizer_id = ?", (organizer_id,))

    cur.execute("DELETE FROM organizers WHERE id = ?", (organizer_id,))
    conn.commit()
    deleted_organizer = cur.rowcount > 0

    conn.close()

    item_images = [img for (_, img) in items_to_delete]
    return deleted_organizer, organizer_image, item_images, len(items_to_delete)


# ------------------------------------------------------------- all_items


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
            o.name as organizer_name
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
        conditions.append("im.barcode = ?")
        params.append(barcode)

    if low_stock_only:
        conditions.append("im.track_quantity = 1 AND il.quantity IS NOT NULL AND im.min_quantity IS NOT NULL AND il.quantity <= im.min_quantity")

    if expired_only:
        conditions.append("il.expiration_dates IS NOT NULL")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY im.name, il.created_at DESC"

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    # Grupăm rezultatele după item
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
                "total_quantity": 0
            }

        # Adăugăm locația dacă există
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
                "room": r[11],
                "cupboard": r[12],
                "shelf": r[13],
                "organizer": r[14],
                "location": location,
                "is_low_stock": bool(r[5] and r[8] is not None and r[4] is not None and r[8] <= r[4]),
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

    # Update pentru item_locations
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

    # Update pentru items_master
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
    """Low-stock payload after a quantity PATCH (qty <= min, no `qty > 0` guard)."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('''
        SELECT
            im.id, im.name, im.min_quantity, im.track_quantity, im.aliases,
            il.quantity,
            r.name as room_name, c.name as cupboard_name, s.name as shelf_name
        FROM item_locations il
        JOIN items_master im ON il.item_id = im.id
        JOIN shelves s ON il.shelf_id = s.id
        JOIN cupboards c ON s.cupboard_id = c.id
        JOIN rooms r ON c.room_id = r.id
        WHERE il.id = ?
    ''', (location_id,))

    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    item_id_db, name, min_qty, track_qty, aliases, qty, room, cupboard, shelf = row

    if track_qty and qty is not None and min_qty is not None:
        if qty <= min_qty:
            return {
                "item_id": item_id_db,
                "name": name,
                "aliases": aliases,
                "quantity": qty,
                "min_quantity": min_qty,
                "room": room,
                "cupboard": cupboard,
                "shelf": shelf,
                "location": f"{room} / {cupboard} / {shelf}"
            }
    return None


def search_items(db_path, query, barcode):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    if barcode:
        # Căutare exactă după barcode
        cur.execute('''
            SELECT
                im.id, im.name, im.default_image, im.barcode, im.aliases,
                COUNT(DISTINCT il.id) as location_count,
                COALESCE(SUM(il.quantity), 0) as total_quantity
            FROM items_master im
            LEFT JOIN item_locations il ON im.id = il.item_id
            WHERE im.barcode = ?
            GROUP BY im.id
        ''', (barcode,))
    else:
        # Căutare fuzzy după nume sau alias
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
    conn.close()

    return [{
        "id": r[0],
        "name": r[1],
        "image": r[2] if r[2] else "",
        "barcode": r[3],
        "aliases": r[4],
        "location_count": r[5],
        "total_quantity": r[6]
    } for r in rows]


# ---------------------------------------------------------------- upload


def count_default_image_refs(db_path, filename):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM items_master WHERE default_image LIKE ?",
        (f'%{filename}%',)
    )
    count = cursor.fetchone()[0]
    conn.close()
    return count
