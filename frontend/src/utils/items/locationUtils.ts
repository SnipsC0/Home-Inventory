import type { ItemLocation } from '../../types';

export const getOrganizerFromLocation = (location: string): string | null => {
  const parts = location.split(' / ');
  return parts.length > 3 ? parts[3] : null;
};

export const normalizeValue = (v?: string | null) =>
  v?.toLowerCase().trim() || null;

export const getSpecificLocation = (
  locations: ItemLocation[] | undefined | null,
  context: {
    room?: string | null;
    cupboard?: string | null;
    shelf?: string | null;
    organizer?: string | null;
  }
): ItemLocation | undefined => {
  if (!locations) return undefined;
  return locations.find(
    (loc) =>
      normalizeValue(loc.room) === normalizeValue(context.room) &&
      normalizeValue(loc.cupboard) === normalizeValue(context.cupboard) &&
      normalizeValue(loc.shelf) === normalizeValue(context.shelf) &&
      normalizeValue(loc.organizer) === normalizeValue(context.organizer)
  );
};

export const getSpecificLocations = (
  locations: ItemLocation[] | undefined | null,
  selectors: {
    room?: string | null;
    cupboard?: string | null;
    shelf?: string | null;
    organizer?: string | null;
  }
): ItemLocation[] => {
  if (!locations) return [];
  const { room, cupboard, shelf, organizer } = selectors;

  return locations.filter(
    (loc) =>
      normalizeValue(loc.room) === normalizeValue(room) &&
      normalizeValue(loc.cupboard) === normalizeValue(cupboard) &&
      normalizeValue(loc.shelf) === normalizeValue(shelf) &&
      (organizer ?? normalizeValue(loc.shelf) === normalizeValue(shelf))
  );
};
