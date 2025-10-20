import { Modal, ModalHeader } from './Modal';
import type { Item } from '../../types';

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
}

export function ViewItemModal({ isOpen, onClose, item }: ViewItemModalProps) {
  const isLowStock =
    item.quantity &&
    item.min_quantity &&
    item.track_quantity &&
    item.quantity !== null &&
    item.min_quantity !== null &&
    item.quantity > 0 &&
    item.quantity <= item.min_quantity;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>{item.name}</ModalHeader>

      {/* Imagine */}
      {item.image ? (
        <div className="mb-5 text-center">
          <img
            src={item.image}
            alt={item.name}
            className="max-w-full max-h-[20rem] rounded shadow-md object-cover m-auto"
          />
        </div>
      ) : (
        <div className="mb-5 flex justify-center">
          <div className="w-[150px] h-[150px] bg-ha-divider rounded-lg flex items-center justify-center text-5xl">
            📦
          </div>
        </div>
      )}

      {/* Locatie */}
      <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
        <div className="text-[0.85em] text-ha-text/70 font-medium mb-2">
          📍 Locație
        </div>
        <div className="font-semibold text-ha-text text-base">
          {item.location}
        </div>
      </div>

      {/* Aliasuri */}
      {item.aliases && (
        <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
          <div className="text-[0.85em] text-ha-text/70 font-medium mb-2">
            🏷️ Aliasuri
          </div>
          <div className="italic text-ha-text">{item.aliases}</div>
        </div>
      )}

      {/* Stoc */}
      {item.track_quantity ? (
        <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4">
          <div className="text-[0.85em] text-ha-text/70 font-medium mb-3">
            📊 Urmărire Cantitate
          </div>

          <div className="flex gap-3 mb-3">
            <div
              className={`flex-1 text-white p-3 rounded text-center ${
                isLowStock ? 'bg-ha-error' : 'bg-green-500'
              }`}
            >
              <div className="text-[0.8em] opacity-80 mb-1">
                Cantitate Curentă
              </div>
              <div className="text-xl font-bold">{item.quantity ?? '?'}</div>
            </div>

            {item.min_quantity && (
              <div className="flex-1 bg-ha-primary text-white p-3 rounded text-center">
                <div className="text-[0.8em] opacity-80 mb-1">
                  Cantitate Minimă
                </div>
                <div className="text-xl font-bold">{item.min_quantity}</div>
              </div>
            )}
          </div>

          {isLowStock && (
            <div className="p-3 bg-ha-error text-white rounded text-center text-sm">
              ⚠️ <strong>Stoc redus!</strong> Recomandăm reaprovizionare.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-ha-secondary-bg p-4 rounded-lg mb-4 text-center">
          <div className="text-sm text-ha-text/70">
            📊 Cantitatea nu este urmărită pentru acest obiect
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 border-t border-ha-divider">
        <div className="text-[0.85em] text-ha-text/70">
          💡 Apă lungă sau click dreapta pentru editare
        </div>
      </div>
    </Modal>
  );
}
