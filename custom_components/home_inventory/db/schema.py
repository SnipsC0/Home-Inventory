import sqlite3
import logging

_LOGGER = logging.getLogger(__name__)

def initialize_db(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    pragmas = {
        "journal_mode": "WAL",
        "synchronous": "NORMAL",
        "cache_size": "-64000",
        "temp_store": "MEMORY",
        "mmap_size": "268435456"
    }
    
    for pragma, value in pragmas.items():
        cur.execute(f"PRAGMA {pragma}={value}")
        result = cur.execute(f"PRAGMA {pragma}").fetchone()
        _LOGGER.debug(f"[DB] {pragma} = {result[0]}")

    cur.executescript('''
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
    conn.close()