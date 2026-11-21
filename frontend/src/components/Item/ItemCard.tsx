import { useState } from 'react';
import { Package } from 'lucide-react';
import ViewItemModal from '../Modal/ItemModal/ViewItemModal';
import EditItemModal from '../Modal/ItemModal/EditItemModal';
import SelectLocationModal from '../Modal/SelectLocationModal';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useInvalidateItems } from '../../hooks/items/useInvalidateItems';
import type { Item, ItemLocation } from '../../types';
import type { ApiService } from '../../services/api';
import SmartImage from '../SmartImage';
import { useApi } from '../../contexts/ApiContext';
import { useTranslation } from '../../i18n/I18nContext';

interface ItemCardProps {
  item: Item;
  organizer?: string | null;
  variant?: 'normal' | 'compact';
  // Allows specifying a location when we know exactly which one to display
  specificLocation?: ItemLocation;
  showMultipleLocations?: boolean;
}

export default function ItemCard({
  item,
  organizer,
  variant = 'normal',
  specificLocation,
  showMultipleLocations = false,
}: ItemCardProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ItemLocation | null>(
    specificLocation || null
  );

  const api = useApi();
  const { invalidateAll } = useInvalidateItems();
  const { t } = useTranslation();

  const hasMultipleLocations = (item.locations?.length || 0) > 1;

  const activeLocation =
    specificLocation ||
    selectedLocation ||
    (item.track_quantity && !specificLocation ? item.locations[0] : null);

  // Aggregated cards (all rows of an item) must not show one row's variant.
  const variantLabel =
    specificLocation?.variant ??
    (hasMultipleLocations ? null : activeLocation?.variant);

  const interactionHandlers = useInteractions({
    onSingleClick: () => {
      if (hasMultipleLocations && showMultipleLocations) {
        setShowLocationModal(true);
      } else {
        setSelectedLocation(activeLocation);
        setShowViewModal(true);
      }
    },
    onRightClick: () => {
      if (hasMultipleLocations && showMultipleLocations) {
        setShowLocationModal(true);
      } else {
        setSelectedLocation(activeLocation);
        setShowEditModal(true);
      }
    },
    onLongPress: () => {
      if (hasMultipleLocations && showMultipleLocations) {
        setShowLocationModal(true);
      } else {
        setSelectedLocation(activeLocation);
        setShowEditModal(true);
      }
    },
    excludeSelector: '.qty-btn',
  });

  const imageSrc =
    specificLocation?.image ||
    (hasMultipleLocations && !specificLocation
      ? item.default_image
      : activeLocation?.image || item.default_image);

  const quantity =
    hasMultipleLocations && showMultipleLocations
      ? item.total_quantity
      : activeLocation?.quantity ?? null;

  // Low stock is evaluated on the item's total, not on this row's quantity
  const isLowStock = item.track_quantity && item.is_low_stock;

  const quantityDisplay =
    item.track_quantity && quantity !== null
      ? item.min_quantity !== null
        ? ` ${quantity}/${item.min_quantity}`
        : ` ${quantity}`
      : '';

  const isCompact = variant === 'compact';

  const handleCloseView = () => {
    setShowViewModal(false);
    if (!showEditModal && !showLocationModal) {
      setSelectedLocation(specificLocation || null);
    }
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    if (!showViewModal && !showLocationModal) {
      setSelectedLocation(specificLocation || null);
    }
  };

  const handleCloseLocation = () => {
    if (!showViewModal && !showEditModal) {
      setSelectedLocation(specificLocation || null);
    }
    setShowLocationModal(false);
  };

  return (
    <>
      <div
        {...interactionHandlers}
        className={`surface surface-interactive p-3 select-none flex flex-col justify-between text-center relative overflow-hidden
        ${isLowStock ? '!border-ha-error/60' : ''}`}
      >
        {hasMultipleLocations && showMultipleLocations && (
          <div className="absolute top-2 right-2 bg-ha-primary text-white text-xs px-2 py-1 rounded-full font-semibold z-10 shadow-ha">
            {item.locations?.length} {t.items.locationsCount}
          </div>
        )}

        <div
          className={`w-full flex flex-col justify-center items-center${
            isCompact ? 'items-center gap-4' : ''
          }`}
        >
          {/* Image */}
          {imageSrc ? (
            <SmartImage
              src={imageSrc}
              alt={item.name}
              wrapperClassName="w-full aspect-[4/5] rounded-xl mb-3"
              width={480}
              fallback={<Package size={40} strokeWidth={1.5} />}
            />
          ) : (
            <div className="w-full aspect-[4/5] bg-ha-secondary-bg flex items-center justify-center text-ha-text/30 rounded-xl mb-3">
              <Package size={40} strokeWidth={1.5} />
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col justify-between items-center text-center font-semibold text-ha-text text-sm mb-1 w-full">
            <div>{item.name}</div>
            {variantLabel && (
              <div className="text-xs text-ha-text/70 font-normal mt-0.5">
                {variantLabel}
              </div>
            )}
            {item.aliases && (
              <div className="text-xs text-ha-text/60 italic font-light mt-1">
                {item.aliases}
              </div>
            )}
            {quantityDisplay && (
              <span
                className={`count-badge mt-1 ${
                  isLowStock
                    ? '!text-ha-error !bg-ha-error/10'
                    : '!text-green-600 !bg-green-500/10'
                }`}
              >
                {quantityDisplay}
              </span>
            )}
          </div>
        </div>
      </div>

      {showLocationModal && (
        <SelectLocationModal
          isOpen={true}
          onClose={handleCloseLocation}
          item={item}
          onSelectLocation={(location) => {
            setSelectedLocation(location);
            setShowLocationModal(false);
            setShowViewModal(true);
          }}
          onEditLocation={(location) => {
            setSelectedLocation(location);
            setShowLocationModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {showViewModal && (
        <ViewItemModal
          isOpen={true}
          onClose={handleCloseView}
          item={item}
          location={activeLocation}
        />
      )}

      {showEditModal && (
        <EditItemModal
          isOpen={true}
          onClose={handleCloseEdit}
          item={item}
          api={api}
          organizer={organizer}
          location={activeLocation!}
          onSuccess={() => {
            invalidateAll();
            handleCloseEdit();
          }}
        />
      )}
    </>
  );
}
