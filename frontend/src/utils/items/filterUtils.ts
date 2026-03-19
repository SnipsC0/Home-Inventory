import type { Item, ItemLocation } from '../../types';

export const filterTrackedItems = (items: Item[]): Item[] => {
  return items
    .filter((item) => item.track_quantity && item.min_quantity !== null)
    .map((item) => ({
      ...item,
      total_quantity:
        item.locations?.reduce((sum, loc) => sum + (loc.quantity || 0), 0) || 0,
    }));
};

export const filterAndSearchItems = (
  items: Item[],
  searchTerm: string,
  filterStatus: 'all' | 'low' | 'ok'
): Item[] => {
  let filtered = [...items];
  const searchLower = searchTerm.toLowerCase();

  if (searchTerm) {
    filtered = filtered.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const aliasMatch = item.aliases?.toLowerCase().includes(searchLower);
      const locationMatch = item.locations?.some((loc) =>
        loc.location?.toLowerCase().includes(searchLower)
      );
      return nameMatch || aliasMatch || locationMatch;
    });
  }

  if (filterStatus === 'low') {
    filtered = filtered.filter((i) => i.total_quantity! <= i.min_quantity!);
  } else if (filterStatus === 'ok') {
    filtered = filtered.filter((i) => i.total_quantity! > i.min_quantity!);
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'ro'));
};

export interface ItemFilters {
  room?: string | null;
  cupboard?: string | null;
  shelf?: string | null;
  organizer?: string | null | undefined;
  search?: string;
}

/** Normalizează stringurile pentru comparare */
const normalize = (v?: string | null) => v?.toLowerCase().trim() || null;

/** Verifică dacă o locație corespunde filtrului curent */
const matchesLocation = (loc: ItemLocation, filters: ItemFilters): boolean => {
  const matchRoom =
    !filters.room || normalize(loc.room) === normalize(filters.room);
  const matchCupboard =
    !filters.cupboard ||
    normalize(loc.cupboard) === normalize(filters.cupboard);
  const matchShelf =
    !filters.shelf || normalize(loc.shelf) === normalize(filters.shelf);
  const matchOrganizer =
    filters.organizer === undefined ||
    (filters.organizer === null
      ? loc.organizer === null
      : normalize(loc.organizer) === normalize(filters.organizer));

  return matchRoom && matchCupboard && matchShelf && matchOrganizer;
};

/** Aplică toate filtrele (inclusiv search) asupra itemelor */
export const filterItems = (items: Item[], filters: ItemFilters): Item[] => {
  const result: Item[] = [];

  items.forEach((item) => {
    const matchingLocations =
      item.locations?.filter((loc) => {
        const locationMatches = matchesLocation(loc, filters);
        if (!locationMatches) return false;

        if (!filters.search) return true;
        const search = filters.search.toLowerCase();

        const nameMatch = item.name.toLowerCase().includes(search);
        const aliasMatch = item.aliases?.toLowerCase().includes(search);
        const locationText = [loc.room, loc.cupboard, loc.shelf, loc.organizer]
          .filter(Boolean)
          .join(' / ')
          .toLowerCase()
          .includes(search);

        return nameMatch || aliasMatch || locationText;
      }) || [];

    // ✅ Fiecare locație devine un item separat
    matchingLocations.forEach((loc) => {
      result.push({
        ...item,
        locations: [loc], // Doar această locație
      });
    });
  });

  return result;
};
