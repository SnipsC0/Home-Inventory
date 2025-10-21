## 🏷️ 1.4.0

- added sensors in HA for tracked items & low stock & all items count
- added new view for tracked items
- fixed bug for negative quantity
- fixed updating rendering photos
- fixed bugs modals for quantity
- fixed backend quantity confusion when min quantity 0 similar with null.

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
- Home Assistant event: `home_inventar_low_stock` (for automations & alerts)
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
