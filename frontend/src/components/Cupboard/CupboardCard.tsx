import { Archive } from 'lucide-react';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';
import SmartImage from '../SmartImage';
import LocationLinkButton from '../Card/LocationLinkButton';

interface Props {
  name: string;
  count: number;
  image?: string | null;
  editable?: boolean;
  onClick?: () => void;
  onEdit: () => void;
  onLinks?: () => void;
}

export default function CupboardCard({
  name,
  count,
  image,
  editable,
  onClick,
  onEdit,
  onLinks,
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
      className="surface surface-interactive p-3 select-none overflow-hidden"
    >
      {/* Image */}
      {image ? (
        <SmartImage
          src={image}
          alt={name}
          wrapperClassName="w-full h-[220px] rounded-xl mb-3"
          width={480}
          fallback={<Archive size={44} strokeWidth={1.5} />}
        />
      ) : (
        <div className="w-full h-[220px] rounded-xl flex items-center justify-center mb-3 text-ha-primary bg-ha-primary/10">
          <Archive size={44} strokeWidth={1.5} />
        </div>
      )}

      <div className="px-3 pb-2 text-center">
        <div className="font-bold text-ha-text mb-2">{name}</div>
        <span className="count-badge">
          {count} {t.items.title.toLowerCase()}
        </span>
      </div>

      {onLinks && <LocationLinkButton onClick={onLinks} />}
    </div>
  );
}
