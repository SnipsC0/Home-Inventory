import { FC, ReactElement } from 'react';
import { Shelf, ClickOrTouchEvent } from '../../types';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  shelf: Shelf;
  onClick: () => void;
  onEdit: () => void;
  onQR?: (e: ClickOrTouchEvent) => void;
  editable?: boolean;
}

const ShelfCard: FC<Props> = ({
  shelf,
  onClick,
  onEdit,
  onQR,
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
      {shelf.image ? (
        <img
          src={shelf.image}
          alt={shelf.name}
          className="w-full h-[150px] object-cover rounded-2xl mb-3 m-auto drag-none"
        />
      ) : (
        <div className="w-full h-[150px] bg-ha-divider rounded-md flex items-center justify-center text-4xl mb-3">
          📚
        </div>
      )}

      <div className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition">
        <div className="font-semibold text-ha-text mb-1">{shelf.name}</div>
        <div className="text-ha-primary text-sm">
          {shelf.itemCount} {t.items.title.toLowerCase()}
        </div>
      </div>

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
};

export default ShelfCard;
