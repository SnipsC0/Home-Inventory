import { useAppStore } from '../../store/useAppStore';

export function useCupboardNavigation() {
  const setView = useAppStore((state) => state.setView);
  const setSelectedCupboard = useAppStore((state) => state.setSelectedCupboard);

  return {
    goToCupboard: (cupboardName: string) => {
      setSelectedCupboard(cupboardName);
      setView('shelves');
    },
  };
}
