<p align="center">
  <img src="https://raw.githubusercontent.com/SnipsC0/Home-Inventory/main/logo.png" width="200" alt="Home Inventory Logo">
</p>

<div align="center">

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-41BDF5)
![Min HA](https://img.shields.io/badge/Home%20Assistant-2026.11%2B-41BDF5)
![Marketplace](https://img.shields.io/badge/Marketplace-Custom%20Repository-blue)
![Privacy](https://img.shields.io/badge/data-local_only-important)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

A custom integration for Home Assistant designed to organize your domestic inventory through a logical structure: **Rooms → Cupboards → Shelves → Organizers → Items**. An item can live in several places at once, each with its own quantity, expiry batches and photo. Includes secure local images, barcodes per variant, low stock and expiry alerts, QR/NFC links, a dedicated UI and sensors/events for automations.

---

## ✨ Features

| Feature                     | Details                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| ✅ Logical Hierarchy        | Rooms → Cupboards → Shelves → Organizers → Items                                              |
| ✅ Multi-location Items     | One item, many places, each with its own quantity, expiry batches and image                   |
| ✅ Variants & Barcodes      | Separate rows per variant (e.g. "small jar"), each with its own barcode                       |
| ✅ Barcode Scanning         | Native scanner of the Companion app, image upload or manual entry; **Find by barcode**        |
| ✅ Expiry Tracking          | Expiration batches, configurable warning window, "Expiring" view, sensor and event            |
| ✅ Quantity Tracking        | Stock badge with quick +/- buttons, minimum thresholds and low stock alerts                   |
| ✅ Photos Everywhere        | Rooms, cupboards, shelves, organizers and every item location, with fast thumbnails           |
| ✅ QR / NFC Links           | QR code (PNG) and deep link for cupboards and shelves; ID-based, so they survive renames      |
| ✅ Safe Deletes             | Delete preview lists everything a cascade delete will remove (children, items, images)        |
| ✅ Dedicated UI             | Sidebar panel with a fast, fluid interface, translated in English, Romanian and Russian                |
| ✅ Secure Images            | Served via authenticated API, NOT through the public `/local` directory                       |
| ✅ 100% Local Storage       | No cloud, no external data transmission (QR codes are generated locally too)                  |
| ✅ Lazy Loading             | Efficient UI handling hundreds of items (infinite scroll)                                     |
| ✅ Automation Ready         | Four sensors and two events for notifications, shopping lists, Discord, LED alerts, etc.      |

---

## 🚀 Installation

> **Requirements:** Home Assistant **2026.11.0** or newer. Older Home Assistant versions stay on **2.0.3**.

### 🟣 Installation via Marketplace (Custom Repository)

1. Open the **Marketplace** (the built-in successor of HACS) → **Integrations**

2. Click on `⋮` (top right menu) → **Custom Repositories**

3. Enter the repository URL:

   ```
   https://github.com/SnipsC0/Home-Inventory
   ```

   Type: **Integration**

4. Confirm → The integration appears in the list → Click **Install**

5. Restart Home Assistant

6. Add the integration:
   ```
   Settings → Devices & Services → Add Integration → "Home Inventory"
   ```

### 🔹 Manual Installation

1. Download `home_inventory.zip` from the latest [GitHub release](https://github.com/SnipsC0/Home-Inventory/releases) (the frontend is already built) and extract it to:

   ```
   /config/custom_components/home_inventory
   ```

2. Restart Home Assistant:

   ```
   Settings → System → Restart
   ```

3. Add the integration:
   ```
   Settings → Devices & Services → Add Integration → "Home Inventory"
   ```

### ⚙️ Options

`Settings → Devices & Services → Home Inventory → Configure`:

- **Interface language** (English / Romanian / Russian), used by the whole panel
- **Allow editing the structure**: when off, rooms, cupboards and shelves cannot be added, edited or deleted (items and organizers stay editable)
- **Warn before expiry**: 1-31 days or 1-12 months (default 7 days)

### 🔄 Upgrading from 2.x

The database is migrated to schema v2 automatically on first start. **A backup is created right before the migration**: `/config/data/home_inventory_backup.zip`, containing the database and all images. An existing backup is never overwritten (a timestamp is added to the new name), and if the backup fails the migration is not applied.

To roll back: stop Home Assistant and extract the zip into `/config/data/` (it contains the `home_inventory/` folder).

---

## 🖥 Dedicated UI Panel

After installation, a **"Home Inventory"** panel appears in the Home Assistant sidebar.

The panel is served through a **secured API**, NOT through `/local`, which means:

✅ Images and data are NOT publicly accessible via direct URL or Cloudflare Proxy  
✅ Content loads only when authenticated in Home Assistant  
✅ Complete privacy and security for your inventory data

### Views

- **Rooms → Cupboards → Shelves → Organizers**: browse and manage the hierarchy, with photos on every card
- **All items**: every item with all its locations and a cumulative total; filter by location (with location photos)
- **Tracked items**: items with quantity tracking enabled
- **Expiring**: batches inside the warning window, already expired ones included
- **Find by barcode** (header): scan or type a barcode to jump straight to the item

Edit and delete actions are available via long press or right-click on any card.

### 🏷️ QR codes & NFC tags

Cupboards and shelves have a **QR / NFC** dialog that shows a QR code (downloadable as PNG) and a copyable deep link to write on an NFC tag with any NFC app:

```
homeassistant://navigate/home_inventory?target=shelf&id=12
```

Links use IDs, so they keep working after a rename. QR codes printed with older versions keep working too.

---

## 📊 Available Sensors

The integration automatically creates four sensor entities for monitoring your inventory. Each sensor updates every minute and provides real-time inventory statistics.

### Sensor: `sensor.home_inventory_total_items`

**Description**: Tracks the number of unique items in your entire inventory.

**Attributes and state**:

```yaml
state: 127
attributes:
  unit_of_measurement: 'items'
```

---

### Sensor: `sensor.home_inventory_low_stock`

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

### Sensor: `sensor.home_inventory_tracked_items`

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

### Sensor: `sensor.home_inventory_expiring_batches`

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

---

## 🔍 Using Sensors in Automations

You can use these sensors to create powerful automations:

### Example: Badge Count Notification

```yaml
automation:
  - alias: 'Daily Low Stock Summary'
    trigger:
      - platform: time
        at: '09:00:00'
    condition:
      - condition: numeric_state
        entity_id: sensor.home_inventory_low_stock
        above: 0
    action:
      - service: notify.mobile_app
        data:
          title: '📦 Inventory Alert'
          message: "You have {{ states('sensor.home_inventory_low_stock') }} items running low!"
```

### Example: Using Sensor Attributes

```yaml
automation:
  - alias: 'Low Stock Item List'
    trigger:
      - platform: state
        entity_id: sensor.home_inventory_low_stock
    action:
      - service: notify.persistent_notification
        data:
          title: 'Low Stock Items'
          message: >
            {% for item in state_attr('sensor.home_inventory_low_stock', 'items') %}
            - {{ item.name }}: {{ item.quantity }}/{{ item.min_quantity }} ({{ item.location }})
            {% endfor %}
```

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

---

## 🔔 Example Automations

### Push Notification for Low Stock

```yaml
automation:
  - alias: '📱 Low Stock Notification - Inventory'
    trigger:
      - platform: event
        event_type: home_inventory_low_stock
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: '⚠️ Low Stock: {{ trigger.event.data.name }}'
          message: >
            Item "{{ trigger.event.data.name }}" is running low!
            Quantity: {{ trigger.event.data.quantity }} / {{ trigger.event.data.min_quantity }}
            Location: {{ trigger.event.data.location }}
```

### Add to Shopping List

```yaml
automation:
  - alias: '🛒 Add Low Stock to Shopping List'
    trigger:
      - platform: event
        event_type: home_inventory_low_stock
    action:
      - service: shopping_list.add_item
        data:
          name: '{{ trigger.event.data.name }}'
```

### Discord Notification

```yaml
automation:
  - alias: '💬 Discord Low Stock Alert'
    trigger:
      - platform: event
        event_type: home_inventory_low_stock
    action:
      - service: notify.discord
        data:
          message: >
            🚨 **Low Stock Alert**
            **Item:** {{ trigger.event.data.name }}
            **Quantity:** {{ trigger.event.data.quantity }}/{{ trigger.event.data.min_quantity }}
            **Location:** {{ trigger.event.data.location }}
```

### LED Light Alert

```yaml
automation:
  - alias: '💡 LED Alert for Low Stock'
    trigger:
      - platform: event
        event_type: home_inventory_low_stock
    action:
      - service: light.turn_on
        target:
          entity_id: light.kitchen_led
        data:
          rgb_color: [255, 0, 0]
          brightness: 255
      - delay: '00:00:03'
      - service: light.turn_off
        target:
          entity_id: light.kitchen_led
```

### Expiry Notification

```yaml
automation:
  - alias: '📅 Expiring Soon - Inventory'
    trigger:
      - platform: event
        event_type: home_inventory_expiring_soon
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: '📅 {{ trigger.event.data.count }} batch(es) expiring soon'
          message: >
            {% for b in trigger.event.data.batches %}
            - {{ b.name }}{% if b.variant %} ({{ b.variant }}){% endif %}: {{ b.quantity }} pcs, {{ b.date }} ({{ b.location }})
            {% endfor %}
```

---

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

---

## 🔐 Security & Privacy

- **Secure image serving**: Images are NOT served through the public `/local` directory
- **Authentication required**: Image access requires Home Assistant authentication
- **100% offline/local operation**: Works completely offline without external dependencies
- **Cloudflare/Remote Proxy compatible**: Secure when accessed remotely
- **No cloud synchronization**: All data stays on your Home Assistant instance
- **No telemetry**: No data collection or external communications; QR codes are generated locally
- **Automatic backup before migrations**: database and images zipped to `/config/data/home_inventory_backup.zip`

---

## 📱 Mobile Usage

The integration works seamlessly with the Home Assistant Companion App:

- Fast mobile interface
- Camera integration for item photos
- Barcode scanning with the app's native scanner (works over http too); image upload and manual entry are available everywhere
- QR codes and NFC tags open a cupboard or shelf directly in the panel
- Quick quantity adjustments
- Push notifications for low stock and expiry alerts

---

## 🛠 Usage Tips

1. **Organize first, populate later**: Set up your room/cupboard/shelf structure before adding items
2. **Use quantity tracking**: Enable quantity tracking for consumable items
3. **Set realistic minimum thresholds**: Configure min_quantity based on your usage patterns
4. **Leverage automations**: Create automations for shopping lists, notifications, and alerts
5. **Use aliases**: Add alternative names to make items easier to search
6. **Take photos**: Visual inventory is easier to manage and identify items
7. **Use variants**: Keep different sizes/brands of the same item as separate rows, each with its own barcode
8. **Add expiry dates**: Enter batches when adding food or medicine and get notified before they expire
9. **Label your furniture**: Stick a QR code or NFC tag on cupboards and shelves for one-tap access

---

## 📜 License

Distributed under the MIT License. You are free to modify and redistribute.

---

## ⭐ Support

If you find this project useful, a ⭐ on GitHub helps tremendously!

---
