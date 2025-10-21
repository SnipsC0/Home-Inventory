import { useEffect, useState } from 'react';
import type { Cupboard, Shelf, Organizer, Room } from '../../../types';
import { ApiService } from '../../../services/api';

interface MoveLocationSelectorProps {
  api: ApiService;
  state: {
    room: string;
    cupboard: string;
    shelf: string;
    organizer: string;
    cupboards: Cupboard[];
    shelves: Shelf[];
    organizers: Organizer[];
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      room: string;
      cupboard: string;
      shelf: string;
      organizer: string;
      cupboards: Cupboard[];
      shelves: Shelf[];
      organizers: Organizer[];
    }>
  >;
  onCancel: () => void;
}

export default function MoveLocationSelector({
  api,
  state,
  setState,
  onCancel,
}: MoveLocationSelectorProps) {
  const { room, cupboard, shelf, organizer, cupboards, shelves, organizers } =
    state;

  const [rooms, setRooms] = useState<Room[]>([]); // ✅ local state pentru camere

  // 🔹 Încarcă camerele o singură dată la montare
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getRooms();
        setRooms(res);
      } catch (err) {
        console.error('Eroare la încărcarea camerelor:', err);
      }
    })();
  }, [api]);

  useEffect(() => {
    if (!room) return;
    (async () => {
      const res = await api.getCupboards(room);
      setState((s) => ({
        ...s,
        cupboards: res,
        shelves: [],
        organizers: [],
        cupboard: '',
        shelf: '',
        organizer: '',
      }));
    })();
  }, [room]);

  useEffect(() => {
    if (!room || !cupboard) return;
    (async () => {
      const res = await api.getShelves(room, cupboard);
      setState((s) => ({
        ...s,
        shelves: res,
        organizers: [],
        shelf: '',
        organizer: '',
      }));
    })();
  }, [room, cupboard]);

  useEffect(() => {
    if (!room || !cupboard || !shelf) return;
    (async () => {
      const res = await api.getOrganizers(room, cupboard, shelf);
      setState((s) => ({
        ...s,
        organizers: res.organizers,
        organizer: '',
      }));
    })();
  }, [room, cupboard, shelf]);

  return (
    <div className="border border-ha-primary rounded-lg p-4 space-y-3 bg-ha-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-ha-text font-semibold text-sm">🚚 Mută în:</span>
        <button
          onClick={onCancel}
          className="text-ha-error text-xs hover:underline"
        >
          Anulează
        </button>
      </div>

      {/* Cameră */}
      <div>
        <label className="text-ha-text text-xs block mb-1">Cameră *</label>
        <select
          value={room}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              room: e.target.value,
              cupboard: '',
              shelf: '',
              organizer: '',
            }))
          }
          className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
        >
          <option value="">Selectează camera</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dulap */}
      {room && (
        <div>
          <label className="text-ha-text text-xs block mb-1">Dulap *</label>
          <select
            value={cupboard}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                cupboard: e.target.value,
                shelf: '',
                organizer: '',
              }))
            }
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
          >
            <option value="">Selectează dulapul</option>
            {cupboards.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Raft */}
      {cupboard && (
        <div>
          <label className="text-ha-text text-xs block mb-1">Raft *</label>
          <select
            value={shelf}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                shelf: e.target.value,
                organizer: '',
              }))
            }
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
          >
            <option value="">Selectează raftul</option>
            {shelves.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Organizator */}
      {shelf && (
        <div>
          <label className="text-ha-text text-xs block mb-1">
            Organizator (opțional)
          </label>
          <select
            value={organizer}
            onChange={(e) =>
              setState((s) => ({ ...s, organizer: e.target.value }))
            }
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
          >
            <option value="">Direct pe raft (fără organizator)</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preview locație nouă */}
      {room && cupboard && shelf && (
        <div className="bg-ha-secondary-bg p-2 rounded text-xs text-ha-text/70">
          📍 Locație nouă:{' '}
          <span className="font-semibold">
            {room} › {cupboard} › {shelf}
            {organizer && ` › ${organizer}`}
          </span>
        </div>
      )}
    </div>
  );
}
