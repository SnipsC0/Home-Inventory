import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from './../node_modules/@tanstack/react-query-devtools/src/production';
import { useHass } from './hooks/useHass';
import { useAppStore } from './store/useAppStore';
import { ApiService } from './services/api';

// Views
import RoomsView from './views/RoomsView';
import ShelvesView from './views/ShelvesView';
import OrganizersView from './views/OrganizersView';
import ItemsView from './views/ItemsView';
import AllItemsView from './views/AllItemsView';
import CupboardsView from './views/CupboardView';
import { isDev } from './config/dev';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AppProps {
  hass?: any;
  panel?: any;
}

function App({ hass: hassProp }: AppProps) {
  const { hass: hassHook, loading, error } = useHass();
  const currentView = useAppStore((state) => state.currentView);

  const hass = hassProp || hassHook;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    if (dataParam && hass) {
      try {
        const { room, cupboard } = JSON.parse(atob(dataParam));
        if (room && cupboard) {
          useAppStore.getState().setSelectedRoom(room);
          useAppStore.getState().setSelectedCupboard(cupboard);
          useAppStore.getState().setView('shelves');
        }
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.warn('Invalid deep link');
      }
    }
  }, [hass]);

  if (loading && !hassProp) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4 text-ha-text">
        <div className="w-10 h-10 border-4 border-ha-divider border-t-ha-primary rounded-full animate-spin" />
        <div>Se conectează la Home Assistant...</div>
      </div>
    );
  }

  if ((error && !hassProp) || !hass) {
    return (
      <div className="p-5 text-center text-ha-error">
        <p>{error?.message || 'Eroare la conectare'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-5 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
        >
          Reîncarcă
        </button>
      </div>
    );
  }

  const api = new ApiService(hass);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 h-full box-border overflow-auto">
        {currentView === 'rooms' && <RoomsView api={api} />}
        {currentView === 'cupboards' && <CupboardsView api={api} />}
        {currentView === 'shelves' && <ShelvesView api={api} />}
        {currentView === 'organizers' && <OrganizersView api={api} />}
        {currentView === 'items' && <ItemsView api={api} />}
        {currentView === 'all-items' && <AllItemsView api={api} />}
      </div>

      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
