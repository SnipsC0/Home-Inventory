import { Home, Package, ClipboardList, Plus, ScanLine, CalendarClock } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  allowEdit?: boolean;
  onAllItemsClick: () => void;
  onAddRoom: () => void;
  onTrackStock: () => void;
  onExpiring: () => void;
  onFindByBarcode: () => void;
}

export default function RoomsHeader({
  allowEdit,
  onAddRoom,
  onAllItemsClick,
  onTrackStock,
  onExpiring,
  onFindByBarcode,
}: Props) {
  const { t } = useTranslation();
  const actions = [
    { onClick: onAllItemsClick, icon: Package, label: t.rooms.allItems },
    { onClick: onTrackStock, icon: ClipboardList, label: t.rooms.trackedItems },
    { onClick: onExpiring, icon: CalendarClock, label: t.rooms.expiring },
    { onClick: onFindByBarcode, icon: ScanLine, label: t.items.findByBarcode },
  ];

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="page-title min-w-0">
          <span className="page-title-icon">
            <Home size={22} />
          </span>
          <span className="truncate">{t.rooms.title}</span>
        </h3>

        {allowEdit && (
          <button onClick={onAddRoom} className="btn btn-primary shrink-0">
            <Plus size={16} />
            {t.rooms.addRoom}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {actions.map(({ onClick, icon: Icon, label }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex items-center gap-2 sm:gap-3 rounded-xl border border-ha-divider bg-ha-card px-3 py-3 text-left text-ha-text transition hover:border-ha-primary hover:shadow-md active:scale-[0.98] cursor-pointer"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ha-secondary-bg text-ha-primary">
              <Icon size={18} />
            </span>
            <span className="min-w-0 text-sm font-medium leading-tight sm:text-base">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
