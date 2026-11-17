import sqlite3, logging, os, json
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from functools import partial
from ..const import DOMAIN
from ..db import repository, devreload

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

        devreload.reload_if_changed(repository)
        add_total_qty, add_batch_qty, batch_date = repository.normalize_batch_input(quantity, exp_obj)
        _LOGGER.debug(f"[ITEM CREATE] After add_total_qty={add_total_qty}, add_batch_qty={add_batch_qty}, batch_date={batch_date}")

        insert = partial(
            repository.create_item_location,
            self.db_path,
            room=room,
            cupboard=cupboard,
            shelf=shelf,
            organizer=organizer,
            name=name,
            aliases=aliases,
            image=image,
            barcode=barcode,
            min_quantity=min_quantity,
            track_quantity=track_quantity,
            exp_obj=exp_obj,
            add_total_qty=add_total_qty,
            add_batch_qty=add_batch_qty,
            batch_date=batch_date,
        )


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

            devreload.reload_if_changed(repository)
            update_item = partial(
                repository.update_item,
                self.db_path,
                item_id,
                data,
                location_id=location_id,
                name=name,
                aliases=aliases,
                barcode=barcode,
                new_image=new_image,
                min_quantity=min_quantity,
                track_quantity=track_quantity,
                expiration_dates=expiration_dates,
                new_room=new_room,
                new_cupboard=new_cupboard,
                new_shelf=new_shelf,
                new_organizer=new_organizer,
            )

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
                devreload.reload_if_changed(repository)
                check_low_stock = partial(repository.get_low_stock_info, self.db_path, location_id)

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

            devreload.reload_if_changed(repository)
            delete_location = partial(repository.delete_item_location, self.db_path, location_id)

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

            devreload.reload_if_changed(repository)
            update_master = partial(
                repository.update_item_master, self.db_path, item_id, data,
                name=name, aliases=aliases, barcode=barcode,
                default_image=default_image, min_quantity=min_quantity,
            )

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

            devreload.reload_if_changed(repository)
            delete_master = partial(repository.delete_item_master, self.db_path, item_id)

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