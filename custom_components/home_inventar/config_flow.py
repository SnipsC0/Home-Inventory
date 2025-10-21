import logging
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

class HomeInventarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    async def async_step_user(self, user_input=None):
        _LOGGER.debug("[HomeInventar] Config flow user step called")
        
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        
        if user_input is not None:
            _LOGGER.info("[HomeInventar] Creating entry with user_input: %s", user_input)
            return self.async_create_entry(
                title="Home Inventar",
                data={},
                options=user_input
            )
        
        _LOGGER.debug("[HomeInventar] Showing user form")
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Optional("allow_structure_modification", default=True): bool,
                vol.Optional("language", default="en"): vol.In(["en", "ro"]),
            })
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return HomeInventarOptionsFlow(config_entry)


class HomeInventarOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        _LOGGER.debug("[HomeInventar] Options flow init step called")
        
        if user_input is not None:
            _LOGGER.info("[HomeInventar] Updating options with: %s", user_input)
            return self.async_create_entry(title="", data=user_input)

        current_allow = self.config_entry.options.get("allow_structure_modification", True)
        current_language = self.config_entry.options.get("language", "en")
        _LOGGER.debug("[HomeInventar] Current settings - allow: %s, language: %s", 
                     current_allow, current_language)

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
            })
        )
