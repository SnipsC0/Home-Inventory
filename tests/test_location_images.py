"""Room/shelf images (added in migrate_to_v2) and QR/NFC location resolution."""
import sqlite3

from home_inventory.db.repository import (
    create_room,
    create_shelf,
    delete_cupboard,
    delete_room,
    delete_shelf,
    list_rooms,
    list_shelves,
    resolve_location,
    update_room,
    update_shelf,
)
from home_inventory.db.schema import (
    _add_column_if_missing,
    get_db_version,
    initialize_db,
    migrate_to_v1,
    migrate_to_v2,
)


def _columns(path, table):
    conn = sqlite3.connect(path)
    cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    conn.close()
    return cols


def _legacy_203_db(tmp_path):
    """v1 schema with data but no schema_version table, like a 2.0.3 install."""
    path = str(tmp_path / "legacy203.db")
    conn = sqlite3.connect(path)
    migrate_to_v1(conn)
    conn.execute("DROP TABLE schema_version")
    conn.execute("INSERT INTO rooms (id, name) VALUES (1, 'Bucătărie')")
    conn.execute("INSERT INTO cupboards (id, name, room_id, image) VALUES (1, 'Dulap', 1, 'c.jpg')")
    conn.execute("INSERT INTO shelves (id, name, cupboard_id) VALUES (1, 'Raft', 1)")
    conn.execute("INSERT INTO items (name, shelf_id) VALUES ('Orez', 1)")
    conn.commit()
    conn.close()
    return path


# --- migration ---------------------------------------------------------------

def test_legacy_203_db_gets_image_columns(tmp_path, q):
    path = _legacy_203_db(tmp_path)
    assert "image" not in _columns(path, "rooms")

    initialize_db(path)

    conn = sqlite3.connect(path)
    assert get_db_version(conn) == 2
    conn.close()
    assert "image" in _columns(path, "rooms")
    assert "image" in _columns(path, "shelves")
    assert q(path, "SELECT name, image FROM rooms") == [("Bucătărie", None)]
    assert q(path, "SELECT name, image FROM cupboards") == [("Dulap", "c.jpg")]
    assert q(path, "SELECT COUNT(*) FROM item_locations") == [(1,)]


def test_fresh_db_has_image_columns(db_path):
    assert "image" in _columns(db_path, "rooms")
    assert "image" in _columns(db_path, "shelves")


def test_add_column_if_missing_is_idempotent(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "t.db"))
    conn.execute("CREATE TABLE rooms (id INTEGER PRIMARY KEY, name TEXT)")
    assert _add_column_if_missing(conn, "rooms", "image", "TEXT") is True
    assert _add_column_if_missing(conn, "rooms", "image", "TEXT") is False
    conn.close()


def test_migrate_v2_after_partial_failed_run(tmp_path):
    """Columns already added by an earlier, interrupted v2 run must not break a retry."""
    path = _legacy_203_db(tmp_path)
    conn = sqlite3.connect(path)
    migrate_to_v1(conn)  # what initialize_db runs first for a version-0 DB
    conn.execute("ALTER TABLE rooms ADD COLUMN image TEXT")
    conn.commit()

    migrate_to_v2(conn)

    assert get_db_version(conn) == 2
    conn.close()
    assert "image" in _columns(path, "shelves")


# --- rooms -------------------------------------------------------------------

def test_room_image_create_list_update(db_path):
    rid = create_room(db_path, "Hall", "hall.jpg")
    create_room(db_path, "Attic")
    rooms = {r["name"]: r for r in list_rooms(db_path)}
    assert rooms["Hall"]["image"] == "hall.jpg"
    assert rooms["Attic"]["image"] == ""

    # name-only update keeps the image and reports nothing to delete
    assert update_room(db_path, rid, "Hallway") == (1, None)
    # new image -> old one is returned for deletion
    assert update_room(db_path, rid, "Hallway", "hall2.jpg") == (1, "hall.jpg")
    # same image -> nothing to delete
    assert update_room(db_path, rid, "Hallway", "hall2.jpg") == (1, None)
    # clearing the image
    assert update_room(db_path, rid, "Hallway", "") == (1, "hall2.jpg")
    assert {r["name"]: r["image"] for r in list_rooms(db_path)}["Hallway"] == ""


def test_room_first_image_has_nothing_to_delete(db_path):
    rid = create_room(db_path, "Hall")
    assert update_room(db_path, rid, "Hall", "new.jpg") == (1, None)


def _fill_images(db_path, ids):
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE rooms SET image='room.jpg' WHERE id=?", (ids["room_id"],))
    conn.execute("UPDATE cupboards SET image='cup.jpg' WHERE id=?", (ids["cupboard_id"],))
    conn.execute("UPDATE shelves SET image='shelf.jpg' WHERE id=?", (ids["shelf_id"],))
    conn.execute("UPDATE organizers SET image='org.jpg' WHERE id=?", (ids["organizer_id"],))
    conn.execute("INSERT INTO items_master (name) VALUES ('Rice')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, image) VALUES (1, ?, 'loc.jpg')",
        (ids["shelf_id"],),
    )
    conn.execute("INSERT INTO item_locations (item_id, shelf_id) VALUES (1, ?)", (ids["shelf_id"],))
    conn.commit()
    conn.close()


def test_delete_room_returns_all_images(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    _fill_images(db_path, ids)
    count, images, _ = delete_room(db_path, ids["room_id"])
    assert count == 1
    assert sorted(images) == ["cup.jpg", "loc.jpg", "org.jpg", "room.jpg", "shelf.jpg"]


def test_delete_cupboard_returns_all_images(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    _fill_images(db_path, ids)
    count, images, _ = delete_cupboard(db_path, ids["cupboard_id"])
    assert count == 1
    assert sorted(images) == ["cup.jpg", "loc.jpg", "org.jpg", "shelf.jpg"]


# --- shelves -----------------------------------------------------------------

def test_shelf_image_create_list_update(db_path, seed):
    seed(db_path, "Kitchen", "C1", "S1")
    sid = create_shelf(db_path, "Kitchen", "C1", "S2", "s2.jpg")
    shelves = {s["name"]: s for s in list_shelves(db_path, "Kitchen", "C1")}
    assert shelves["S1"]["image"] == ""
    assert shelves["S2"]["image"] == "s2.jpg"

    assert update_shelf(db_path, sid, "S2b") == (1, None)
    assert update_shelf(db_path, sid, "S2b", "s2b.jpg") == (1, "s2.jpg")
    assert {s["name"]: s["image"] for s in list_shelves(db_path, "Kitchen", "C1")}["S2b"] == "s2b.jpg"


def test_delete_shelf_returns_all_images(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    _fill_images(db_path, ids)
    count, images, _ = delete_shelf(db_path, ids["shelf_id"])
    assert count == 1
    assert sorted(images) == ["loc.jpg", "org.jpg", "shelf.jpg"]


# --- resolve_location ----------------------------------------------------------

def test_resolve_location(db_path, seed):
    ids = seed(db_path, "Bucătărie", "Dulap", "Raft")
    assert resolve_location(db_path, "cupboard", ids["cupboard_id"]) == {
        "room": "Bucătărie", "cupboard": "Dulap",
    }
    assert resolve_location(db_path, "shelf", ids["shelf_id"]) == {
        "room": "Bucătărie", "cupboard": "Dulap", "shelf": "Raft",
    }
    assert resolve_location(db_path, "shelf", 999) is None
    assert resolve_location(db_path, "cupboard", 999) is None
    assert resolve_location(db_path, "room", ids["room_id"]) is None
