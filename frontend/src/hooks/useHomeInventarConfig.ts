import { useQuery } from '@tanstack/react-query';
import type { ApiService } from '../services/api';

export function useHomeInventarConfig(api: ApiService) {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
  });
}
