import { useAppStore } from '../store/useAppStore';

export function useRoomNavigation() {
  const setView = useAppStore((state) => state.setView);
  const setSelectedRoom = useAppStore((state) => state.setSelectedRoom);

  return {
    goToRoom: (roomName: string) => {
      setSelectedRoom(roomName);
      setView('cupboards');
    },
    goToAllItems: () => setView('all-items'),
  };
}
