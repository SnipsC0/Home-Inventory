import { useQuery } from '@tanstack/react-query';
import type { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function useCupboards(api: ApiService) {
  const selectedRoom = useAppStore((state) => state.selectedRoom);

  return useQuery({
    queryKey: ['cupboards', selectedRoom],
    queryFn: () => api.getCupboards(selectedRoom!),
    enabled: !!selectedRoom,
  });
}
