import { FC, ReactElement } from 'react';
import { Shelf } from '../../types';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  shelf: Shelf;
  onClick: () => void;
  onEdit: () => void;
  editable?: boolean;
}

const ShelfCard: FC<Props> = ({
  shelf,
  onClick,
  onEdit,
  editable,
}): ReactElement => {
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
      className="bg-ha-card p-4 rounded-lg shadow-ha select-none"
    >
      <div className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="text-3xl mb-2">📚</div>
        <div className="font-semibold text-ha-text mb-1">{shelf.name}</div>
        <div className="text-ha-primary text-sm">
          {shelf.itemCount} {t.items.title.toLowerCase()}
        </div>
      </div>
    </div>
  );
};

export default ShelfCard;
