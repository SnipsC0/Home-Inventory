import logging, os, time, random
import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .db.schema import initialize_db
from .api.rooms import HomeInventarRoomsView
from .api.cupboards import HomeInventarCupboardsView
from .api.shelves import HomeInventarShelvesView
from .api.organizers import HomeInventarOrganizersView
from .api.items import HomeInventarItemsView, HomeInventarItemView
from .api.all_items import (
    HomeInventarAllItemsView,
    HomeInventarUpdateItemQuantityView,
)
from .api.upload import HomeInventarUpload, HomeInventarImageView
from .api.config import HomeInventarConfigView
from .api.consume import HomeInventarConsumeView, HomeInventarItemDeepLinkView

from .const import DOMAIN

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_LOGGER = logging.getLogger(__name__)
VERSION = f"2.0.{int(time.time())}{random.randint(1000, 9999)}"


def ensure_data_folders(hass: HomeAssistant):
    base_path = hass.config.path(f"data/{DOMAIN}")
    folders = ["db", "images", "exports", "config"]
    for folder in folders:
        path = os.path.join(base_path, folder)
        os.makedirs(path, exist_ok=True)
        _LOGGER.debug(f"[HomeInventar] Verified data folder: {path}")
    return base_path


async def async_setup(hass: HomeAssistant, config: ConfigType):
    return True


async def async_setup_entry(hass, entry):
    _LOGGER.info("[Home Inventar] Inițializare integrare...")

    base_path = ensure_data_folders(hass)
    db_path = os.path.join(base_path, "db", "inventar.db")

    await hass.async_add_executor_job(initialize_db, db_path)
    _LOGGER.info(f"[Home Inventar] ✅ Baza de date inițializată la {db_path}")

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["entry"] = entry

    for view in [
        HomeInventarRoomsView(db_path, hass), 
        HomeInventarCupboardsView(db_path, hass), 
        HomeInventarShelvesView(db_path, hass), 
        HomeInventarOrganizersView(db_path, hass), 
        HomeInventarItemsView(db_path, hass), 
        HomeInventarItemView(db_path, hass), 
        HomeInventarAllItemsView(db_path),
        HomeInventarUpdateItemQuantityView(db_path),
        HomeInventarUpload(hass),
        HomeInventarImageView(hass),
        HomeInventarConfigView(hass),
        HomeInventarConsumeView(hass, db_path),
        HomeInventarItemDeepLinkView(hass),
    ]:
        hass.http.register_view(view)
    _LOGGER.info("[Home Inventar] ✅ API-uri înregistrate")

    panel_dir = os.path.join(os.path.dirname(__file__), "panel")
    await hass.http.async_register_static_paths([
        StaticPathConfig(url_path=f"/{DOMAIN}_static", path=panel_dir, cache_headers=False)
    ])
    _LOGGER.info("[Home Inventar] ✅ Static path înregistrat")

    try:
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Home Inventar",
            sidebar_icon="mdi:archive",
            frontend_url_path=DOMAIN,
            config={
                "_panel_custom": {
                    "name": "home-inventar-app",
                    "module_url": f"/{DOMAIN}_static/app.js?v={VERSION}",
                }
            },
            require_admin=False,
        )
        _LOGGER.info(f"[Home Inventar] ✅ Panou frontend v{VERSION}")
    except ValueError as e:
        if "Overwriting panel" in str(e):
            _LOGGER.warning(f"[Home Inventar] Panou deja înregistrat, se ignoră: {e}")
        else:
            raise
    
    entry.async_on_unload(entry.add_update_listener(async_update_options))
    
    return True


async def async_update_options(hass: HomeAssistant, entry):
    _LOGGER.info("[Home Inventar] Opțiuni actualizate")


async def async_unload_entry(hass, entry):
    _LOGGER.info("[Home Inventar] Integrare dezinstalată.")
    hass.data[DOMAIN].pop("entry", None)
    return True