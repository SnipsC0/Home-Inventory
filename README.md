# Home Inventory

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-blue)
![Privacy](https://img.shields.io/badge/data-local_only-important)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

**Home Inventory** este o integrare custom pentru **Home Assistant**, destinată organizării inventarului casnic printr-o structură logică:
**Camere → Dulapuri → Rafturi → Organizatoare → Obiecte**, cu suport pentru **poze locale securizate, cantități, prag minim, eveniment automat pentru stoc redus, UI dedicat și automatizări inteligente**.

---

## 📌 Cuprins

- [✨ Funcționalități](#-funcționalități)
- [📁 Structură proiect](#-structură-proiect)
- [🚀 Instalare](#-instalare)
- [🔹 Instalare Manuală](#-instalare-manuală)
- [🟣 Instalare prin HACS (Custom Repository)](#-instalare-prin-hacs-custom-repository)
- [🖥 Panou UI dedicat](#-panou-ui-dedicat)
- [📊 Senzori disponibili](#-senzori-disponibili)
- [📢 Eveniment automat: home_inventory_low_stock](#-eveniment-automat-home_inventory_low_stock)
- [🔔 Exemplu notificare push](#-exemplu-notificare-push)
- [🧪 Test eveniment manual](#-test-eveniment-manual)
- [🔐 Securitate & confidențialitate](#-securitate--confidențialitate)
- [🖼 Screenshot-uri (opțional)](#-screenshot-uri-opțional)
- [📜 Licență](#-licență)

---

## ✨ Funcționalități

| Funcție                        | Detalii                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| ✅ Ierarhie logică             | Camere → Dulapuri → Rafturi → Organizatoare → Obiecte             |
| ✅ UI dedicat                  | Panou în Home Assistant Sidebar, interfață rapidă și fluentă      |
| ✅ Poze securizate             | Servite prin API local, **NU prin `/local` public**               |
| ✅ Stocare locală 100%         | Fără cloud, fără trimiteri externe                                |
| ✅ Track cantitate             | Afișare badge stoc + reglare rapidă (+/-)                         |
| ✅ Prag minim alertă           | Eveniment Home Assistant: `home_inventory_low_stock`              |
| ✅ HACS compatibil             | Instalabil ca **HACS Custom Repository**                          |
| ✅ Lazy Loading                | UI eficient cu sute de obiecte (scroll infinit)                   |
| ✅ Automations Ready           | Suport pentru notificări, Discord, To-Do, Google Sheets, LED etc. |
| ✅ Compatibil cu Companion App | Perfect pentru mobil + scanare coduri/poze                        |

---

## 🚀 Instalare

### 🔹 Instalare Manuală

1. Copiază folderul `home_inventory` în:
   → `/config/custom_components/home_inventory`
2. Repornește Home Assistant:
   → `Settings → System → Restart`
3. Adaugă integrarea:
   → `Settings → Devices & Services → Add Integration → "Home Inventory"`

---

### 🟣 Instalare prin **HACS (Custom Repository)**

1. Deschide HACS → `Integrations`
2. Click pe `⋮` (meniu dreapta sus) → `Custom Repositories`
3. Introdu URL:
   →`https://github.com/SnipsC0/Home-inventar`

Tip: **Integration** 4. Confirmă → apare în HACS → Instalează 5. Repornește Home Assistant

---

## 🖥 Panou UI dedicat

După instalare, în bara laterală Home Assistant apare **"Home Inventory"**.  
Panoul este servit prin API securizat, NU prin `/local`, ceea ce înseamnă:

> ✅ **Imaginile și datele NU sunt accesibile public** prin URL direct sau Cloudflare Proxy — se încarcă doar dacă ești autentificat în HA.

---

## 📢 Eveniment automat: `home_inventory_low_stock`

Integrarea generează automat evenimentul **`home_inventory_low_stock`** când un obiect intră în **stoc redus**.

### 🎯 Condiții pentru declanșare

| Condiție                            | Necesită |
| ----------------------------------- | :------: |
| `track_quantity = True`             |    ✅    |
| Modificare cantitate (UI/API/modal) |    ✅    |
| `quantity <= min_quantity`          |    ✅    |
| `quantity > 0`                      |    ✅    |

### 🔍 Structură eveniment

```yaml
event_type: home_inventory_low_stock
  event_data:
    item_id: 123
    name: 'Orez Basmati'
    aliases: 'orez, rice'
    quantity: 1
    min_quantity: 2
    room: 'Bucătărie'
    cupboard: 'Dulap Mare'
    shelf: 'Raft 2'
    location: 'Bucătărie › Dulap Mare › Raft 2'
```

### Exemple notificare push

automation:

```yaml
- alias: '📱 Notificare Stoc Redus - Inventar'
  trigger:
    - platform: event
      event_type: home_inventory_low_stock
  action:
    - service: notify.mobile_app_telefonul_tau
      data:
        title: '⚠️ Stoc Redus: {{ trigger.event.data.name }}'
        message: >
          Obiectul "{{ trigger.event.data.name }}" este pe terminate!
          Cantitate: {{ trigger.event.data.quantity }} / {{ trigger.event.data.min_quantity }}
          Locație: {{ trigger.event.data.location }}
```

### Test eveniment manual

```yaml
event_type: home_inventory_low_stock
event_data:
  name: 'Test'
  quantity: 1
  min_quantity: 2
  location: 'Room / Cupboard / Shelf *(/ Organizer)*'
```

---

## Securitate & confidențialitate

→ Imaginile nu sunt servite prin /local public
→ Acces imagini doar cu autentificare HA
→ Funcționare 100% offline/local
→ Compatibil cu Cloudflare / Remote Proxy

---

## Screenshot-uri

... in progress

---

## Licență

Distribuit sub licență MIT — poți modifica și redistribui liber.

Dacă îți este util proiectul, un ⭐ pe GitHub ajută enorm.
