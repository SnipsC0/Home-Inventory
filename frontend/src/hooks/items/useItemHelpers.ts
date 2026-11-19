import { useMemo, useCallback } from 'react';
import { sortItemsByName } from '../../utils/items/sortUtils';
import { getSpecificLocation } from '../../utils/items/locationUtils';
import type { Item, ItemLocation } from '../../types';

export const useItemHelpers = (
  items: Item[],
  context: {
    room?: string | null;
    cupboard?: string | null;
    shelf?: string | null;
    organizer?: string | null;
  }
) => {
  const sortedItems = useMemo(() => sortItemsByName(items), [items]);

  const findLocation = useCallback(
    (locations: ItemLocation[] | undefined | null) =>
      getSpecificLocation(locations, context),
    [context]
  );

  return { sortedItems, findLocation };
};
