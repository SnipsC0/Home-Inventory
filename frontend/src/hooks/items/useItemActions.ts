import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

export function useItemActions(api: ApiService, organizerName?: string | null) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedShelf = useAppStore((state) => state.selectedShelf);
  const selectedOrganizer = useAppStore((state) => state.selectedOrganizer);

  const effectiveOrganizer =
    organizerName !== undefined ? organizerName : selectedOrganizer;

  const addItem = useMutation({
    mutationFn: async (itemData: {
      name: string;
      aliases?: string;
      imageFile?: File | null;
      quantity?: number | null;
      min_quantity?: number | null;
      track_quantity: boolean;
    }) => {
      let imagePath = '';
      if (itemData.imageFile) {
        imagePath = await api.uploadImage(itemData.imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: selectedShelf!,
          organizer: effectiveOrganizer || undefined,
          item: itemData.name,
        });
      }

      return api.addItem(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        effectiveOrganizer,
        {
          name: itemData.name,
          aliases: itemData.aliases,
          image: imagePath,
          quantity: itemData.quantity,
          min_quantity: itemData.min_quantity,
          track_quantity: itemData.track_quantity,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-items'] });
      queryClient.invalidateQueries({ queryKey: ['organizers'] });
    },
  });

  return { addItem };
}
