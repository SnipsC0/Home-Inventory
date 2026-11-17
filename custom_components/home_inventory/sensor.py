import logging
from functools import partial
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.components.sensor import SensorEntity
from datetime import timedelta
from .const import DOMAIN, DB_PATH, INTEGRATION_NAME
from .db import repository, devreload

_LOGGER = logging.getLogger(__name__)
SCAN_INTERVAL = timedelta(minutes=1)

async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities):
    db_path = hass.config.path(DB_PATH)
    
    sensors = [
        InventoryTotalItemsSensor(hass, db_path),
        InventoryLowStockSensor(hass, db_path),
        InventoryTrackedItemsSensor(hass, db_path),
    ]
    
    async_add_entities(sensors, True)


class InventoryTotalItemsSensor(SensorEntity):
    
    def __init__(self, hass, db_path):
        self._hass = hass
        self._db_path = db_path
        self._state = 0
        self._attr_name = f"{INTEGRATION_NAME} Total items"
        self._attr_unique_id = f"{DOMAIN}_total_items"
        self._attr_icon = "mdi:package-variant"

    @property
    def state(self):
        return self._state

    @property
    def extra_state_attributes(self):
        return {
            "unit_of_measurement": "items",
        }

    async def async_update(self):
        devreload.reload_if_changed(repository)
        self._state = await self._hass.async_add_executor_job(
            partial(repository.count_items_master, self._db_path)
        )


class InventoryLowStockSensor(SensorEntity):
    
    def __init__(self, hass, db_path):
        self._hass = hass
        self._db_path = db_path
        self._state = 0
        self._items = []
        self._attr_name = f"{INTEGRATION_NAME}: Low stock"
        self._attr_unique_id = f"{DOMAIN}_low_stock"
        self._attr_icon = "mdi:alert-circle"

    @property
    def state(self):
        return self._state

    @property
    def extra_state_attributes(self):
        return {
            "unit_of_measurement": "items",
            "items": self._items,
        }

    async def async_update(self):
        devreload.reload_if_changed(repository)
        self._state, self._items = await self._hass.async_add_executor_job(
            partial(repository.list_low_stock_sensor, self._db_path)
        )


class InventoryTrackedItemsSensor(SensorEntity):
    
    def __init__(self, hass, db_path):
        self._hass = hass
        self._db_path = db_path
        self._state = 0
        self._items = []
        self._attr_name = f"{INTEGRATION_NAME}: Tracked items"
        self._attr_unique_id = f"{DOMAIN}_tracked_items"
        self._attr_icon = "mdi:playlist-check"

    @property
    def state(self):
        return self._state

    @property
    def extra_state_attributes(self):
        return {
            "unit_of_measurement": "items",
            "items": self._items,
        }

    async def async_update(self):
        devreload.reload_if_changed(repository)
        self._state, self._items = await self._hass.async_add_executor_job(
            partial(repository.list_tracked_sensor, self._db_path)
        )
