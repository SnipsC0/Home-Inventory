import { useAppStore } from '../store/useAppStore';

export function useShelfNavigation() {
  const setView = useAppStore((state) => state.setView);
  const setSelectedShelf = useAppStore((state) => state.setSelectedShelf);

  return {
    goToShelf: (shelfName: string) => {
      setSelectedShelf(shelfName);
      setView('organizers');
    },
  };
}
