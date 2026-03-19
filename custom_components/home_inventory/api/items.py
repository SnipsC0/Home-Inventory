import sqlite3, logging, os, json
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# ============================================================================
# API VIEW CLASSES
# ============================================================================

class HomeInventarItemsView(HomeAssistantView):
    """API pentru vizualizarea și crearea itemelor"""
    url = f"/api/{DOMAIN}/items"
    name = f"api:{DOMAIN}_items"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        """Șterge fizic fișierul imaginii de pe disk"""
        if not image_path:
            return
        
        try:
            if image_path.startswith(f'/api/{DOMAIN}/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                return
            else:
                filename = image_path
            
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.info(f"[HomeInventar] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[HomeInventar] Image file not found: {full_path}")
                
        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting image file: {e}", exc_info=True)

    async def get(self, request):
        """Obține itemele dintr-o locație specifică sau toate itemele unui item master"""
        room = request.query.get("room")
        cupboard = request.query.get("cupboard")
        shelf = request.query.get("shelf")
        organizer = request.query.get("organizer") 
        item_id = request.query.get("item_id")  # Nou: caută toate locațiile unui item
        
        # Dacă avem item_id, returnăm toate locațiile acelui item
        if item_id:
            def fetch_item_locations():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                cur.execute('''
                    SELECT 
                        il.id as location_id,
                        im.id as item_id,
                        im.name,
                        im.default_image,
                        im.barcode,
                        im.min_quantity,
                        im.track_quantity,
                        im.aliases,
                        il.quantity,
                        il.expiration_dates,
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
                        "organizer": r[13]
                    }
                    result.append(item)
                
                return result

            data = await request.app["hass"].async_add_executor_job(fetch_item_locations)
            return web.json_response(data)
        
        # Altfel, returnăm itemele dintr-o locație specifică
        if not room or not cupboard or not shelf:
            return web.json_response({"error": "Missing params"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            if organizer:
                cur.execute('''
                    SELECT 
                        il.id as location_id,
                        im.id as item_id,
                        im.name,
                        im.default_image,
                        im.barcode,
                        im.min_quantity,
                        im.track_quantity,
                        im.aliases,
                        il.quantity,
                        il.expiration_dates,
                        r.name as room_name,
                        c.name as cupboard_name,
                        s.name as shelf_name,
                        o.name as organizer_name
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
                        im.default_image,
                        im.barcode,
                        im.min_quantity,
                        im.track_quantity,
                        im.aliases,
                        il.quantity,
                        il.expiration_dates,
                        r.name as room_name,
                        c.name as cupboard_name,
                        s.name as shelf_name,
                        NULL as organizer_name
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
                    "location": location
                }
                _LOGGER.debug(f"Item fetched - Location ID: {r[0]}, Item ID: {r[1]}, Name: {r[2]}, Location: '{location}'")
                result.append(item)
            
            return result

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

    async def post(self, request):
        
        data = await request.json()

        # 1) Extract & normalize
        room = (data.get("room") or "").strip()
        cupboard = (data.get("cupboard") or "").strip()
        shelf = (data.get("shelf") or "").strip()
        organizer = (data.get("organizer") or None) or None
        if isinstance(organizer, str):
            organizer = organizer.strip() or None

        name = (data.get("name") or "").strip()
        aliases = (data.get("aliases") or None)
        if isinstance(aliases, str):
            aliases = aliases.strip() or None
        image = data.get("image") or None
        barcode = (data.get("barcode") or None)
        if isinstance(barcode, str):
            barcode = barcode.strip() or None

        # numeric fields
        quantity = data.get("quantity")
        min_quantity = data.get("min_quantity")
        track_quantity = bool(data.get("track_quantity", False))

        # new single object: {"quantity": X, "date": "YYYY-MM-DD"} or None
        exp_obj = data.get("expiration_date")

        if isinstance(exp_obj, str):
            try:
                exp_obj = json.loads(exp_obj)
            except Exception:
                exp_obj = None

        _LOGGER.debug(f"[ITEM CREATE] All data input: {data}")

        # If not tracking, quantities/expiration are cleared
        if not track_quantity:
            quantity = None
            min_quantity = None
            exp_obj = None

        # Basic validation
        if not all([room, cupboard, shelf]):
            return web.json_response(
                {"error": "Missing required location params (room, cupboard, shelf)."},
                status=400
            )
        if not name and not barcode:
            return web.json_response(
                {"error": "Either 'name' or 'barcode' must be provided."},
                status=400
            )

        _LOGGER.debug(f"[ITEM CREATE] Processing item: Barcode={barcode}, Name={name}, Aliases={aliases}")

        def _normalize_batch_input(quantity, exp_obj):
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

        add_total_qty, add_batch_qty, batch_date = _normalize_batch_input(quantity, exp_obj)
        _LOGGER.debug(f"[ITEM CREATE] After add_total_qty={add_total_qty}, add_batch_qty={add_batch_qty}, batch_date={batch_date}")

        def insert():
            conn = sqlite3.connect(self.db_path)
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

                # Helper: safely load expiration list
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

                return (locals().get("location_id"), master_item_id), None

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

        # 4) Execute in executor, return response
        try:
            result, error = await request.app["hass"].async_add_executor_job(insert)
            if error:
                return web.json_response({"error": error}, status=400)

            location_id, master_item_id = result
            return web.json_response({
                "status": "success",
                "message": "Item location created or updated successfully.",
                "location_id": location_id,
                "item_id": master_item_id,
                "name": name
            })
        except Exception as e:
            _LOGGER.error(f"[ITEM CREATE] Fatal thread error: {e}", exc_info=True)
            return web.json_response({"error": "Internal server error during item processing."}, status=500)
class HomeInventarItemView(HomeAssistantView):
    """API pentru modificarea și ștergerea itemelor"""
    url = f"/api/{DOMAIN}/items/{'{item_id}'}"
    name = f"api:{DOMAIN}_item"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        if not image_path:
            return
        
        try:
            if image_path.startswith(f'/api/{DOMAIN}/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                return
            else:
                filename = image_path
            
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.debug(f"[HomeInventar] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[HomeInventar] Image file not found: {full_path}")
                
        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting image file: {e}", exc_info=True)

    async def patch(self, request, item_id):
        """Update item details with smart master item merging/splitting logic"""
        try:
            data = await request.json()
            _LOGGER.debug(f"[ITEM PATCH] item {item_id} - received data: {data}")

            location_id = data.get("location_id")
            name = data.get("name")
            aliases = data.get("aliases")
            barcode = data.get("barcode")
            new_image = data.get("image")
            min_quantity = data.get("min_quantity") if "min_quantity" in data else None
            track_quantity = data.get("track_quantity")
            expiration_dates = data.get("expiration_dates")

            # Location move parameters
            new_room = data.get("room")
            new_cupboard = data.get("cupboard")
            new_shelf = data.get("shelf")
            new_organizer = data.get("organizer")

            # Validation: track_quantity
            if track_quantity is not None and not track_quantity:
                min_quantity = None
                expiration_dates = None

            # Validation: min_quantity >= 0
            if min_quantity is not None and min_quantity < 0:
                return web.json_response({"error": "min_quantity must be >= 0"}, status=400)

            def update_item():
                conn = sqlite3.connect(self.db_path)
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

            count, old_images, error = await request.app["hass"].async_add_executor_job(update_item)

            if error:
                return web.json_response({"error": error}, status=400)

            if count == 0:
                return web.json_response({"error": "Item not found"}, status=404)

            # Clean up old images
            for old_image in old_images:
                if old_image:
                    self._delete_image_file(old_image)
                    _LOGGER.debug(f"[ITEM PATCH] Old image cleaned: {old_image}")

            # Check low stock
            if expiration_dates is not None and location_id:
                def check_low_stock():
                    conn = sqlite3.connect(self.db_path)
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

                low_stock_data = await request.app["hass"].async_add_executor_job(check_low_stock)

                if low_stock_data:
                    _LOGGER.debug(
                        f"🔔 Low stock detected for item {low_stock_data['item_id']}: "
                        f"{low_stock_data['name']} ({low_stock_data['quantity']}/{low_stock_data['min_quantity']}) "
                        f"at {low_stock_data['location']}"
                    )
                    request.app["hass"].bus.async_fire(
                        "home_inventory_low_stock",
                        low_stock_data
                    )

            return web.json_response({"message": "Updated"})

        except Exception as e:
            _LOGGER.error(f"Error updating item: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request, item_id):
        try:
            # item_id from URL path is actually location_id
            location_id = item_id
            _LOGGER.info(f"[ITEM DELETE] Deleting location {location_id}")

            def delete_location():
                conn = sqlite3.connect(self.db_path)
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

            count, images, error = await request.app["hass"].async_add_executor_job(delete_location)

            if error:
                return web.json_response({"error": error}, status=400)

            if count == 0:
                return web.json_response({"error": "Location not found"}, status=404)

            # Clean up images
            for image in images:
                if image:
                    self._delete_image_file(image)
                    _LOGGER.debug(f"[ITEM DELETE] Image deleted: {image}")

            return web.json_response({"message": "Location deleted successfully"})

        except Exception as e:
            _LOGGER.error(f"Error deleting location: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

class HomeInventarItemMasterView(HomeAssistantView):
    url = f"/api/{DOMAIN}/items_master"
    name = f"api:{DOMAIN}_items_master"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def get(self, request):
        search = request.query.get("search", "").strip()
        barcode = request.query.get("barcode", "").strip()
        
        def fetch():
            conn = sqlite3.connect(self.db_path)
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
                conditions.append("im.barcode = ?")
                params.append(barcode)
            
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

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)


class HomeInventarItemMasterUpdateView(HomeAssistantView):
    """API pentru modificarea unui item master"""
    url = f"/api/{DOMAIN}/items_master/{'{item_id}'}"
    name = f"api:{DOMAIN}_items_master_update"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        if not image_path:
            return

        try:
            if image_path.startswith(f'/api/{DOMAIN}/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                return
            else:
                filename = image_path

            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")

            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.debug(f"[HomeInventar] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[HomeInventar] Image file not found: {full_path}")

        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting image file: {e}", exc_info=True)

    async def patch(self, request, item_id):
        """Update item master details"""
        try:
            data = await request.json()
            _LOGGER.debug(f"[ITEM_MASTER PATCH] item {item_id} - received data: {data}")

            name = data.get("name")
            aliases = data.get("aliases")
            barcode = data.get("barcode")
            default_image = data.get("default_image")
            min_quantity = data.get("min_quantity") if "min_quantity" in data else None

            def update_master():
                conn = sqlite3.connect(self.db_path)
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

            count, old_images, error = await request.app["hass"].async_add_executor_job(update_master)

            if error:
                return web.json_response({"error": error}, status=400)

            if count == 0:
                return web.json_response({"error": "Item master not found"}, status=404)

            # Clean up old images
            for old_image in old_images:
                if old_image:
                    self._delete_image_file(old_image)
                    _LOGGER.debug(f"[ITEM_MASTER PATCH] Old image cleaned: {old_image}")

            return web.json_response({"message": "Updated"})

        except Exception as e:
            _LOGGER.error(f"Error updating item master: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request, item_id):
        """Delete item master with cascade deletion of all locations and images"""
        try:
            _LOGGER.info(f"[ITEM_MASTER DELETE] Deleting item master {item_id}")

            def delete_master():
                conn = sqlite3.connect(self.db_path)
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

            count, images, locations, error = await request.app["hass"].async_add_executor_job(delete_master)

            if error:
                return web.json_response({"error": error}, status=400)

            if count == 0:
                return web.json_response({"error": "Item master not found"}, status=404)

            # Clean up all images
            for image in images:
                if image:
                    self._delete_image_file(image)
                    _LOGGER.debug(f"[ITEM_MASTER DELETE] Image deleted: {image}")

            return web.json_response({
                "message": "Item master deleted successfully",
                "deleted_locations": len(locations)
            })

        except Exception as e:
            _LOGGER.error(f"Error deleting item master: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)