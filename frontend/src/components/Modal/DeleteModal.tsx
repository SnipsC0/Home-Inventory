import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType: string;
  itemCount?: number;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  itemCount = 0,
}: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>Ștergere {itemType}</ModalHeader>

      <div className="text-ha-text leading-relaxed mb-4">
        Ești sigur că vrei să ștergi <strong>{itemName}</strong>?
        {itemCount > 0 && (
          <span className="block mt-2 text-ha-error">
            ⚠ Acest {itemType.toLowerCase()} conține {itemCount} elemente care
            vor fi șterse!
          </span>
        )}
      </div>

      <ModalFooter>
        <button
          className="flex-1 py-2 bg-ha-error text-white rounded hover:opacity-90 transition disabled:opacity-50"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Se șterge...' : '🗑️ Șterge'}
        </button>
        <button
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
          onClick={onClose}
        >
          Anulează
        </button>
      </ModalFooter>
    </Modal>
  );
}
