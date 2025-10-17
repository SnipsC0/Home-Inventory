import { useEffect, useState } from 'react';
import type { Hass } from '../types';
import { isDev, createMockHass } from '../config/dev';

declare global {
  interface Window {
    hass?: Hass;
    hassConnection?: Hass;
  }
}

function findHass(): Hass | null {
  if (window.hass?.auth) return window.hass;
  if (window.hassConnection?.auth) return window.hassConnection;

  const ha = document.querySelector('home-assistant') as any;
  if (ha?.hass?.auth) return ha.hass;

  const panel = document.querySelector('ha-panel-custom') as any;
  if (panel?.hass?.auth) return panel.hass;

  try {
    const parent = window.parent;
    if (parent && parent !== window) {
      if (parent.hass?.auth) return parent.hass;
      if (parent.hassConnection?.auth) return parent.hassConnection;

      const parentHa = parent.document.querySelector('home-assistant') as any;
      if (parentHa?.hass?.auth) return parentHa.hass;
    }
  } catch {}

  return null;
}

export function useHass(maxAttempts = 100, delayMs = 100) {
  const [hass, setHass] = useState<Hass | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDev && import.meta.env.VITE_HA_TOKEN) {
      console.log('🔧 DEV MODE: Using mock Hass connection');
      const mockHass = createMockHass();
      setHass(mockHass);
      setLoading(false);
      return;
    }

    let attempts = 0;
    let mounted = true;

    const checkHass = async () => {
      while (attempts < maxAttempts && mounted) {
        const foundHass = findHass();

        if (foundHass?.auth) {
          console.log('✅ Connected to Home Assistant');
          setHass(foundHass);
          setLoading(false);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempts++;
      }

      if (mounted) {
        setError(new Error('Nu s-a putut conecta la Home Assistant'));
        setLoading(false);
      }
    };

    checkHass();

    return () => {
      mounted = false;
    };
  }, [maxAttempts, delayMs]);

  return { hass, loading, error };
}
