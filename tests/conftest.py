"""Pytest setup for Home Inventory backend tests.

The integration package's ``__init__.py`` imports Home Assistant. To test the
pure DB layer without HA installed, we register a stub ``home_inventory``
package whose ``__path__`` points at the integration folder, so submodules
(``home_inventory.const``, ``home_inventory.db.schema``, ...) import normally
while ``__init__.py`` is never executed.
"""
import sqlite3
import sys
import types
from pathlib import Path

import pytest

INTEGRATION_DIR = (
    Path(__file__).resolve().parent.parent / "custom_components" / "home_inventory"
)

if "home_inventory" not in sys.modules:
    _pkg = types.ModuleType("home_inventory")
    _pkg.__path__ = [str(INTEGRATION_DIR)]
    sys.modules["home_inventory"] = _pkg

from home_inventory.db.schema import initialize_db  # noqa: E402


@pytest.fixture
def db_path(tmp_path):
    """Fresh, fully migrated (v2) database."""
    path = str(tmp_path / "test.db")
    initialize_db(path)
    return path


def _get_or_create(cur, table, name, parent_col=None, parent_id=None):
    if parent_col:
        cur.execute(
            f"SELECT id FROM {table} WHERE name = ? AND {parent_col} = ?",
            (name, parent_id),
        )
    else:
        cur.execute(f"SELECT id FROM {table} WHERE name = ?", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    if parent_col:
        cur.execute(
            f"INSERT INTO {table} (name, {parent_col}) VALUES (?, ?)",
            (name, parent_id),
        )
    else:
        cur.execute(f"INSERT INTO {table} (name) VALUES (?)", (name,))
    return cur.lastrowid


def seed_location(db_path, room, cupboard, shelf, organizer=None):
    """Create (or reuse) a room/cupboard/shelf[/organizer] chain; return ids."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    room_id = _get_or_create(cur, "rooms", room)
    cupboard_id = _get_or_create(cur, "cupboards", cupboard, "room_id", room_id)
    shelf_id = _get_or_create(cur, "shelves", shelf, "cupboard_id", cupboard_id)
    organizer_id = None
    if organizer:
        organizer_id = _get_or_create(cur, "organizers", organizer, "shelf_id", shelf_id)
    conn.commit()
    conn.close()
    return {
        "room_id": room_id,
        "cupboard_id": cupboard_id,
        "shelf_id": shelf_id,
        "organizer_id": organizer_id,
    }


@pytest.fixture
def seed():
    return seed_location


def query(db_path, sql, params=()):
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


@pytest.fixture
def q():
    return query
