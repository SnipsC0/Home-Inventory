# Automations

Back to the [README](https://github.com/SnipsC0/Home-Inventory/blob/main/README.md) · [Sensors](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/sensors.md) · [Events](https://github.com/SnipsC0/Home-Inventory/blob/main/docs/events.md)

## 🔍 Using sensors in automations

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

## 🔔 Event-based automations

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

