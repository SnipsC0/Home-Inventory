from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import sqlite3
import logging
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class HomeInventarConsumeView(HomeAssistantView):

    url = f"/api/{DOMAIN}/consume/{'{item_id}'}"
    name = f"api:{DOMAIN}:consume"
    requires_auth = True

    def __init__(self, hass, db_path):
        self.hass = hass
        self.db_path = db_path

    async def post(self, request, item_id):
        try:
            def consume_item():
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                
                cur.execute("""
                    SELECT i.id, i.name, i.quantity, i.min_quantity, i.track_quantity, i.aliases,
                           r.name as room_name, c.name as cupboard_name, s.name as shelf_name
                    FROM items i
                    JOIN shelves s ON i.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    WHERE i.id = ?
                """, (item_id,))
                
                item = cur.fetchone()
                
                if not item:
                    conn.close()
                    return None, "Item not found"
                
                if not item['track_quantity']:
                    conn.close()
                    return None, "Item does not have quantity tracking enabled"
                
                if item['quantity'] is None or item['quantity'] <= 0:
                    conn.close()
                    return None, "Item quantity is already 0 or not set"
                
                new_quantity = item['quantity'] - 1
                
                cur.execute("""
                    UPDATE items 
                    SET quantity = ? 
                    WHERE id = ?
                """, (new_quantity, item_id))
                
                conn.commit()
                
                is_low_stock = (
                    item['min_quantity'] is not None and 
                    new_quantity > 0 and
                    new_quantity <= item['min_quantity']
                )
                
                location = f"{item['room_name']} / {item['cupboard_name']} / {item['shelf_name']}"
                
                result = {
                    'id': item['id'],
                    'name': item['name'],
                    'aliases': item['aliases'],
                    'old_quantity': item['quantity'],
                    'new_quantity': new_quantity,
                    'min_quantity': item['min_quantity'],
                    'is_low_stock': is_low_stock,
                    'room': item['room_name'],
                    'cupboard': item['cupboard_name'],
                    'shelf': item['shelf_name'],
                    'location': location
                }
                
                conn.close()
                return result, None
            
            result, error = await self.hass.async_add_executor_job(consume_item)
            
            if error:
                return web.json_response(
                    {"error": error},
                    status=400
                )
            
            if result['is_low_stock']:
                _LOGGER.debug(
                    f"🔔 Low stock detected (consume) for item {result['id']}: "
                    f"{result['name']} ({result['new_quantity']}/{result['min_quantity']}) "
                    f"at {result['location']}"
                )
                self.hass.bus.async_fire(
                    "home_inventory_low_stock",
                    {
                        "item_id": result['id'],
                        "name": result['name'],
                        "aliases": result['aliases'],
                        "quantity": result['new_quantity'],
                        "min_quantity": result['min_quantity'],
                        "room": result['room'],
                        "cupboard": result['cupboard'],
                        "shelf": result['shelf'],
                        "location": result['location']
                    }
                )
            
            self.hass.bus.async_fire(
                "home_inventory_item_consumed",
                {
                    "item_id": result['id'],
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


class HomeInventarItemDeepLinkView(HomeAssistantView):

    url = f"/api/{DOMAIN}/items/{'{item_id}'}/consume_link"
    name = f"api:{DOMAIN}:item_consume_link"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request, item_id):
        try:
            deep_link = f"homeassistant://navigate/{DOMAIN}/consume/{item_id}"
            
            webhook_url = f"{self._get_base_url()}/api/{DOMAIN}/consume/{item_id}"
            
            return web.json_response({
                "deep_link": deep_link,
                "webhook_url": webhook_url,
                "item_id": item_id
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