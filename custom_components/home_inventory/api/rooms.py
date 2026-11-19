import sqlite3, logging, os
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload
from ._images import delete_image_file

_LOGGER = logging.getLogger(__name__)

class HomeInventarRoomsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/rooms"
    name = f"api:{DOMAIN}_rooms"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        delete_image_file(self.hass, image_path)

    async def get(self, request):
        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(partial(repository.list_rooms, self.db_path))
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        name = data.get("name", "").strip()
        image = data.get("image") or None
        if not name:
            return web.json_response({"error": "Name required"}, status=400)

        devreload.reload_if_changed(repository)
        try:
            rid = await request.app["hass"].async_add_executor_job(
                partial(repository.create_room, self.db_path, name, image)
            )
            return web.json_response({"id": rid, "name": name, "image": image or ""})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Room already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH rooms - received data: {data}")
            
            room_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")

            if not room_id:
                _LOGGER.error("PATCH rooms - missing room ID")
                return web.json_response({"error": "Room ID required"}, status=400)
            
            if not name:
                _LOGGER.error("PATCH rooms - missing room name")
                return web.json_response({"error": "Room name required"}, status=400)

            devreload.reload_if_changed(repository)
            count, old_image = await request.app["hass"].async_add_executor_job(
                partial(repository.update_room, self.db_path, room_id, name, new_image)
            )
            if count == 0:
                _LOGGER.error(f"Room not found with ID: {room_id}")
                return web.json_response({"error": "Room not found"}, status=404)

            if old_image:
                self._delete_image_file(old_image)
            
            _LOGGER.info(f"Room {room_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Room name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating room: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            room_id = data.get("id")

            if not room_id:
                return web.json_response({"error": "Room ID required"}, status=400)

            devreload.reload_if_changed(repository)
            count, images_to_delete = await request.app["hass"].async_add_executor_job(
                partial(repository.delete_room, self.db_path, room_id)
            )
            
            if count == 0:
                return web.json_response({"error": "Room not found"}, status=404)
            
            for image in images_to_delete:
                self._delete_image_file(image)
            
            _LOGGER.info(f"Room {room_id} deleted successfully (cleaned {len(images_to_delete)} images)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images_to_delete)})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting room: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)