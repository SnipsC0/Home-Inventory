import { FC, ReactElement } from 'react';
import { Library } from 'lucide-react';
import { Shelf } from '../../types';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';
import SmartImage from '../SmartImage';
import LocationLinkButton from '../Card/LocationLinkButton';

interface Props {
  shelf: Shelf;
  onClick: () => void;
  onEdit: () => void;
  onLinks?: () => void;
  editable?: boolean;
}

const ShelfCard: FC<Props> = ({
  shelf,
  onClick,
  onEdit,
  onLinks,
  editable,
}): ReactElement => {
  const { t } = useTranslation();

  const interactionHandlers = useInteractions({
    onSingleClick: onClick,
    onRightClick: onEdit,
    onLongPress: onEdit,
    enabled: editable ?? false,
  });

  const linkButton = onLinks && (
    <LocationLinkButton onClick={onLinks} />
  );

  return (
    <div
      {...interactionHandlers}
      className="surface surface-interactive p-3 select-none overflow-hidden"
    >
      {shelf.image ? (
        <SmartImage
          src={shelf.image}
          alt={shelf.name}
          wrapperClassName="w-full h-[180px] rounded-xl mb-3"
          width={480}
          fallback={<Library size={40} strokeWidth={1.5} />}
        />
      ) : (
        <div className="w-full h-[180px] rounded-xl flex items-center justify-center mb-3 text-ha-primary bg-ha-primary/10">
          <Library size={40} strokeWidth={1.5} />
        </div>
      )}
      <div className="px-3 pb-2 text-center">
        <div className="font-bold text-ha-text mb-2">{shelf.name}</div>
        <span className="count-badge">
          {shelf.itemCount} {t.items.title.toLowerCase()}
        </span>
      </div>
      {linkButton}
    </div>
  );
};

export default ShelfCard;
