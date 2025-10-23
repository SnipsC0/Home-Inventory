import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

export function useOrganizers(api: ApiService) {
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedShelf = useAppStore((state) => state.selectedShelf);

  return useQuery({
    queryKey: ['organizers', selectedShelf],
    queryFn: () =>
      api.getOrganizers(selectedRoom!, selectedCupboard!, selectedShelf!),
    enabled: !!selectedShelf,
  });
}
