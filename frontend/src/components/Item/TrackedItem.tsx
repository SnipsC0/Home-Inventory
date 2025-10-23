import { FC } from 'react';
import { Item } from '../../types';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface TrackedItemProps {
  item: Item;
  onView: (item: Item) => void;
  onEdit: (item: Item) => void;
  onQuantityChange: (item: Item, newQuantity: number) => void;
}

const TrackedItem: FC<TrackedItemProps> = ({
  item,
  onView,
  onEdit,
  onQuantityChange,
}) => {
  const { t } = useTranslation();

  const interactionHandlers = useInteractions({
    onSingleClick: () => onView(item),
    onRightClick: () => onEdit(item),
    onLongPress: () => onEdit(item),
    excludeSelector: '.qty-btn',
  });

  const getStatusColor = () => {
    if (item.quantity! <= item.min_quantity!) {
      return 'border-l-4 border-ha-error';
    }
    return 'border-l-4 border-transparent';
  };

  const getStatusIcon = () => {
    if (item.quantity! <= item.min_quantity!) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <div
      {...interactionHandlers}
      className={`p-4 rounded-lg border-2 transition bg-ha-card cursor-pointer select-none ${getStatusColor()}`}
    >
      <div className="flex gap-4 items-center">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-40 h-55 object-cover rounded-lg flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              if (parent) {
                parent.innerHTML =
                  '<div style="display:flex;align-items:center;justify-content:center;width:80px;height:120px;font-size:3em;">📦</div>';
              }
            }}
          />
        ) : (
          <div className="w-40 h-50 flex border-[1px] rounded-lg">
            <div className="bg-ha-secondary-bg flex items-center justify-center m-auto text-4xl rounded-lg flex-shrink-0">
              📦
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ha-text text-lg truncate">
                {item.name}
              </h3>
              {item.aliases && (
                <p className="text-sm text-ha-secondary truncate">
                  {item.aliases}
                </p>
              )}
            </div>
            {getStatusIcon()}
          </div>

          <div className="text-sm text-ha-secondary mb-3 truncate flex flex-col">
            <span className="font-semibold">
              {t.trackedItems.locationLabel}
            </span>
            <span className="italic">{item.location}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ha-secondary">
                {`${t.trackedItems.quantityLabel} `}
                <span className="font-semibold text-ha-text">
                  {item.quantity}
                </span>{' '}
                / {item.min_quantity}
              </span>
            </div>

            {item.quantity! <= item.min_quantity! && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3 h-3" />
                {t.trackedItems.needsRestockLabel}
              </div>
            )}
          </div>

          <div
            className="flex gap-4 justify-start items-center mt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={item.quantity === 0}
              className="qty-btn w-11 h-11 bg-ha-error text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition disabled:opacity-50"
              onClick={() =>
                onQuantityChange(item, Math.max(0, (item.quantity || 0) - 1))
              }
            >
              -
            </button>
            <button
              className="qty-btn w-11 h-11 bg-ha-primary text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition"
              onClick={() => onQuantityChange(item, (item.quantity || 0) + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackedItem;
