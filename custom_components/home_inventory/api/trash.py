import logging
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import CONF_TRASH_RETENTION, DEFAULT_TRASH_RETENTION, DOMAIN
from ..db import repository, devreload
from ._images import delete_image_files

_LOGGER = logging.getLogger(__name__)


def trash_retention_days(hass):
    """Configured bin retention (option, re-read on every call)."""
    entry = hass.data.get(DOMAIN, {}).get("entry")
    if not entry:
        return DEFAULT_TRASH_RETENTION
    return int(entry.options.get(CONF_TRASH_RETENTION, DEFAULT_TRASH_RETENTION))


def _parse_id(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class HomeInventarTrashView(HomeAssistantView):
    """List the recycle bin (GET) or empty it (DELETE)."""
    url = f"/api/{DOMAIN}/trash"
    name = f"api:{DOMAIN}_trash"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def get(self, request):
        try:
            days = trash_retention_days(self.hass)
            devreload.reload_if_changed(repository)
            entries = await self.hass.async_add_executor_job(
                partial(repository.list_trash, self.db_path, days)
            )
            return web.json_response({"entries": entries, "retention_days": days})
        except Exception as e:
            _LOGGER.error(f"Error listing bin: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            devreload.reload_if_changed(repository)
            images = await self.hass.async_add_executor_job(
                partial(repository.purge_trash, self.db_path, all=True)
            )
            await self.hass.async_add_executor_job(delete_image_files, self.hass, images)
            _LOGGER.info(f"Bin emptied ({len(images)} images deleted)")
            return web.json_response({"message": "Emptied", "images_deleted": len(images)})
        except Exception as e:
            _LOGGER.error(f"Error emptying bin: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class HomeInventarTrashEntryView(HomeAssistantView):
    """Permanently delete one bin entry."""
    url = f"/api/{DOMAIN}/trash/{'{trash_id}'}"
    name = f"api:{DOMAIN}_trash_entry"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def delete(self, request, trash_id):
        tid = _parse_id(trash_id)
        if tid is None:
            return web.json_response({"error": "Bin entry not found"}, status=404)
        try:
            devreload.reload_if_changed(repository)
            exists = await self.hass.async_add_executor_job(
                partial(repository.trash_entry_exists, self.db_path, tid)
            )
            if not exists:
                return web.json_response({"error": "Bin entry not found"}, status=404)
            images = await self.hass.async_add_executor_job(
                partial(repository.purge_trash, self.db_path, trash_id=tid)
            )
            await self.hass.async_add_executor_job(delete_image_files, self.hass, images)
            _LOGGER.info(f"Bin entry {tid} deleted forever ({len(images)} images deleted)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images)})
        except Exception as e:
            _LOGGER.error(f"Error deleting bin entry: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)


class HomeInventarTrashRestoreView(HomeAssistantView):
    """Restore one bin entry."""
    url = f"/api/{DOMAIN}/trash/{'{trash_id}'}/restore"
    name = f"api:{DOMAIN}_trash_restore"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def post(self, request, trash_id):
        tid = _parse_id(trash_id)
        if tid is None:
            return web.json_response({"error": "Bin entry not found"}, status=404)
        try:
            devreload.reload_if_changed(repository)
            result = await self.hass.async_add_executor_job(
                partial(repository.restore_trash_entry, self.db_path, tid)
            )
            error = result.get("error")
            if error == "not_found":
                return web.json_response({"error": "Bin entry not found"}, status=404)
            if error == "parent_missing":
                return web.json_response(result, status=409)
            _LOGGER.info(f"Bin entry {tid} restored ({result['restored']} {result['entity_id']})")
            return web.json_response(result)
        except Exception as e:
            _LOGGER.error(f"Error restoring bin entry: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)
