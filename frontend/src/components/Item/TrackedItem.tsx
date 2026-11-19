import { FC } from 'react';
import { Item } from '../../types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  MapPin,
  Package,
} from 'lucide-react';
import SmartImage from '../SmartImage';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useTranslation } from '../../i18n/I18nContext';

interface TrackedItemProps {
  item: Item;
  onView: (item: Item) => void;
  onEdit: (item: Item) => void;
}

const TrackedItem: FC<TrackedItemProps> = ({ item, onView, onEdit }) => {
  const { t } = useTranslation();

  const interactionHandlers = useInteractions({
    onSingleClick: () => {
      onView(item);
    },
    onRightClick: () => {
      if (item.locations.length > 1) return;
      onEdit(item);
    },
    onLongPress: () => {
      if (item.locations.length > 1) return;
      onEdit(item);
    },
    excludeSelector: '.qty-btn',
  });

  // Total quantity
  const totalQuantity = item.total_quantity ?? 0;

  const getStatusColor = () => {
    if (totalQuantity <= item.min_quantity!) {
      return '!border-ha-error/60';
    }
    return '';
  };

  const getStatusIcon = () => {
    if (totalQuantity <= item.min_quantity!) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  // Use the default image
  const imageSrc = item.default_image;

  return (
    <div
      {...interactionHandlers}
      className={`surface surface-interactive p-4 select-none ${getStatusColor()}`}
    >
      <div className="flex gap-4 items-center">
        {/* Image */}
        {imageSrc ? (
          <SmartImage
            src={imageSrc}
            alt={item.name}
            wrapperClassName="w-28 h-36 rounded-xl flex-shrink-0"
            width={480}
            fallback={<Package size={40} strokeWidth={1.5} />}
          />
        ) : (
          <div className="w-28 h-36 flex items-center justify-center rounded-xl flex-shrink-0 bg-ha-secondary-bg text-ha-text/30">
            <Package size={40} strokeWidth={1.5} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-ha-text text-lg truncate">
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

          {/* Total Quantity */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ha-secondary">
                {`${t.trackedItems.quantityLabel} (${t.items.total}): `}
                <span
                  className={`font-semibold text-lg ${
                    totalQuantity <= item.min_quantity!
                      ? 'text-ha-error'
                      : 'text-green-500'
                  }`}
                >
                  {totalQuantity}
                </span>{' '}
                / {item.min_quantity}
              </span>
            </div>

            {totalQuantity <= item.min_quantity! && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                <AlertCircle className="w-3 h-3" />
                {t.trackedItems.needsRestockLabel}
              </div>
            )}
          </div>

          {/* Locations List */}
          <div className="space-y-2 mb-3">
            <div className="text-sm font-semibold text-ha-text flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {(item.locations?.length ?? 0) === 1
                ? t.items.productInLocation
                : t.items.productInLocations.replace(
                    '{n}',
                    String(item.locations?.length ?? 0)
                  )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {item.locations?.map((loc) => {
                return (
                  <div
                    key={loc.location_id}
                    className="px-2.5 py-1.5 rounded-lg bg-ha-secondary-bg/70 max-sm:hidden"
                  >
                    <div className="flex items-center max-w-2xl justify-between gap-2">
                      {/* Location Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex max-sm:flex-col items-center gap-2 text-xs text-ha-text truncate ">
                          <MapPin size={14} className="text-ha-primary" />
                          {loc.location} {<ArrowRight size={'1rem'} />}
                          <span className="text-lg text-green-600">
                            {loc.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackedItem;
