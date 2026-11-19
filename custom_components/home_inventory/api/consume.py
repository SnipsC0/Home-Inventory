from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import logging
from functools import partial
from ..const import DOMAIN
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)


class HomeInventarConsumeView(HomeAssistantView):
    """Consume an item from a specific location"""
    url = f"/api/{DOMAIN}/consume/{'{item_id}'}"
    name = f"api:{DOMAIN}:consume"
    requires_auth = True

    def __init__(self, hass, db_path):
        self.hass = hass
        self.db_path = db_path

    async def post(self, request, item_id):
        try:
            data = await request.json()
            location_id = data.get("location_id")  # New: specify the location
            
            if not location_id:
                return web.json_response(
                    {"error": "location_id required"}, 
                    status=400
                )
            
            devreload.reload_if_changed(repository)
            consume_item = partial(repository.consume_item, self.db_path, item_id, location_id)
            
            result, error = await self.hass.async_add_executor_job(consume_item)
            
            if error:
                return web.json_response(
                    {"error": error},
                    status=400
                )
            
            # Fire low stock event if needed
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
            
            # Fire item consumed event
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
    """Consume multiple units from a location"""
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
            
            devreload.reload_if_changed(repository)
            consume_items = partial(repository.consume_items, self.db_path, item_id, location_id, amount)
            
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
    """Generate links for quick consumption"""
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