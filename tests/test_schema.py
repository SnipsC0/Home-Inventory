import json
import sqlite3

from home_inventory.const import CURRENT_DB_VERSION
from home_inventory.db.schema import (
    create_expiration_batch,
    get_db_version,
    initialize_db,
    migrate_to_v1,
    migrate_to_v2,
)


def _tables(path):
    conn = sqlite3.connect(path)
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    conn.close()
    return {r[0] for r in rows}


def _version(path):
    conn = sqlite3.connect(path)
    v = get_db_version(conn)
    conn.close()
    return v


# --- initialize_db -----------------------------------------------------------

def test_fresh_db_is_at_current_version(tmp_path):
    path = str(tmp_path / "t.db")
    initialize_db(path)
    assert _version(path) == CURRENT_DB_VERSION == 2
    assert {"schema_version", "rooms", "cupboards", "shelves", "organizers",
            "items_master", "item_locations", "items_old_v1"} <= _tables(path)
    assert "items" not in _tables(path)


def test_initialize_is_idempotent_and_keeps_data(db_path, seed, q):
    ids = seed(db_path, "Bucatarie", "Dulap", "Raft")
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name) VALUES ('Orez')")
    conn.execute("INSERT INTO item_locations (item_id, shelf_id) VALUES (1, ?)", (ids["shelf_id"],))
    conn.commit()
    conn.close()

    initialize_db(db_path)

    assert _version(db_path) == 2
    assert q(db_path, "SELECT name FROM items_master") == [("Orez",)]
    assert q(db_path, "SELECT COUNT(*) FROM item_locations") == [(1,)]


def test_get_db_version_without_table_is_zero(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "empty.db"))
    assert get_db_version(conn) == 0
    conn.close()


# --- create_expiration_batch -------------------------------------------------

def test_create_expiration_batch():
    assert create_expiration_batch(None) is None
    assert create_expiration_batch(0) is None
    assert create_expiration_batch(-3) is None
    assert json.loads(create_expiration_batch(4)) == [{"quantity": 4, "date": None}]


# --- migrate v1 -> v2 with legacy data ----------------------------------------

def _v1_db(tmp_path):
    path = str(tmp_path / "legacy.db")
    conn = sqlite3.connect(path)
    migrate_to_v1(conn)
    cur = conn.cursor()
    cur.execute("INSERT INTO rooms (id, name) VALUES (1, 'Bucatarie')")
    cur.execute("INSERT INTO cupboards (id, name, room_id) VALUES (1, 'Dulap', 1)")
    cur.execute("INSERT INTO shelves (id, name, cupboard_id) VALUES (1, 'Raft1', 1)")
    cur.execute("INSERT INTO shelves (id, name, cupboard_id) VALUES (2, 'Raft2', 1)")
    cur.execute("INSERT INTO organizers (id, name, shelf_id) VALUES (1, 'Cutie', 1)")
    conn.commit()
    return path, conn


def _add_v1_item(conn, name, shelf_id, *, aliases=None, image=None, organizer_id=None,
                 quantity=None, min_quantity=None, track=0):
    conn.execute(
        "INSERT INTO items (name, aliases, image, shelf_id, organizer_id, quantity, min_quantity, track_quantity) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (name, aliases, image, shelf_id, organizer_id, quantity, min_quantity, track),
    )
    conn.commit()


def _migrate(conn, path):
    migrate_to_v2(conn)
    conn.close()
    assert _version(path) == 2


def test_v2_groups_items_by_name_and_aliases(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Sare", 1)
    _add_v1_item(conn, "Sare", 2)
    _add_v1_item(conn, "Sare", 1, aliases="grunjoasa")
    _migrate(conn, path)

    masters = q(path, "SELECT name, aliases FROM items_master ORDER BY aliases")
    assert masters == [("Sare", None), ("Sare", "grunjoasa")]
    # non-tracked: one location row per legacy item
    assert q(path, "SELECT COUNT(*) FROM item_locations") == [(3,)]
    assert q(path, "SELECT COUNT(*) FROM item_locations WHERE quantity IS NOT NULL") == [(0,)]


def test_v2_normalizes_empty_aliases_and_image(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Piper", 1, aliases="  ", image="")
    _add_v1_item(conn, "Piper", 2)
    _migrate(conn, path)

    assert q(path, "SELECT name, aliases, default_image FROM items_master") == [("Piper", None, None)]
    assert q(path, "SELECT COUNT(*) FROM item_locations") == [(2,)]


def test_v2_sums_tracked_duplicates_in_same_location(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Orez", 1, quantity=2, min_quantity=1, track=1)
    _add_v1_item(conn, "Orez", 1, quantity=3, min_quantity=1, track=1)
    _add_v1_item(conn, "Orez", 2, quantity=5, min_quantity=1, track=1)
    _migrate(conn, path)

    rows = q(path, "SELECT shelf_id, quantity, expiration_dates FROM item_locations ORDER BY shelf_id")
    assert [(r[0], r[1]) for r in rows] == [(1, 5), (2, 5)]
    for _, qty, exp in rows:
        assert json.loads(exp) == [{"quantity": qty, "date": None}]
    assert q(path, "SELECT track_quantity FROM items_master") == [(1,)]


def test_v2_tracked_zero_quantity_becomes_null(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Faina", 1, quantity=0, track=1)
    _migrate(conn, path)

    assert q(path, "SELECT quantity, expiration_dates FROM item_locations") == [(None, None)]


def test_v2_non_tracked_under_tracked_master(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Ulei", 1, quantity=4, track=1)
    _add_v1_item(conn, "Ulei", 2, image="ulei.jpg", track=0)
    _add_v1_item(conn, "Ulei", 2, track=0)
    _migrate(conn, path)

    assert q(path, "SELECT COUNT(*) FROM items_master") == [(1,)]
    rows = q(path, "SELECT shelf_id, quantity, expiration_dates, image FROM item_locations ORDER BY id")
    assert rows[0][:2] == (1, 4)
    with_image = [r for r in rows if r[3] == "ulei.jpg"]
    without_image = [r for r in rows if r[0] == 2 and r[3] is None]
    assert len(with_image) == 1 and with_image[0][1] == 1
    assert json.loads(with_image[0][2]) == [{"quantity": 1, "date": None}]
    assert len(without_image) == 1 and without_image[0][1] is None and without_image[0][2] is None


def test_v2_skips_items_with_invalid_references(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Valid", 1)
    _add_v1_item(conn, "OrfanRaft", 99)
    _add_v1_item(conn, "OrfanOrganizer", 1, organizer_id=99)
    _add_v1_item(conn, "OrfanTracked", 99, quantity=2, track=1)
    _migrate(conn, path)

    located = q(path, "SELECT im.name FROM item_locations il JOIN items_master im ON il.item_id = im.id")
    assert located == [("Valid",)]
    assert q(path, "SELECT COUNT(*) FROM items_old_v1") == [(4,)]


def test_v2_keeps_organizer_and_default_image(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Cleste", 1, organizer_id=1, image="cleste.jpg")
    _migrate(conn, path)

    assert q(path, "SELECT default_image FROM items_master") == [("cleste.jpg",)]
    assert q(path, "SELECT shelf_id, organizer_id, image FROM item_locations") == [(1, 1, "cleste.jpg")]


def test_initialize_db_migrates_existing_v1_db(tmp_path, q):
    path, conn = _v1_db(tmp_path)
    _add_v1_item(conn, "Zahar", 1, quantity=1, track=1)
    conn.close()

    initialize_db(path)

    assert _version(path) == 2
    assert q(path, "SELECT name FROM items_master") == [("Zahar",)]
