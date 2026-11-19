import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import type { ImagePickerValue } from '../../components/Modal/ImagePickerField';
import { resolveImageField } from '../../utils/imageUpload';

export function useRoomMutations(api: ApiService) {
  const queryClient = useQueryClient();

  const addRoom = useMutation({
    mutationFn: async ({
      name,
      image,
    }: {
      name: string;
      image?: ImagePickerValue;
    }) => {
      const imagePath = await resolveImageField(api, image, { room: name });
      return api.addRoom(name, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('Failed to add room:', error);
    },
  });

  const updateRoom = useMutation({
    mutationFn: async ({
      id,
      name,
      image,
    }: {
      id: number;
      name: string;
      image?: ImagePickerValue;
    }) => {
      const imagePath = await resolveImageField(api, image, { room: name });
      const data: { name: string; image?: string } = { name };
      if (imagePath !== undefined) data.image = imagePath;
      return api.updateRoom(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('Failed to update room:', error);
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => api.deleteRoom(id),
    onSuccess: () => {
      // Cascade delete: refresh every dependent cache (items, totals, hierarchy)
      for (const key of ['rooms', 'cupboards', 'shelves', 'organizers', 'global-items']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: any) => {
      console.error('Failed to delete room:', error);
    },
  });

  return {
    addRoom,
    updateRoom,
    deleteRoom,
  };
}
