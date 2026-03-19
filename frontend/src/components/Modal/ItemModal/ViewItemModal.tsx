import { Modal, ModalHeader } from '../Modal';
import type { ExpirationBatch, Item, ItemLocation } from '../../../types';
import { useTranslation } from '../../../i18n/I18nContext';
import { useItemActions } from '../../../hooks/items/useItemActions';
import { useLoadingImage } from './../../../hooks/global/useLoadingImage';
import LoadingSpinner from '../../LoadingImg';
import { useEffect, useState } from 'react';

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
  const { t } = useTranslation();

  const { updateItem } = useItemActions();

  // ✅ dacă s-a selectat o locație, o folosim, altfel prima
  const loc = location ?? item.locations?.[0];

  // ✅ Imaginea – mai întâi cea specifică locației selectate, apoi fallback la default
  const imageSrc = loc?.image || item.default_image || null;

  const { imageError, loadingImage, setImageError, setLoadingImage } =
    useLoadingImage(imageSrc);

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
        setLocalBatches(Array.isArray(parsed) ? parsed : []);
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
    : t?.items?.noLocation || 'No location';

  const quantity = loc?.quantity ?? item.total_quantity ?? null;

  const isLowStock =
    item.total_quantity &&
    item.min_quantity &&
    item.total_quantity < item.min_quantity
      ? true
      : false;

  // ✅ Optimistic update - only update local state
  const handleQuantityChange = (
    newQuantity: number,
    batch: ExpirationBatch
  ) => {
    setLocalBatches((prev) =>
      prev.map((b) =>
        b.date === batch.date ? { ...b, quantity: newQuantity } : b
      )
    );
    setHasChanges(true);
  };

  // ✅ Save changes when closing modal
  const handleModalClose = () => {
    if (hasChanges && localBatches.length > 0) {
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
      <ModalHeader onClose={handleModalClose}>{item.name}</ModalHeader>

      {/* Imagine */}
      {imageSrc ? (
        <div className="w-[15rem] h-[20rem] bg-ha-secondary-bg relative overflow-hidden rounded mb-3 m-auto">
          {loadingImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size={50} />
            </div>
          )}
          {imageError ? (
            <div className="w-full h-[150px] bg-ha-secondary-bg flex items-center justify-center text-4xl rounded mb-3">
              📦
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={item.name}
              loading="lazy"
              className={`w-full h-full object-cover drag-none transition-opacity duration-200 ${
                loadingImage ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setLoadingImage(false)}
              onError={() => {
                setLoadingImage(false);
                setImageError(true);
              }}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-[150px] bg-ha-secondary-bg flex items-center justify-center text-4xl rounded mb-3">
          📦
        </div>
      )}

      {/* Locație */}
      <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
        <div className="text-[0.85em] text-ha-text/70 font-medium mb-2">
          📍 {t.items.location}:
        </div>
        <div className="font-semibold text-ha-text text-base">
          {locationString}
        </div>

        {/* ✅ afișăm data de expirare dacă există */}
      </div>

      {/* Aliasuri */}
      {item.aliases && (
        <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
          <div className="text-[0.85em] text-ha-text/70 font-medium mb-2">
            🏷️ {t.items.aliases}
          </div>
          <div className="italic text-ha-text">{item.aliases}</div>
        </div>
      )}

      {/* Stoc */}
      {item.track_quantity ? (
        <>
          <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
            <div className="text-[0.85em] text-ha-text/70 font-medium mb-3">
              📊 {t.items.trackQuantity}
            </div>

            <div className="flex gap-3 mb-3">
              <div
                className={`flex-1 text-white p-3 rounded text-center bg-green-500 flex flex-col justify-between h-20 ${
                  isLowStock ? 'bg-ha-error' : 'bg-green-500'
                }`}
              >
                <div className="text-[0.8em] opacity-80 mb-1">
                  {t.items.quantity}
                </div>
                <div className="text-xl font-bold">{totalLocalQuantity}</div>
              </div>

              {item.min_quantity !== null && item.min_quantity >= 0 ? (
                <div className="flex-1 bg-red-950 text-white p-3 rounded text-center flex flex-col justify-between h-20">
                  <div className="text-[0.8em] opacity-80 mb-1">
                    {t.items.minQuantity}
                  </div>
                  <div className="text-xl font-bold">{item.min_quantity}</div>
                </div>
              ) : (
                ''
              )}
              {item.locations.length > 1 && item.total_quantity ? (
                <div className="flex-1 bg-ha-primary text-white p-3 rounded text-center flex flex-col justify-between h-20">
                  <div className="text-[0.8em] opacity-80 mb-1">
                    Cantitate totala
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
              <div className="p-3 bg-ha-error text-white rounded text-center text-sm">
                ⚠️ <strong>{t.items.lowStock}!</strong> {t.items.needsRestock}.
              </div>
            )}
          </div>
          {batches.length ? (
            <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
              <div className="text-[0.85em] text-ha-text/70 font-medium mb-3">
                ⏳ {t.items.lots}:
              </div>

              <div className="space-y-3">
                {batches?.map((batch, index) => {
                  const expirationDate = batch.date
                    ? new Date(batch.date)
                    : null;
                  const today = new Date();
                  const isExpired = expirationDate && expirationDate < today;
                  const daysUntilExpiration = expirationDate
                    ? Math.ceil(
                        (expirationDate.getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  const isExpiringSoon =
                    daysUntilExpiration !== null &&
                    daysUntilExpiration <= 7 &&
                    daysUntilExpiration > 0;

                  return (
                    <div
                      key={`${batch.date}-${index}`}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isExpired
                          ? 'bg-red-950/20 border-red-500/50'
                          : isExpiringSoon
                          ? 'bg-orange-950/20 border-orange-500/50'
                          : 'bg-ha-bg border-ha-divider'
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
                            ? t?.items?.expired ?? 'Expirat'
                            : `${daysUntilExpiration} ${
                                daysUntilExpiration === 1 ? 'zi' : 'zile'
                              }`}
                        </div>
                      )}

                      {/* Date Info */}
                      <div className="mb-3 pr-20">
                        <div className="text-sm text-ha-text/60 mb-1">
                          {batch.date
                            ? '📅 Data expirării'
                            : '📦 Lot fără dată'}
                        </div>
                        <div className="font-semibold text-ha-text">
                          {batch.date || 'Nedefinită'}
                        </div>
                      </div>

                      {/* Quantity & Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-ha-text/70">
                            Cantitate:
                          </span>
                          <span className="text-2xl font-bold text-ha-text">
                            {batch.quantity}
                          </span>
                        </div>

                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            disabled={quantity === 0}
                            className="w-10 h-10 bg-ha-error text-white rounded-lg flex items-center justify-center text-xl font-bold hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() =>
                              handleQuantityChange(
                                Math.max(0, (batch.quantity || 0) - 1),
                                batch
                              )
                            }
                          >
                            −
                          </button>
                          <button
                            className="w-10 h-10 bg-ha-primary text-white rounded-lg flex items-center justify-center text-xl font-bold hover:opacity-90 transition"
                            onClick={() =>
                              handleQuantityChange(
                                (batch.quantity || 0) + 1,
                                batch
                              )
                            }
                          >
                            +
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
        <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4 text-center">
          <div className="text-sm text-ha-text/70">📊 {t.items.noTrack}</div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 border-t border-ha-divider">
        <div className="text-[0.85em] text-ha-text/70">
          💡 {t.common.infoViewPress}
        </div>
      </div>
    </Modal>
  );
}
