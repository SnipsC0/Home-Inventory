import json
import sqlite3

from home_inventory.db.repository import (
    get_quantity_update_low_stock, list_all_items, search_items, update_item_quantity,
)


def add_item(db_path, name, shelf_id, *, barcode=None, aliases=None, track=0, min_q=None,
             qty=None, exp=None, organizer_id=None):
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "INSERT INTO items_master (name, barcode, aliases, track_quantity, min_quantity) VALUES (?,?,?,?,?)",
        (name, barcode, aliases, track, min_q),
    )
    item_id = cur.lastrowid
    cur = conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, expiration_dates) VALUES (?,?,?,?,?)",
        (item_id, shelf_id, organizer_id, qty, json.dumps(exp) if exp else None),
    )
    loc_id = cur.lastrowid
    conn.commit()
    conn.close()
    return item_id, loc_id


def test_list_all_items_groups_and_location_string(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    add_item(db_path, "Rice", ids["shelf_id"], track=1, min_q=2, qty=1, organizer_id=ids["organizer_id"])
    add_item(db_path, "Beans", ids["shelf_id"], qty=4)
    items = list_all_items(db_path, "", "", False, False)
    assert [i["name"] for i in items] == ["Beans", "Rice"]
    rice = items[1]
    assert rice["locations"][0]["location"] == "Kitchen / C1 / S1 / Box"
    assert rice["locations"][0]["is_low_stock"] is True and rice["total_quantity"] == 1
    assert items[0]["locations"][0]["is_low_stock"] is False


def test_list_all_items_filters(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    add_item(db_path, "Rice", ids["shelf_id"], barcode="111", aliases="orez", track=1, min_q=2, qty=1,
             exp=[{"quantity": 1, "date": "2000-01-01"}])
    add_item(db_path, "Beans", ids["shelf_id"], track=1, min_q=2, qty=9,
             exp=[{"quantity": 9, "date": "2999-01-01"}])
    assert [i["name"] for i in list_all_items(db_path, "orez", "", False, False)] == ["Rice"]
    assert [i["name"] for i in list_all_items(db_path, "", "111", False, False)] == ["Rice"]
    assert [i["name"] for i in list_all_items(db_path, "", "", True, False)] == ["Rice"]
    expired = list_all_items(db_path, "", "", False, True)
    # existing quirk: non-expired items are still listed, just with no locations
    assert [(i["name"], len(i["locations"])) for i in expired] == [("Beans", 0), ("Rice", 1)]
    assert expired[1]["locations"][0]["is_expired"] is True


def test_item_without_location_has_empty_locations(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name) VALUES ('Orphan')")
    conn.commit()
    conn.close()
    items = list_all_items(db_path, "", "", False, False)
    assert items[0]["locations"] == [] and items[0]["total_quantity"] == 0


def test_update_item_quantity_and_low_stock(db_path, seed, q):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    item_id, loc_id = add_item(db_path, "Rice", ids["shelf_id"], track=1, min_q=2, qty=5)
    assert update_item_quantity(db_path, str(item_id), loc_id, 1, None, None, None) == 1
    assert q(db_path, "SELECT quantity FROM item_locations WHERE id=?", (loc_id,)) == [(1,)]
    payload = get_quantity_update_low_stock(db_path, loc_id)
    assert payload["quantity"] == 1 and payload["location"] == "Kitchen / C1 / S1"
    update_item_quantity(db_path, str(item_id), loc_id, None, 0, False, None)
    assert q(db_path, "SELECT min_quantity, track_quantity FROM items_master") == [(0, 0)]
    assert get_quantity_update_low_stock(db_path, loc_id) is None
    assert get_quantity_update_low_stock(db_path, 999) is None


def test_update_item_quantity_nothing_matched(db_path):
    assert update_item_quantity(db_path, "1", 999, 3, None, None, None) == 0


def test_search_items(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    add_item(db_path, "Rice", ids["shelf_id"], barcode="111", aliases="orez", qty=3)
    add_item(db_path, "Beans", ids["shelf_id"], qty=2)
    by_alias = search_items(db_path, "orez", "")
    assert [(r["name"], r["location_count"], r["total_quantity"]) for r in by_alias] == [("Rice", 1, 3)]
    assert [r["name"] for r in search_items(db_path, "", "111")] == ["Rice"]
    assert [r["name"] for r in search_items(db_path, "e", "")] == ["Beans", "Rice"]


def test_count_default_image_refs(db_path):
    from home_inventory.db.repository import count_default_image_refs
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name, default_image) VALUES ('Rice', '/api/home_inventory/images/a.jpg?t=1')")
    conn.commit()
    conn.close()
    assert count_default_image_refs(db_path, "a.jpg") == 1
    assert count_default_image_refs(db_path, "b.jpg") == 0
