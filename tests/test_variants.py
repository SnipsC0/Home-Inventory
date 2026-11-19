import json
import sqlite3

import pytest

from home_inventory.db.repository import (
    consume_item,
    create_item_location,
    get_low_stock_info,
    get_quantity_update_low_stock,
    list_all_items,
    list_item_locations,
    list_items_at_location,
    list_low_stock_sensor,
    list_tracked_sensor,
    normalize_batch_input,
    update_item,
)
from home_inventory.db.schema import _add_column_if_missing, migrate_to_v1, migrate_to_v2

LOC = dict(room="Kitchen", cupboard="Cup", shelf="Top")


def create(db_path, name="Ardei", *, quantity=1, variant=None, merge_location_id=None,
           track=True, image=None, min_quantity=None, **loc):
    loc = {**LOC, **loc}
    add_total, add_batch, batch_date = normalize_batch_input(quantity, None)
    return create_item_location(
        db_path, room=loc["room"], cupboard=loc["cupboard"], shelf=loc["shelf"],
        organizer=None, name=name, aliases=None, image=image, barcode=None,
        min_quantity=min_quantity, track_quantity=track, exp_obj=None,
        add_total_qty=add_total, add_batch_qty=add_batch, batch_date=batch_date,
        variant=variant, merge_location_id=merge_location_id,
    )


def patch(db_path, item_id, data, **kw):
    args = dict(location_id=None, name=None, aliases=None, barcode=None, new_image=None,
                min_quantity=None, track_quantity=None, expiration_dates=None,
                new_room=None, new_cupboard=None, new_shelf=None, new_organizer=None,
                variant=data.get("variant"))
    args.update(kw)
    return update_item(db_path, str(item_id), data, **args)


@pytest.fixture
def loc(db_path, seed):
    return seed(db_path, "Kitchen", "Cup", "Top")


# --- migration ---------------------------------------------------------------

def _v1(tmp_path):
    path = str(tmp_path / "legacy.db")
    conn = sqlite3.connect(path)
    migrate_to_v1(conn)
    conn.execute("INSERT INTO rooms (id, name) VALUES (1, 'K')")
    conn.execute("INSERT INTO cupboards (id, name, room_id) VALUES (1, 'C', 1)")
    conn.execute("INSERT INTO shelves (id, name, cupboard_id) VALUES (1, 'S', 1)")
    conn.commit()
    return path, conn


def _item(conn, name, qty=None, image=None, track=1):
    conn.execute(
        "INSERT INTO items (name, image, shelf_id, quantity, min_quantity, track_quantity) "
        "VALUES (?, ?, 1, ?, 3, ?)", (name, image, qty, track))
    conn.commit()


def test_migration_keeps_tracked_rows_with_own_qty_image_batch(tmp_path, q):
    path, conn = _v1(tmp_path)
    _item(conn, "Ardei copti", 3, "a.jpg")
    _item(conn, "Ardei copti", 2, "b.jpg")
    migrate_to_v2(conn)
    conn.close()

    rows = q(path, "SELECT quantity, image, expiration_dates, variant FROM item_locations ORDER BY id")
    assert [(r[0], r[1], r[3]) for r in rows] == [(3, "a.jpg", None), (2, "b.jpg", None)]
    assert [json.loads(r[2]) for r in rows] == [[{"quantity": 3, "date": None}], [{"quantity": 2, "date": None}]]
    items = list_all_items(path, None, None, False, False)
    assert len(items) == 1 and items[0]["total_quantity"] == 5 and len(items[0]["locations"]) == 2


def test_migration_keeps_rows_without_images_separate(tmp_path, q):
    path, conn = _v1(tmp_path)
    _item(conn, "Orez", 3)
    _item(conn, "Orez", 2)
    migrate_to_v2(conn)
    conn.close()
    assert q(path, "SELECT quantity FROM item_locations ORDER BY id") == [(3,), (2,)]


def test_migration_non_tracked_rows_stay_separate(tmp_path, q):
    path, conn = _v1(tmp_path)
    _item(conn, "Blender electric", None, "x.jpg", track=0)
    _item(conn, "Blender electric", None, "y.jpg", track=0)
    migrate_to_v2(conn)
    conn.close()
    assert q(path, "SELECT image FROM item_locations ORDER BY id") == [("x.jpg",), ("y.jpg",)]


def test_add_column_if_missing_is_noop_on_rerun(db_path):
    conn = sqlite3.connect(db_path)
    assert _add_column_if_missing(conn, "item_locations", "variant", "TEXT") is False
    conn.close()


# --- create / merge rule -----------------------------------------------------

def test_merge_location_id_merges_only_chosen_row(db_path, loc, q):
    (a, _), _ = create(db_path, quantity=3, variant="small")
    (b, _), _ = create(db_path, quantity=2, variant="large")
    assert a != b
    (r, _), err = create(db_path, quantity=4, variant="whatever", merge_location_id=b)
    assert err is None and r == b
    assert q(db_path, "SELECT id, quantity FROM item_locations ORDER BY id") == [(a, 3), (b, 6)]


def test_merge_location_id_from_other_item_is_error(db_path, loc):
    (other, _), _ = create(db_path, name="Alt", quantity=1)
    create(db_path, quantity=1)
    res, err = create(db_path, quantity=1, merge_location_id=other)
    assert res is None and err


def test_merge_location_id_from_other_place_is_error(db_path, loc, seed):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (far, _), _ = create(db_path, quantity=1, shelf="Bottom")
    res, err = create(db_path, quantity=1, merge_location_id=far)
    assert res is None and err


def test_single_matching_row_is_merged(db_path, loc, q):
    (a, _), _ = create(db_path, quantity=1)
    (b, _), _ = create(db_path, quantity=2)
    assert a == b
    assert q(db_path, "SELECT quantity FROM item_locations") == [(3,)]


def test_new_variant_creates_new_row(db_path, loc, q):
    create(db_path, quantity=1)
    create(db_path, quantity=2, variant="big")
    assert q(db_path, "SELECT quantity, variant FROM item_locations ORDER BY id") == [(1, None), (2, "big")]


def test_multiple_matching_rows_without_merge_id_creates_new_row(db_path, loc, q):
    create(db_path, quantity=1)
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity) "
                 "SELECT item_id, shelf_id, 5 FROM item_locations")
    conn.commit()
    conn.close()
    create(db_path, quantity=1)
    assert q(db_path, "SELECT COUNT(*) FROM item_locations") == [(3,)]


def test_update_item_sets_and_clears_variant(db_path, loc, q):
    (loc_id, item_id), _ = create(db_path, quantity=1)
    patch(db_path, item_id, {"variant": " jar "}, location_id=loc_id)
    assert q(db_path, "SELECT variant FROM item_locations") == [("jar",)]
    patch(db_path, item_id, {"variant": ""}, location_id=loc_id)
    assert q(db_path, "SELECT variant FROM item_locations") == [(None,)]


# --- queries -----------------------------------------------------------------

def test_list_queries_return_row_image_and_variant(db_path, loc):
    (loc_id, item_id), _ = create(
        db_path, quantity=1, variant="v", image={"path": "row.jpg", "default_path": "def.jpg"})
    at_loc = list_items_at_location(
        db_path, room="Kitchen", cupboard="Cup", shelf="Top", organizer=None)
    for rows in (list_item_locations(db_path, item_id), at_loc):
        assert rows[0]["image"] == "row.jpg" and rows[0]["variant"] == "v"


# --- low stock on total ------------------------------------------------------

def _two_rows(db_path, min_q=3):
    (a, item_id), _ = create(db_path, quantity=2, variant="s", min_quantity=min_q)
    (b, _), _ = create(db_path, quantity=3, variant="l")
    return a, b, item_id


def test_low_stock_uses_total(db_path, loc):
    a, b, item_id = _two_rows(db_path)
    assert get_low_stock_info(db_path, a) is None
    assert get_quantity_update_low_stock(db_path, a) is None
    assert list_low_stock_sensor(db_path) == (0, [])
    assert list_all_items(db_path, None, None, True, False) == []

    res, _ = consume_item(db_path, str(item_id), b)
    assert res["is_low_stock"] is False  # total 4 > 3
    res, _ = consume_item(db_path, str(item_id), b)
    assert res["is_low_stock"] is True and res["total_quantity"] == 3
    info = get_low_stock_info(db_path, a)
    assert info["quantity"] == 3 and info["variant"] == "s"
    n, items = list_low_stock_sensor(db_path)
    assert n == 1 and items[0]["quantity"] == 3 and items[0]["location"] == "2 locations"
    assert len(items[0]["locations"]) == 2
    listed = list_all_items(db_path, None, None, True, False)
    assert len(listed) == 1 and listed[0]["is_low_stock"]
    assert all(entry["is_low_stock"] for entry in listed[0]["locations"])
    _, tracked = list_tracked_sensor(db_path)
    assert len(tracked) == 2 and all(t["is_low"] for t in tracked)


def test_total_zero_sensor_yes_event_no(db_path, loc):
    a, b, item_id = _two_rows(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE item_locations SET quantity = 0")
    conn.commit()
    conn.close()
    assert get_low_stock_info(db_path, a) is None
    n, items = list_low_stock_sensor(db_path)
    assert n == 1 and items[0]["quantity"] == 0


def test_new_row_flag_skips_merge(db_path, loc, q):
    create(db_path, quantity=1)
    add_total, add_batch, batch_date = normalize_batch_input(2, None)
    create_item_location(
        db_path, room="Kitchen", cupboard="Cup", shelf="Top", organizer=None, name="Ardei",
        aliases=None, image=None, barcode=None, min_quantity=None, track_quantity=True,
        exp_obj=None, add_total_qty=add_total, add_batch_qty=add_batch, batch_date=batch_date,
        new_row=True,
    )
    assert q(db_path, "SELECT quantity FROM item_locations ORDER BY id") == [(1,), (2,)]
