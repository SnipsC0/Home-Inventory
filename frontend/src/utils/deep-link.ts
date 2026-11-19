import type { ApiService } from '../services/api';
import type { LocationTarget } from '../types';
import { useAppStore } from '../store/useAppStore';

/** URL params owned by QR/NFC links; everything else in the URL is left alone. */
const LINK_PARAMS = ['target', 'id', 'data'];

export type DeepLinkResult = 'none' | 'opened' | 'not-found';

export function hasDeepLinkParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    (params.has('target') && params.has('id')) || params.has('data')
  );
}

function stripDeepLinkParams() {
  const url = new URL(window.location.href);
  LINK_PARAMS.forEach((p) => url.searchParams.delete(p));
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}

function openLocation(room: string, cupboard: string, shelf?: string | null) {
  const store = useAppStore.getState();
  store.setSelectedRoom(room);
  store.setSelectedCupboard(cupboard);
  store.setSelectedShelf(shelf || null);
  store.setSelectedOrganizer(null);
  store.setView(shelf ? 'organizers' : 'shelves');
}

/**
 * Handle `?target=cupboard|shelf&id=N` (current QR/NFC links) and the legacy
 * `?data=<base64 JSON {room, cupboard}>` from QR codes printed before 3.0.0.
 */
export async function applyDeepLink(api: ApiService): Promise<DeepLinkResult> {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('target');
  const rawId = params.get('id');
  const data = params.get('data');

  // Drop the link params first, so a reload never re-applies them
  if (!hasDeepLinkParams()) return 'none';
  stripDeepLinkParams();

  if (target && rawId) {
    const id = Number(rawId);
    if (
      (target !== 'cupboard' && target !== 'shelf') ||
      !Number.isInteger(id)
    ) {
      return 'not-found';
    }
    const location = await api.locate(target as LocationTarget, id);
    if (!location) return 'not-found';
    openLocation(location.room, location.cupboard, location.shelf);
    return 'opened';
  }

  if (data) {
    try {
      const { room, cupboard } = JSON.parse(atob(data));
      if (room && cupboard) {
        openLocation(room, cupboard);
        return 'opened';
      }
    } catch (e) {
      console.warn('Invalid deep link', e);
    }
    return 'not-found';
  }

  return 'none';
}
