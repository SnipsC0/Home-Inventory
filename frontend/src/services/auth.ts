import type { Hass } from '../types';

// Hass instance registered by ApiService; `hass.auth` is refreshed in place.
let source: Hass | null = null;

export const setAuthSource = (hass: Hass) => {
  source = hass;
};

const getAuth = (): any => (source as any)?.auth;

/** Token as currently stored (may be expired; use getValidToken for requests). */
export const getCurrentToken = (): string | undefined =>
  getAuth()?.data?.access_token;

/** Refreshes the token if it has expired. Returns true when a refresh happened. */
export async function refreshIfExpired(): Promise<boolean> {
  const auth = getAuth();
  if (auth?.expired && typeof auth.refreshAccessToken === 'function') {
    await auth.refreshAccessToken();
    return true;
  }
  return false;
}

/** A token that is valid right now. */
export async function getValidToken(): Promise<string | undefined> {
  await refreshIfExpired();
  return getCurrentToken();
}

const TOKEN_RE = /([?&])access_token=[^&]*/;

/** Swaps the access_token query param of a URL for the current one. */
export function withCurrentToken(url: string): string {
  const token = getCurrentToken();
  return token && TOKEN_RE.test(url)
    ? url.replace(TOKEN_RE, `$1access_token=${token}`)
    : url;
}

/** URL without its access_token, usable as a stable cache key. */
export const stripToken = (url: string): string =>
  url.replace(/([?&])access_token=[^&]*&?/, '$1').replace(/[?&]$/, '');
