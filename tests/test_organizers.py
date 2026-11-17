import sqlite3

import pytest
from home_inventory.db.repository import (
    create_organizer, hard_delete_organizer, list_organizers, update_organizer,
)


def add_loc(db_path, shelf_id, organizer_id=None, image=None):
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT OR IGNORE INTO items_master (id, name) VALUES (1, 'Rice')")
    conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, organizer_id, image) VALUES (1, ?, ?, ?)",
        (shelf_id, organizer_id, image),
    )
    conn.commit()
    conn.close()


def test_list_organizers_counts_and_unassigned(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    add_loc(db_path, ids["shelf_id"], ids["organizer_id"])
    add_loc(db_path, ids["shelf_id"])
    assert list_organizers(db_path, "Kitchen", "C1", "S1") == {
        "organizers": [{"id": ids["organizer_id"], "name": "Box", "image": "", "itemCount": 1}],
        "itemsWithoutOrganizer": 1,
    }


def test_create_organizer(db_path, seed):
    seed(db_path, "Kitchen", "C1", "S1")
    assert create_organizer(db_path, "Kitchen", "C1", "S1", "Box", "") is not None
    assert create_organizer(db_path, "Kitchen", "C1", "Nope", "Box", "") is None
    with pytest.raises(sqlite3.IntegrityError):
        create_organizer(db_path, "Kitchen", "C1", "S1", "Box", "")


def test_update_organizer_name_image(db_path, seed, q):
    oid = seed(db_path, "Kitchen", "C1", "S1", "Box")["organizer_id"]
    args = (None, None, None)
    assert update_organizer(db_path, oid, "Bin", None, *args) == (1, None, None)
    assert update_organizer(db_path, oid, None, "a.jpg", *args) == (1, None, None)  # no old image
    assert update_organizer(db_path, oid, None, "b.jpg", *args) == (1, "a.jpg", None)
    assert update_organizer(db_path, oid, None, None, *args) == (0, None, None)
    assert update_organizer(db_path, 999, "X", None, *args) == (0, None, None)
    assert q(db_path, "SELECT name, image FROM organizers WHERE id=?", (oid,)) == [("Bin", "b.jpg")]


def test_update_organizer_move_shelf(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    dest = seed(db_path, "Kitchen", "C1", "S2")
    add_loc(db_path, ids["shelf_id"], ids["organizer_id"])
    res = update_organizer(db_path, ids["organizer_id"], None, None, "Kitchen", "C1", "S2")
    assert res == (1, None, None)
    assert q(db_path, "SELECT shelf_id FROM organizers") == [(dest["shelf_id"],)]
    assert q(db_path, "SELECT shelf_id FROM item_locations") == [(dest["shelf_id"],)]
    res = update_organizer(db_path, ids["organizer_id"], None, None, "Kitchen", "C1", "Nope")
    assert res == (0, None, "Destination shelf not found")


def test_hard_delete_organizer_removes_items(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE organizers SET image='org.jpg' WHERE id=?", (ids["organizer_id"],))
    conn.commit()
    conn.close()
    add_loc(db_path, ids["shelf_id"], ids["organizer_id"], "loc.jpg")
    add_loc(db_path, ids["shelf_id"])  # untouched: no organizer
    assert hard_delete_organizer(db_path, ids["organizer_id"]) == (True, "org.jpg", ["loc.jpg"], 1)
    assert q(db_path, "SELECT COUNT(*) FROM item_locations") == [(1,)]
    assert hard_delete_organizer(db_path, 999) == (False, None, [], 0)
