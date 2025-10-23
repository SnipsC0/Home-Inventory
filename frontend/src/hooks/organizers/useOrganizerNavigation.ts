import { useAppStore } from '../../store/useAppStore';

export function useOrganizerNavigation() {
  const setView = useAppStore((state) => state.setView);
  const setSelectedOrganizer = useAppStore(
    (state) => state.setSelectedOrganizer
  );

  return {
    goToOrganizer: (organizerName: string) => {
      setSelectedOrganizer(organizerName);
      setView('items');
    },
  };
}
