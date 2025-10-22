<p align="center">
  <img src="https://raw.githubusercontent.com/SnipsC0/Home-Inventory/main/logo.png" width="200" alt="Home Inventory Logo">
</p>

<div align="center">

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-blue)
![Privacy](https://img.shields.io/badge/data-local_only-important)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

A custom integration for Home Assistant designed to organize your domestic inventory through a logical structure: **Rooms → Cupboards → Shelves → Organizers → Items**, with support for secure local images, quantity tracking, minimum threshold alerts, automatic low stock events, dedicated UI, and smart automations.

---

## ✨ Features

| Feature                                   | Details                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| ✅ Logical Hierarchy                      | Rooms → Cupboards → Shelves → Organizers → Items                                 |
| ✅ Dedicated UI                           | Panel in Home Assistant Sidebar with fast, fluid interface                       |
| ✅ Secure Images                          | Served via local API, NOT through public `/local` directory                      |
| ✅ 100% Local Storage                     | No cloud, no external data transmission                                          |
| ✅ Quantity Tracking                      | Stock badge display with quick adjustment (+/-) buttons                          |
| ✅ HACS Compatible                        | Installable as HACS Custom Repository                                            |
| ✅ Lazy Loading                           | Efficient UI handling hundreds of items (infinite scroll)                        |
| ✅ Automations ready with sens and events | Support for notifications, Discord, To-Do lists, Google Sheets, LED alerts, etc. |
| ✅ Companion App Compatible               | Perfect for mobile use with barcode scanning and photo capture                   |

---

## 🚀 Installation

### 🔹 Manual Installation

1. Copy the `home_inventory` folder to:

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

### 🟣 Installation via HACS (Custom Repository)

1. Open HACS → **Integrations**

2. Click on `⋮` (top right menu) → **Custom Repositories**

3. Enter the repository URL:

   ```
   https://github.com/SnipsC0/Home-Inventory
   ```

   Type: **Integration**

4. Confirm → The integration appears in HACS → Click **Install**

5. Restart Home Assistant

---

## 🖥 Dedicated UI Panel

After installation, a **"Home Inventory"** panel appears in the Home Assistant sidebar.

The panel is served through a **secured API**, NOT through `/local`, which means:

✅ Images and data are NOT publicly accessible via direct URL or Cloudflare Proxy  
✅ Content loads only when authenticated in Home Assistant  
✅ Complete privacy and security for your inventory data

---

## 📊 Available Sensors

The integration automatically creates three sensor entities for monitoring your inventory. Each sensor updates every minute and provides real-time inventory statistics.

### Sensor: `sensor.home_inventory_total_items`

**Description**: Tracks the total number of items in your entire inventory.

**Attributes and state**:

```yaml
state: 127
attributes:
  unit_of_measurement: 'items'
```

---

### Sensor: `sensor.home_inventory_low_stock`

**Description**: Monitors items that have quantity tracking enabled and are currently at or below their minimum threshold.

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

**Description**: Displays all items that have quantity tracking enabled, regardless of their current stock level.

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
      is_low: false
    - id: 102
      name: 'Paper Towels'
      quantity: 1
      min_quantity: 3
      room: 'Kitchen'
      cupboard: 'Under Sink'
      shelf: 'Bottom'
      is_low: true
```

**SQL Query Logic**:

- Only includes items with `track_quantity = 1`
- Only includes items where `min_quantity` is set
- Includes items regardless of current quantity level
- Orders results by name (alphabetically)
- Includes `is_low` flag to indicate if item is below threshold

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
- **No telemetry**: No data collection or external communications

---

## 📱 Mobile Usage

The integration works seamlessly with the Home Assistant Companion App:

- Fast mobile interface
- Camera integration for item photos
- Barcode scanning support (incoming...)
- Quick quantity adjustments
- Push notifications for low stock alerts

---

## 🛠 Usage Tips

1. **Organize first, populate later**: Set up your room/cupboard/shelf structure before adding items
2. **Use quantity tracking**: Enable quantity tracking for consumable items
3. **Set realistic minimum thresholds**: Configure min_quantity based on your usage patterns
4. **Leverage automations**: Create automations for shopping lists, notifications, and alerts
5. **Use aliases**: Add alternative names to make items easier to search
6. **Take photos**: Visual inventory is easier to manage and identify items

---

## 📜 License

Distributed under the MIT License. You are free to modify and redistribute.

---

## ⭐ Support

If you find this project useful, a ⭐ on GitHub helps tremendously!

---
