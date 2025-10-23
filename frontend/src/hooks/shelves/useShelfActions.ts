import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

export function useShelfActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);

  const addShelf = useMutation({
    mutationFn: (name: string) =>
      api.addShelf(selectedRoom!, selectedCupboard!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  const updateShelf = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.updateShelf(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  const deleteShelf = useMutation({
    mutationFn: (id: number) => api.deleteShelf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  return {
    addShelf,
    updateShelf,
    deleteShelf,
  };
}
