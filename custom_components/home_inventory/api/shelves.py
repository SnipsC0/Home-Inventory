import sqlite3, logging, os
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload
from ._images import delete_image_file

_LOGGER = logging.getLogger(__name__)

class HomeInventarShelvesView(HomeAssistantView):
    url = f"/api/{DOMAIN}/shelves"
    name = f"api:{DOMAIN}_shelves"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        delete_image_file(self.hass, image_path)

    async def get(self, request):
        room = request.query.get("room")
        cupboard = request.query.get("cupboard")
        if not room or not cupboard:
            return web.json_response({"error": "Room and cupboard required"}, status=400)

        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.list_shelves, self.db_path, room, cupboard)
        )
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        cupboard = data.get("cupboard", "").strip()
        name = data.get("name", "").strip()
        image = data.get("image") or None

        if not room or not cupboard or not name:
            return web.json_response({"error": "Room, cupboard and name required"}, status=400)

        devreload.reload_if_changed(repository)
        try:
            shelf_id = await request.app["hass"].async_add_executor_job(
                partial(repository.create_shelf, self.db_path, room, cupboard, name, image)
            )
            if shelf_id is None:
                return web.json_response({"error": "Cupboard not found"}, status=404)
            return web.json_response({"id": shelf_id, "name": name, "image": image or ""})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Shelf already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH shelves - received data: {data}")
            
            shelf_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")

            if not shelf_id:
                _LOGGER.error("PATCH shelves - missing shelf ID")
                return web.json_response({"error": "Shelf ID required"}, status=400)
            
            if not name:
                _LOGGER.error("PATCH shelves - missing shelf name")
                return web.json_response({"error": "Shelf name required"}, status=400)

            devreload.reload_if_changed(repository)
            count, old_image = await request.app["hass"].async_add_executor_job(
                partial(repository.update_shelf, self.db_path, shelf_id, name, new_image)
            )
            if count == 0:
                _LOGGER.error(f"Shelf not found with ID: {shelf_id}")
                return web.json_response({"error": "Shelf not found"}, status=404)

            if old_image:
                self._delete_image_file(old_image)
            
            _LOGGER.info(f"Shelf {shelf_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Shelf name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating shelf: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            shelf_id = data.get("id")

            if not shelf_id:
                return web.json_response({"error": "Shelf ID required"}, status=400)

            devreload.reload_if_changed(repository)
            count, images, trash_id = await request.app["hass"].async_add_executor_job(
                partial(repository.delete_shelf, self.db_path, shelf_id, request["hass_user"].id)
            )

            if count == 0:
                return web.json_response({"error": "Shelf not found"}, status=404)

            # Photos stay on disk while the entry is in the bin
            _LOGGER.info(f"Shelf {shelf_id} moved to bin (trash_id={trash_id}, {len(images)} images kept)")
            return web.json_response({"message": "Deleted", "images_deleted": 0, "trash_id": trash_id})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting shelf: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)