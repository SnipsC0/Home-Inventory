import { useQuery } from '@tanstack/react-query';
import type { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function useShelves(api: ApiService) {
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedRoom = useAppStore((state) => state.selectedRoom);

  return useQuery({
    queryKey: ['shelves', selectedCupboard],
    queryFn: () => api.getShelves(selectedRoom!, selectedCupboard!),
    enabled: !!selectedCupboard,
  });
}
