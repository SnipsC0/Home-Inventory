from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload


class HomeInventarDeletePreviewView(HomeAssistantView):
    url = f"/api/{DOMAIN}/delete_preview"
    name = f"api:{DOMAIN}_delete_preview"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def get(self, request):
        kind = request.query.get("type", "")
        try:
            entity_id = int(request.query.get("id", ""))
        except ValueError:
            return web.json_response({"error": "Valid id required"}, status=400)

        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.delete_preview, self.db_path, kind, entity_id)
        )
        if data is None:
            return web.json_response({"error": "Not found"}, status=404)
        return web.json_response(data)
