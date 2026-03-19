from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import sqlite3
import logging
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class HomeInventarConsumeView(HomeAssistantView):
    """Consumă un item dintr-o locație specifică"""
    url = f"/api/{DOMAIN}/consume/{'{item_id}'}"
    name = f"api:{DOMAIN}:consume"
    requires_auth = True

    def __init__(self, hass, db_path):
        self.hass = hass
        self.db_path = db_path

    async def post(self, request, item_id):
        try:
            data = await request.json()
            location_id = data.get("location_id")  # Nou: specificăm locația
            
            if not location_id:
                return web.json_response(
                    {"error": "location_id required"}, 
                    status=400
                )
            
            def consume_item():
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                
                # Găsim locația specifică
                cur.execute("""
                    SELECT 
                        il.id as location_id,
                        il.quantity,
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
                    SET quantity = ? 
                    WHERE id = ?
                """, (new_quantity, location_id))
                
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
            
            result, error = await self.hass.async_add_executor_job(consume_item)
            
            if error:
                return web.json_response(
                    {"error": error},
                    status=400
                )
            
            # Trimitem eveniment low stock dacă e cazul
            if result['is_low_stock']:
                _LOGGER.debug(
                    f"🔔 Low stock detected (consume) for item {result['item_id']}: "
                    f"{result['name']} ({result['new_quantity']}/{result['min_quantity']}) "
                    f"at {result['location']}"
                )
                self.hass.bus.async_fire(
                    "home_inventory_low_stock",
                    {
                        "item_id": result['item_id'],
                        "location_id": result['location_id'],
                        "name": result['name'],
                        "aliases": result['aliases'],
                        "quantity": result['new_quantity'],
                        "min_quantity": result['min_quantity'],
                        "room": result['room'],
                        "cupboard": result['cupboard'],
                        "shelf": result['shelf'],
                        "organizer": result['organizer'],
                        "location": result['location']
                    }
                )
            
            # Trimitem eveniment item consumed
            self.hass.bus.async_fire(
                "home_inventory_item_consumed",
                {
                    "item_id": result['item_id'],
                    "location_id": result['location_id'],
                    "name": result['name'],
                    "old_quantity": result['old_quantity'],
                    "new_quantity": result['new_quantity'],
                    "location": result['location']
                }
            )
            
            _LOGGER.info(
                f"[Home Inventory] Item consumed: {result['name']} "
                f"({result['old_quantity']} -> {result['new_quantity']}) "
                f"at {result['location']}"
            )
            
            return web.json_response(result)
            
        except Exception as e:
            _LOGGER.error(f"Error consuming item: {e}", exc_info=True)
            return web.json_response(
                {"error": str(e)},
                status=500
            )


class HomeInventarConsumeMultipleView(HomeAssistantView):
    """Consumă mai multe unități dintr-o locație"""
    url = f"/api/{DOMAIN}/consume_multiple/{'{item_id}'}"
    name = f"api:{DOMAIN}:consume_multiple"
    requires_auth = True

    def __init__(self, hass, db_path):
        self.hass = hass
        self.db_path = db_path

    async def post(self, request, item_id):
        try:
            data = await request.json()
            location_id = data.get("location_id")
            amount = data.get("amount", 1)
            
            if not location_id:
                return web.json_response(
                    {"error": "location_id required"}, 
                    status=400
                )
            
            if amount < 1:
                return web.json_response(
                    {"error": "amount must be at least 1"}, 
                    status=400
                )
            
            def consume_items():
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                
                cur.execute("""
                    SELECT 
                        il.id as location_id,
                        il.quantity,
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
                    SET quantity = ? 
                    WHERE id = ?
                """, (new_quantity, location_id))
                
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
            
            result, error = await self.hass.async_add_executor_job(consume_items)
            
            if error:
                return web.json_response({"error": error}, status=400)
            
            if result['is_low_stock']:
                self.hass.bus.async_fire(
                    "home_inventory_low_stock",
                    {
                        "item_id": result['item_id'],
                        "location_id": result['location_id'],
                        "name": result['name'],
                        "aliases": result['aliases'],
                        "quantity": result['new_quantity'],
                        "min_quantity": result['min_quantity'],
                        "room": result['room'],
                        "cupboard": result['cupboard'],
                        "shelf": result['shelf'],
                        "organizer": result['organizer'],
                        "location": result['location']
                    }
                )
            
            self.hass.bus.async_fire(
                "home_inventory_item_consumed",
                {
                    "item_id": result['item_id'],
                    "location_id": result['location_id'],
                    "name": result['name'],
                    "old_quantity": result['old_quantity'],
                    "new_quantity": result['new_quantity'],
                    "amount_consumed": result['amount_consumed'],
                    "location": result['location']
                }
            )
            
            _LOGGER.info(
                f"[Home Inventory] Items consumed: {result['name']} x{result['amount_consumed']} "
                f"({result['old_quantity']} -> {result['new_quantity']}) "
                f"at {result['location']}"
            )
            
            return web.json_response(result)
            
        except Exception as e:
            _LOGGER.error(f"Error consuming items: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class HomeInventarItemDeepLinkView(HomeAssistantView):
    """Generează link-uri pentru consumul rapid"""
    url = f"/api/{DOMAIN}/items/{'{item_id}'}/consume_link"
    name = f"api:{DOMAIN}:item_consume_link"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request, item_id):
        try:
            location_id = request.query.get("location_id")
            
            if not location_id:
                return web.json_response(
                    {"error": "location_id required"}, 
                    status=400
                )
            
            deep_link = f"homeassistant://navigate/{DOMAIN}/consume/{item_id}?location_id={location_id}"
            webhook_url = f"{self._get_base_url()}/api/{DOMAIN}/consume/{item_id}"
            
            return web.json_response({
                "deep_link": deep_link,
                "webhook_url": webhook_url,
                "item_id": item_id,
                "location_id": location_id
            })
            
        except Exception as e:
            _LOGGER.error(f"Error generating consume link: {e}")
            return web.json_response(
                {"error": str(e)},
                status=500
            )
    
    def _get_base_url(self):
        if hasattr(self.hass.config, "external_url") and self.hass.config.external_url:
            return self.hass.config.external_url
        elif hasattr(self.hass.config, "internal_url") and self.hass.config.internal_url:
            return self.hass.config.internal_url
        else:
            return f"http://{self.hass.config.api.local_ip}:8123"