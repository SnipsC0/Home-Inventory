import { ExpirationBatch, Item, ItemLocation } from '../../types';
import { X, MapPin, Package } from 'lucide-react';
import { sortBatchesByDate } from '../../utils/items/expiryUtils';
import { useTranslation } from '../../i18n/I18nContext';
import { useInteractions } from '../../hooks/global/useInteractions';
import SmartImage from '../SmartImage';
import LocationPhotos from '../LocationPhotos';
import FavoriteButton from '../Item/FavoriteButton';

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

  // Group rows by physical place, keeping first-appearance order
  const groups: { key: string; locations: ItemLocation[] }[] = [];
  for (const loc of locations) {
    const key = [loc.room, loc.cupboard, loc.shelf, loc.organizer ?? ''].join(
      '\u0000'
    );
    const g = groups.find((x) => x.key === key);
    if (g) g.locations.push(loc);
    else groups.push({ key, locations: [loc] });
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-ha-card rounded-3xl shadow-ha-lg border border-ha-divider/60 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ha-card/95 backdrop-blur border-b border-ha-divider/60 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="page-title-icon">
              <Package size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ha-text">
                {item.name}
              </h2>
              <p className="text-sm text-ha-text/60">
                {`${locations.length} ${t.items.locationsCount}`}
                {item.track_quantity && ` • ${t.items.total}: ${totalQuantity}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <FavoriteButton itemId={item.id} size={20} />
            <button
              onClick={onClose}
              aria-label={t.common.close}
              className="btn btn-ghost !p-2 !rounded-full"
            >
              <X className="w-5 h-5 text-ha-text" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-ha-text/80 mb-4">
            {t.items.selectLocationHint}
          </p>

          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              {/* Group header: the place, shown once */}
              <div className="flex items-start gap-2 px-1">
                <MapPin className="w-4 h-4 mt-0.5 text-ha-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-ha-text">
                    {group.locations[0].location}
                  </div>
                  <div className="text-sm text-ha-text/70">
                    {group.locations[0].room} / {group.locations[0].cupboard} /{' '}
                    {group.locations[0].shelf}
                    {group.locations[0].organizer && (
                      <span className="inline-flex items-center gap-1.5 ml-2">
                        <Package size={13} /> {group.locations[0].organizer}
                      </span>
                    )}
                  </div>
                  <LocationPhotos
                    className="mt-2"
                    room={{
                      name: group.locations[0].room,
                      image: group.locations[0].room_image,
                    }}
                    cupboard={{
                      name: group.locations[0].cupboard,
                      image: group.locations[0].cupboard_image,
                    }}
                    shelf={{
                      name: group.locations[0].shelf,
                      image: group.locations[0].shelf_image,
                    }}
                    organizer={{
                      name: group.locations[0].organizer,
                      image: group.locations[0].organizer_image,
                    }}
                  />
                </div>
                {item.track_quantity && group.locations.length > 1 && (
                  <span className="count-badge !text-sm">
                    {t.items.total}:{' '}
                    {group.locations.reduce(
                      (s, l) => s + (l.quantity || 0),
                      0
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-2 ml-3 pl-3 border-l-2 border-ha-divider/60">
                {group.locations.map((location) => (
                  <LocationRow
                    key={location.location_id}
                    item={item}
                    location={location}
                    onSelectLocation={onSelectLocation}
                    onEditLocation={onEditLocation}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-ha-card/95 backdrop-blur border-t border-ha-divider/60 p-4">
          <button
            onClick={onClose}
            className="btn btn-secondary w-full"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationRow({
  item,
  location,
  onSelectLocation,
  onEditLocation,
}: {
  item: Item;
  location: ItemLocation;
  onSelectLocation: (location: ItemLocation) => void;
  onEditLocation?: (location: ItemLocation) => void;
}) {
  const { t, language } = useTranslation();
  // Low stock is evaluated on the item's total
  const isLowStock = item.track_quantity && item.is_low_stock;
  const isExpired = location.is_expired;

  // expiration_dates arrives as a JSON string from the API
  let batches: ExpirationBatch[] = [];
  try {
    const raw =
      typeof location.expiration_dates === 'string'
        ? JSON.parse(location.expiration_dates)
        : location.expiration_dates;
    if (Array.isArray(raw)) batches = sortBatchesByDate(raw);
  } catch {
    batches = [];
  }

  const edit = () => onEditLocation?.(location);
  const interactionHandlers = useInteractions({
    onSingleClick: () => onSelectLocation(location),
    onLongPress: edit,
    onRightClick: edit,
    excludeSelector: '',
  });

  const variantBarcode = location.variant
    ? item.variant_barcodes?.find((vb) => vb.variant === location.variant)
        ?.barcode
    : undefined;

  return (
    <div
      {...interactionHandlers}
      className={`surface surface-interactive p-3 select-none
        ${isLowStock ? '!border-ha-error/60' : ''}
        ${isExpired ? '!border-orange-500/60' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-4">
        {(location.image || item.default_image) && (
          <SmartImage
            src={(location.image || item.default_image)!}
            alt={item.name}
            wrapperClassName="w-16 h-16 rounded-lg flex-shrink-0"
            width={480}
          />
        )}
        <div className="flex-1 font-semibold text-ha-text">
          {location.variant || item.name}
          {variantBarcode && (
            <span className="ml-2 text-xs font-normal text-ha-text/60">
              {variantBarcode}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {item.track_quantity && location.quantity !== null && (
            <div
              className={`count-badge !text-sm ${
                isLowStock
                  ? '!text-ha-error !bg-ha-error/10'
                  : '!text-green-600 !bg-green-500/10'
              }`}
            >
              {location.quantity}
              {item.min_quantity !== null && ` / ${item.min_quantity}`}
            </div>
          )}
          <div className="flex flex-col items-end gap-1">
            {isLowStock && (
              <span className="count-badge !text-ha-error !bg-ha-error/10">
                {t.items.lowStock}
              </span>
            )}
            {isExpired && (
              <span className="count-badge !text-orange-600 !bg-orange-500/10">
                {t.items.expired}
              </span>
            )}
            {!isExpired &&
              batches.map((b, i) => (
                <span key={i} className="text-xs text-ha-text/60">
                  {b.date
                    ? `${t.items.expShort}: ${new Date(
                        b.date
                      ).toLocaleDateString(language)}`
                    : t.items.noDate}
                  {item.track_quantity &&
                    batches.length > 1 &&
                    ` (${b.quantity ?? 0})`}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
