from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import logging

_LOGGER = logging.getLogger(__name__)
DOMAIN = "home_inventar"


class HomeInventarConfigView(HomeAssistantView):

    url = "/api/home_inventar/config"
    name = "api:home_inventar:config"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request):
        try:
            entry = self.hass.data.get(DOMAIN, {}).get("entry")
            
            if not entry:
                return web.json_response({
                    "allow_structure_modification": True,
                    "qr_redirect_url": self._get_qr_redirect_url()
                })
            
            allow_structure_modification = entry.options.get(
                "allow_structure_modification", True
            )
            
            return web.json_response({
                "allow_structure_modification": allow_structure_modification,
                "qr_redirect_url": self._get_qr_redirect_url() if allow_structure_modification else None
            })
            
        except Exception as e:
            _LOGGER.error(f"Error getting config: {e}")
            return web.json_response(
                {"error": str(e)},
                status=500
            )
    
    def _get_qr_redirect_url(self):
        return "homeassistant://navigate/home_inventar"