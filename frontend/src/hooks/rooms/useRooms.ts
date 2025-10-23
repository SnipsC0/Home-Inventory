import { useQuery } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';

export function useRooms(api: ApiService) {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
  });
}
