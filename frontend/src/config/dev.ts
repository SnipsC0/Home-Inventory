import type { Hass } from '../types';

export const isDev = import.meta.env.DEV;

export function createMockHass(): Hass {
  const token = import.meta.env.VITE_HA_TOKEN || '';

  return {
    auth: {
      data: {
        access_token: token,
      },
    },
    config: {
      external_url: `http://${import.meta.env.VITE_HA_IP}:${
        import.meta.env.VITE_HA_PORT
      }`,
      internal_url: `http://${import.meta.env.VITE_HA_IP}:${
        import.meta.env.VITE_HA_PORT
      }`,
      api: { local_ip: import.meta.env.VITE_HA_IP },
    },
    callApi: async <T = any>(
      method: string,
      path: string,
      data?: any
    ): Promise<T> => {
      const url = `/api/${path}`;

      const options: RequestInit = {
        method:
          method === 'GET'
            ? 'GET'
            : method === 'POST'
            ? 'POST'
            : method === 'PATCH'
            ? 'PATCH'
            : 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      console.log(`📡 API Call: ${method} ${url}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ API Error: ${response.status}`, errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
  };
}
