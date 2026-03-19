import { useQueryClient } from '@tanstack/react-query';
import type { Item } from '../../types';

export function useItemsCache() {
  const queryClient = useQueryClient();

  const getAll = () => queryClient.getQueryData<Item[]>(['global-items']) ?? [];
  const setAll = (items: Item[]) =>
    queryClient.setQueryData(['global-items'], items);
  const updateItem = (id: number, updater: (item: Item) => Item) => {
    const items = getAll().map((item) =>
      item.id === id ? updater(item) : item
    );
    setAll(items);
  };

  return { getAll, setAll, updateItem };
}
