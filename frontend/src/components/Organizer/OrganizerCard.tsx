import { FC, ReactElement, useState } from 'react';
import { Organizer } from '../../types';
import { useTranslation } from '../../i18n/I18nContext';
import { useInteractions } from '../../hooks/global/useInteractions';

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
      className="bg-ha-card p-4 rounded-lg shadow-ha"
    >
      <div className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        {organizer.image ? (
          <img
            src={organizer.image}
            alt={organizer.name}
            className="w-[15rem] h-[10rem] object-cover rounded mb-2 m-auto"
          />
        ) : (
          <div className="text-3xl mb-2">📦</div>
        )}
        <div className="font-semibold text-ha-text mb-1">{organizer.name}</div>
        <div className="text-ha-primary text-sm">
          {organizer.itemCount} {t.items.title.toLowerCase()}
        </div>
      </div>
    </div>
  );
};

export default OrganizerCard;
