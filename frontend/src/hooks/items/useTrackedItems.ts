import { useMemo } from 'react';
import { useGlobalItems } from './useItems';
import { filterTrackedItems } from '../../utils/items/filterUtils';
import type { ApiService } from '../../services/api';

export const useTrackedItems = (api: ApiService) => {
  const { data: allItems = [], isLoading } = useGlobalItems(api);

  const trackedItems = useMemo(() => filterTrackedItems(allItems), [allItems]);
  return { trackedItems, isLoading };
};
