import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import type { ImagePickerValue } from '../../components/Modal/ImagePickerField';
import { useAppStore } from '../../store/useAppStore';
import { resolveImageField } from '../../utils/imageUpload';

export function useShelfActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);

  const addShelf = useMutation({
    mutationFn: async ({
      name,
      image,
    }: {
      name: string;
      image?: ImagePickerValue;
    }) => {
      const imagePath = await resolveImageField(api, image, {
        room: selectedRoom!,
        cupboard: selectedCupboard!,
        shelf: name,
      });
      return api.addShelf(selectedRoom!, selectedCupboard!, name, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  const updateShelf = useMutation({
    mutationFn: async ({
      id,
      name,
      image,
    }: {
      id: number;
      name: string;
      image?: ImagePickerValue;
    }) => {
      const imagePath = await resolveImageField(api, image, {
        room: selectedRoom!,
        cupboard: selectedCupboard!,
        shelf: name,
      });
      const data: { name: string; image?: string } = { name };
      if (imagePath !== undefined) data.image = imagePath;
      return api.updateShelf(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  const deleteShelf = useMutation({
    mutationFn: (id: number) => api.deleteShelf(id),
    onSuccess: () => {
      // Cascade delete: refresh every dependent cache (items, totals, hierarchy)
      for (const key of ['rooms', 'cupboards', 'shelves', 'organizers', 'global-items']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  return {
    addShelf,
    updateShelf,
    deleteShelf,
  };
}
