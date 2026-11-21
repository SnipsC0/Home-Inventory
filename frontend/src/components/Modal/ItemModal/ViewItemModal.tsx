import { Modal, ModalHeader } from '../Modal';
import type { ExpirationBatch, Item, ItemLocation } from '../../../types';
import { useTranslation } from '../../../i18n/I18nContext';
import { useItemActions } from '../../../hooks/items/useItemActions';
import SmartImage from '../../SmartImage';
import FavoriteButton from '../../Item/FavoriteButton';
import { useEffect, useState } from 'react';
import { useApi } from '../../../contexts/ApiContext';
import { useHomeInventarConfig } from '../../../hooks/global/useHomeInventarConfig';
import {
  getBatchExpiryStatus,
  sortBatchesByDate,
} from '../../../utils/items/expiryUtils';
import {
  Package,
  MapPin,
  Tag,
  BarChart3,
  Hourglass,
  CalendarDays,
  AlertTriangle,
  Minus,
  Plus,
  Lightbulb,
  Trash2,
} from 'lucide-react';

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  location: ItemLocation | null;
}

export default function ViewItemModal({
  isOpen,
  onClose,
  item,
  location,
}: ViewItemModalProps) {
  const { t, language } = useTranslation();

  const { updateItem } = useItemActions();
  const { data: config } = useHomeInventarConfig(useApi());

  // use the selected location if any, otherwise the first one
  const loc = location ?? item.locations?.[0];
  const variantBarcode = loc?.variant
    ? item.variant_barcodes?.find((vb) => vb.variant === loc.variant)?.barcode
    : undefined;

  // Image: the selected location's own image first, then fall back to the default
  const imageSrc = loc?.image || item.default_image || null;

  // ✅ Local state for batch quantity changes (optimistic update)
  const [localBatches, setLocalBatches] = useState<ExpirationBatch[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local batches when modal opens or location changes
  useEffect(() => {
    if (isOpen && loc?.expiration_dates) {
      try {
        const parsed =
          typeof loc.expiration_dates === 'string'
            ? JSON.parse(loc.expiration_dates)
            : loc.expiration_dates;
        setLocalBatches(Array.isArray(parsed) ? sortBatchesByDate(parsed) : []);
      } catch {
        setLocalBatches([]);
      }
      setHasChanges(false);
    }
  }, [isOpen, loc?.expiration_dates]);

  const locationString = loc
    ? [loc.room, loc.cupboard, loc.shelf, loc.organizer]
        .filter(Boolean)
        .join(' / ')
    : t.items.noLocation;

  const quantity = loc?.quantity ?? item.total_quantity ?? null;

  const isLowStock =
    item.total_quantity &&
    item.min_quantity &&
    item.total_quantity < item.min_quantity
      ? true
      : false;

  // ✅ Optimistic update - only update local state
  const handleQuantityChange = (newQuantity: number, index: number) => {
    setLocalBatches((prev) =>
      prev.map((b, i) => (i === index ? { ...b, quantity: newQuantity } : b))
    );
    setHasChanges(true);
  };

  const handleDeleteBatch = (index: number) => {
    setLocalBatches((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // ✅ Save changes when closing modal
  const handleModalClose = () => {
    if (hasChanges) {
      updateItem.mutate({
        id: item.id,
        location_id: loc.location_id,
        data: {
          expiration_dates: JSON.stringify(localBatches),
        },
      });
    }
    onClose();
  };

  const batches = localBatches;

  const totalLocalQuantity = localBatches.reduce(
    (sum, b) => sum + (b.quantity ?? 0),
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose}>
      <ModalHeader
        onClose={handleModalClose}
        actions={<FavoriteButton itemId={item.id} />}
      >
        {item.name}
      </ModalHeader>

      {/* Imagine */}
      {imageSrc ? (
        <SmartImage
          src={imageSrc}
          alt={item.name}
          wrapperClassName="w-full max-w-[16rem] aspect-[3/4] rounded-2xl shadow-ha mb-5 mx-auto"
          width={800}
          fallback={<Package size={56} strokeWidth={1.5} />}
        />
      ) : (
        <div className="w-full h-[150px] bg-ha-secondary-bg flex items-center justify-center text-ha-text/30 rounded-2xl mb-5">
          <Package size={56} strokeWidth={1.5} />
        </div>
      )}

      {/* Location */}
      <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-2">
          <MapPin size={14} /> {t.items.location}
        </div>
        <div className="font-semibold text-ha-text text-base">
          {locationString}
        </div>
        {loc?.variant && (
          <div className="text-sm text-ha-text/70 mt-1">
            {t.items.variant}: {loc.variant}
            {variantBarcode && (
              <span className="ml-2 text-ha-text/60">({variantBarcode})</span>
            )}
          </div>
        )}

        {/* show the expiration date if present */}
      </div>

      {/* Aliasuri */}
      {item.aliases && (
        <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-2">
            <Tag size={14} /> {t.items.aliases}
          </div>
          <div className="italic text-ha-text">{item.aliases}</div>
        </div>
      )}

      {/* Stoc */}
      {item.track_quantity ? (
        <>
          <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl mb-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-3">
              <BarChart3 size={14} /> {t.items.trackQuantity}
            </div>

            <div className="flex gap-3 mb-3">
              <div
                className={`flex-1 text-white p-3 rounded-xl text-center flex flex-col justify-between h-20 shadow-ha ${
                  isLowStock ? 'bg-ha-error' : 'bg-green-500'
                }`}
              >
                <div className="text-[0.8em] opacity-80 mb-1">
                  {t.items.quantity}
                </div>
                <div className="text-xl font-bold">{totalLocalQuantity}</div>
              </div>

              {item.min_quantity !== null && item.min_quantity >= 0 ? (
                <div className="flex-1 bg-red-900 text-white p-3 rounded-xl shadow-ha text-center flex flex-col justify-between h-20">
                  <div className="text-[0.8em] opacity-80 mb-1">
                    {t.items.minQuantity}
                  </div>
                  <div className="text-xl font-bold">{item.min_quantity}</div>
                </div>
              ) : (
                ''
              )}
              {item.locations.length > 1 && item.total_quantity ? (
                <div className="flex-1 bg-ha-primary text-white p-3 rounded-xl shadow-ha text-center flex flex-col justify-between h-20">
                  <div className="text-[0.8em] opacity-80 mb-1">
                    {t.items.totalQuantity}
                  </div>
                  <div className="text-xl font-bold">
                    {item.total_quantity -
                      (loc?.quantity ?? 0) +
                      totalLocalQuantity}
                  </div>
                </div>
              ) : (
                ''
              )}
            </div>
            {isLowStock && (
              <div className="p-3 bg-ha-error/10 text-ha-error border border-ha-error/30 rounded-xl text-center text-sm flex items-center justify-center gap-2">
                <AlertTriangle size={16} /> <strong>{t.items.lowStock}!</strong> {t.items.needsRestock}.
              </div>
            )}
          </div>
          {batches.length ? (
            <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl mb-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-3">
                <Hourglass size={14} /> {t.items.lots}
              </div>

              <div className="space-y-3">
                {batches?.map((batch, index) => {
                  const {
                    expired: isExpired,
                    soon: isExpiringSoon,
                    daysLeft: daysUntilExpiration,
                  } = getBatchExpiryStatus(batch.date, config);

                  return (
                    <div
                      key={`${batch.date}-${index}`}
                      className={`relative p-4 rounded-xl border transition-all ${
                        isExpired
                          ? 'bg-red-950/20 border-red-500/50'
                          : isExpiringSoon
                          ? 'bg-orange-950/20 border-orange-500/50'
                          : 'bg-ha-card border-ha-divider'
                      }`}
                    >
                      {/* Status Badge */}
                      {(isExpired || isExpiringSoon) && (
                        <div
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold ${
                            isExpired
                              ? 'bg-red-500 text-white'
                              : 'bg-orange-500 text-white'
                          }`}
                        >
                          {isExpired
                            ? t.items.expired
                            : daysUntilExpiration === 0
                            ? t.expiring.today
                            : `${daysUntilExpiration} ${
                                language === 'ru'
                                  ? [t.items.days, t.items.day, t.items.daysFew][
                                      daysUntilExpiration % 10 === 1 &&
                                      daysUntilExpiration % 100 !== 11
                                        ? 1
                                        : daysUntilExpiration % 10 >= 2 &&
                                          daysUntilExpiration % 10 <= 4 &&
                                          (daysUntilExpiration % 100 < 12 ||
                                            daysUntilExpiration % 100 > 14)
                                        ? 2
                                        : 0
                                    ]
                                  : daysUntilExpiration === 1
                                  ? t.items.day
                                  : t.items.days
                              }`}
                        </div>
                      )}

                      {/* Date Info */}
                      <div className="mb-3 pr-20">
                        <div className="text-sm text-ha-text/60 mb-1">
                          {batch.date ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} /> {t.items.expirationDate}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Package size={14} /> {t.items.batchNoDate}
                            </span>
                          )}
                        </div>
                        {batch.date && (
                          <div className="font-semibold text-ha-text">
                            {batch.date}
                          </div>
                        )}
                      </div>

                      {/* Quantity & Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-ha-text/70">
                            {t.items.quantity}:
                          </span>
                          <span className="text-2xl font-bold text-ha-text">
                            {batch.quantity}
                          </span>
                        </div>

                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(batch.quantity || 0) === 0 && (
                            <button
                              title={t.common.delete}
                              aria-label={t.common.delete}
                              className="btn btn-danger !w-10 !h-10 !p-0 !rounded-full"
                              onClick={() => handleDeleteBatch(index)}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button
                            disabled={(batch.quantity || 0) === 0}
                            className="btn btn-danger !w-10 !h-10 !p-0 !rounded-full"
                            onClick={() =>
                              handleQuantityChange(
                                Math.max(0, (batch.quantity || 0) - 1),
                                index
                              )
                            }
                          >
                            <Minus size={18} />
                          </button>
                          <button
                            className="btn btn-primary !w-10 !h-10 !p-0 !rounded-full"
                            onClick={() =>
                              handleQuantityChange(
                                (batch.quantity || 0) + 1,
                                index
                              )
                            }
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            ''
          )}
        </>
      ) : (
        <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl mb-4 text-center">
          <div className="text-sm text-ha-text/70 inline-flex items-center gap-2">
            <BarChart3 size={16} /> {t.items.noTrack}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 border-t border-ha-divider/60">
        <div className="text-xs text-ha-text/60 inline-flex items-center gap-1.5">
          <Lightbulb size={14} /> {t.common.infoViewPress}
        </div>
      </div>
    </Modal>
  );
}
