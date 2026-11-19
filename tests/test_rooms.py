import sqlite3

import pytest
from home_inventory.db.repository import create_room, delete_room, list_rooms, update_room


def test_create_and_list_rooms_with_item_count(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    create_room(db_path, "Attic")
    q_conn = sqlite3.connect(db_path)
    q_conn.execute("INSERT INTO items_master (name) VALUES ('Rice')")
    q_conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id) VALUES (1, ?)", (ids["shelf_id"],)
    )
    q_conn.commit()
    q_conn.close()
    assert list_rooms(db_path) == [
        {"id": 2, "name": "Attic", "image": "", "itemCount": 0},
        {"id": ids["room_id"], "name": "Kitchen", "image": "", "itemCount": 1},
    ]


def test_create_room_duplicate_raises(db_path):
    create_room(db_path, "Hall")
    with pytest.raises(sqlite3.IntegrityError):
        create_room(db_path, "Hall")


def test_update_room(db_path):
    rid = create_room(db_path, "Hall")
    assert update_room(db_path, rid, "Corridor") == (1, None)
    assert update_room(db_path, 999, "X") == (0, None)
    other = create_room(db_path, "Garage")
    with pytest.raises(sqlite3.IntegrityError):
        update_room(db_path, other, "Corridor")


def test_delete_room_collects_images(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE cupboards SET image='cup.jpg' WHERE id=?", (ids["cupboard_id"],))
    conn.execute("INSERT INTO items_master (name) VALUES ('Rice')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, image) VALUES (1, ?, 'loc.jpg')",
        (ids["shelf_id"],),
    )
    conn.commit()
    conn.close()
    count, images = delete_room(db_path, ids["room_id"])
    assert count == 1 and sorted(images) == ["cup.jpg", "loc.jpg"]
    assert q(db_path, "SELECT COUNT(*) FROM rooms") == [(0,)]
    assert delete_room(db_path, ids["room_id"])[0] == 0  # no FK cascade in API conns
