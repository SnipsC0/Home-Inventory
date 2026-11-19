import { FC, ReactElement } from 'react';
import { FolderOpen } from 'lucide-react';
import { Organizer } from '../../types';
import { useTranslation } from '../../i18n/I18nContext';
import { useInteractions } from '../../hooks/global/useInteractions';
import SmartImage from '../SmartImage';

interface Props {
  organizer: Organizer;
  editable: boolean | undefined;
  onClick: () => void;
  onEdit?: () => void;
}

const OrganizerCard: FC<Props> = ({
  organizer,
  editable,
  onClick,
  onEdit,
}): ReactElement => {
  const { t } = useTranslation();

  const interactionsHandlers = useInteractions({
    onSingleClick: onClick,
    onLongPress: onEdit,
    onRightClick: onEdit,
    enabled: editable ?? false,
  });

  return (
    <div
      {...interactionsHandlers}
      className="surface surface-interactive p-4 select-none"
    >
      <div className="text-center">
        {organizer.image ? (
          <SmartImage
            src={organizer.image}
            alt={organizer.name}
            wrapperClassName="w-full h-40 rounded-xl mb-3"
            width={480}
            fallback={<FolderOpen size={28} />}
          />
        ) : (
          <div className="w-full h-40 rounded-xl flex items-center justify-center mb-3 text-ha-primary bg-ha-primary/10">
            <FolderOpen size={28} />
          </div>
        )}
        <div className="font-bold text-ha-text mb-2">{organizer.name}</div>
        <span className="count-badge">
          {organizer.itemCount} {t.items.title.toLowerCase()}
        </span>
      </div>
    </div>
  );
};

export default OrganizerCard;
