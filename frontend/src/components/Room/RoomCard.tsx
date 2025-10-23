import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  name: string;
  count: number;
  editable?: boolean;
  onClick: () => void;
  onEdit?: () => void;
}

export default function RoomCard({
  name,
  count,
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
      <div className="p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="text-3xl mb-2">🏠</div>
        <div className="font-semibold text-ha-text mb-2">{name}</div>
        <div className="text-ha-primary text-sm">
          {count} {t.items.title.toLowerCase()}
        </div>
      </div>
    </div>
  );
}
