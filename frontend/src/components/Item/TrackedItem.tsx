import { FC } from 'react';
import { Item } from '../../types';
import { AlertCircle, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
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

  // ✅ Cantitatea totală
  const totalQuantity = item.total_quantity ?? 0;

  const getStatusColor = () => {
    if (totalQuantity <= item.min_quantity!) {
      return 'border-l-4 border-ha-error';
    }
    return 'border-l-4 border-transparent';
  };

  const getStatusIcon = () => {
    if (totalQuantity <= item.min_quantity!) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  // ✅ Folosim imaginea default
  const imageSrc = item.default_image;

  return (
    <div
      {...interactionHandlers}
      className={`p-4 rounded-lg border-2 transition bg-ha-card cursor-pointer select-none ${getStatusColor()}`}
    >
      <div className="flex gap-4 items-center">
        {/* Image */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            className="w-32 h-40 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              if (parent) {
                parent.innerHTML =
                  '<div style="display:flex;align-items:center;justify-content:center;width:128px;height:160px;font-size:3em;">📦</div>';
              }
            }}
          />
        ) : (
          <div className="w-32 h-40 flex border-[1px] rounded-lg flex-shrink-0">
            <div className="bg-ha-secondary-bg flex items-center justify-center m-auto text-4xl rounded-lg">
              📦
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
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

          {/* Total Quantity */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ha-secondary">
                {`${t.trackedItems.quantityLabel} (Total): `}
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
              Produsul se afla in {item.locations?.length || 0}{' '}
              {item.locations?.length > 1 ? 'locuri' : 'loc'}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {item.locations?.map((loc) => {
                return (
                  <div
                    key={loc.location_id}
                    className={`p-0.5 rounded bg-ha-secondary-bg border-ha-divider max-sm:hidden`}
                  >
                    <div className="flex items-center max-w-2xl justify-between gap-2">
                      {/* Location Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex max-sm:flex-col items-center gap-2 text-xs text-ha-text truncate ">
                          📍 {loc.location} {<ArrowRight size={'1rem'} />}
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
