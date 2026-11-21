import sqlite3

import pytest

from home_inventory.db import repository
from home_inventory.db.schema import ensure_favorites_table, initialize_db
from test_repository import create, patch

U1, U2 = "user-a", "user-b"


@pytest.fixture
def loc(db_path, seed):
    return seed(db_path, "Kitchen", "Cup", "Top")


def favs(q, db_path):
    return q(db_path, "SELECT user_id, item_id FROM item_favorites ORDER BY user_id, item_id")


def test_add_remove_list_per_user(db_path, loc):
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    (_, salt), _ = create(db_path, "Salt", quantity=1)
    assert repository.set_favorite(db_path, U1, rice, True)
    assert repository.set_favorite(db_path, U1, salt, True)
    assert repository.set_favorite(db_path, U2, salt, True)
    assert sorted(repository.list_favorite_ids(db_path, U1)) == [rice, salt]
    assert repository.list_favorite_ids(db_path, U2) == [salt]
    assert repository.set_favorite(db_path, U1, salt, False)
    assert repository.list_favorite_ids(db_path, U1) == [rice]
    assert repository.list_favorite_ids(db_path, U2) == [salt]
    assert repository.list_favorite_ids(db_path, "nobody") == []


def test_idempotent(db_path, loc, q):
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    assert repository.set_favorite(db_path, U1, rice, True)
    assert repository.set_favorite(db_path, U1, rice, True)
    assert favs(q, db_path) == [(U1, rice)]
    assert repository.set_favorite(db_path, U1, rice, False)
    assert repository.set_favorite(db_path, U1, rice, False)
    assert favs(q, db_path) == []


def test_missing_item_returns_false(db_path, q):
    assert repository.set_favorite(db_path, U1, 999, True) is False
    assert repository.set_favorite(db_path, U1, 999, False) is False
    assert favs(q, db_path) == []


def test_delete_master_cleans_favorites(db_path, loc, q):
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    repository.set_favorite(db_path, U1, rice, True)
    repository.set_favorite(db_path, U2, rice, True)
    repository.delete_item_master(db_path, rice)
    assert favs(q, db_path) == []


def test_delete_last_location_cleans_favorites(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (l1, rice), _ = create(db_path, "Rice", quantity=1)
    (l2, _), _ = create(db_path, "Rice", quantity=1, shelf="Bottom")
    repository.set_favorite(db_path, U1, rice, True)
    repository.delete_item_location(db_path, l1)
    assert favs(q, db_path) == [(U1, rice)]
    repository.delete_item_location(db_path, l2)
    assert favs(q, db_path) == []


def test_delete_room_cleans_favorites(db_path, loc, q):
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    repository.set_favorite(db_path, U1, rice, True)
    repository.delete_room(db_path, loc["room_id"])
    assert favs(q, db_path) == []


def test_rename_keeps_favorite(db_path, loc, q):
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    repository.set_favorite(db_path, U1, rice, True)
    _, _, err = patch(db_path, rice, name="Basmati rice")
    assert err is None
    new_id = q(db_path, "SELECT id FROM items_master WHERE name='Basmati rice'")[0][0]
    assert new_id != rice
    assert favs(q, db_path) == [(U1, new_id)]


def test_merge_keeps_favorite_without_duplicates(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (_, rice), _ = create(db_path, "Rice", quantity=1)
    (_, basmati), _ = create(db_path, "Basmati", quantity=1, shelf="Bottom")
    repository.set_favorite(db_path, U1, rice, True)
    repository.set_favorite(db_path, U1, basmati, True)
    repository.set_favorite(db_path, U2, rice, True)
    _, _, err = patch(db_path, rice, name="Basmati")
    assert err is None
    assert q(db_path, "SELECT id FROM items_master") == [(basmati,)]
    assert favs(q, db_path) == [(U1, basmati), (U2, basmati)]


def test_split_one_location_keeps_favorite_on_old_master(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (l1, rice), _ = create(db_path, "Rice", quantity=1)
    create(db_path, "Rice", quantity=1, shelf="Bottom")
    repository.set_favorite(db_path, U1, rice, True)
    _, _, err = patch(db_path, rice, location_id=l1, name="Brown rice")
    assert err is None
    assert favs(q, db_path) == [(U1, rice)]


def test_ensure_table_twice(tmp_path):
    path = str(tmp_path / "x.db")
    initialize_db(path)
    initialize_db(path)
    conn = sqlite3.connect(path)
    ensure_favorites_table(conn)
    ensure_favorites_table(conn)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(item_favorites)")]
    conn.close()
    assert cols == ["user_id", "item_id", "created_at"]
