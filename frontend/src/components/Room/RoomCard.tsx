import { Home } from 'lucide-react';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';
import SmartImage from '../SmartImage';

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
      className="surface surface-interactive p-3 select-none overflow-hidden"
    >
      {image ? (
        <SmartImage
          src={image}
          alt={name}
          wrapperClassName="w-full h-[180px] rounded-xl mb-3"
          width={480}
          fallback={<Home size={40} strokeWidth={1.5} />}
        />
      ) : (
        <div className="w-full h-[180px] rounded-xl flex items-center justify-center mb-3 text-ha-primary bg-ha-primary/10">
          <Home size={40} strokeWidth={1.5} />
        </div>
      )}
      <div className="px-3 pb-2 text-center">
        <div className="font-bold text-ha-text mb-2 text-base">{name}</div>
        <span className="count-badge">
          {count} {t.items.title.toLowerCase()}
        </span>
      </div>
    </div>
  );
}
