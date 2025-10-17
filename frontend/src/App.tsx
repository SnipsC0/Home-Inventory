import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const { hass, loading, error } = useHass();
  const currentView = useAppStore((state) => state.currentView);

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
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.warn('Invalid deep link');
      }
    }
  }, [hass]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--divider-color)',
            borderTopColor: 'var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div>Se conectează la Home Assistant...</div>
      </div>
    );
  }

  if (error || !hass) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--error-color)',
        }}
      >
        <p>{error?.message || 'Eroare la conectare'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reîncarcă
        </button>
      </div>
    );
  }

  const api = new ApiService(hass);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '16px' }}>
        {currentView === 'rooms' && <RoomsView api={api} />}
        {currentView === 'cupboards' && <CupboardsView api={api} />}
        {currentView === 'shelves' && <ShelvesView api={api} />}
        {currentView === 'organizers' && <OrganizersView api={api} />}
        {currentView === 'items' && <ItemsView api={api} />}
        {currentView === 'all-items' && <AllItemsView api={api} />}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </QueryClientProvider>
  );
}
