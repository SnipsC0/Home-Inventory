import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  name: string;
  count: number;
  editable?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RoomCard({
  name,
  count,
  editable,
  onClick,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="bg-ha-card p-4 rounded-lg shadow-ha">
      <div
        onClick={onClick}
        className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition"
      >
        <div className="text-3xl mb-2">🏠</div>
        <div className="font-semibold text-ha-text mb-2">{name}</div>
        <div className="text-ha-primary text-sm">
          {count} {t.items.title.toLowerCase()}
        </div>
      </div>

      {editable && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="flex-1 py-2 bg-ha-primary text-white rounded text-sm hover:opacity-90 transition"
          >
            ✏️ Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="flex-1 py-2 bg-ha-error text-white rounded text-sm hover:opacity-90 transition"
          >
            🗑️ Șterge
          </button>
        </div>
      )}
    </div>
  );
}
