## 🏷️ 3.0.1

> Home Inventory 3.0 is a big update: one item can now be stored in several places, with variants, barcodes, expiry alerts and photos for every location. Version 3.0.1 is the first one you should install - it also makes sure your browser or the Home Assistant app shows the new look right after updating.

### ⚠️ Before you update

- You need Home Assistant **2026.11.0** or newer, and the integration must be installed from the built-in **Marketplace** (it replaces HACS). If you have an older Home Assistant, stay on version 2.0.3.
- **Your data is upgraded automatically** the first time Home Assistant starts with this version. Nothing to do on your side.
- **A backup is made for you first**, right before the upgrade: `<config>/data/home_inventory_backup.zip` (usually `/config/data/home_inventory_backup.zip`). It contains your database and all your photos. It never overwrites an older backup (a date is added to the name instead). If the backup can't be created, the upgrade is not applied and your data stays untouched.
- **To go back to the old version:** stop Home Assistant, unzip the backup into `<config>/data/` (it contains the `home_inventory` folder), then reinstall 2.0.3.

### What's new in 3.0.1

- **No more stale screens after updating.** Previously your browser or the Home Assistant app could keep showing the old panel after an update until you refreshed manually. It now picks up the new version by itself.
- If you already installed 3.0.0 and still see the old interface, do one hard refresh (Ctrl+F5, or clear the app cache) - after that it stays up to date.

### Highlights of version 3

- **One item, many places** - keep the same item in several locations, each with its own quantity, expiry dates and photo.
- **Variants and barcodes** - e.g. "small jar" and "large jar" as separate entries, each with its own barcode.
- **Expiry alerts** - a new "Expiring" view, plus a sensor and an event you can use in Home Assistant automations and notifications.
- **Photos everywhere** - rooms, shelves and every place where an item is stored, with fast-loading previews.
- **QR / NFC links that last** - they keep working even if you rename a room, cupboard or shelf. Already printed QR codes still work.
- **Russian translation** - the panel and the integration settings (pick the language in the options).

### New features

**Items and barcodes**

- **Variants**: the same item placed in the same spot can be kept as separate entries, each with an optional label (e.g. "500 g"). When adding, you choose an existing entry or start a new one.
- **Barcode per variant**: scan or type a barcode and the item, variant and entry are selected for you. Items without variants have one editable barcode.
- **Find by barcode**: scan or type a barcode from the top bar to jump straight to the item.

**Expiry**

- **Expiry warnings**: choose how early you want to be warned (1-31 days or 1-12 months, 7 days by default).
- Home Assistant gets a `sensor.home_inventory_expiring_batches` sensor and a `home_inventory_expiring_soon` event for your automations.
- Typing an expiry date is easier: it formats itself as `YYYY/MM/DD`, and the dates of one item are sorted when you edit it.

**Places and photos**

- You can add a photo to rooms and shelves, and remove photos from anything that has one.
- All items, Move location and the organizer move menu show the photo of the place (room › cupboard › shelf › organizer), so it's easier to recognise where things are.
- Photos load as small previews first, with a smooth loading animation and automatic retry.
- **QR / NFC window** for cupboards and shelves: download the QR code as an image or copy the link to write on an NFC tag.
- **Delete preview**: before deleting a room, cupboard or shelf you see exactly what will disappear with it (contents, items, photos).

**Home Assistant**

- The "tracked items" sensor now also tells you where each item is.

### Changes

- A refreshed look: new cards, headers, windows and views, and a new loading animation.
- All texts are translated (Romanian and English), following the language you selected in the settings.
- Barcode "Video scan" now uses the built-in scanner of the Home Assistant Companion app (works even without https). Uploading a photo of the barcode and typing it in still work. Barcodes can only contain digits.
- QR codes are created on your own Home Assistant, without any online service.
- Items and organizers can be edited and deleted even when "allow structure modification" is off - that setting now only protects rooms, cupboards and shelves.
- The settings screen uses a language dropdown and simple on/off switches.

## 🏷️ 3.0.0

> Items can now live in several places at once, with variants, per-variant barcodes, expiry alerts, photos for every location and a refreshed UI.

### ⚠️ Before you update

- Requires Home Assistant **2026.11.0** or newer and installation through the built-in **Marketplace** (the successor of HACS). Older Home Assistant versions stay on 2.0.3.
- The database is migrated to schema v2 automatically on first start. **A backup is created automatically right before the migration**: `<config>/data/home_inventory_backup.zip` (e.g. `/config/data/home_inventory_backup.zip`), containing the database and all images. An existing backup is never overwritten (a timestamp is added to the new name). If the backup fails, the migration is not applied. To roll back, stop Home Assistant and extract the zip into `<config>/data/` (it contains the `home_inventory/` folder).

### Highlights

- **Multi-location items** - one item, many places, each with its own quantity, expiration batches and image.
- **Variants & barcodes** - separate rows per variant (e.g. "small jar"), each with its own barcode.
- **Expiry alerts** - new sensor, event and "Expiring" view.
- **Photos everywhere** - rooms, shelves and every item location, with fast thumbnails.
- **QR / NFC links** - ID-based, they survive renames.
- **Russian translation** - panel and integration settings (language selectable in the options).

### Added

**Items & barcodes**

- **Variants**: rows of the same item at the same place are kept separate, each with an optional label; when adding you can pick the row or start a new one.
- **Barcode per variant**: scanning/typing it preselects the item, variant and row; the main barcode is editable for items without variants.
- **Find by barcode** (scan or manual entry) from the header.

**Expiry**

- **Expiring batches**: configurable warning window (1-31 days / 1-12 months, default 7 days), `sensor.home_inventory_expiring_batches`, `home_inventory_expiring_soon` event and a new "Expiring" view.
- Expiry date input auto-formats `YYYY/MM/DD`; batches are sorted by date in Edit.

**Locations & images**

- Images for rooms and shelves; images can be removed from every entity.
- Location photos (room › cupboard › shelf › organizer) in All items, Move location and the organizer move selector.
- Image thumbnails (480/800 px) with skeleton loading, fade-in and retry.
- **QR / NFC dialog** for cupboards and shelves (PNG download, copyable deep link for NFC tags).
- **Delete preview**: the delete dialog lists everything a cascade delete will remove (children, items, images).

**Home Assistant**

- Tracked items sensor includes the item location.

### Changed

- Database schema v2 (see above); existing data is migrated automatically.
- Refreshed UI: restyled cards, headers, modals and views, new loading animation.
- All UI text translated (RO/EN); the configured language is the source of truth.
- Barcode "Video scan" uses the native scanner of the Home Assistant Companion app (works over http); upload image and manual entry remain. Barcodes are numeric-only.
- QR codes are generated locally (no external service) with ID-based links; old printed QR codes keep working.
- Items and organizers are no longer locked by "allow structure modification" (it only protects rooms, cupboards and shelves).
- Config/options flow uses a language dropdown and toggle selectors.
- Local brand assets (icon/logo) for Home Assistant brand support.
- Releases ship a ready-made `home_inventory.zip` (frontend included).

### Fixed

- Low stock (event, sensors, UI) is evaluated on the item's total across all its rows; the low-stock sensor lists one entry per item.
- Consuming an item also decrements its expiration batches.
- Deleting a location also deletes the images (and thumbnails) of everything inside it.
- Location-specific images are returned by the per-shelf and per-item location queries.
- Opening a QR link no longer drops other parameters from the panel URL.
- The organizer Delete button opens the delete confirmation dialog.
- Long press no longer triggers a stray click; the native context menu is blocked.
- Non-existent dates (e.g. 2026/11/31) are rejected.
- Removed Pillow from manifest requirements (fixes hassfest validation).

### Internal

- All SQL moved to `db/repository.py`, with a pytest suite covering the database layer; dev-only hot reload for the repository.
- Backend comments and log messages translated to English.

## 🏷️ 2.0.3 - UI Improvements & Compatibility Update

### Improved

- Unified interaction behavior — editing and deleting entities (rooms, cupboards, etc.) can now be triggered via long press or right-click, just like for items.

- Provides a more consistent and intuitive experience across all entity types.

### Fixed

- Updated integration configuration to align with upcoming Home Assistant 2025.12 standards, ensuring future compatibility and preventing deprecation warnings.

## 🏷️ 2.0.2 - Bug fix

### Bug

- Provider translation use

## 🏷️ 2.0.1 - Fixes

### Fixed

- Translate to EN all apis loggers
- Few refactorization for frontend

## 🏷️ 2.0.0 - Translations + new sensors + new view

### Added

- Added translations for English (en) and Romanian (ro)
- Added Home Assistant sensors for:
  - Tracked items count
  - Low stock items count
  - Total items count

- Added new “Tracked Items” view in frontend

### Fixed

- Fixed bug allowing negative quantities
- Fixed photo rendering updates after item modification
- Fixed modal bugs for quantity editing
- Fixed backend confusion when min_quantity = 0 was treated like null

## 🏷️ 1.3.0 - React frontend migration + UI/UX polish

### Added

- Migrated frontend architecture to **React** for improved maintainability and reactivity
- **Persistent history tracking** for quantity changes and item interactions
- **Smart search with diacritic normalization** — "paine" found and "pâine", "mar" can find "măr"
- All items are now **auto-sorted alphabetically** for cleaner browsing

### Improved

- General UI consistency and more fluid interaction animations
- Better touch interaction handling on mobile (long press / editable areas)
- Cleaner layout alignment for cards and stock controls

### Fixed

- Minor glitches in interaction events not triggering correctly on repeated clicks/taps
- Various small UI inconsistencies and rendering sync issues after optimistic updates

## 🏷️ 1.2.1 - Move objects + HA low stock event

### Fixed

- StockBadge UI update not refreshing correctly in All Items View
- Cleanup: removed console debug logs

## 🏷️ 1.2.0 - Move objects + HA low stock event

### Added

- Move objects between organizers for existing items
- Home Assistant event: `home_inventory_low_stock` (for automations & alerts)
- Deep-link support for direct item consumption (`consume view`)

### Fixed

- stockBadge in all items view preventing updating quantity in UI
- remove useless logs in browser console

## 🏷️ 1.1.0 - Infinite scrolling + performance UX

### Added

- Infinite scrolling for all items view

### Improved

- Clear form immediately to allow rapid item insertion
- Keeps UI responsive while upload happens in background

### Fixed

- refactored modal interaction logic for objects
- fixed image upload glitch and input focus issues
- cleaned up event listeners and permission handling for edit/view

## 🏷️ 1.0.0 - Initial release
