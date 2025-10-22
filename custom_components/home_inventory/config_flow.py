"""Config flow for Home Inventory integration."""
import logging
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class HomeInventarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Inventory."""

    VERSION = 3

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        _LOGGER.debug("[Home Inventory] Config flow user step called")
        
        # Only allow a single instance
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        
        if user_input is not None:
            _LOGGER.info("[Home Inventory] Creating entry with user_input: %s", user_input)
            return self.async_create_entry(
                title="Home Inventory",
                data={},
                options=user_input
            )
        
        _LOGGER.debug("[Home Inventory] Showing user form")
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Optional("allow_structure_modification", default=True): bool,
                vol.Optional("language", default="en"): vol.In(["en", "ro"]),
            }),
            description_placeholders={
                "structure_info": "Rooms > Cupboards > Shelves > Organizers > Items"
            }
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return HomeInventarOptionsFlow(config_entry)


class HomeInventarOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Home Inventory."""
    
    # ❌ REMOVED: def __init__(self, config_entry):
    # ❌ REMOVED:     self.config_entry = config_entry
    # ✅ Nu mai setăm explicit config_entry - clasa părinte o face automat!

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        _LOGGER.debug("[Home Inventory] Options flow init step called")
        
        if user_input is not None:
            _LOGGER.info("[Home Inventory] Updating options with: %s", user_input)
            return self.async_create_entry(title="", data=user_input)

        # Get current options with defaults
        # ✅ Folosește self.config_entry direct - e setat de clasa părinte
        current_allow = self.config_entry.options.get("allow_structure_modification", True)
        current_language = self.config_entry.options.get("language", "en")
        
        _LOGGER.debug(
            "[Home Inventory] Current settings - allow: %s, language: %s", 
            current_allow, current_language
        )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Optional(
                    "allow_structure_modification",
                    default=current_allow
                ): bool,
                vol.Optional(
                    "language",
                    default=current_language
                ): vol.In(["en", "ro"]),
            }),
            description_placeholders={
                "structure_info": "Rooms > Cupboards > Shelves > Organizers > Items",
                "sensor_count": "3 sensors available",
                "event_info": "Low stock events: home_inventory_low_stock"
            }
        )