import sqlite3, logging, os
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload
from ._images import delete_image_file

_LOGGER = logging.getLogger(__name__)

class HomeInventarOrganizersView(HomeAssistantView):
    url = f"/api/{DOMAIN}/organizers"
    name = f"api:{DOMAIN}_organizers"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        delete_image_file(self.hass, image_path)

    async def get(self, request):
        room = request.query.get("room")
        cupboard = request.query.get("cupboard")
        shelf = request.query.get("shelf")
        
        if not room or not cupboard or not shelf:
            return web.json_response({"error": "Room, cupboard and shelf required"}, status=400)

        devreload.reload_if_changed(repository)
        data = await request.app["hass"].async_add_executor_job(
            partial(repository.list_organizers, self.db_path, room, cupboard, shelf)
        )
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        cupboard = data.get("cupboard", "").strip()
        shelf = data.get("shelf", "").strip()
        name = data.get("name", "").strip()
        image = data.get("image", "")
        
        if not room or not cupboard or not shelf or not name:
            return web.json_response({"error": "All fields required"}, status=400)

        _LOGGER.info(f"Creating organizer - Name: {name}, Image: '{image}'")

        devreload.reload_if_changed(repository)
        try:
            organizer_id = await request.app["hass"].async_add_executor_job(
                partial(repository.create_organizer, self.db_path, room, cupboard, shelf, name, image)
            )
            if organizer_id is None:
                return web.json_response({"error": "Shelf not found"}, status=404)
            return web.json_response({"id": organizer_id, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Organizer already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH organizers - received data: {data}")
            
            organizer_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")
            
            new_room = data.get("room")
            new_cupboard = data.get("cupboard")
            new_shelf = data.get("shelf")

            if not organizer_id:
                _LOGGER.error("PATCH organizers - missing organizer ID")
                return web.json_response({"error": "Organizer ID required"}, status=400)

            devreload.reload_if_changed(repository)
            count, old_image, error = await request.app["hass"].async_add_executor_job(
                partial(
                    repository.update_organizer, self.db_path, organizer_id,
                    name, new_image, new_room, new_cupboard, new_shelf,
                )
            )
            
            if error:
                return web.json_response({"error": error}, status=404)
            
            if count == 0:
                _LOGGER.error(f"Organizer not found with ID: {organizer_id}")
                return web.json_response({"error": "Organizer not found"}, status=404)
            
            if old_image:
                self._delete_image_file(old_image)
                _LOGGER.info(f"Old organizer image cleaned: {old_image}")
            
            _LOGGER.info(f"Organizer {organizer_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Organizer name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating organizer: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            organizer_id = data.get("id")

            if not organizer_id:
                return web.json_response({"error": "Organizer ID required"}, status=400)

            devreload.reload_if_changed(repository)
            deleted_organizer, _organizer_image, _item_images, items_deleted, trash_id = (
                await request.app["hass"].async_add_executor_job(
                    partial(repository.hard_delete_organizer, self.db_path, organizer_id, request["hass_user"].id)
                )
            )

            if not deleted_organizer:
                return web.json_response({"error": "Organizer not found"}, status=404)

            # Photos stay on disk while the entry is in the bin
            _LOGGER.info(f"[HomeInventar] Organizer {organizer_id} moved to bin (trash_id={trash_id}, {items_deleted} items)")
            return web.json_response({
                "message": "Deleted",
                "items_deleted": items_deleted,
                "images_deleted": 0,
                "trash_id": trash_id,
            })

        except Exception as e:
            _LOGGER.error(f"Error deleting organizer: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)