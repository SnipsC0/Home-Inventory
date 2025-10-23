import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';
import { ClickOrTouchEvent } from '../../types';

interface Props {
  name: string;
  count: number;
  image?: string | null;
  editable?: boolean;
  onClick?: () => void;
  onEdit: () => void;
  onQR?: (e: ClickOrTouchEvent) => void;
}

export default function CupboardCard({
  name,
  count,
  image,
  editable,
  onClick,
  onEdit,
  onQR,
}: Props) {
  const { t } = useTranslation();

  const interactionHandlers = useInteractions({
    onSingleClick: onClick,
    onRightClick: onEdit,
    onLongPress: onEdit,
    enabled: editable ?? false,
  });

  return (
    <div
      {...interactionHandlers}
      className="bg-ha-card p-3 rounded-4xl shadow-ha cursor-pointer select-none"
    >
      {/* Imagine */}
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-[25rem] h-[250px] object-cover rounded-2xl mb-3 m-auto drag-none"
        />
      ) : (
        <div className="w-full h-[150px] bg-ha-divider rounded-md flex items-center justify-center text-4xl mb-3">
          🗄️
        </div>
      )}

      {/* Click open */}
      <div className="p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="font-semibold text-ha-text mb-1">{name}</div>
        <div className="text-ha-primary text-sm">
          {count} {t.items.title.toLowerCase()}
        </div>
      </div>

      {/* Actiuni */}
      {editable && (
        <div className="mt-1 space-y-2 flex">
          <button
            onClick={onQR}
            className="m-auto p-3 bg-ha-secondary-bg text-ha-text border border-ha-divider text-sm rounded hover:bg-ha-card transition"
          >
            📱 QR
          </button>
        </div>
      )}
    </div>
  );
}
