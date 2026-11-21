import sqlite3, logging, os
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload
from ._images import delete_image_file

_LOGGER = logging.getLogger(__name__)

class HomeInventarCupboardsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/cupboards"
    name = f"api:{DOMAIN}_cupboards"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        delete_image_file(self.hass, image_path)

    async def get(self, request):
        room = request.query.get("room")
        if not room:
            return web.json_response({"error": "Room required"}, status=400)

        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.list_cupboards, self.db_path, room)
        )
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        name = data.get("name", "").strip()
        image = data.get("image", "")
        
        if not room or not name:
            return web.json_response({"error": "Room and name required"}, status=400)

        _LOGGER.info(f"Creating cupboard - Room: {room}, Name: {name}, Image: {image}")

        devreload.reload_if_changed(repository)
        try:
            cupboard_id = await request.app["hass"].async_add_executor_job(
                partial(repository.create_cupboard, self.db_path, room, name, image)
            )
            if cupboard_id is None:
                return web.json_response({"error": "Room not found"}, status=404)
            return web.json_response({"id": cupboard_id, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Cupboard already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH cupboards - received data: {data}")
            
            cupboard_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")

            if not cupboard_id:
                _LOGGER.error("PATCH cupboards - missing cupboard ID")
                return web.json_response({"error": "Cupboard ID required"}, status=400)

            devreload.reload_if_changed(repository)
            count, old_image = await request.app["hass"].async_add_executor_job(
                partial(repository.update_cupboard, self.db_path, cupboard_id, name, new_image)
            )
            
            if count == 0:
                _LOGGER.error(f"Cupboard not found with ID: {cupboard_id}")
                return web.json_response({"error": "Cupboard not found"}, status=404)
            
            if old_image:
                self._delete_image_file(old_image)
            
            _LOGGER.info(f"Cupboard {cupboard_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except Exception as e:
            _LOGGER.error(f"Error updating cupboard: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            cupboard_id = data.get("id")

            if not cupboard_id:
                return web.json_response({"error": "Cupboard ID required"}, status=400)

            devreload.reload_if_changed(repository)
            count, images, trash_id = await request.app["hass"].async_add_executor_job(
                partial(repository.delete_cupboard, self.db_path, cupboard_id, request["hass_user"].id)
            )

            if count == 0:
                return web.json_response({"error": "Cupboard not found"}, status=404)

            # Photos stay on disk while the entry is in the bin
            _LOGGER.info(f"Cupboard {cupboard_id} moved to bin (trash_id={trash_id}, {len(images)} images kept)")
            return web.json_response({"message": "Deleted", "images_deleted": 0, "trash_id": trash_id})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting cupboard: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)