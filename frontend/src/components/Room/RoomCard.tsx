import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  name: string;
  count: number;
  image?: string | null;
  editable?: boolean;
  onClick: () => void;
  onEdit?: () => void;
}

export default function RoomCard({
  name,
  count,
  image,
  editable,
  onClick,
  onEdit,
}: Props) {
  const { t } = useTranslation();

  const interactionsHandlers = useInteractions({
    onSingleClick: onClick,
    onRightClick: onEdit,
    onLongPress: onEdit,
    enabled: editable ?? false,
  });

  return (
    <div
      {...interactionsHandlers}
      className="bg-ha-card p-4 rounded-lg shadow-ha cursor-pointer select-none"
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-full h-[150px] object-cover rounded-2xl mb-3 m-auto drag-none"
        />
      ) : (
        <div className="w-full h-[150px] bg-ha-divider rounded-md flex items-center justify-center text-4xl mb-3">
          🏠
        </div>
      )}

      <div className="p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="font-semibold text-ha-text mb-2">{name}</div>
        <div className="text-ha-primary text-sm">
          {count} {t.items.title.toLowerCase()}
        </div>
      </div>
    </div>
  );
}
