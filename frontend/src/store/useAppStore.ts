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

const getStateFromURL = (): Partial<AppState> => {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  return {
    currentView: (params.get('view') as AppState['currentView']) || 'rooms',
    selectedRoom: params.get('room'),
    selectedCupboard: params.get('cupboard'),
    selectedShelf: params.get('shelf'),
    selectedOrganizer: params.get('organizer'),
  };
};

const updateURL = (state: AppState) => {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();

  if (state.currentView && state.currentView !== 'rooms') {
    params.set('view', state.currentView);
  }
  if (state.selectedRoom) params.set('room', state.selectedRoom);
  if (state.selectedCupboard) params.set('cupboard', state.selectedCupboard);
  if (state.selectedShelf) params.set('shelf', state.selectedShelf);
  if (state.selectedOrganizer) params.set('organizer', state.selectedOrganizer);

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, '', newURL);
};

const initialState: AppState = {
  currentView: 'rooms',
  selectedRoom: null,
  selectedCupboard: null,
  selectedShelf: null,
  selectedOrganizer: null,
};

export const useAppStore = create<AppStore>((set, get) => {
  const urlState = getStateFromURL();
  const startState = { ...initialState, ...urlState };

  return {
    ...startState,

    setView: (view) => {
      set({ currentView: view });
      updateURL(get());
    },

    setSelectedRoom: (room) => {
      set({ selectedRoom: room });
      updateURL(get());
    },

    setSelectedCupboard: (cupboard) => {
      set({ selectedCupboard: cupboard });
      updateURL(get());
    },

    setSelectedShelf: (shelf) => {
      set({ selectedShelf: shelf });
      updateURL(get());
    },

    setSelectedOrganizer: (organizer) => {
      set({ selectedOrganizer: organizer });
      updateURL(get());
    },

    reset: () => {
      set(initialState);
      updateURL(get());
    },

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
        case 'tracked-items':
          set({ currentView: 'rooms' });
          break;
        default:
          set({ currentView: 'rooms' });
      }

      updateURL(get());
    },
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const urlState = getStateFromURL();
    useAppStore.setState(urlState);
  });
}
