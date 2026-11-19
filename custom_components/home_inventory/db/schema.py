import sqlite3
import logging
import json
from datetime import date, timedelta
from typing import Optional
from ..const import CURRENT_DB_VERSION
from .backup import backup_data

_LOGGER = logging.getLogger(__name__)

def get_db_version(conn: sqlite3.Connection) -> int:
    """Get the current database version"""
    try:
        cur = conn.cursor()
        cur.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        row = cur.fetchone()
        return row[0] if row else 0
    except sqlite3.OperationalError:
        return 0

def set_db_version(conn: sqlite3.Connection, version: int):
    """Set the database version"""
    cur = conn.cursor()
    cur.execute("INSERT INTO schema_version (version, applied_at) VALUES (?, CURRENT_TIMESTAMP)", (version,))
    conn.commit()

def migrate_to_v1(conn: sqlite3.Connection):
    """Initial migration - original schema"""
    _LOGGER.info("[DB Migration] Applying v1 schema...")
    cur = conn.cursor()
    
    cur.executescript('''
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cupboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image TEXT,
            room_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            UNIQUE(name, room_id)
        );

        CREATE TABLE IF NOT EXISTS shelves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cupboard_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cupboard_id) REFERENCES cupboards(id) ON DELETE CASCADE,
            UNIQUE(name, cupboard_id)
        );

        CREATE TABLE IF NOT EXISTS organizers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image TEXT,
            shelf_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
            UNIQUE(name, shelf_id)
        );

        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            aliases TEXT,
            image TEXT,
            shelf_id INTEGER NOT NULL,
            organizer_id INTEGER DEFAULT NULL,
            quantity INTEGER DEFAULT NULL,
            min_quantity INTEGER DEFAULT NULL,
            track_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
            FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_cupboards_room ON cupboards(room_id);
        CREATE INDEX IF NOT EXISTS idx_shelves_cupboard ON shelves(cupboard_id);
        CREATE INDEX IF NOT EXISTS idx_organizers_shelf ON organizers(shelf_id);
        CREATE INDEX IF NOT EXISTS idx_items_shelf ON items(shelf_id);
        CREATE INDEX IF NOT EXISTS idx_items_organizer ON items(organizer_id);
        CREATE INDEX IF NOT EXISTS idx_items_quantity ON items(quantity);
    ''')
    
    conn.commit()
    set_db_version(conn, 1)
    _LOGGER.info("[DB Migration] ✅ v1 schema applied")

def create_expiration_batch(quantity: int) -> Optional[str]:
    if quantity is None or quantity <= 0:
        return None
    
    batch = [{"quantity": quantity, "date": None}]
    return json.dumps(batch, ensure_ascii=False)

def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, decl: str) -> bool:
    """Add a column unless it already exists (safe to re-run after a failed migration)."""
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute(f"PRAGMA table_info({table})").fetchall()}
    if column in existing:
        return False
    cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
    _LOGGER.info(f"[DB Migration] Added column {table}.{column}")
    return True

def ensure_variant_barcodes_table(conn: sqlite3.Connection):
    """Per-variant barcodes (idempotent; runs on every start, DB version unchanged)."""
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS item_variant_barcodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            variant TEXT NOT NULL,
            barcode TEXT NOT NULL UNIQUE,
            FOREIGN KEY (item_id) REFERENCES items_master(id) ON DELETE CASCADE,
            UNIQUE (item_id, variant)
        );
        CREATE INDEX IF NOT EXISTS idx_variant_barcodes_item ON item_variant_barcodes(item_id);
    ''')
    conn.commit()


def migrate_to_v2(conn: sqlite3.Connection):
    """Migration to v2 - multi-location, barcode, expiration dates JSON, per-location images"""
    _LOGGER.info("[DB Migration] Applying v2 schema...")
    cur = conn.cursor()
    
    # Drop partial tables if they exist (from earlier failed migrations)
    _LOGGER.info("[DB Migration] Cleaning up any partial tables from previous failed migrations...")
    cur.execute("DROP TABLE IF EXISTS item_locations")
    cur.execute("DROP TABLE IF EXISTS items_master")
    conn.commit()
    
    # Create the master items table (without a specific location)
    cur.executescript('''
        -- Master table for items (no location, with default image)
        CREATE TABLE items_master (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            aliases TEXT,
            default_image TEXT,
            barcode TEXT UNIQUE,
            min_quantity INTEGER DEFAULT NULL,
            track_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
                      
        CREATE UNIQUE INDEX idx_items_master_name_aliases
        ON items_master(name, COALESCE(aliases, ''));
        
        -- Table for item locations with quantities and location-specific image
        CREATE TABLE item_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            shelf_id INTEGER NOT NULL,
            organizer_id INTEGER DEFAULT NULL,
            quantity INTEGER DEFAULT NULL,
            expiration_dates TEXT DEFAULT NULL,
            image TEXT,
            variant TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items_master(id) ON DELETE CASCADE,
            FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
            FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_item_locations_item ON item_locations(item_id);
        CREATE INDEX idx_item_locations_shelf ON item_locations(shelf_id);
        CREATE INDEX idx_item_locations_organizer ON item_locations(organizer_id);
        CREATE INDEX idx_items_master_barcode ON items_master(barcode);
    ''')
    
    _LOGGER.info("[DB Migration] Migrating existing items...")

    # Normalize empty strings to NULL for all text columns
    _LOGGER.info("[DB Migration] Normalizing empty strings to NULL...")
    cur.execute("UPDATE items SET aliases = NULL WHERE aliases = '' OR TRIM(aliases) = ''")
    cur.execute("UPDATE items SET image = NULL WHERE image = '' OR TRIM(image) = ''")
    conn.commit()

    # Check whether there is data to migrate
    cur.execute("SELECT COUNT(*) FROM items")
    item_count = cur.fetchone()[0]

    if item_count > 0:
        _LOGGER.info(f"[DB Migration] Found {item_count} items to migrate")

        # Insert unique items into items_master, grouped by (name, aliases)
        # Use the first image found as default_image
        cur.execute('''
            INSERT INTO items_master (name, aliases, default_image, min_quantity, track_quantity, created_at)
            SELECT
                name,
                aliases,
                (SELECT image FROM items i2
                 WHERE i2.name = items.name
                   AND i2.aliases IS items.aliases
                   AND i2.image IS NOT NULL
                 LIMIT 1) as default_image,
                min_quantity,
                track_quantity,
                MIN(created_at)
            FROM items
            GROUP BY name, aliases
        ''')

        items_master_count = cur.rowcount
        _LOGGER.info(f"[DB Migration] Created {items_master_count} unique items in items_master")

        # Identify item masters that have at least one item with track_quantity=1
        _LOGGER.info("[DB Migration] Identifying items with mixed track_quantity...")
        cur.execute('''
            SELECT DISTINCT im.id
            FROM items_master im
            JOIN items i ON i.name = im.name AND i.aliases IS im.aliases
            WHERE i.track_quantity = 1
        ''')
        tracked_master_ids = set(row[0] for row in cur.fetchall())
        _LOGGER.info(f"[DB Migration] Found {len(tracked_master_ids)} items that have tracked instances")

        # Migrate locations in 3 different ways:
        # 1. Fully non-tracked items (track_quantity=0 for all instances)
        # 2. Tracked items (track_quantity=1): one row per old row (no merging)
        # 3. Non-tracked items under a tracked master: special handling with quantity=1 if they have an image

        _LOGGER.info("[DB Migration] Migrating fully non-tracked items as separate locations...")
        cur.execute('''
            INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, expiration_dates, image, created_at)
            SELECT
                im.id,
                i.shelf_id,
                i.organizer_id,
                NULL as quantity,
                NULL as expiration_dates,
                i.image,
                i.created_at
            FROM items i
            JOIN items_master im ON i.name = im.name AND i.aliases IS im.aliases
            WHERE i.track_quantity = 0
              AND im.id NOT IN ({})
              AND EXISTS (SELECT 1 FROM shelves WHERE id = i.shelf_id)
              AND (i.organizer_id IS NULL OR EXISTS (SELECT 1 FROM organizers WHERE id = i.organizer_id))
        '''.format(','.join(map(str, tracked_master_ids)) if tracked_master_ids else '-1'))

        fully_non_tracked_locations = cur.rowcount
        _LOGGER.info(f"[DB Migration] Created {fully_non_tracked_locations} locations for fully non-tracked items")

        _LOGGER.info("[DB Migration] Migrating tracked items (track_quantity=1), one location row per old row...")
        tracked_locations = []
        locations_with_batches = 0
        total_quantity_migrated = 0

        for master_id in tracked_master_ids:
            cur.execute('''
                SELECT
                    i.shelf_id,
                    i.organizer_id,
                    i.quantity,
                    i.image,
                    i.created_at
                FROM items i
                JOIN items_master im ON i.name = im.name AND i.aliases IS im.aliases
                WHERE im.id = ? AND i.track_quantity = 1
                  AND EXISTS (SELECT 1 FROM shelves WHERE id = i.shelf_id)
                  AND (i.organizer_id IS NULL OR EXISTS (SELECT 1 FROM organizers WHERE id = i.organizer_id))
                ORDER BY i.id
            ''', (master_id,))

            for shelf_id, organizer_id, quantity, image, created_at in cur.fetchall():
                tracked_locations.append((master_id, shelf_id, organizer_id, quantity, image, created_at))

                qty = quantity if quantity else None  # 0 -> NULL
                expiration_dates_json = None
                if qty is not None and qty > 0:
                    expiration_dates_json = create_expiration_batch(qty)
                    locations_with_batches += 1
                    total_quantity_migrated += qty

                cur.execute('''
                    INSERT INTO item_locations
                    (item_id, shelf_id, organizer_id, quantity, expiration_dates, image, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (master_id, shelf_id, organizer_id, qty, expiration_dates_json, image, created_at))

        tracked_locations_count = len(tracked_locations)
        _LOGGER.info(f"[DB Migration] Created {tracked_locations_count} locations for tracked items")

        # Migrate non-tracked items that are under a tracked master
        _LOGGER.info("[DB Migration] Migrating non-tracked items under tracked masters...")
        non_tracked_under_tracked_with_image = 0
        non_tracked_under_tracked_without_image = 0

        for master_id in tracked_master_ids:
            cur.execute('''
                SELECT
                    ? as item_id,
                    i.shelf_id,
                    i.organizer_id,
                    i.image,
                    i.created_at
                FROM items i
                JOIN items_master im ON i.name = im.name AND i.aliases IS im.aliases
                WHERE im.id = ? AND i.track_quantity = 0
                  AND EXISTS (SELECT 1 FROM shelves WHERE id = i.shelf_id)
                  AND (i.organizer_id IS NULL OR EXISTS (SELECT 1 FROM organizers WHERE id = i.organizer_id))
            ''', (master_id, master_id))

            for item_id, shelf_id, organizer_id, image, created_at in cur.fetchall():
                if image is not None:
                    # Item with image → treat as quantity=1
                    expiration_dates_json = create_expiration_batch(1)
                    quantity = 1
                    non_tracked_under_tracked_with_image += 1
                    total_quantity_migrated += 1
                    locations_with_batches += 1
                else:
                    # Item without image → quantity=NULL
                    expiration_dates_json = None
                    quantity = None
                    non_tracked_under_tracked_without_image += 1

                cur.execute('''
                    INSERT INTO item_locations
                    (item_id, shelf_id, organizer_id, quantity, expiration_dates, image, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (item_id, shelf_id, organizer_id, quantity, expiration_dates_json, image, created_at))

        _LOGGER.info(
            f"[DB Migration] Created {non_tracked_under_tracked_with_image} non-tracked locations with images (quantity=1) "
            f"and {non_tracked_under_tracked_without_image} without images (quantity=NULL) under tracked masters"
        )

        locations_count = fully_non_tracked_locations + tracked_locations_count + non_tracked_under_tracked_with_image + non_tracked_under_tracked_without_image
        _LOGGER.info(f"[DB Migration] Total locations created: {locations_count}")
        _LOGGER.info(
            f"[DB Migration] ✅ Converted {locations_with_batches} locations with quantities "
            f"to expiration_dates JSON format (total: {total_quantity_migrated} items)"
        )

        # Informational: (item, location) pairs that now hold several rows (variants)
        cur.execute('''
            SELECT item_id, shelf_id, organizer_id, COUNT(*) AS row_count
            FROM item_locations
            GROUP BY item_id, shelf_id, organizer_id
            HAVING row_count > 1
        ''')
        multi_row_locations = cur.fetchall()
        if multi_row_locations:
            _LOGGER.info(
                f"[DB Migration] {len(multi_row_locations)} (item, location) pairs have multiple rows "
                f"(kept separate, each with its own quantity and image)"
            )
            for item_id, shelf_id, organizer_id, row_count in multi_row_locations[:5]:
                org_info = f" (organizer {organizer_id})" if organizer_id else ""
                _LOGGER.info(f"  - Item {item_id} in shelf {shelf_id}{org_info}: {row_count} rows")
            if len(multi_row_locations) > 5:
                _LOGGER.info(f"  ... and {len(multi_row_locations) - 5} more")

        # Report items with mixed track_quantity
        if non_tracked_under_tracked_with_image > 0 or non_tracked_under_tracked_without_image > 0:
            _LOGGER.info(
                f"[DB Migration] Found {len(tracked_master_ids)} items with mixed track_quantity values. "
                f"Non-tracked items with images were converted to quantity=1."
            )
        
        # Check for items that couldn't be migrated due to invalid foreign keys
        cur.execute('''
            SELECT COUNT(*) FROM items i
            WHERE NOT EXISTS (SELECT 1 FROM shelves WHERE id = i.shelf_id)
               OR (i.organizer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizers WHERE id = i.organizer_id))
        ''')
        skipped_items = cur.fetchone()[0]
        
        if skipped_items > 0:
            _LOGGER.warning(
                f"[DB Migration] ⚠️  Skipped {skipped_items} items with invalid shelf/organizer references. "
                f"This usually happens when shelves/organizers were deleted but items weren't cleaned up."
            )
        
        # Report image statistics
        cur.execute('''
            SELECT COUNT(*) FROM item_locations WHERE image IS NOT NULL AND image != ''
        ''')
        locations_with_images = cur.fetchone()[0]
        
        cur.execute('''
            SELECT COUNT(*) FROM items_master WHERE default_image IS NOT NULL AND default_image != ''
        ''')
        masters_with_images = cur.fetchone()[0]
        
        _LOGGER.info(f"[DB Migration] Images: {masters_with_images} default images, {locations_with_images} location-specific images")

        # Report final statistics
        _LOGGER.info(
            f"[DB Migration] Summary: {item_count} original items → "
            f"{items_master_count} unique items → {locations_count} locations "
            f"({skipped_items} skipped due to invalid references)"
        )
        
        cur.execute('''
            SELECT im.name, COUNT(il.id) as location_count
            FROM items_master im
            JOIN item_locations il ON im.id = il.item_id
            GROUP BY im.id
            HAVING location_count > 1
        ''')
        
        multi_location_items = cur.fetchall()
        if multi_location_items:
            _LOGGER.info(f"[DB Migration] Found {len(multi_location_items)} items in multiple locations:")
            for item_name, loc_count in multi_location_items[:5]:  # Show the first 5
                _LOGGER.info(f"  - '{item_name}': {loc_count} locations")
            if len(multi_location_items) > 5:
                _LOGGER.info(f"  ... and {len(multi_location_items) - 5} more")
        
        _LOGGER.info("[DB Migration] ✅ Data migration completed")
    
    cur.execute("ALTER TABLE items RENAME TO items_old_v1")

    # Custom images for rooms and shelves (cupboards/organizers already have one)
    _add_column_if_missing(conn, "item_locations", "variant", "TEXT")
    _add_column_if_missing(conn, "rooms", "image", "TEXT")
    _add_column_if_missing(conn, "shelves", "image", "TEXT")
    ensure_variant_barcodes_table(conn)

    conn.commit()
    set_db_version(conn, 2)
    _LOGGER.info("[DB Migration] ✅ v2 schema applied")

def _has_user_tables(conn: sqlite3.Connection) -> bool:
    """True if the DB already holds data (2.0.x DBs have tables but no schema_version, i.e. version 0)."""
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1"
    ).fetchone() is not None

def initialize_db(db_path: str, data_dir: Optional[str] = None, backup_dir: Optional[str] = None):
    """Initialize or migrate the database.

    With ``data_dir`` and ``backup_dir`` an existing DB is zipped into ``backup_dir``
    before any migration runs; if the backup fails the migration is not applied.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Configure the PRAGMAs
    pragmas = {
        "journal_mode": "WAL",
        "synchronous": "NORMAL",
        "cache_size": "-64000",
        "temp_store": "MEMORY",
        "mmap_size": "268435456",
        "foreign_keys": "ON"
    }
    
    for pragma, value in pragmas.items():
        cur.execute(f"PRAGMA {pragma}={value}")
        result = cur.execute(f"PRAGMA {pragma}").fetchone()
        _LOGGER.debug(f"[DB] {pragma} = {result[0]}")

    current_version = get_db_version(conn)
    _LOGGER.info(f"[DB] Current version: {current_version}, Target version: {CURRENT_DB_VERSION}")
    
    if data_dir and backup_dir and current_version < CURRENT_DB_VERSION and _has_user_tables(conn):
        try:
            zip_path = backup_data(conn, data_dir, backup_dir)
        except Exception:
            conn.close()
            _LOGGER.exception("[DB] Pre-migration backup failed, migration NOT applied")
            raise
        _LOGGER.warning(f"[DB] Backup created before migration: {zip_path}")

    if current_version < 1:
        migrate_to_v1(conn)
        current_version = 1
    
    if current_version < 2:
        migrate_to_v2(conn)
        current_version = 2
    
    ensure_variant_barcodes_table(conn)

    if current_version == CURRENT_DB_VERSION:
        _LOGGER.info(f"[DB] ✅ Database is up to date (v{CURRENT_DB_VERSION})")
    
    conn.close()