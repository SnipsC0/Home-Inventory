import { useQuery } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import type { Item } from '../../types';
import { filterItems, ItemFilters } from '../../utils/items/filterUtils';

export function useGlobalItems(api: ApiService) {
  return useQuery({
    queryKey: ['global-items'],
    queryFn: async (): Promise<Item[]> => api.getAllItems(),
    staleTime: 30_000,
  });
}

export function useFilteredItems(api: ApiService, filters: ItemFilters) {
  const { data: allItems = [] } = useGlobalItems(api);
  return filterItems(allItems, filters);
}
