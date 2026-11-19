import logging
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)

TARGETS = ("cupboard", "shelf")


class HomeInventarLocateView(HomeAssistantView):
    """Resolve a cupboard/shelf id (from a QR/NFC deep link) to its location names."""
    url = f"/api/{DOMAIN}/locate"
    name = f"api:{DOMAIN}:locate"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def get(self, request):
        target = request.query.get("target")
        raw_id = request.query.get("id")

        if target not in TARGETS:
            return web.json_response({"error": "target must be cupboard or shelf"}, status=400)
        try:
            location_id = int(raw_id)
        except (TypeError, ValueError):
            return web.json_response({"error": "Valid id required"}, status=400)

        devreload.reload_if_changed(repository)
        location = await self.hass.async_add_executor_job(
            partial(repository.resolve_location, self.db_path, target, location_id)
        )
        if location is None:
            return web.json_response({"error": "Location not found"}, status=404)

        return web.json_response({"target": target, "id": location_id, **location})
