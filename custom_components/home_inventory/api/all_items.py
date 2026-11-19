import logging
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)

class HomeInventarAllItemsView(HomeAssistantView):
    """Return all items with all their locations"""
    url = f"/api/{DOMAIN}/all_items"
    name = f"api:{DOMAIN}_all_items"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        """Get all items with their locations"""
        search = request.query.get("search", "").strip()
        barcode = request.query.get("barcode", "").strip()
        low_stock_only = request.query.get("low_stock_only", "false").lower() == "true"
        expired_only = request.query.get("expired_only", "false").lower() == "true"
        
        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.list_all_items, self.db_path, search, barcode, low_stock_only, expired_only)
        )
        return web.json_response(data)


class HomeInventarUpdateItemQuantityView(HomeAssistantView):
    """Update the quantity of an item at a specific location"""
    url = f"/api/{DOMAIN}/items/{'{item_id}'}/quantity"
    name = f"api:{DOMAIN}_item_quantity"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def patch(self, request, item_id):
        data = await request.json()
        location_id = data.get("location_id")
        quantity = data.get("quantity")
        min_quantity = data.get("min_quantity")
        track_quantity = data.get("track_quantity")
        expiration_dates = data.get("expiration_dates")

        if not location_id:
            return web.json_response({"error": "location_id required"}, status=400)

        devreload.reload_if_changed(repository)
        count = await request.app["hass"].async_add_executor_job(
            partial(
                repository.update_item_quantity, self.db_path, item_id, location_id,
                quantity, min_quantity, track_quantity, expiration_dates,
            )
        )
        if count == 0:
            return web.json_response({"error": "Item location not found"}, status=404)
        
        # Check low stock
        low_stock_data = await request.app["hass"].async_add_executor_job(
            partial(repository.get_quantity_update_low_stock, self.db_path, location_id)
        )
        
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


class HomeInventarItemSearchView(HomeAssistantView):
    """Advanced item search"""
    url = f"/api/{DOMAIN}/items/search"
    name = f"api:{DOMAIN}_items_search"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        """Search items by name, alias, or barcode"""
        query = request.query.get("q", "").strip()
        barcode = request.query.get("barcode", "").strip()
        
        if not query and not barcode:
            return web.json_response({"error": "Query or barcode required"}, status=400)
        
        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.search_items, self.db_path, query, barcode)
        )
        return web.json_response(data)