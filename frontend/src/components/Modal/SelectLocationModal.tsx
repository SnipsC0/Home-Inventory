import { Item, ItemLocation } from '../../types';
import { X, MapPin, Package } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';
import { useInteractions } from '../../hooks/global/useInteractions';

interface Props {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: ItemLocation) => void;
  onEditLocation?: (location: ItemLocation) => void;
}

export default function SelectLocationModal({
  item,
  isOpen,
  onClose,
  onSelectLocation,
  onEditLocation,
}: Props) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const locations = item.locations || [];
  const totalQuantity = locations.reduce(
    (sum, loc) => sum + (loc.quantity || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-ha-card rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ha-card border-b border-ha-divider p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-ha-primary" />
            <div>
              <h2 className="text-xl font-semibold text-ha-text">
                {item.name}
              </h2>
              <p className="text-sm text-ha-text/60">
                {`${locations.length} locații`}
                {item.track_quantity && ` • Total: ${totalQuantity}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ha-secondary-bg rounded-full transition"
          >
            <X className="w-5 h-5 text-ha-text" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-ha-text/80 mb-4">
            Acest item se află în mai multe locații. Selectează locația pe care
            vrei să o vizualizezi (click scurt) sau modifici (ținere apăsat):
          </p>

          {locations.map((location) => {
            const isLowStock =
              item.track_quantity &&
              location.quantity !== null &&
              item.min_quantity !== null &&
              location.quantity <= item.min_quantity;

            const isExpired = location.is_expired;

            const interactionHandlers = useInteractions({
              onSingleClick: () => {
                onSelectLocation(location);
              },
              onLongPress: () => {
                if (onEditLocation) {
                  onEditLocation(location);
                }
              },
              onRightClick: () => {
                if (onEditLocation) {
                  onEditLocation(location);
                }
              },
              excludeSelector: '',
            });

            return (
              <div
                key={location.location_id}
                {...interactionHandlers}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer select-none
                  ${
                    isLowStock
                      ? 'border-ha-error bg-ha-error/5'
                      : 'border-ha-divider bg-ha-secondary-bg hover:border-ha-primary'
                  }
                  ${isExpired ? 'border-orange-500 bg-orange-500/5' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-ha-primary flex-shrink-0" />
                      <span className="font-medium text-ha-text">
                        {location.location}
                      </span>
                    </div>

                    {/* Location Details */}
                    <div className="text-sm text-ha-text/70 space-y-1 ml-6">
                      <div>
                        📍 {location.room} / {location.cupboard} /{' '}
                        {location.shelf}
                      </div>
                      {location.organizer && <div>📦 {location.organizer}</div>}
                    </div>
                  </div>

                  {/* Quantity & Status */}
                  <div className="flex flex-col items-end gap-2">
                    {item.track_quantity && location.quantity !== null && (
                      <div
                        className={`text-lg font-bold ${
                          isLowStock ? 'text-ha-error' : 'text-green-500'
                        }`}
                      >
                        {location.quantity}
                        {item.min_quantity !== null &&
                          ` / ${item.min_quantity}`}
                      </div>
                    )}

                    <div className="flex flex-col items-end gap-1">
                      {isLowStock && (
                        <span className="text-xs px-2 py-1 bg-ha-error text-white rounded-full">
                          Stoc scăzut
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded-full">
                          Expirat
                        </span>
                      )}
                      {location.expiration_dates && !isExpired && (
                        <span className="text-xs text-ha-text/60">
                          {location.expiration_dates[0].date
                            ? `Exp: ${new Date(
                                location.expiration_dates[0]?.date
                              ).toLocaleDateString('ro-RO')}`
                            : 'Fara data'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-ha-card border-t border-ha-divider p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-ha-secondary-bg text-ha-text rounded hover:bg-ha-divider transition"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}
