"""Config flow for Home Inventory integration."""
import logging
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers import selector

from .const import (
    CONF_EXPIRY_UNIT,
    CONF_EXPIRY_VALUE,
    CONF_TRASH_RETENTION,
    DEFAULT_EXPIRY_UNIT,
    DEFAULT_EXPIRY_VALUE,
    DEFAULT_TRASH_RETENTION,
    DOMAIN,
    EXPIRY_MAX,
    EXPIRY_UNITS,
    TRASH_RETENTION_MAX,
)

_LOGGER = logging.getLogger(__name__)

LANGUAGE_SELECTOR = selector.SelectSelector(
    selector.SelectSelectorConfig(
        options=["en", "ro", "ru", "de"],
        mode=selector.SelectSelectorMode.DROPDOWN,
        translation_key="language",
    )
)


EXPIRY_SECTION = "expiry"

TRASH_SECTION = "trash"

TRASH_RETENTION_SELECTOR = selector.NumberSelector(
    selector.NumberSelectorConfig(
        min=1,
        max=TRASH_RETENTION_MAX,
        step=1,
        mode=selector.NumberSelectorMode.BOX,
        unit_of_measurement="d",
    )
)

EXPIRY_VALUE_SELECTOR = selector.NumberSelector(
    selector.NumberSelectorConfig(
        min=1,
        max=max(EXPIRY_MAX.values()),
        step=1,
        mode=selector.NumberSelectorMode.BOX,
    )
)

EXPIRY_UNIT_SELECTOR = selector.SelectSelector(
    selector.SelectSelectorConfig(
        options=list(EXPIRY_UNITS),
        mode=selector.SelectSelectorMode.DROPDOWN,
        translation_key="expiry_unit",
    )
)


def _schema(
    allow: bool,
    language: str,
    expiry: tuple[int, str] | None = None,
    show_qr: bool = True,
    trash_retention: int = DEFAULT_TRASH_RETENTION,
) -> vol.Schema:
    """Build the settings schema (expiry fields only when ``expiry`` is given)."""
    fields = {
        vol.Required("language", default=language): LANGUAGE_SELECTOR,
        vol.Required(
            "allow_structure_modification", default=allow
        ): selector.BooleanSelector(),
        vol.Required("show_qr_nfc", default=show_qr): selector.BooleanSelector(),
    }
    if expiry is not None:
        value, unit = expiry
        fields[vol.Required(EXPIRY_SECTION)] = section(
            vol.Schema({
                vol.Required(CONF_EXPIRY_VALUE, default=value): EXPIRY_VALUE_SELECTOR,
                vol.Required(CONF_EXPIRY_UNIT, default=unit): EXPIRY_UNIT_SELECTOR,
            }),
            {"collapsed": False},
        )
        fields[vol.Required(TRASH_SECTION)] = section(
            vol.Schema({
                vol.Required(CONF_TRASH_RETENTION, default=trash_retention): TRASH_RETENTION_SELECTOR,
            }),
            {"collapsed": False},
        )
    return vol.Schema(fields)


class HomeInventarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Inventory."""

    VERSION = 3

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        _LOGGER.debug("[Home Inventory] Config flow user step called")
        
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
            data_schema=_schema(True, "en"),
            description_placeholders={
                "structure_info": "Rooms > Cupboards > Shelves > Organizers > Items"
            }
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return HomeInventarOptionsFlow()


class HomeInventarOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Home Inventory."""
    
    async def async_step_init(self, user_input=None):
        """Manage the options."""
        _LOGGER.debug("[Home Inventory] Options flow init step called")
        
        errors = {}
        if user_input is not None:
            expiry = user_input[EXPIRY_SECTION]
            value = int(expiry[CONF_EXPIRY_VALUE])
            unit = expiry[CONF_EXPIRY_UNIT]
            retention = int(user_input[TRASH_SECTION][CONF_TRASH_RETENTION])
            if not 1 <= value <= EXPIRY_MAX[unit]:
                errors["base"] = "invalid_expiry_value"
            elif not 1 <= retention <= TRASH_RETENTION_MAX:
                errors["base"] = "invalid_trash_retention"
            else:
                # store flat: the section is only a UI grouping
                user_input = {
                    "language": user_input["language"],
                    "allow_structure_modification": user_input["allow_structure_modification"],
                    "show_qr_nfc": user_input["show_qr_nfc"],
                    CONF_EXPIRY_VALUE: value,
                    CONF_EXPIRY_UNIT: unit,
                    CONF_TRASH_RETENTION: retention,
                }
                _LOGGER.info("[Home Inventory] Updating options with: %s", user_input)
                return self.async_create_entry(title="", data=user_input)

        current_allow = self.config_entry.options.get("allow_structure_modification", True)
        current_language = self.config_entry.options.get("language", "en")
        current_show_qr = self.config_entry.options.get("show_qr_nfc", True)
        current_expiry = (
            int(self.config_entry.options.get(CONF_EXPIRY_VALUE, DEFAULT_EXPIRY_VALUE)),
            self.config_entry.options.get(CONF_EXPIRY_UNIT, DEFAULT_EXPIRY_UNIT),
        )
        current_retention = int(
            self.config_entry.options.get(CONF_TRASH_RETENTION, DEFAULT_TRASH_RETENTION)
        )
        if user_input is not None:  # re-show the form with what the user typed
            current_allow = user_input["allow_structure_modification"]
            current_language = user_input["language"]
            current_show_qr = user_input["show_qr_nfc"]
            current_expiry = (int(expiry[CONF_EXPIRY_VALUE]), expiry[CONF_EXPIRY_UNIT])
            current_retention = int(user_input[TRASH_SECTION][CONF_TRASH_RETENTION])
        
        _LOGGER.debug(
            "[Home Inventory] Current settings - allow: %s, language: %s", 
            current_allow, current_language
        )

        return self.async_show_form(
            step_id="init",
            data_schema=_schema(
                current_allow, current_language, current_expiry, current_show_qr, current_retention
            ),
            errors=errors,
            description_placeholders={
                "structure_info": "Rooms > Cupboards > Shelves > Organizers > Items",
                "sensor_count": "4 sensors available",
                "event_info": "home_inventory_low_stock, home_inventory_expiring_soon"
            }
        )