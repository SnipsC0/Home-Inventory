DOMAIN = "home_inventory"
INTEGRATION_NAME = "Home Inventory"
DB_PATH = f"data/{DOMAIN}/db/inventar.db"
CURRENT_DB_VERSION = 2

# Expiry warning (options): window = value + unit before a batch's date
CONF_EXPIRY_VALUE = "expiry_warning_value"
CONF_EXPIRY_UNIT = "expiry_warning_unit"
EXPIRY_UNITS = ("days", "months")
EXPIRY_MAX = {"days": 31, "months": 12}
DEFAULT_EXPIRY_VALUE = 7
DEFAULT_EXPIRY_UNIT = "days"
EVENT_EXPIRING_SOON = "home_inventory_expiring_soon"

# Recycle bin (options): days a deleted entry stays restorable
CONF_TRASH_RETENTION = "trash_retention_days"
DEFAULT_TRASH_RETENTION = 7
TRASH_RETENTION_MAX = 90
TRASH_PURGE_INTERVAL_HOURS = 6
