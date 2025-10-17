import { useState } from 'react';
import { Card } from './Card';
import { ViewItemModal } from '../Modal/ViewItemModal';
import { EditItemModal } from '../Modal/EditItemModal';
import type { Item } from '../../types';
import type { ApiService } from '../../services/api';

interface ItemCardProps {
  item: Item;
  api: ApiService;
  onUpdate: () => void;
  organizer?: string | null;
}

export function ItemCard({ item, api, onUpdate, organizer }: ItemCardProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const isLowStock =
    item.track_quantity &&
    item.quantity !== null &&
    item.min_quantity !== null &&
    item.quantity <= item.min_quantity;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.qty-btn')) {
      return;
    }
    setShowViewModal(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!(e.target as HTMLElement).closest('.qty-btn')) {
      setShowEditModal(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.qty-btn')) {
      return;
    }

    const timer = setTimeout(() => {
      setShowEditModal(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleQuantityChange = async (newQuantity: number) => {
    try {
      await api.updateItem(item.id, { quantity: newQuantity });
      onUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Eroare la actualizarea cantității');
    }
  };

  let quantityDisplay = '';
  if (item.track_quantity && item.quantity !== null) {
    if (item.min_quantity !== null && item.min_quantity > 0) {
      quantityDisplay = ` ${item.quantity}/${item.min_quantity}`;
    } else {
      quantityDisplay = ` ${item.quantity}`;
    }
  }

  return (
    <>
      <Card
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          {/* Image */}
          {item.image ? (
            <div
              style={{
                width: '100%',
                height: '150px',
                background: 'var(--secondary-background-color)',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML =
                    '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3em;">📦</div>';
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '150px',
                background: 'var(--secondary-background-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3em',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              📦
            </div>
          )}

          {/* Content */}
          <div style={{ padding: '12px' }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: '1.05em',
                marginBottom: '4px',
              }}
            >
              {item.name}
              {quantityDisplay && (
                <span
                  style={{
                    color: isLowStock
                      ? 'var(--error-color)'
                      : 'var(--primary-color)',
                    fontWeight: 600,
                  }}
                >
                  {quantityDisplay}
                </span>
              )}
            </div>

            {item.aliases && (
              <div
                style={{
                  fontSize: '0.8em',
                  color: 'var(--secondary-text-color)',
                  marginTop: '6px',
                  fontStyle: 'italic',
                }}
              >
                aka: {item.aliases}
              </div>
            )}

            {/* Quantity buttons */}
            {item.track_quantity && (
              <div
                className="qty-controls"
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  justifyContent: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="qty-btn"
                  onClick={() =>
                    handleQuantityChange(Math.max(0, (item.quantity || 0) - 1))
                  }
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'var(--error-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  −
                </button>
                <button
                  className="qty-btn"
                  onClick={() => handleQuantityChange((item.quantity || 0) + 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'var(--success-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

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
          onSuccess={onUpdate}
        />
      )}
    </>
  );
}
