import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';

export function useRoomMutations(api: ApiService) {
  const queryClient = useQueryClient();

  const addRoom = useMutation({
    mutationFn: (name: string) => api.addRoom(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('❌ Eroare la adăugarea camerei:', error);
    },
  });

  const updateRoom = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.updateRoom(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('❌ Eroare la actualizarea camerei:', error);
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => api.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('❌ Eroare la ștergerea camerei:', error);
    },
  });

  return {
    addRoom,
    updateRoom,
    deleteRoom,
  };
}
