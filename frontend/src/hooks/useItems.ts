import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../services/api';
import type { Item } from '../types';

export function useGlobalItems(api: ApiService) {
  return useQuery({
    queryKey: ['global-items'],
    queryFn: async () => {
      const items = await api.getAllItems();
      return items;
    },
    staleTime: 30 * 1000,
  });
}

export function useFilteredItems(
  api: ApiService,
  filters: {
    room?: string | null;
    cupboard?: string | null;
    shelf?: string | null;
    organizer?: string | null | undefined;
    search?: string;
  }
) {
  const { data: allItems = [] } = useGlobalItems(api);

  return allItems.filter((item: Item) => {
    const locationParts = item.location.split(' / ');
    const itemRoom = locationParts[0];
    const itemCupboard = locationParts[1];
    const itemShelf = locationParts[2];
    const itemOrganizer = locationParts[3] || null;

    if (filters.room && itemRoom !== filters.room) return false;
    if (filters.cupboard && itemCupboard !== filters.cupboard) return false;
    if (filters.shelf && itemShelf !== filters.shelf) return false;

    if (filters.organizer !== undefined) {
      if (filters.organizer === null) {
        if (itemOrganizer !== null) return false;
      } else if (itemOrganizer !== filters.organizer) {
        return false;
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.aliases?.toLowerCase().includes(searchLower) ||
        item.location?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });
}

export function useUpdateItemMutation(api: ApiService) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Item> }) =>
      api.updateItem(id, data),
    onMutate: async ({ id, data }) => {
      if (data.image) {
        return { previousItems: undefined };
      }

      await queryClient.cancelQueries({ queryKey: ['global-items'] });

      const previousItems = queryClient.getQueryData<Item[]>(['global-items']);

      queryClient.setQueryData<Item[]>(['global-items'], (old = []) =>
        old.map((item) => {
          if (item.id === id) {
            return { ...item, ...data };
          }
          return item;
        })
      );

      return { previousItems };
    },
    onSuccess: (_, variables) => {
      if (variables.data.image) {
        queryClient.refetchQueries({ queryKey: ['global-items'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['global-items'] });
      }

      if (
        variables.data.room ||
        variables.data.cupboard ||
        variables.data.shelf
      ) {
        queryClient.invalidateQueries({ queryKey: ['organizers'] });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['global-items'], context.previousItems);
      }
    },
  });
}

export function useDeleteItemMutation(api: ApiService) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['global-items'] });

      const previousItems = queryClient.getQueryData<Item[]>(['global-items']);

      queryClient.setQueryData<Item[]>(['global-items'], (old = []) =>
        old.filter((item) => item.id !== id)
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['global-items'], context.previousItems);
      }
    },
  });
}

export function useAddItemMutation(api: ApiService) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      room,
      cupboard,
      shelf,
      organizer,
      itemData,
    }: {
      room: string;
      cupboard: string;
      shelf: string;
      organizer: string | null;
      itemData: {
        name: string;
        aliases?: string;
        image?: string;
        quantity?: number | null;
        min_quantity?: number | null;
        track_quantity: boolean;
      };
    }) => {
      return api.addItem(room, cupboard, shelf, organizer, itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-items'] });
    },
  });
}
