import { useState, useCallback } from 'react';
import type { Cupboard, Shelf, Organizer } from '../../types';
import { ApiService } from '../../services/api';
import { useTranslation } from '../../i18n/I18nContext';

interface CurrentLocation {
  room: string;
  cupboard: string;
  shelf: string;
  organizer?: string | null;
}

export function useMoveLocation(
  api: ApiService,
  { current }: { current: CurrentLocation }
) {
  const { t } = useTranslation();
  const [showMove, setShowMove] = useState(false);
  const [state, setState] = useState({
    room: current.room || '',
    cupboard: current.cupboard || '',
    shelf: current.shelf || '',
    organizer: current.organizer || '',
    cupboards: [] as Cupboard[],
    shelves: [] as Shelf[],
    organizers: [] as Organizer[],
  });

  const loadCupboards = useCallback(
    async (room: string) => {
      const cupboards = await api.getCupboards(room);
      setState((s) => ({ ...s, cupboards }));
    },
    [api]
  );

  const loadShelves = useCallback(
    async (room: string, cupboard: string) => {
      const shelves = await api.getShelves(room, cupboard);
      setState((s) => ({ ...s, shelves }));
    },
    [api]
  );

  const loadOrganizers = useCallback(
    async (room: string, cupboard: string, shelf: string) => {
      const data = await api.getOrganizers(room, cupboard, shelf);
      setState((s) => ({ ...s, organizers: data.organizers }));
    },
    [api]
  );

  const startMove = useCallback(async () => {
    setShowMove(true);

    if (current.room) {
      try {
        const cupboards = await api.getCupboards(current.room);
        const shelves = current.cupboard
          ? await api.getShelves(current.room, current.cupboard)
          : [];
        const organizers =
          current.shelf && current.cupboard
            ? (
                await api.getOrganizers(
                  current.room,
                  current.cupboard,
                  current.shelf
                )
              ).organizers
            : [];

        setState((s) => ({
          ...s,
          cupboards,
          shelves,
          organizers,
          room: current.room.trim() || '',
          cupboard: current.cupboard || '',
          shelf: current.shelf || '',
          organizer: current.organizer || '',
        }));
      } catch (err) {
        console.error(`${t.errors.preloadMoveLocation}:`, err);
      }
    }
  }, [api, current]);

  const cancelMove = useCallback(() => {
    setShowMove(false);
  }, []);

  const isSameLocation = (m: any) =>
    m.room === current.room &&
    m.cupboard === current.cupboard &&
    m.shelf === current.shelf &&
    m.organizer === current.organizer;

  return {
    showMove,
    startMove,
    cancelMove,
    moveState: state,
    setMoveState: setState,
    isSameLocation,
    loadCupboards,
    loadShelves,
    loadOrganizers,
  };
}
