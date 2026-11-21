import sqlite3

import pytest
from home_inventory.db.repository import create_shelf, delete_shelf, list_shelves, update_shelf


def test_create_and_list_shelves_with_counts(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    assert create_shelf(db_path, "Kitchen", "C1", "S2") is not None
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name) VALUES ('Rice')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id) VALUES (1, ?)", (ids["shelf_id"],)
    )
    conn.commit()
    conn.close()
    result = list_shelves(db_path, "Kitchen", "C1")
    assert [(s["name"], s["organizerCount"], s["itemCount"]) for s in result] == [
        ("S1", 1, 1),
        ("S2", 0, 0),
    ]
    assert list_shelves(db_path, "Kitchen", "Nope") == []


def test_create_shelf_unknown_cupboard_and_duplicate(db_path, seed):
    assert create_shelf(db_path, "Nope", "C1", "S") is None
    seed(db_path, "Kitchen", "C1", "S1")
    with pytest.raises(sqlite3.IntegrityError):
        create_shelf(db_path, "Kitchen", "C1", "S1")


def test_update_shelf(db_path, seed):
    sid = seed(db_path, "Kitchen", "C1", "S1")["shelf_id"]
    assert update_shelf(db_path, sid, "S9") == (1, None)
    assert update_shelf(db_path, 999, "X") == (0, None)
    other = create_shelf(db_path, "Kitchen", "C1", "S2")
    with pytest.raises(sqlite3.IntegrityError):
        update_shelf(db_path, other, "S9")


def test_delete_shelf_collects_images(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name) VALUES ('Rice')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, image) VALUES (1, ?, 'loc.jpg')",
        (ids["shelf_id"],),
    )
    conn.execute("INSERT INTO item_locations (item_id, shelf_id) VALUES (1, ?)", (ids["shelf_id"],))
    conn.commit()
    conn.close()
    assert delete_shelf(db_path, ids["shelf_id"]) == (1, ["loc.jpg"], 1)
    assert q(db_path, "SELECT COUNT(*) FROM shelves") == [(0,)]
    assert delete_shelf(db_path, 999) == (0, [], None)
