import sqlite3, logging, os
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)

class HomeInventarCupboardsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/cupboards"
    name = f"api:{DOMAIN}_cupboards"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        """Șterge fizic fișierul imaginii de pe disk"""
        if not image_path:
            return
        
        try:
            if image_path.startswith(f'/api/{DOMAIN}/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                return
            else:
                filename = image_path
            
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.info(f"[Home Inventory] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[Home Inventory] Image file not found: {full_path}")
                
        except Exception as e:
            _LOGGER.error(f"[Home Inventory] Error deleting image file: {e}", exc_info=True)

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
            count, images_to_delete = await request.app["hass"].async_add_executor_job(
                partial(repository.delete_cupboard, self.db_path, cupboard_id)
            )
            
            if count == 0:
                return web.json_response({"error": "Cupboard not found"}, status=404)
            
            for image in images_to_delete:
                self._delete_image_file(image)
            
            _LOGGER.info(f"Cupboard {cupboard_id} deleted successfully (cleaned {len(images_to_delete)} images)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images_to_delete)})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting cupboard: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)