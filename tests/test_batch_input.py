import pytest

from home_inventory.db.repository import normalize_batch_input


@pytest.mark.parametrize(
    "quantity, exp_obj, expected",
    [
        (None, None, (0, 0, None)),
        (5, None, (5, 5, None)),
        ("5", None, (5, 5, None)),
        (5, {"quantity": 3, "date": "2025-12-31"}, (5, 3, "2025-12-31")),
        (None, {"quantity": 3, "date": "2025-12-31"}, (3, 3, "2025-12-31")),
        (4, {"date": "2025-12-31"}, (4, 4, "2025-12-31")),
        (4, {"quantity": 2, "date": "  "}, (4, 2, None)),
        (4, {"quantity": 2, "date": "  2025-01-01 "}, (4, 2, "2025-01-01")),
        (None, {"date": "2025-01-01"}, (0, 0, "2025-01-01")),
        ("abc", None, (0, 0, None)),
        (5, {"quantity": "x", "date": None}, (5, 0, None)),
    ],
)
def test_normalize_batch_input(quantity, exp_obj, expected):
    assert normalize_batch_input(quantity, exp_obj) == expected
