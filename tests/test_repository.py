import json

import pytest

from home_inventory.db.repository import (
    create_item_location,
    get_low_stock_info,
    normalize_batch_input,
    update_item,
)

LOC = dict(room="Kitchen", cupboard="Cup", shelf="Top")


def create(db_path, name="Rice", *, quantity=None, exp_obj=None, track=True,
           organizer=None, aliases=None, image=None, barcode=None,
           min_quantity=None, **loc_override):
    loc = {**LOC, **loc_override}
    add_total, add_batch, batch_date = normalize_batch_input(quantity, exp_obj)
    return create_item_location(
        db_path,
        room=loc["room"], cupboard=loc["cupboard"], shelf=loc["shelf"],
        organizer=organizer, name=name, aliases=aliases, image=image,
        barcode=barcode, min_quantity=min_quantity, track_quantity=track,
        exp_obj=exp_obj, add_total_qty=add_total, add_batch_qty=add_batch,
        batch_date=batch_date,
    )


def patch(db_path, item_id, data=None, **kw):
    """Call update_item like the HTTP handler: item_id is a string."""
    data = data or {}
    args = dict(
        location_id=None, name=None, aliases=None, barcode=None,
        new_image=None, min_quantity=data.get("min_quantity"),
        track_quantity=None, expiration_dates=None, new_room=None,
        new_cupboard=None, new_shelf=None, new_organizer=None,
    )
    args.update(kw)
    return update_item(db_path, str(item_id), data, **args)


@pytest.fixture
def loc(db_path, seed):
    return seed(db_path, "Kitchen", "Cup", "Top")


def batches(q, db_path, loc_id):
    raw = q(db_path, "SELECT expiration_dates FROM item_locations WHERE id=?", (loc_id,))[0][0]
    return json.loads(raw) if raw is not None else None


# ---------------- create ----------------

def test_create_new_master_and_location(db_path, loc, q):
    res, err = create(db_path, quantity=3, min_quantity=1)
    assert err is None
    loc_id, master_id = res
    assert q(db_path, "SELECT name, track_quantity, min_quantity FROM items_master WHERE id=?", (master_id,)) == [("Rice", 1, 1)]
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (loc_id,)) == [(3,)]
    assert batches(q, db_path, loc_id) == [{"quantity": 3, "date": None}]


def test_create_reuses_master_by_name_and_barcode(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (_, m1), _ = create(db_path, barcode="123", quantity=1)
    (_, m2), err = create(db_path, barcode="123", quantity=1, shelf="Bottom")
    assert err is None and m1 == m2
    (_, m3), _ = create(db_path, name="Rice", shelf="Bottom", quantity=1)
    assert m3 == m1
    assert q(db_path, "SELECT COUNT(*) FROM items_master") == [(1,)]


def test_create_reuses_master_by_name_and_aliases(db_path, loc):
    (_, m1), _ = create(db_path, aliases="orez", quantity=1)
    (_, m2), _ = create(db_path, aliases="orez", quantity=1)
    (_, m3), _ = create(db_path, aliases=None, quantity=1)
    assert m1 == m2 != m3


def test_tracked_same_location_merges_same_date(db_path, loc, q):
    exp = {"quantity": 2, "date": "2025-12-31"}
    (l1, _), _ = create(db_path, quantity=2, exp_obj=exp)
    (l2, _), err = create(db_path, quantity=2, exp_obj=exp)
    assert err is None and l1 == l2
    assert batches(q, db_path, l1) == [{"quantity": 4, "date": "2025-12-31"}]
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (l1,)) == [(4,)]


def test_tracked_different_date_new_batch(db_path, loc, q):
    (l1, _), _ = create(db_path, quantity=2, exp_obj={"quantity": 2, "date": "2025-01-01"})
    create(db_path, quantity=3, exp_obj={"quantity": 3, "date": "2026-01-01"})
    assert batches(q, db_path, l1) == [
        {"quantity": 2, "date": "2025-01-01"},
        {"quantity": 3, "date": "2026-01-01"},
    ]


def test_tracked_no_date_merges_into_null_batch(db_path, loc, q):
    (l1, _), _ = create(db_path, quantity=2)
    create(db_path, quantity=3)
    assert batches(q, db_path, l1) == [{"quantity": 5, "date": None}]


def test_track_quantity_mismatch_error(db_path, loc):
    create(db_path, track=True, quantity=1)
    res, err = create(db_path, track=False)
    assert res is None and "Can't reusing" in err


def test_missing_shelf_and_organizer(db_path, loc):
    res, err = create(db_path, shelf="Nope", quantity=1)
    assert res is None and "Shelf 'Nope' not found" in err
    res, err = create(db_path, organizer="Nope", quantity=1)
    assert res is None and "Organizer 'Nope' not found" in err


def test_non_tracked_allows_duplicate_rows(db_path, loc, q):
    (l1, m1), e1 = create(db_path, "Hammer", track=False)
    (l2, m2), e2 = create(db_path, "Hammer", track=False)
    assert e1 is None and e2 is None
    assert m1 == m2 and l1 != l2
    assert q(db_path, "SELECT quantity, expiration_dates FROM item_locations WHERE id=?", (l1,)) == [(None, None)]


def test_non_tracked_existing_cannot_add_quantity(db_path, loc):
    create(db_path, "Hammer", track=False)
    res, err = create(db_path, "Hammer", track=False, quantity=2)
    assert res is None and "not consumable" in err


def test_image_dict_vs_string(db_path, loc, q):
    (l1, m1), _ = create(db_path, "A", image={"default_path": "d.jpg", "path": "l.jpg"}, quantity=1)
    assert q(db_path, "SELECT default_image FROM items_master WHERE id=?", (m1,)) == [("d.jpg",)]
    assert q(db_path, "SELECT image FROM item_locations WHERE id=?", (l1,)) == [("l.jpg",)]
    (l2, m2), _ = create(db_path, "B", image="x.jpg", quantity=1)
    assert q(db_path, "SELECT default_image FROM items_master WHERE id=?", (m2,)) == [("x.jpg",)]
    assert q(db_path, "SELECT image FROM item_locations WHERE id=?", (l2,)) == [("x.jpg",)]


def test_existing_master_gets_default_image_only_if_missing(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (_, m), _ = create(db_path, quantity=1)
    create(db_path, quantity=1, shelf="Bottom", image="first.jpg")
    create(db_path, quantity=1, shelf="Bottom", image="second.jpg")
    assert q(db_path, "SELECT default_image FROM items_master WHERE id=?", (m,)) == [("first.jpg",)]


# ---------------- update ----------------

def test_update_item_not_found(db_path):
    count, imgs, err = patch(db_path, 999)
    assert (count, imgs, err) == (0, [], "Item master not found")


def test_rename_creates_new_master_and_deletes_old(db_path, loc, q):
    (l, m), _ = create(db_path, quantity=2)
    count, _, err = patch(db_path, m, location_id=l, name="Basmati")
    assert (count, err) == (1, None)
    assert q(db_path, "SELECT id FROM items_master WHERE name='Rice'") == []
    new_id = q(db_path, "SELECT item_id FROM item_locations WHERE id=?", (l,))[0][0]
    assert q(db_path, "SELECT name FROM items_master WHERE id=?", (new_id,)) == [("Basmati",)]


def test_rename_keeps_old_master_if_other_locations(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (l1, m), _ = create(db_path, quantity=1)
    (l2, _), _ = create(db_path, quantity=1, shelf="Bottom")
    patch(db_path, m, location_id=l1, name="Basmati")
    assert q(db_path, "SELECT COUNT(*) FROM items_master WHERE name='Rice'") == [(1,)]
    assert q(db_path, "SELECT item_id FROM item_locations WHERE id=?", (l2,)) == [(m,)]


def test_rename_to_existing_master_merges(db_path, loc, q):
    (l1, m1), _ = create(db_path, "Rice", quantity=1)
    (_, m2), _ = create(db_path, "Pasta", quantity=1)
    count, _, err = patch(db_path, m1, location_id=l1, name="Pasta")
    assert (count, err) == (1, None)
    assert q(db_path, "SELECT item_id FROM item_locations WHERE id=?", (l1,)) == [(m2,)]
    assert q(db_path, "SELECT id FROM items_master WHERE id=?", (m1,)) == []


def test_rename_merge_track_mismatch(db_path, loc):
    (l1, m1), _ = create(db_path, "Rice", quantity=1)
    create(db_path, "Hammer", track=False)
    count, _, err = patch(db_path, m1, location_id=l1, name="Hammer")
    assert count == 0 and "different track_quantity" in err


def test_rename_barcode_conflict(db_path, loc):
    (l1, m1), _ = create(db_path, "Rice", quantity=1, barcode="111")
    create(db_path, "Pasta", quantity=1, barcode="222")
    count, _, err = patch(db_path, m1, location_id=l1, name="Rice2", barcode="222")
    assert count == 0 and "already exists for different item" in err


def test_set_barcode_conflict_without_rename(db_path, loc):
    (l1, m1), _ = create(db_path, "Rice", quantity=1)
    create(db_path, "Pasta", quantity=1, barcode="222")
    count, _, err = patch(db_path, m1, location_id=l1, barcode="222")
    assert count == 0 and "already exists" in err


def test_untrack_nulls_quantity_and_batches(db_path, loc, q):
    (l, m), _ = create(db_path, quantity=4)
    count, _, err = patch(db_path, m, location_id=l, track_quantity=False)
    assert (count, err) == (1, None)
    assert q(db_path, "SELECT quantity, expiration_dates FROM item_locations WHERE id=?", (l,)) == [(None, None)]
    assert q(db_path, "SELECT track_quantity FROM items_master WHERE id=?", (m,)) == [(0,)]


def test_expiration_dates_sets_quantity_sum(db_path, loc, q):
    (l, m), _ = create(db_path, quantity=1)
    new = [{"quantity": 2, "date": "2025-01-01"}, {"quantity": 5, "date": None}]
    patch(db_path, m, location_id=l, expiration_dates=new)
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (l,)) == [(7,)]
    assert batches(q, db_path, l) == new
    patch(db_path, m, location_id=l, expiration_dates=json.dumps(new[:1]))
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (l,)) == [(2,)]


def test_move_to_shelf_and_organizer(db_path, loc, seed, q):
    ids = seed(db_path, "Kitchen", "Cup", "Bottom", "Box")
    (l, m), _ = create(db_path, quantity=1)
    count, _, err = patch(db_path, m, location_id=l, new_room="Kitchen",
                          new_cupboard="Cup", new_shelf="Bottom", new_organizer="Box")
    assert (count, err) == (1, None)
    assert q(db_path, "SELECT shelf_id, organizer_id FROM item_locations WHERE id=?", (l,)) == [(ids["shelf_id"], ids["organizer_id"])]
    patch(db_path, m, location_id=l, new_room="Kitchen", new_cupboard="Cup", new_shelf="Bottom")
    assert q(db_path, "SELECT organizer_id FROM item_locations WHERE id=?", (l,)) == [(None,)]


def test_move_errors(db_path, loc):
    (l, m), _ = create(db_path, quantity=1)
    _, _, err = patch(db_path, m, location_id=l, new_room="Kitchen", new_cupboard="Cup", new_shelf="Nope")
    assert err == "Destination shelf not found"
    _, _, err = patch(db_path, m, location_id=l, new_room="Kitchen", new_cupboard="Cup",
                      new_shelf="Top", new_organizer="Nope")
    assert err == "Organizer 'Nope' not found"


def test_update_master_fields_without_location(db_path, loc, q):
    (_, m), _ = create(db_path, quantity=1)
    count, _, err = patch(db_path, m, data={"min_quantity": 3})
    assert (count, err) == (1, None)
    assert q(db_path, "SELECT min_quantity FROM items_master WHERE id=?", (m,)) == [(3,)]


# ---------------- low stock ----------------

def test_low_stock(db_path, loc):
    (l, m), _ = create(db_path, quantity=2, min_quantity=3)
    info = get_low_stock_info(db_path, l)
    assert info["quantity"] == 2 and info["min_quantity"] == 3
    assert info["location"] == "Kitchen / Cup / Top"

    patch(db_path, m, location_id=l, expiration_dates=[{"quantity": 3, "date": None}])
    assert get_low_stock_info(db_path, l) is not None
    patch(db_path, m, location_id=l, expiration_dates=[{"quantity": 4, "date": None}])
    assert get_low_stock_info(db_path, l) is None
    patch(db_path, m, location_id=l, expiration_dates=[])
    assert get_low_stock_info(db_path, l) is None


def test_low_stock_untracked_or_missing(db_path, loc):
    (l, _), _ = create(db_path, "Hammer", track=False, min_quantity=5)
    assert get_low_stock_info(db_path, l) is None
    assert get_low_stock_info(db_path, 9999) is None


# ---------------- delete location / master, update master ----------------

from home_inventory.db.repository import (  # noqa: E402
    delete_item_location,
    delete_item_master,
    update_item_master,
)


def master_patch(db_path, item_id, data, **kw):
    args = dict(
        name=data.get("name"), aliases=data.get("aliases"),
        barcode=data.get("barcode"), default_image=data.get("default_image"),
        min_quantity=data.get("min_quantity"),
    )
    args.update(kw)
    return update_item_master(db_path, str(item_id), data, **args)


def test_delete_location_not_found(db_path):
    assert delete_item_location(db_path, "999") == (0, [], "Location not found")


def test_delete_last_location_removes_master_and_images(db_path, loc, q):
    (loc_id, master_id), _ = create(db_path, quantity=1, image={"default_path": "m.jpg", "path": "l.jpg"})
    count, images, err = delete_item_location(db_path, str(loc_id))
    assert (count, err) == (1, None)
    assert sorted(images) == ["l.jpg", "m.jpg"]
    assert q(db_path, "SELECT COUNT(*) FROM items_master")[0][0] == 0
    assert q(db_path, "SELECT COUNT(*) FROM item_locations")[0][0] == 0


def test_delete_one_of_many_keeps_master(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (l1, master_id), _ = create(db_path, quantity=1, image="l1.jpg")
    (l2, _), _ = create(db_path, quantity=1, shelf="Bottom")
    count, images, err = delete_item_location(db_path, str(l1))
    assert (count, err) == (1, None)
    assert images == ["l1.jpg"]
    assert q(db_path, "SELECT COUNT(*) FROM items_master WHERE id=?", (master_id,))[0][0] == 1
    assert q(db_path, "SELECT id FROM item_locations") == [(l2,)]


def test_delete_master_cascades_locations(db_path, loc, seed, q):
    seed(db_path, "Kitchen", "Cup", "Bottom")
    (l1, master_id), _ = create(db_path, quantity=1, image="l1.jpg")
    create(db_path, quantity=1, shelf="Bottom")
    count, images, infos, err = delete_item_master(db_path, str(master_id))
    assert (count, err) == (1, None)
    assert "l1.jpg" in images
    assert sorted(infos) == ["Kitchen / Cup / Bottom", "Kitchen / Cup / Top"]
    assert q(db_path, "SELECT COUNT(*) FROM items_master")[0][0] == 0
    assert q(db_path, "SELECT COUNT(*) FROM item_locations")[0][0] == 0


def test_delete_master_not_found(db_path):
    assert delete_item_master(db_path, "999") == (0, [], [], "Item master not found")


def test_update_master_not_found(db_path):
    assert master_patch(db_path, 999, {"name": "x"}) == (0, [], "Item master not found")


def test_update_master_fields_and_old_image(db_path, loc, q):
    (_, master_id), _ = create(db_path, quantity=1, image="old.jpg")
    count, old, err = master_patch(
        db_path, master_id,
        {"name": "Rice2", "aliases": "r", "default_image": "new.jpg", "min_quantity": 4},
    )
    assert (count, err) == (1, None)
    assert old == ["old.jpg"]
    assert q(db_path, "SELECT name, aliases, default_image, min_quantity FROM items_master WHERE id=?", (master_id,)) == [("Rice2", "r", "new.jpg", 4)]


def test_update_master_barcode_conflict(db_path, loc):
    create(db_path, "A", quantity=1, barcode="111")
    (_, mb), _ = create(db_path, "B", quantity=1)
    count, _, err = master_patch(db_path, mb, {"barcode": "111"})
    assert count == 0 and "already exists" in err
