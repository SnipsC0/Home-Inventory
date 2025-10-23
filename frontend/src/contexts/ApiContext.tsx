import React, { createContext, useContext, useMemo } from 'react';
import type { Hass } from '../types';
import { ApiService } from '../services/api';

interface ApiContextValue {
  api: ApiService;
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

interface ApiProviderProps {
  hass: Hass;
  children: React.ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ hass, children }) => {
  const api = useMemo(() => new ApiService(hass), [hass]);

  return <ApiContext.Provider value={{ api }}>{children}</ApiContext.Provider>;
};

export function useApi(): ApiService {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context.api;
}
