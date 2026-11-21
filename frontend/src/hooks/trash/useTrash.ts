import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';

/** Everything a restore (or purge-free delete) can change. */
const HIERARCHY_KEYS = [
  'rooms',
  'cupboards',
  'shelves',
  'organizers',
  'global-items',
  'favorites',
  'expiring-batches',
  'trash',
];

export function useInvalidateAfterRestore() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of HIERARCHY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useTrash(api: ApiService) {
  return useQuery({
    queryKey: ['trash'],
    queryFn: () => api.getTrash(),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (n) => 500 * (n + 1),
  });
}

export function useRestoreTrash(api: ApiService) {
  const invalidate = useInvalidateAfterRestore();
  return useMutation({
    mutationFn: (id: number) => api.restoreTrash(id),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });
}

export function useDeleteTrashEntry(api: ApiService) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTrashEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  });
}

export function useEmptyTrash(api: ApiService) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.emptyTrash(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  });
}
