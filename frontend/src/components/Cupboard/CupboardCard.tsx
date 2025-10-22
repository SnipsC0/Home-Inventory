import { useTranslation } from '../../i18n/I18nContext';
import type { ClickOrTouchEvent } from '../../types';

interface Props {
  name: string;
  count: number;
  image?: string | null;
  editable?: boolean;
  onClick?: () => void;
  onEdit?: (e: ClickOrTouchEvent) => void;
  onDelete?: (e: ClickOrTouchEvent) => void;
  onQR?: (e: ClickOrTouchEvent) => void;
}

export default function CupboardCard({
  name,
  count,
  image,
  editable,
  onClick,
  onEdit,
  onDelete,
  onQR,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="bg-ha-card p-3 rounded-4xl shadow-ha" onClick={onClick}>
      {/* Imagine */}
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-[25rem] h-[250px] object-cover rounded-2xl mb-3 m-auto"
        />
      ) : (
        <div className="w-full h-[150px] bg-ha-divider rounded-md flex items-center justify-center text-4xl mb-3">
          🗄️
        </div>
      )}

      {/* Click open */}
      <div className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="font-semibold text-ha-text mb-1">{name}</div>
        <div className="text-ha-primary text-sm">
          {count} {t.items.title.toLowerCase()}
        </div>
      </div>

      {/* Actiuni */}
      {editable && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 py-2 bg-ha-primary text-white text-sm rounded hover:opacity-90 transition"
            >
              ✏️ {t.common.edit}
            </button>
            <button
              onClick={onQR}
              className="flex-1 py-2 bg-ha-secondary-bg text-ha-text border border-ha-divider text-sm rounded hover:bg-ha-card transition"
            >
              📱 QR
            </button>
          </div>
          <button
            onClick={onDelete}
            className="w-full py-2 bg-ha-error text-white rounded text-sm hover:opacity-90 transition"
          >
            🗑️ {t.common.delete}
          </button>
        </div>
      )}
    </div>
  );
}
