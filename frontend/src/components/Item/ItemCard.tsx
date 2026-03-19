import { useState } from 'react';
import ViewItemModal from '../Modal/ItemModal/ViewItemModal';
import EditItemModal from '../Modal/ItemModal/EditItemModal';
import SelectLocationModal from '../Modal/SelectLocationModal';
import { useInteractions } from '../../hooks/global/useInteractions';
import type { Item, ItemLocation } from '../../types';
import type { ApiService } from '../../services/api';
import { useLoadingImage } from '../../hooks/global/useLoadingImage';
import LoadingSpinner from '../LoadingImg';
import { useApi } from '../../contexts/ApiContext';

interface ItemCardProps {
  item: Item;
  organizer?: string | null;
  variant?: 'normal' | 'compact';
  // ✅ Nou: permite specificarea unei locații când știm exact care locație să afișăm
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

  const hasMultipleLocations = (item.locations?.length || 0) > 1;

  const activeLocation =
    specificLocation ||
    selectedLocation ||
    (item.track_quantity && !specificLocation ? item.locations[0] : null);

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

  const { imageError, setImageError, loadingImage, setLoadingImage } =
    useLoadingImage(imageSrc);

  const quantity =
    hasMultipleLocations && showMultipleLocations
      ? item.total_quantity
      : activeLocation?.quantity ?? null;

  const isLowStock =
    item.track_quantity &&
    quantity !== null &&
    item.min_quantity !== null &&
    quantity <= item.min_quantity;

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
        className={`bg-ha-card p-3 rounded-lg shadow-ha cursor-pointer select-none flex flex-col justify-between text-center relative
        ${
          isLowStock
            ? 'border-l-4 border-ha-error'
            : 'border-l-4 border-transparent'
        }`}
      >
        {hasMultipleLocations && showMultipleLocations && (
          <div className="absolute top-2 right-2 bg-ha-primary text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
            {item.locations?.length} locații
          </div>
        )}

        <div
          className={`flex flex-col justify-center items-center${
            isCompact ? 'items-center gap-4' : ''
          }`}
        >
          {/* Image */}
          {imageSrc ? (
            <div className="w-[8rem] h-[10rem] bg-ha-secondary-bg relative overflow-hidden rounded mb-3 m-auto">
              {loadingImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner size={8} />
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
                  className={`w-full h-full object-cover transition-opacity duration-200 drag-none ${
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

          {/* Content */}
          <div className="flex flex-col justify-between items-center text-center font-semibold text-ha-text text-md mb-1 max-sm:max-w-[10rem]">
            <div>{item.name}</div>
            {item.aliases && (
              <div className="text-xs text-ha-text/60 italic font-light mt-1">
                {item.aliases}
              </div>
            )}
            {quantityDisplay && (
              <span
                className={`font-semibold ${
                  isLowStock ? 'text-ha-error' : 'text-green-500'
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
          onSuccess={handleCloseEdit}
        />
      )}
    </>
  );
}
