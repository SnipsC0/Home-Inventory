## 🏷️ 3.0.0 - Migrate to DBv2

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
