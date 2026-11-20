# Sensors

Back to the [README](https://github.com/SnipsC0/Home-Inventory/blob/main/README.md) · [Events](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/events.md) · [Automations](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/automations.md)

The integration automatically creates four sensor entities for monitoring your inventory. Each sensor updates every minute and provides real-time inventory statistics.

## Sensor: `sensor.home_inventory_total_items`

**Description**: Tracks the number of unique items in your entire inventory.

**Attributes and state**:

```yaml
state: 127
attributes:
  unit_of_measurement: 'items'
```

---

## Sensor: `sensor.home_inventory_low_stock`

**Description**: Monitors items that have quantity tracking enabled and whose **total quantity across all locations** is at or below their minimum threshold. One entry per item.

**Attributes and state**:

```yaml
state: 5
attributes:
  unit_of_measurement: 'items'
  items:
    - id: 123
      name: 'Basmati Rice'
      quantity: 1
      min_quantity: 2
      room: 'Kitchen'
      cupboard: 'Main Cupboard'
      shelf: 'Shelf 2'
      location: 'Kitchen / Main Cupboard / Shelf 2'
    - id: 456
      name: 'Olive Oil'
      quantity: 0
      min_quantity: 1
      room: 'Kitchen'
      cupboard: 'Pantry'
      shelf: 'Top Shelf'
      location: 'Kitchen / Pantry / Top Shelf'
```

---

## Sensor: `sensor.home_inventory_tracked_items`

**Description**: Displays all items that have quantity tracking enabled, regardless of their current stock level. One entry per item location.

**Attributes and state**:

```yaml
state: 42
attributes:
  unit_of_measurement: 'items'
  items:
    - id: 101
      name: 'AA Batteries'
      quantity: 8
      min_quantity: 4
      room: 'Office'
      cupboard: 'Desk Drawer'
      shelf: 'Top Drawer'
      location: 'Office / Desk Drawer / Top Drawer'
      is_low: false
    - id: 102
      name: 'Paper Towels'
      quantity: 1
      min_quantity: 3
      room: 'Kitchen'
      cupboard: 'Under Sink'
      shelf: 'Bottom'
      location: 'Kitchen / Under Sink / Bottom'
      is_low: true
```

**Logic**:

- Only includes items with `track_quantity = 1`
- Only includes items where `min_quantity` is set
- Includes items regardless of current quantity level
- Orders results by name (alphabetically)
- `is_low` is evaluated on the item's total across all its locations

---

## Sensor: `sensor.home_inventory_expiring_batches`

**Description**: Counts expiration batches with a date inside the warning window (configurable in the integration options, default 7 days). Already expired batches are included with `expired: true`.

**Attributes and state**:

```yaml
state: 2
attributes:
  unit_of_measurement: 'batches'
  expired_count: 1
  warning_value: 7
  warning_unit: 'days'
  warning_until: '2026/11/26'
  batches:
    - id: 123
      name: 'Milk'
      variant: '1L'
      location_id: 45
      quantity: 2
      date: '2026/11/18'
      days_left: -1
      expired: true
      room: 'Kitchen'
      cupboard: 'Fridge'
      shelf: 'Door'
      organizer: null
      location: 'Kitchen / Fridge / Door'
    - id: 130
      name: 'Yogurt'
      variant: null
      location_id: 51
      quantity: 4
      date: '2026/11/22'
      days_left: 3
      expired: false
      room: 'Kitchen'
      cupboard: 'Fridge'
      shelf: 'Top Shelf'
      organizer: null
      location: 'Kitchen / Fridge / Top Shelf'
```

