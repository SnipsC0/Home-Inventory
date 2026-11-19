import { useEffect, useState } from 'react';
import type { Cupboard, Shelf, Organizer, Room } from '../../../types';
import { ApiService } from '../../../services/api';
import { useTranslation } from '../../../i18n/I18nContext';
import SmartImage from '../../SmartImage';

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

  const [rooms, setRooms] = useState<Room[]>([]);

  const { t } = useTranslation();

  const selRoom = rooms.find((r) => r.name === room);
  const selCupboard = cupboards.find((c) => c.name === cupboard);
  const selShelf = shelves.find((s) => s.name === shelf);
  const selOrganizer = organizers.find((o) => o.name === organizer);

  const renderThumb = (src?: string | null, alt?: string) =>
    src ? (
      <SmartImage
        src={src}
        alt={alt ?? ''}
        width={96}
        wrapperClassName="w-24 h-24 rounded-md mt-2"
      />
    ) : null;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getRooms();
        setRooms(res);
      } catch (err) {
        console.error(`${t.errors.getRoomsError}: `, err);
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
        <span className="text-ha-text font-semibold text-sm">{t.items.moveTo}</span>
        <button
          onClick={onCancel}
          className="text-ha-error text-xs hover:underline"
        >
          {t.common.cancel}
        </button>
      </div>

      {/* Room */}
      <div>
        <label className="text-ha-text text-xs block mb-1">
          {t.rooms.room} *
        </label>
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
          className="field"
        >
          <option value="">
            {t.common.select} {t.rooms.room.toLowerCase()}
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        {renderThumb(selRoom?.image, room)}
      </div>

      {/* Cupboard */}
      {room && (
        <div>
          <label className="text-ha-text text-xs block mb-1">
            {t.cupboards.cupboard} *
          </label>
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
            className="field"
          >
            <option value="">
              {t.common.select} {t.cupboards.cupboard.toLowerCase()}
            </option>
            {cupboards.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {renderThumb(selCupboard?.image, cupboard)}
        </div>
      )}

      {/* Shelf */}
      {cupboard && (
        <div>
          <label className="text-ha-text text-xs block mb-1">
            {t.shelves.shelf} *
          </label>
          <select
            value={shelf}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                shelf: e.target.value,
                organizer: '',
              }))
            }
            className="field"
          >
            <option value="">
              {t.common.select} {t.shelves.shelf.toLowerCase()}
            </option>
            {shelves.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {renderThumb(selShelf?.image, shelf)}
        </div>
      )}

      {/* Organizator */}
      {shelf && (
        <div>
          <label className="text-ha-text text-xs block mb-1">
            {t.items.organizerOptional}
          </label>
          <select
            value={organizer}
            onChange={(e) =>
              setState((s) => ({ ...s, organizer: e.target.value }))
            }
            className="field"
          >
            <option value="">
              {t.items.addItemWithoutOrganizer} (
              {t.organizers.withoutOrganizer.toLowerCase()})
            </option>
            {organizers.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
          {renderThumb(selOrganizer?.image, organizer)}
        </div>
      )}

      {/* New location preview */}
      {room && cupboard && shelf && (
        <div className="bg-ha-secondary-bg p-2 rounded text-xs text-ha-text/70">
          {t.items.newLocation}{' '}
          <span className="font-semibold">
            {room} › {cupboard} › {shelf}
            {organizer && ` › ${organizer}`}
          </span>
        </div>
      )}
    </div>
  );
}
