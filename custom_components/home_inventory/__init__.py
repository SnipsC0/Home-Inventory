# custom_components/home_inventory/__init__.py
import json, logging, os
import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .db.schema import initialize_db
from .images import prune_thumbnails
from .api.rooms import HomeInventarRoomsView
from .api.cupboards import HomeInventarCupboardsView
from .api.shelves import HomeInventarShelvesView
from .api.organizers import HomeInventarOrganizersView
from .api.items import HomeInventarItemsView, HomeInventarItemView, HomeInventarItemMasterView, HomeInventarItemMasterUpdateView
from .api.all_items import (
    HomeInventarAllItemsView,
    HomeInventarUpdateItemQuantityView,
)
from .api.delete_preview import HomeInventarDeletePreviewView
from .api.upload import HomeInventarUpload, HomeInventarImageView
from .api.config import HomeInventarConfigView
from .api.consume import HomeInventarConsumeView, HomeInventarItemDeepLinkView
from .api.locate import HomeInventarLocateView
from .api.expiring import HomeInventarExpiringBatchesView

from .const import DOMAIN

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_LOGGER = logging.getLogger(__name__)


def _read_manifest_version() -> str:
    # Read once at import time (integration modules load in an executor, not the event loop)
    try:
        with open(os.path.join(os.path.dirname(__file__), "manifest.json"), encoding="utf-8") as f:
            return str(json.load(f)["version"])
    except (OSError, ValueError, KeyError):
        return "0"


VERSION = _read_manifest_version()


def ensure_data_folders(hass: HomeAssistant):
    base_path = hass.config.path(f"data/{DOMAIN}")
    folders = ["db", "images", "exports", "config"]
    for folder in folders:
        path = os.path.join(base_path, folder)
        os.makedirs(path, exist_ok=True)
        _LOGGER.debug(f"[Home Inventory] Verified data folder: {path}")
    return base_path


async def async_setup(hass: HomeAssistant, config: ConfigType):
    return True


async def async_setup_entry(hass, entry):
    _LOGGER.info("[Home Inventory] Integration init...")

    base_path = ensure_data_folders(hass)
    db_path = os.path.join(base_path, "db", "inventar.db")

    await hass.async_add_executor_job(
        initialize_db, db_path, base_path, os.path.dirname(base_path)
    )
    _LOGGER.debug(f"[Home Inventory] ✅ DB initialized at {db_path}")

    images_dir = os.path.join(base_path, "images")
    pruned = await hass.async_add_executor_job(prune_thumbnails, images_dir)
    if pruned:
        _LOGGER.debug(f"[Home Inventory] Pruned {pruned} orphaned thumbnails")

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["entry"] = entry

    for view in [
        HomeInventarRoomsView(db_path, hass),
        HomeInventarCupboardsView(db_path, hass),
        HomeInventarShelvesView(db_path, hass),
        HomeInventarOrganizersView(db_path, hass),
        HomeInventarItemsView(db_path, hass),
        HomeInventarItemView(db_path, hass),
        HomeInventarItemMasterView(db_path, hass),
        HomeInventarItemMasterUpdateView(db_path, hass),
        HomeInventarAllItemsView(db_path),
        HomeInventarUpdateItemQuantityView(db_path),
        HomeInventarUpload(hass),
        HomeInventarImageView(hass),
        HomeInventarConfigView(hass),
        HomeInventarConsumeView(hass, db_path),
        HomeInventarItemDeepLinkView(hass),
        HomeInventarLocateView(db_path, hass),
        HomeInventarDeletePreviewView(db_path, hass),
        HomeInventarExpiringBatchesView(db_path, hass),
    ]:
        hass.http.register_view(view)
    _LOGGER.debug("[Home Inventory] ✅ APIs registered")

    panel_dir = os.path.join(os.path.dirname(__file__), "panel")
    await hass.http.async_register_static_paths([
        StaticPathConfig(url_path=f"/{DOMAIN}_static", path=panel_dir, cache_headers=False)
    ])
    _LOGGER.debug("[Home Inventory] ✅ Static path registered")

    try:
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Home Inventory",
            sidebar_icon="mdi:archive",
            frontend_url_path=DOMAIN,
            config={
                "_panel_custom": {
                    "name": "home-inventory-app",
                    "module_url": f"/{DOMAIN}_static/panel-wrapper.js?v={VERSION}",
                }
            },
            require_admin=False,
        )
        _LOGGER.debug(f"[Home Inventory] ✅ Panou frontend v{VERSION}")
    except ValueError as e:
        if "Overwriting panel" in str(e):
            _LOGGER.warning(f"[Home Inventory] Panel already registered, ignoring: {e}")
        else:
            raise
    
    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])
    _LOGGER.info("[Home Inventory] ✅ Sensors registered")
    
    entry.async_on_unload(entry.add_update_listener(async_update_options))
    
    return True


async def async_update_options(hass: HomeAssistant, entry):
    _LOGGER.info("[Home Inventory] Update options")


async def async_unload_entry(hass, entry):
    _LOGGER.info("[Home Inventory] Uninstalled integration.")
    
    unload_ok = await hass.config_entries.async_unload_platforms(entry, ["sensor"])
    
    if unload_ok:
        hass.data[DOMAIN].pop("entry", None)
    
    return unload_ok