import json
import sqlite3
from datetime import date

from conftest import seed_location
from home_inventory.db.repository import (
    create_item_location,
    expiry_threshold,
    list_expiring_batches,
)

TODAY = date(2026, 1, 31)


def test_threshold_days_and_months():
    assert expiry_threshold(TODAY, 7, "days") == date(2026, 2, 7)
    assert expiry_threshold(TODAY, 1, "months") == date(2026, 2, 28)
    assert expiry_threshold(TODAY, 12, "months") == date(2027, 1, 31)
    assert expiry_threshold(date(2026, 11, 19), 3, "months") == date(2027, 2, 19)


def _add(db_path, name, batches, **loc):
    seed_location(db_path, "Kitchen", "Cup", "Top")
    r = create_item_location(
        db_path, room="Kitchen", cupboard="Cup", shelf=loc.get("shelf", "Top"),
        organizer=None, name=name, aliases=None, image=None, barcode=None,
        min_quantity=None, track_quantity=True, exp_obj=None,
        add_total_qty=1, add_batch_qty=1, batch_date=None,
        variant=None, merge_location_id=None,
    )
    conn = sqlite3.connect(db_path)
    conn.execute(
        "UPDATE item_locations SET expiration_dates = ? WHERE item_id = (SELECT id FROM items_master WHERE name = ?)",
        (json.dumps(batches), name),
    )
    conn.commit()
    conn.close()
    return r


def test_lists_only_batches_inside_window(db_path):
    _add(db_path, "Milk", [
        {"quantity": 2, "date": "2026-02-03"},
        {"quantity": 1, "date": "2026-06-01"},
        {"quantity": 4, "date": None},
    ])
    _add(db_path, "Yogurt", [{"quantity": 1, "date": "2026-01-30"}])
    out = list_expiring_batches(db_path, TODAY, date(2026, 2, 7))
    assert [(b["name"], b["date"], b["days_left"], b["expired"]) for b in out] == [
        ("Yogurt", "2026/01/30", -1, True),
        ("Milk", "2026/02/03", 3, False),
    ]
    assert out[1]["location"] == "Kitchen / Cup / Top"


def test_ignores_bad_data_and_zero_quantity(db_path):
    _add(db_path, "Bad", [{"quantity": 1, "date": "nope"}, {"quantity": 0, "date": "2026-02-01"}, "x"])
    assert list_expiring_batches(db_path, TODAY, date(2026, 12, 31)) == []


def test_accepts_slash_dates(db_path):
    _add(db_path, "Slash", [{"quantity": 1, "date": "2026/02/03"}])
    out = list_expiring_batches(db_path, TODAY, date(2026, 2, 7))
    assert [b["date"] for b in out] == ["2026/02/03"]
