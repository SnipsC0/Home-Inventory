import sqlite3

import pytest
from home_inventory.db.repository import (
    create_cupboard, delete_cupboard, list_cupboards, update_cupboard,
)


def test_create_cupboard_and_list(db_path, seed):
    seed(db_path, "Kitchen", "Old", "S1")
    assert create_cupboard(db_path, "Kitchen", "Pantry", "") is not None
    result = list_cupboards(db_path, "Kitchen")
    assert [c["name"] for c in result] == ["Old", "Pantry"]
    assert result[0]["itemCount"] == 0 and result[0]["image"] == ""
    assert list_cupboards(db_path, "Nope") == []


def test_create_cupboard_unknown_room_and_duplicate(db_path, seed):
    assert create_cupboard(db_path, "Nope", "X", "") is None
    seed(db_path, "Kitchen", "Pantry", "S1")
    with pytest.raises(sqlite3.IntegrityError):
        create_cupboard(db_path, "Kitchen", "Pantry", "")


def test_update_cupboard_name_and_image(db_path, seed, q):
    cid = seed(db_path, "Kitchen", "C1", "S1")["cupboard_id"]
    assert update_cupboard(db_path, cid, "C2", None) == (1, None)
    assert update_cupboard(db_path, cid, None, "a.jpg") == (1, None)  # old image empty
    assert update_cupboard(db_path, cid, None, "b.jpg") == (1, "a.jpg")
    assert update_cupboard(db_path, cid, None, "b.jpg") == (1, None)  # same image
    assert update_cupboard(db_path, cid, None, None) == (0, None)
    assert update_cupboard(db_path, 999, "X", None) == (0, None)
    assert q(db_path, "SELECT name, image FROM cupboards WHERE id=?", (cid,)) == [("C2", "b.jpg")]


def test_delete_cupboard_collects_images(db_path, seed, q):
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
    count, images, _ = delete_cupboard(db_path, ids["cupboard_id"])
    assert count == 1 and sorted(images) == ["cup.jpg", "loc.jpg"]
    assert q(db_path, "SELECT COUNT(*) FROM cupboards") == [(0,)]
    assert delete_cupboard(db_path, 999) == (0, [], None)
