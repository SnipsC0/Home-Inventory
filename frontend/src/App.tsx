import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from './../node_modules/@tanstack/react-query-devtools/src/production';
import { useHass } from './hooks/global/useHass';
import { useAppStore } from './store/useAppStore';
import { ApiService } from './services/api';

import RoomsView from './views/RoomsView';
import ShelvesView from './views/ShelvesView';
import OrganizersView from './views/OrganizersView';
import ItemsView from './views/ItemsView';
import AllItemsView from './views/AllItemsView';
import CupboardsView from './views/CupboardView';
import { isDev } from './config/dev';
import TrackedItemsView from './views/TrackedItemsView';
import ExpiringView from './views/ExpiringView';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { useHomeInventarConfig } from './hooks/global/useHomeInventarConfig';
import { ApiProvider } from './contexts/ApiContext';
import { useSmoothLoading } from './hooks/global/useSmoothLoading';
import Loading from './components/Loading';
import { applyDeepLink, hasDeepLinkParams } from './utils/deep-link';

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

function LocationNotFoundNotice({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="surface p-3 mb-4 flex items-center gap-3 border border-ha-error text-ha-error">
      <span className="flex-1">{t.locationLink.notFound}</span>
      <button onClick={onClose} className="btn btn-ghost !py-1">
        {t.common.close}
      </button>
    </div>
  );
}

function AppContent({ api }: { api: ApiService }) {
  const currentView = useAppStore((state) => state.currentView);
  const { data: config, isLoading } = useHomeInventarConfig(api);

  // QR/NFC deep link (?target=…&id=… or legacy ?data=…), applied once
  const [resolvingLink, setResolvingLink] = useState(hasDeepLinkParams);
  const [linkNotFound, setLinkNotFound] = useState(false);
  const linkHandled = useRef(false);

  useEffect(() => {
    if (linkHandled.current) return;
    linkHandled.current = true;
    applyDeepLink(api)
      .then((result) => setLinkNotFound(result === 'not-found'))
      .finally(() => setResolvingLink(false));
  }, [api]);

  // A link opened while the panel is already mounted (HA navigates in place)
  useEffect(() => {
    const onLocationChanged = () => {
      if (!hasDeepLinkParams()) return;
      applyDeepLink(api).then((result) =>
        setLinkNotFound(result === 'not-found')
      );
    };
    window.addEventListener('location-changed', onLocationChanged);
    window.addEventListener('popstate', onLocationChanged);
    return () => {
      window.removeEventListener('location-changed', onLocationChanged);
      window.removeEventListener('popstate', onLocationChanged);
    };
  }, [api]);

  const smoothLanding = useSmoothLoading(isLoading, 3000);

  if (smoothLanding || isLoading || resolvingLink)
    return (
      <I18nProvider configLanguage={config?.language}>
        <Loading animated={true} />
      </I18nProvider>
    );

  return (
    <I18nProvider configLanguage={config?.language}>
      <div className="p-5 h-full w-full relative overflow-auto box-border">
        {linkNotFound && (
          <LocationNotFoundNotice onClose={() => setLinkNotFound(false)} />
        )}
        {currentView === 'rooms' && <RoomsView api={api} />}
        {currentView === 'cupboards' && <CupboardsView api={api} />}
        {currentView === 'shelves' && <ShelvesView api={api} />}
        {currentView === 'organizers' && <OrganizersView api={api} />}
        {currentView === 'items' && <ItemsView api={api} />}
        {currentView === 'all-items' && <AllItemsView api={api} />}
        {currentView === 'tracked-items' && <TrackedItemsView api={api} />}
        {currentView === 'expiring' && <ExpiringView api={api} />}
      </div>

      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </I18nProvider>
  );
}

function ConnectingNotice() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-[400px] flex-col gap-4 text-ha-text">
      <div className="w-10 h-10 border-4 border-ha-divider border-t-ha-primary rounded-full animate-spin" />
      <div>{t.common.connectingHA}</div>
    </div>
  );
}

function ConnectionErrorNotice() {
  const { t } = useTranslation();
  return (
    <div className="p-5 text-center text-ha-error">
      <p>{t.errors.connectFailed}</p>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-primary mt-4"
      >
        {t.common.reload}
      </button>
    </div>
  );
}

function App({ hass: hassProp }: AppProps) {
  const { hass: hassHook, loading, error } = useHass();
  const hass = hassProp || hassHook;

  if (loading && !hassProp) {
    return (
      <I18nProvider>
        <ConnectingNotice />
      </I18nProvider>
    );
  }

  if ((error && !hassProp) || !hass) {
    return (
      <I18nProvider>
        <ConnectionErrorNotice />
      </I18nProvider>
    );
  }

  const api = new ApiService(hass);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider hass={hass}>
        <AppContent api={api} />
      </ApiProvider>
    </QueryClientProvider>
  );
}

export default App;
