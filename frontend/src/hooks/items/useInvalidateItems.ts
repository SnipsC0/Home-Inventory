import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateItems() {
  const queryClient = useQueryClient();

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: ['global-items'] });
  const refetchAll = () =>
    queryClient.refetchQueries({ queryKey: ['global-items'] });

  return { invalidateAll, refetchAll };
}
