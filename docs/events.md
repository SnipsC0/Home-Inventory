# Events

Back to the [README](https://github.com/SnipsC0/Home-Inventory/blob/main/README.md) · [Sensors](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/sensors.md) · [Automations](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/automations.md)

## 📢 Automatic Event: `home_inventory_low_stock`

The integration automatically triggers the `home_inventory_low_stock` event when an item enters low stock status.

### Trigger Conditions

| Condition                        | Required |
| -------------------------------- | -------- |
| `track_quantity = True`          | ✅       |
| Quantity modified (UI/API/modal) | ✅       |
| `quantity <= min_quantity`       | ✅       |
| `quantity > 0`                   | ✅       |

### Event Data Structure

```yaml
event_type: home_inventory_low_stock
event_data:
  item_id: 123
  name: 'Basmati Rice'
  aliases: 'rice, long grain'
  quantity: 1
  min_quantity: 2
  room: 'Kitchen'
  cupboard: 'Main Cupboard'
  shelf: 'Shelf 2'
  organizer: 'Rice Container' # Optional
  location: 'Kitchen › Main Cupboard › Shelf 2 › Rice Container'
```

> Low stock is evaluated on the item's **total quantity across all its locations**.

---

## 📅 Automatic Event: `home_inventory_expiring_soon`

Fired by the expiring batches sensor when batches enter the warning window. Each batch notifies once, until it leaves the window (or Home Assistant restarts).

### Event Data Structure

```yaml
event_type: home_inventory_expiring_soon
event_data:
  count: 1 # batches that just entered the window
  total_count: 2 # all batches currently in the window
  warning_value: 7
  warning_unit: 'days'
  warning_until: '2026/11/26'
  batches:
    - id: 130
      name: 'Yogurt'
      variant: null
      quantity: 4
      date: '2026/11/22'
      days_left: 3
      expired: false
      location: 'Kitchen / Fridge / Top Shelf'
      # ... same fields as the sensor's batches
```


## 🧪 Manual Event Testing

You can manually trigger the event for testing purposes:

### Via Developer Tools → Events

```yaml
event_type: home_inventory_low_stock
event_data:
  name: 'Test Item'
  quantity: 1
  min_quantity: 2
  location: 'Room / Cupboard / Shelf / Organizer'
```

