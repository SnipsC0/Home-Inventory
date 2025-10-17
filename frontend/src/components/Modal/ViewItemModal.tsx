import { Modal, ModalHeader } from './Modal';
import type { Item } from '../../types';

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
}

export function ViewItemModal({ isOpen, onClose, item }: ViewItemModalProps) {
  const isLowStock =
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
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img
            src={item.image}
            alt={item.name}
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div
            style={{
              width: '150px',
              height: '150px',
              background: 'var(--divider-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4em',
              margin: '0 auto',
            }}
          >
            📦
          </div>
        </div>
      )}

      {/* Locație */}
      <div
        style={{
          background: 'var(--secondary-background-color)',
          padding: '14px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '0.85em',
            color: 'var(--secondary-text-color)',
            marginBottom: '6px',
            fontWeight: 500,
          }}
        >
          📍 Locație
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.05em' }}>
          {item.location}
        </div>
      </div>

      {/* Aliasuri */}
      {item.aliases && (
        <div
          style={{
            background: 'var(--secondary-background-color)',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '0.85em',
              color: 'var(--secondary-text-color)',
              marginBottom: '6px',
              fontWeight: 500,
            }}
          >
            🏷️ Aliasuri
          </div>
          <div
            style={{ fontStyle: 'italic', color: 'var(--primary-text-color)' }}
          >
            {item.aliases}
          </div>
        </div>
      )}

      {/* Stoc */}
      {item.track_quantity ? (
        <div
          style={{
            background: 'var(--secondary-background-color)',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '0.85em',
              color: 'var(--secondary-text-color)',
              marginBottom: '10px',
              fontWeight: 500,
            }}
          >
            📊 Urmărire Cantitate
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                flex: 1,
                background: isLowStock
                  ? 'var(--error-color)'
                  : 'var(--success-color)',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div
                style={{ fontSize: '0.8em', opacity: 0.9, marginBottom: '4px' }}
              >
                Cantitate Curentă
              </div>
              <div style={{ fontSize: '1.5em', fontWeight: 700 }}>
                {item.quantity ?? '?'}
              </div>
            </div>
            {item.min_quantity && (
              <div
                style={{
                  flex: 1,
                  background: 'var(--primary-color)',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8em',
                    opacity: 0.9,
                    marginBottom: '4px',
                  }}
                >
                  Cantitate Minimă
                </div>
                <div style={{ fontSize: '1.5em', fontWeight: 700 }}>
                  {item.min_quantity}
                </div>
              </div>
            )}
          </div>
          {isLowStock && (
            <div
              style={{
                padding: '10px',
                background: 'var(--error-color)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.9em',
                textAlign: 'center',
              }}
            >
              ⚠️ <strong>Stoc redus!</strong> Recomandăm reaprovizionare.
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--secondary-background-color)',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{ fontSize: '0.9em', color: 'var(--secondary-text-color)' }}
          >
            📊 Cantitatea nu este urmărită pentru acest obiect
          </div>
        </div>
      )}

      {/* Footer info */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: '16px',
          borderTop: '1px solid var(--divider-color)',
        }}
      >
        <div
          style={{ fontSize: '0.85em', color: 'var(--secondary-text-color)' }}
        >
          💡 Click dreapta sau touch lung pentru editare
        </div>
      </div>
    </Modal>
  );
}
