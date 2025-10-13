from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import sqlite3
import logging

_LOGGER = logging.getLogger(__name__)


class HomeInventarConsumeView(HomeAssistantView):
    """API endpoint pentru scăderea cantității unui item."""

    url = "/api/home_inventar/consume/{item_id}"
    name = "api:home_inventar:consume"
    requires_auth = True

    def __init__(self, hass, db_path):
        self.hass = hass
        self.db_path = db_path

    async def post(self, request, item_id):
        """Scade cantitatea cu 1 pentru item-ul specificat."""
        try:
            def consume_item():
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                
                # Verifică dacă item-ul există și are tracking activat
                cur.execute("""
                    SELECT id, name, quantity, min_quantity, track_quantity
                    FROM items 
                    WHERE id = ?
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
                
                # Scade cantitatea cu 1
                new_quantity = item['quantity'] - 1
                
                cur.execute("""
                    UPDATE items 
                    SET quantity = ? 
                    WHERE id = ?
                """, (new_quantity, item_id))
                
                conn.commit()
                
                # Verifică dacă e stoc redus
                is_low_stock = (
                    item['min_quantity'] is not None and 
                    new_quantity <= item['min_quantity']
                )
                
                result = {
                    'id': item['id'],
                    'name': item['name'],
                    'old_quantity': item['quantity'],
                    'new_quantity': new_quantity,
                    'min_quantity': item['min_quantity'],
                    'is_low_stock': is_low_stock
                }
                
                conn.close()
                return result, None
            
            result, error = await self.hass.async_add_executor_job(consume_item)
            
            if error:
                return web.json_response(
                    {"error": error},
                    status=400
                )
            
            # Fire event pentru automatizări
            if result['is_low_stock']:
                self.hass.bus.async_fire(
                    "home_inventar_low_stock",
                    {
                        "item_id": result['id'],
                        "item_name": result['name'],
                        "quantity": result['new_quantity'],
                        "min_quantity": result['min_quantity']
                    }
                )
            
            # Fire event pentru consumare
            self.hass.bus.async_fire(
                "home_inventar_item_consumed",
                {
                    "item_id": result['id'],
                    "item_name": result['name'],
                    "old_quantity": result['old_quantity'],
                    "new_quantity": result['new_quantity']
                }
            )
            
            _LOGGER.info(
                f"[Home Inventar] Item consumed: {result['name']} "
                f"({result['old_quantity']} -> {result['new_quantity']})"
            )
            
            return web.json_response(result)
            
        except Exception as e:
            _LOGGER.error(f"Error consuming item: {e}", exc_info=True)
            return web.json_response(
                {"error": str(e)},
                status=500
            )


class HomeInventarItemDeepLinkView(HomeAssistantView):
    """API endpoint pentru generarea deep link-ului de consumare."""

    url = "/api/home_inventar/items/{item_id}/consume_link"
    name = "api:home_inventar:item_consume_link"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request, item_id):
        """Returnează deep link-ul pentru consumarea item-ului."""
        try:
            # Generează deep link pentru aplicația Home Assistant
            # Folosim hash routing pentru a funcționa direct în app
            deep_link = f"homeassistant://navigate/home_inventar?consume={item_id}"
            
            # Alternative: webhook URL pentru consumare directă
            # Aceasta poate fi accesată și din exterior (cu long-lived token)
            webhook_url = f"{self._get_base_url()}/api/home_inventar/consume/{item_id}"
            
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
        """Obține URL-ul de bază al Home Assistant."""
        if hasattr(self.hass.config, "external_url") and self.hass.config.external_url:
            return self.hass.config.external_url
        elif hasattr(self.hass.config, "internal_url") and self.hass.config.internal_url:
            return self.hass.config.internal_url
        else:
            return f"http://{self.hass.config.api.local_ip}:8123"