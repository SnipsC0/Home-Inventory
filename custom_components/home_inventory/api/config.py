from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import logging
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

class HomeInventarConfigView(HomeAssistantView):

    url = f"/api/{DOMAIN}/config"
    name = f"api:{DOMAIN}:config"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request):
        try:
            entry = self.hass.data.get(DOMAIN, {}).get("entry")
            
            if not entry:
                return web.json_response({
                    "allow_structure_modification": True,
                    "qr_redirect_url": self._get_qr_redirect_url(),
                    "language": "en"  # Default language
                })
            
            allow_structure_modification = entry.options.get(
                "allow_structure_modification", True
            )
            language = entry.options.get("language", "en")
            
            return web.json_response({
                "allow_structure_modification": allow_structure_modification,
                "qr_redirect_url": self._get_qr_redirect_url() if allow_structure_modification else None,
                "language": language
            })
            
        except Exception as e:
            _LOGGER.error(f"Error getting config: {e}")
            return web.json_response(
                {"error": str(e)},
                status=500
            )
    
    def _get_qr_redirect_url(self):
        return "homeassistant://navigate/home_inventory"