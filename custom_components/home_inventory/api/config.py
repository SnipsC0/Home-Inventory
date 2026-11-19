from homeassistant.components.http import HomeAssistantView
from aiohttp import web
import logging
from ..const import (
    CONF_EXPIRY_UNIT,
    CONF_EXPIRY_VALUE,
    DEFAULT_EXPIRY_UNIT,
    DEFAULT_EXPIRY_VALUE,
    DOMAIN,
)

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
                    "show_qr_nfc": True,
                    "qr_redirect_url": self._get_qr_redirect_url(),
                    "language": "en",  # Default language
                    "expiry_warning_value": DEFAULT_EXPIRY_VALUE,
                    "expiry_warning_unit": DEFAULT_EXPIRY_UNIT,
                })
            
            allow_structure_modification = entry.options.get(
                "allow_structure_modification", True
            )
            show_qr_nfc = entry.options.get("show_qr_nfc", True)
            language = entry.options.get("language", "en")
            
            return web.json_response({
                "allow_structure_modification": allow_structure_modification,
                "show_qr_nfc": show_qr_nfc,
                "qr_redirect_url": self._get_qr_redirect_url() if show_qr_nfc else None,
                "language": language,
                "expiry_warning_value": int(
                    entry.options.get(CONF_EXPIRY_VALUE, DEFAULT_EXPIRY_VALUE)
                ),
                "expiry_warning_unit": entry.options.get(
                    CONF_EXPIRY_UNIT, DEFAULT_EXPIRY_UNIT
                ),
            })
            
        except Exception as e:
            _LOGGER.error(f"Error getting config: {e}")
            return web.json_response(
                {"error": str(e)},
                status=500
            )
    
    def _get_qr_redirect_url(self):
        # Base for QR/NFC deep links; DOMAIN is the panel's frontend_url_path
        return f"homeassistant://navigate/{DOMAIN}"