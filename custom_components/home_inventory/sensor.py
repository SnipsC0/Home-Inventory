import sqlite3, logging
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.components.sensor import SensorEntity
from datetime import timedelta
from .const import DOMAIN, DB_PATH, INTEGRATION_NAME

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
        def fetch():
            conn = sqlite3.connect(self._db_path)
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM items")
            count = cur.fetchone()[0]
            conn.close()
            return count
        
        self._state = await self._hass.async_add_executor_job(fetch)


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
        def fetch():
            conn = sqlite3.connect(self._db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT 
                    i.id, i.name, i.quantity, i.min_quantity,
                    r.name as room, c.name as cupboard, s.name as shelf
                FROM items i
                JOIN shelves s ON i.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE i.track_quantity = 1 
                  AND i.quantity IS NOT NULL 
                  AND i.min_quantity IS NOT NULL
                  AND i.quantity <= i.min_quantity
                ORDER BY i.quantity ASC
            ''')
            rows = cur.fetchall()
            conn.close()
            
            items = [{
                "id": r[0],
                "name": r[1],
                "quantity": r[2],
                "min_quantity": r[3],
                "room": r[4],
                "cupboard": r[5],
                "shelf": r[6],
                "location": f"{r[4]} / {r[5]} / {r[6]}"
            } for r in rows]
            
            return len(items), items
        
        self._state, self._items = await self._hass.async_add_executor_job(fetch)


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
        def fetch():
            conn = sqlite3.connect(self._db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT 
                    i.id, i.name, i.quantity, i.min_quantity,
                    r.name as room, c.name as cupboard, s.name as shelf
                FROM items i
                JOIN shelves s ON i.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE i.track_quantity = 1
                    AND i.min_quantity IS NOT NULL
                ORDER BY i.name
            ''')
            rows = cur.fetchall()
            conn.close()
            
            items = [{
                "id": r[0],
                "name": r[1],
                "quantity": r[2],
                "min_quantity": r[3],
                "room": r[4],
                "cupboard": r[5],
                "shelf": r[6],
                "is_low": r[2] is not None and r[3] is not None and r[2] <= r[3]
            } for r in rows]
            
            return len(items), items
        
        self._state, self._items = await self._hass.async_add_executor_job(fetch)