import logging
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)


class HomeInventarFavoritesView(HomeAssistantView):
    """List the current HA user's favorite item masters."""
    url = f"/api/{DOMAIN}/favorites"
    name = f"api:{DOMAIN}_favorites"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        user_id = request["hass_user"].id
        devreload.reload_if_changed(repository)
        item_ids = await request.app["hass"].async_add_executor_job(
            partial(repository.list_favorite_ids, self.db_path, user_id)
        )
        return web.json_response({"item_ids": item_ids})


class HomeInventarFavoriteItemView(HomeAssistantView):
    """Add (PUT) or remove (DELETE) one favorite for the current HA user."""
    url = f"/api/{DOMAIN}/favorites/{'{item_id}'}"
    name = f"api:{DOMAIN}_favorite_item"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def _set(self, request, item_id, favorite):
        try:
            item_id = int(item_id)
        except ValueError:
            return web.json_response({"error": "Item not found"}, status=404)
        user_id = request["hass_user"].id
        devreload.reload_if_changed(repository)
        ok = await request.app["hass"].async_add_executor_job(
            partial(repository.set_favorite, self.db_path, user_id, item_id, favorite)
        )
        if not ok:
            return web.json_response({"error": "Item not found"}, status=404)
        return web.json_response({"item_id": item_id, "favorite": favorite})

    async def put(self, request, item_id):
        return await self._set(request, item_id, True)

    async def delete(self, request, item_id):
        return await self._set(request, item_id, False)
