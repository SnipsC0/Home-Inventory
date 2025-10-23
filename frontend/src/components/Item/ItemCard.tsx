import { useState } from 'react';
import ViewItemModal from '../Modal/ViewItemModal';
import EditItemModal from '../Modal/EditItemModal/EditItemModal';
import { useInteractions } from '../../hooks/global/useInteractions';
import type { Item } from '../../types';
import type { ApiService } from '../../services/api';
import { useUpdateItemMutation } from '../../hooks/items/useItems';

interface ItemCardProps {
  item: Item;
  api: ApiService;
  organizer?: string | null;
  variant?: 'normal' | 'compact';
}

export default function ItemCard({
  item,
  api,
  organizer,
  variant = 'normal',
}: ItemCardProps) {
  const updateItem = useUpdateItemMutation(api);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const interactionHandlers = useInteractions({
    onSingleClick: () => setShowViewModal(true),
    onRightClick: () => setShowEditModal(true),
    onLongPress: () => setShowEditModal(true),
    excludeSelector: '.qty-btn',
  });

  const isLowStock =
    item.track_quantity &&
    item.quantity !== null &&
    item.quantity !== undefined &&
    item.min_quantity !== null &&
    item.min_quantity !== undefined &&
    item.quantity <= item.min_quantity;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 0) return;
    updateItem.mutate({ id: item.id, data: { quantity: newQuantity } });
  };

  const quantityDisplay =
    item.track_quantity && item.quantity !== null && item.quantity !== undefined
      ? item.min_quantity !== null && item.min_quantity !== undefined
        ? ` ${item.quantity}/${item.min_quantity}`
        : ` ${item.quantity}`
      : '';

  const isCompact = variant === 'compact';

  return (
    <>
      <div
        {...interactionHandlers}
        className={`bg-ha-card p-3 rounded-lg shadow-ha cursor-pointer select-none flex flex-col justify-between text-center
        ${
          isLowStock
            ? 'border-l-4 border-ha-error'
            : 'border-l-4 border-transparent'
        }`}
      >
        <div className={`${isCompact ? 'items-center gap-4' : ''}`}>
          {/* Image */}
          {item.image ? (
            <div
              className={`w-fit h-fit bg-ha-secondary-bg relative overflow-hidden rounded mb-3 m-auto`}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-[8rem] h-[10rem] object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement as HTMLElement;
                  if (parent) {
                    parent.innerHTML =
                      '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3em;">📦</div>';
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-full h-[150px] bg-ha-secondary-bg flex items-center justify-center text-4xl rounded mb-3">
              📦
            </div>
          )}

          {/* Content */}
          <div className="flex flex-row justify-center">
            <div className="font-semibold text-ha-text text-md mb-1 screen max-sm:max-w-[10rem]">
              <div>{item.name}</div>
              {quantityDisplay && (
                <span
                  className={`font-semibold ${
                    isLowStock ? 'text-ha-error' : 'text-green-500'
                  }`}
                >
                  {quantityDisplay}
                </span>
              )}
              {item.aliases && (
                <div className="text-xs text-ha-text/60 italic font-light mt-1">
                  {item.aliases}
                </div>
              )}
            </div>
          </div>
        </div>
        {item.track_quantity && (
          <div
            className="flex gap-7 justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={item.quantity === 0}
              className="qty-btn w-11 h-11 bg-ha-error text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition"
              onClick={() =>
                handleQuantityChange(Math.max(0, (item.quantity || 0) - 1))
              }
            >
              -
            </button>
            <button
              className="qty-btn w-11 h-11 bg-ha-primary text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition"
              onClick={() => handleQuantityChange((item.quantity || 0) + 1)}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showViewModal && (
        <ViewItemModal
          isOpen={true}
          onClose={() => setShowViewModal(false)}
          item={item}
        />
      )}
      {showEditModal && (
        <EditItemModal
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          item={item}
          api={api}
          organizer={organizer}
          onSuccess={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
