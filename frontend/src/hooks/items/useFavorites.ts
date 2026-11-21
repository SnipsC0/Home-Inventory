import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../contexts/ApiContext';

const FAVORITES_KEY = ['favorites'];

/** Favorite item master ids of the current HA user. */
export function useFavorites() {
  const api = useApi();
  const query = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: () => api.getFavorites(),
    staleTime: 60_000,
  });
  const ids = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { ...query, ids };
}

/** Optimistic add/remove; the refetch on settle corrects any failed call
 *  (safeCall alerts and resolves instead of throwing). */
export function useToggleFavorite() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: number; favorite: boolean }) =>
      favorite ? api.addFavorite(itemId) : api.removeFavorite(itemId),
    onMutate: async ({ itemId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
      const previous = queryClient.getQueryData<number[]>(FAVORITES_KEY);
      queryClient.setQueryData<number[]>(FAVORITES_KEY, (old = []) =>
        favorite
          ? old.includes(itemId)
            ? old
            : [...old, itemId]
          : old.filter((id) => id !== itemId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}
