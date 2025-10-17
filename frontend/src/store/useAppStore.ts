import { create } from 'zustand';
import type { AppState } from '../types';

interface AppStore extends AppState {
  setView: (view: AppState['currentView']) => void;
  setSelectedRoom: (room: string | null) => void;
  setSelectedCupboard: (cupboard: string | null) => void;
  setSelectedShelf: (shelf: string | null) => void;
  setSelectedOrganizer: (organizer: string | null) => void;
  reset: () => void;
  goBack: () => void;
}

const initialState: AppState = {
  currentView: 'rooms',
  selectedRoom: null,
  selectedCupboard: null,
  selectedShelf: null,
  selectedOrganizer: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setView: (view) => set({ currentView: view }),

  setSelectedRoom: (room) => set({ selectedRoom: room }),

  setSelectedCupboard: (cupboard) => set({ selectedCupboard: cupboard }),

  setSelectedShelf: (shelf) => set({ selectedShelf: shelf }),

  setSelectedOrganizer: (organizer) => set({ selectedOrganizer: organizer }),

  reset: () => set(initialState),

  goBack: () => {
    const { currentView } = get();

    switch (currentView) {
      case 'cupboards':
        set({ currentView: 'rooms', selectedRoom: null });
        break;
      case 'shelves':
        set({ currentView: 'cupboards', selectedCupboard: null });
        break;
      case 'organizers':
        set({ currentView: 'shelves', selectedShelf: null });
        break;
      case 'items':
        set({ currentView: 'organizers', selectedOrganizer: null });
        break;
      case 'all-items':
        set({ currentView: 'rooms' });
        break;
      default:
        set({ currentView: 'rooms' });
    }
  },
}));
