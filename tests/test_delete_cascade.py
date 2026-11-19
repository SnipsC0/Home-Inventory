import sqlite3

from home_inventory.db import repository


def _setup(db_path, seed):
    a = seed(db_path, "R1", "C1", "S1", "O1")
    b = seed(db_path, "R2", "C2", "S2")
    conn = sqlite3.connect(db_path)
    conn.execute("UPDATE rooms SET image='room.jpg' WHERE id=?", (a["room_id"],))
    conn.execute("UPDATE cupboards SET image='cup.jpg' WHERE id=?", (a["cupboard_id"],))
    conn.execute("UPDATE shelves SET image='shelf.jpg' WHERE id=?", (a["shelf_id"],))
    conn.execute("UPDATE organizers SET image='org.jpg' WHERE id=?", (a["organizer_id"],))
    # only_here: single location in R1; both: R1 + R2
    conn.execute("INSERT INTO items_master (id, name, default_image) VALUES (1,'only','m1.jpg')")
    conn.execute("INSERT INTO items_master (id, name, default_image) VALUES (2,'both','m2.jpg')")
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, image) VALUES (1,?,?,1,'l1.jpg')",
                 (a["shelf_id"], a["organizer_id"]))
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (2,?,1,'l2a.jpg')", (a["shelf_id"],))
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (2,?,1,'l2b.jpg')", (b["shelf_id"],))
    conn.commit()
    conn.close()
    return a, b


def test_delete_room_cascades(db_path, seed, q):
    a, b = _setup(db_path, seed)
    count, images = repository.delete_room(db_path, a["room_id"])
    assert count == 1
    assert set(images) == {"room.jpg", "cup.jpg", "shelf.jpg", "org.jpg", "l1.jpg", "l2a.jpg", "m1.jpg"}
    assert q(db_path, "SELECT id FROM items_master") == [(2,)]
    assert q(db_path, "SELECT image FROM item_locations") == [("l2b.jpg",)]
    assert q(db_path, "SELECT COUNT(*) FROM cupboards")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM shelves")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM organizers")[0][0] == 0


def test_delete_organizer_removes_orphan_master(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    deleted, org_img, item_imgs, n = repository.hard_delete_organizer(db_path, a["organizer_id"])
    assert deleted and org_img == "org.jpg" and n == 1
    assert set(item_imgs) == {"l1.jpg", "m1.jpg"}
    assert q(db_path, "SELECT id FROM items_master ORDER BY id") == [(2,)]


def test_shared_image_with_surviving_master_is_kept(db_path, seed, q):
    a = seed(db_path, "R1", "C1", "S1")
    b = seed(db_path, "R2", "C2", "S2")
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO items_master (id, name, default_image) VALUES (1,'x','same.jpg')")
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (1,?,1,'same.jpg')", (a["shelf_id"],))
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, quantity, image) VALUES (1,?,1,'keep.jpg')", (b["shelf_id"],))
    conn.commit()
    conn.close()
    _, images = repository.delete_room(db_path, a["room_id"])
    assert "same.jpg" not in images
    assert q(db_path, "SELECT image FROM item_locations") == [("keep.jpg",)]


def test_delete_cupboard_cascades(db_path, seed, q):
    a, b = _setup(db_path, seed)
    count, images = repository.delete_cupboard(db_path, a["cupboard_id"])
    assert count == 1
    assert set(images) == {"cup.jpg", "shelf.jpg", "org.jpg", "l1.jpg", "l2a.jpg", "m1.jpg"}
    assert q(db_path, "SELECT id FROM rooms ORDER BY id") == [(a["room_id"],), (b["room_id"],)]
    assert q(db_path, "SELECT COUNT(*) FROM cupboards")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM shelves")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM organizers")[0][0] == 0
    assert q(db_path, "SELECT id FROM items_master") == [(2,)]
    assert q(db_path, "SELECT image FROM item_locations") == [("l2b.jpg",)]


def test_delete_shelf_cascades(db_path, seed, q):
    a, b = _setup(db_path, seed)
    count, images = repository.delete_shelf(db_path, a["shelf_id"])
    assert count == 1
    assert set(images) == {"shelf.jpg", "org.jpg", "l1.jpg", "l2a.jpg", "m1.jpg"}
    assert q(db_path, "SELECT COUNT(*) FROM cupboards")[0][0] == 2
    assert q(db_path, "SELECT COUNT(*) FROM shelves")[0][0] == 1
    assert q(db_path, "SELECT COUNT(*) FROM organizers")[0][0] == 0
    assert q(db_path, "SELECT id FROM items_master") == [(2,)]
    assert q(db_path, "SELECT image FROM item_locations") == [("l2b.jpg",)]


def test_delete_organizer_keeps_master_with_other_location(db_path, seed, q):
    a, _ = _setup(db_path, seed)
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO item_locations (item_id, shelf_id, organizer_id, quantity, image) VALUES (2,?,?,1,'l2c.jpg')",
                 (a["shelf_id"], a["organizer_id"]))
    conn.commit()
    conn.close()
    _, _, imgs, n = repository.hard_delete_organizer(db_path, a["organizer_id"])
    assert n == 2
    assert set(imgs) == {"l1.jpg", "m1.jpg", "l2c.jpg"}  # master 2 survives: no m2.jpg
    assert q(db_path, "SELECT id FROM items_master ORDER BY id") == [(2,)]
    assert q(db_path, "SELECT COUNT(*) FROM item_locations")[0][0] == 2


def test_delete_item_master_removes_everything(db_path, seed, q):
    _setup(db_path, seed)
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO item_variant_barcodes (item_id, variant, barcode) VALUES (2,'v','123')")
    conn.commit()
    conn.close()
    count, images, locations, err = repository.delete_item_master(db_path, 2)
    assert (count, err) == (1, None)
    assert set(images) == {"l2a.jpg", "l2b.jpg", "m2.jpg"}
    assert len(locations) == 2
    assert q(db_path, "SELECT id FROM items_master") == [(1,)]
    assert q(db_path, "SELECT COUNT(*) FROM item_locations WHERE item_id = 2")[0][0] == 0
    assert q(db_path, "SELECT COUNT(*) FROM item_variant_barcodes")[0][0] == 0


def test_delete_preview_matches_actual_delete(db_path, seed):
    a, _ = _setup(db_path, seed)
    pv = repository.delete_preview(db_path, "room", a["room_id"])
    assert pv["cupboards"] == 1 and pv["shelves"] == 1 and pv["organizers"] == 1
    assert pv["locations"] == 2 and pv["items"] == 1  # master 2 survives in R2
    _, images = repository.delete_room(db_path, a["room_id"])
    assert pv["images"] == len(set(images))


def test_delete_preview_other_kinds(db_path, seed):
    a, _ = _setup(db_path, seed)
    assert repository.delete_preview(db_path, "cupboard", a["cupboard_id"])["locations"] == 2
    assert repository.delete_preview(db_path, "shelf", a["shelf_id"])["organizers"] == 1
    pv = repository.delete_preview(db_path, "organizer", a["organizer_id"])
    assert (pv["locations"], pv["items"]) == (1, 1)
    pv = repository.delete_preview(db_path, "item_master", 2)
    assert (pv["locations"], pv["items"]) == (2, 1) and len(pv["locations_list"]) == 2
    assert repository.delete_preview(db_path, "room", 999) is None
    assert repository.delete_preview(db_path, "bogus", 1) is None


def test_delete_preview_item_location(db_path, seed, q):
    _setup(db_path, seed)
    last = q(db_path, "SELECT id FROM item_locations WHERE item_id = 1")[0][0]
    shared = q(db_path, "SELECT id FROM item_locations WHERE image = 'l2a.jpg'")[0][0]
    pv = repository.delete_preview(db_path, "item_location", last)
    assert (pv["locations"], pv["items"], pv["images"]) == (1, 1, 2)  # l1.jpg + m1.jpg
    pv = repository.delete_preview(db_path, "item_location", shared)
    assert (pv["locations"], pv["items"], pv["images"]) == (1, 0, 1)
