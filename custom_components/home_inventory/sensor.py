import logging
import os
from functools import partial
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.components.sensor import SensorEntity
from datetime import date, timedelta
from .const import (
    CONF_EXPIRY_UNIT,
    CONF_EXPIRY_VALUE,
    DB_PATH,
    DEFAULT_EXPIRY_UNIT,
    DEFAULT_EXPIRY_VALUE,
    DOMAIN,
    EVENT_EXPIRING_SOON,
    INTEGRATION_NAME,
)
from .db import repository, devreload

_LOGGER = logging.getLogger(__name__)
SCAN_INTERVAL = timedelta(minutes=1)

async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities):
    db_path = hass.config.path(DB_PATH)
    
    sensors = [
        InventoryTotalItemsSensor(hass, db_path),
        InventoryLowStockSensor(hass, db_path),
        InventoryTrackedItemsSensor(hass, db_path),
        InventoryExpiringBatchesSensor(hass, db_path, entry),
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


MAX_ATTR_BATCHES = 50  # cap on the `batches` attribute; the state keeps the full count


class InventoryExpiringBatchesSensor(SensorEntity):
    """Batches expiring within the configured window (options: value + days/months).

    Fires ``home_inventory_expiring_soon`` whenever batches enter the window
    (once per batch until it leaves the window or HA restarts).
    """

    # The (potentially large) batch list is not worth keeping in recorder history
    _unrecorded_attributes = frozenset({"batches"})

    def __init__(self, hass, db_path, entry):
        self._hass = hass
        self._db_path = db_path
        self._entry = entry
        self._signature = None
        self._state = 0
        self._batches = []
        self._expired_count = 0
        self._window = {}
        self._notified = set()
        self._attr_name = f"{INTEGRATION_NAME}: Expiring batches"
        self._attr_unique_id = f"{DOMAIN}_expiring_batches"
        self._attr_icon = "mdi:calendar-alert"

    @property
    def state(self):
        return self._state

    @property
    def extra_state_attributes(self):
        return {
            "unit_of_measurement": "batches",
            "batches": self._batches,
            "expired_count": self._expired_count,
            **self._window,
        }

    def _db_stamp(self):
        stamp = []
        for suffix in ("", "-wal"):
            try:
                st = os.stat(self._db_path + suffix)
                stamp.append((st.st_mtime_ns, st.st_size))
            except OSError:
                stamp.append(None)
        return tuple(stamp)

    async def async_update(self):
        devreload.reload_if_changed(repository)
        options = self._entry.options
        value = int(options.get(CONF_EXPIRY_VALUE, DEFAULT_EXPIRY_VALUE))
        unit = options.get(CONF_EXPIRY_UNIT, DEFAULT_EXPIRY_UNIT)
        today = date.today()

        # Skip the query when nothing relevant changed (day, options, DB files).
        # The DB runs in WAL mode, so writes touch the -wal file first.
        signature = (today, value, unit, await self._hass.async_add_executor_job(self._db_stamp))
        if signature == self._signature:
            return
        threshold = repository.expiry_threshold(today, value, unit)

        batches = await self._hass.async_add_executor_job(
            partial(repository.list_expiring_batches, self._db_path, today, threshold)
        )
        self._batches = batches[:MAX_ATTR_BATCHES]
        self._expired_count = sum(1 for b in batches if b["expired"])
        self._state = len(batches)
        self._window = {
            "warning_value": value,
            "warning_unit": unit,
            "warning_until": threshold.strftime("%Y/%m/%d"),
        }

        self._signature = signature

        keys = {(b["location_id"], b["date"]) for b in batches}
        new = [b for b in batches if (b["location_id"], b["date"]) not in self._notified]
        self._notified = keys  # batches that left the window can notify again if re-added
        if new:
            _LOGGER.debug("Expiring batches entering window: %d", len(new))
            self._hass.bus.async_fire(EVENT_EXPIRING_SOON, {
                "count": len(new),
                "total_count": len(batches),
                "batches": new,
                **self._window,
            })
