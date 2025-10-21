import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  allowEdit?: boolean;
  onAllItemsClick: () => void;
  onAddRoom: () => void;
  onTrackStock: () => void;
}

export default function RoomsHeader({
  allowEdit,
  onAddRoom,
  onAllItemsClick,
  onTrackStock,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="m-0 text-ha-text text-lg font-semibold">
        🏠 {t.rooms.title}
      </h3>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onAllItemsClick}
          className="px-3 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          📦 {t.rooms.allItems}
        </button>
        <button
          onClick={onTrackStock}
          className="px-3 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          📦 {t.rooms.trackedItems}
        </button>

        {allowEdit && (
          <button
            onClick={onAddRoom}
            className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
          >
            + {t.rooms.addRoom}
          </button>
        )}
      </div>
    </div>
  );
}
