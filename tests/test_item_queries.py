import json
import sqlite3

from home_inventory.db.repository import (
    list_item_locations, list_item_masters, list_items_at_location,
)


def add_item(db_path, name, shelf_id, *, barcode=None, aliases=None, track=0, min_q=None,
             qty=None, organizer_id=None, image=None):
    conn = sqlite3.connect(db_path)
    item_id = conn.execute(
        "INSERT INTO items_master (name, barcode, aliases, track_quantity, min_quantity, default_image)"
        " VALUES (?,?,?,?,?,?)",
        (name, barcode, aliases, track, min_q, image),
    ).lastrowid
    loc_id = conn.execute(
        "INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity) VALUES (?,?,?,?)",
        (item_id, shelf_id, organizer_id, qty),
    ).lastrowid
    conn.commit()
    conn.close()
    return item_id, loc_id


def test_list_item_locations_multi_location(db_path, seed):
    a = seed(db_path, "Kitchen", "C1", "S1", "Box")
    b = seed(db_path, "Garage", "C2", "S2")
    item_id, loc1 = add_item(db_path, "Rice", a["shelf_id"], track=1, min_q=2, qty=3,
                             organizer_id=a["organizer_id"], image="rice.jpg")
    conn = sqlite3.connect(db_path)
    loc2 = conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity) VALUES (?,?,?)",
                        (item_id, b["shelf_id"], 5)).lastrowid
    conn.commit()
    conn.close()
    res = list_item_locations(db_path, str(item_id))
    assert {r["location_id"] for r in res} == {loc1, loc2}
    k = next(r for r in res if r["location_id"] == loc1)
    assert k["location"] == "Kitchen / C1 / S1 / Box" and k["organizer"] == "Box"
    assert k["image"] == "rice.jpg" and k["track_quantity"] is True and k["quantity"] == 3
    g = next(r for r in res if r["location_id"] == loc2)
    assert g["location"] == "Garage / C2 / S2" and g["organizer"] is None and g["image"] == "rice.jpg"
    assert list_item_locations(db_path, "9999") == []


def test_list_items_at_location_shelf_vs_organizer(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1", "Box")
    add_item(db_path, "OnShelf", ids["shelf_id"], qty=1)
    add_item(db_path, "InBox", ids["shelf_id"], organizer_id=ids["organizer_id"], qty=2)
    shelf = list_items_at_location(db_path, "Kitchen", "C1", "S1", None)
    assert [i["name"] for i in shelf] == ["OnShelf"]
    assert shelf[0]["location"] == "Kitchen / C1 / S1" and "room" not in shelf[0]
    box = list_items_at_location(db_path, "Kitchen", "C1", "S1", "Box")
    assert [i["name"] for i in box] == ["InBox"]
    assert box[0]["location"] == "Kitchen / C1 / S1 / Box"
    assert list_items_at_location(db_path, "Kitchen", "C1", "S1", "Nope") == []
    assert list_items_at_location(db_path, "Nope", "C1", "S1", None) == []


def test_list_item_masters_filters(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    add_item(db_path, "Rice", ids["shelf_id"], barcode="111", aliases="orez", track=1, qty=4)
    add_item(db_path, "Brown Rice", ids["shelf_id"], barcode="222", qty=None)
    add_item(db_path, "Beans", ids["shelf_id"], barcode="333", aliases="rice substitute")
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (name) VALUES ('Orphan')")
    conn.commit()
    conn.close()
    names = lambda s, b: [m["name"] for m in list_item_masters(db_path, s, b)]
    assert names("", "") == ["Beans", "Brown Rice", "Orphan", "Rice"]
    assert names("rice", "") == ["Beans", "Brown Rice", "Rice"]  # name or aliases, LIKE
    assert names("orez", "") == ["Rice"]
    assert names("", "222") == ["Brown Rice"]
    assert names("rice", "333") == ["Beans"]  # AND combination
    assert names("orez", "222") == []
    assert names("zzz", "") == []


def test_list_item_masters_shape(db_path, seed):
    ids = seed(db_path, "Kitchen", "C1", "S1")
    add_item(db_path, "Rice", ids["shelf_id"], track=1, min_q=2, qty=4, image="r.jpg")
    add_item(db_path, "Plain", ids["shelf_id"])
    by = {m["name"]: m for m in list_item_masters(db_path, "", "")}
    assert by["Rice"] == {"id": by["Rice"]["id"], "name": "Rice", "aliases": None, "image": "r.jpg",
                          "barcode": None, "min_quantity": 2, "track_quantity": True,
                          "location_count": 1, "total_quantity": 4}
    assert by["Plain"]["image"] is None and by["Plain"]["total_quantity"] is None
    assert by["Plain"]["track_quantity"] is False
