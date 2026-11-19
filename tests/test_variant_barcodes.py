import pytest

from home_inventory.db.repository import (
    create_item_location,
    delete_item_master,
    list_all_items,
    list_item_masters,
    normalize_batch_input,
    search_items,
    update_item,
    update_item_master,
)

LOC = dict(room="Kitchen", cupboard="Cup", shelf="Top")


def create(db_path, name="Boia afumata", *, barcode=None, variant=None, quantity=1,
           merge_location_id=None):
    add_total, add_batch, batch_date = normalize_batch_input(quantity, None)
    return create_item_location(
        db_path, **LOC, organizer=None, name=name, aliases=None, image=None,
        barcode=barcode, min_quantity=None, track_quantity=True, exp_obj=None,
        add_total_qty=add_total, add_batch_qty=add_batch, batch_date=batch_date,
        variant=variant, merge_location_id=merge_location_id,
    )


def patch(db_path, item_id, data, location_id=None, **kw):
    args = dict(location_id=location_id, name=None, aliases=None, barcode=None,
                new_image=None, min_quantity=None, track_quantity=None,
                expiration_dates=None, new_room=None, new_cupboard=None,
                new_shelf=None, new_organizer=None, variant=data.get("variant"),
                variant_barcode=data.get("variant_barcode"))
    args.update(kw)
    return update_item(db_path, str(item_id), data, **args)


@pytest.fixture
def two_variants(db_path, seed):
    seed(db_path, "Kitchen", "Cup", "Top")
    (gali_loc, item_id), _ = create(db_path, barcode="111", variant="Gali", quantity=2)
    (magi_loc, same_id), _ = create(db_path, barcode="222", variant="Magi", quantity=2)
    assert item_id == same_id
    return item_id, gali_loc, magi_loc


def test_new_barcode_with_variant_is_registered(db_path, q, two_variants):
    item_id, gali_loc, magi_loc = two_variants
    # "Gali" row keeps master barcode 111; "Magi" got its own barcode
    assert q(db_path, "SELECT variant, barcode FROM item_variant_barcodes") == [("Magi", "222")]
    assert gali_loc != magi_loc


def test_scan_variant_barcode_picks_variant_and_merges(db_path, q, two_variants):
    item_id, gali_loc, magi_loc = two_variants
    (loc_id, mid), err = create(db_path, name="", barcode="222", quantity=3)
    assert err is None and mid == item_id and loc_id == magi_loc
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (magi_loc,)) == [(5,)]


def test_all_items_single_item_with_matched_variant(db_path, two_variants):
    item_id, *_ = two_variants
    items = list_all_items(db_path, "", "222", False, False)
    assert len(items) == 1
    assert items[0]["id"] == item_id and items[0]["matched_variant"] == "Magi"
    assert len(items[0]["locations"]) == 2
    assert items[0]["variant_barcodes"] == [{"variant": "Magi", "barcode": "222"}]
    assert len(list_all_items(db_path, "Boia", "", False, False)) == 1
    assert [i["id"] for i in search_items(db_path, "", "222")] == [item_id]
    assert [i["id"] for i in list_item_masters(db_path, "", "222")] == [item_id]


def test_barcode_used_elsewhere_is_rejected(db_path, q, two_variants):
    item_id, gali_loc, magi_loc = two_variants
    create(db_path, name="Sare", barcode="999")
    err = patch(db_path, item_id, {"variant_barcode": "999"}, location_id=magi_loc)[2]
    assert "different item" in err
    sare = q(db_path, "SELECT id FROM items_master WHERE name='Sare'")[0][0]
    err = update_item_master(db_path, sare, {}, name=None, aliases=None, barcode="222",
                             default_image=None, min_quantity=None)[2]
    assert "different item" in err


def test_set_and_clear_variant_barcode_via_update(db_path, q, two_variants):
    item_id, gali_loc, magi_loc = two_variants
    assert patch(db_path, item_id, {"variant_barcode": "333"}, location_id=gali_loc)[2] is None
    assert q(db_path, "SELECT barcode FROM item_variant_barcodes WHERE variant='Gali'") == [("333",)]
    assert patch(db_path, item_id, {"variant_barcode": ""}, location_id=gali_loc)[2] is None
    assert q(db_path, "SELECT barcode FROM item_variant_barcodes WHERE variant='Gali'") == []


def test_variant_barcode_needs_variant_label(db_path, seed):
    seed(db_path, "Kitchen", "Cup", "Top")
    (loc_id, item_id), _ = create(db_path, barcode="111")
    err = patch(db_path, item_id, {"variant_barcode": "333"}, location_id=loc_id)[2]
    assert "variant label" in err


def test_rename_variant_moves_barcode(db_path, q, two_variants):
    item_id, gali_loc, magi_loc = two_variants
    assert patch(db_path, item_id, {"variant": "Magi mare"}, location_id=magi_loc)[2] is None
    assert q(db_path, "SELECT variant, barcode FROM item_variant_barcodes") == [("Magi mare", "222")]


def test_delete_master_removes_variant_barcodes(db_path, q, two_variants):
    item_id, *_ = two_variants
    assert delete_item_master(db_path, item_id)[0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM item_variant_barcodes") == [(0,)]


def test_schema_idempotent(db_path):
    from home_inventory.db.schema import initialize_db
    initialize_db(db_path)
    initialize_db(db_path)


def test_new_barcode_without_variant_on_item_with_barcode_is_rejected(db_path, q, seed):
    seed(db_path, "Kitchen", "Cup", "Top")
    create(db_path, barcode="111", quantity=1)
    err = create(db_path, barcode="222", quantity=1)[1]
    assert err and "111" in err and "variant" in err
    assert q(db_path, "SELECT barcode FROM items_master") == [("111",)]
    assert q(db_path, "SELECT COUNT(*) FROM item_locations") == [(1,)]


def test_barcode_without_variant_sets_missing_master_barcode(db_path, q, seed):
    seed(db_path, "Kitchen", "Cup", "Top")
    create(db_path, barcode=None, quantity=1)
    assert create(db_path, barcode="222", quantity=1)[1] is None
    assert q(db_path, "SELECT barcode FROM items_master") == [("222",)]


def test_missing_master_barcode_not_set_to_variant_barcode_of_other_item(db_path, q, seed):
    seed(db_path, "Kitchen", "Cup", "Top")
    create(db_path, name="Alt", barcode="111", quantity=1)
    create(db_path, name="Alt", barcode="333", variant="V", quantity=1)
    create(db_path, name="Boia afumata", barcode=None, quantity=1)
    err = create(db_path, name="Boia afumata", barcode="333", quantity=1)[1]
    assert err is None or "333" in err
    assert q(db_path, "SELECT barcode FROM items_master WHERE name='Boia afumata'") != [("333",)]
