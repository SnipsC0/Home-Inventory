import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { Button } from '../Button/Button';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType: string;
  itemCount?: number;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  itemCount = 0,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      alert(
        `Eroare: ${error instanceof Error ? error.message : 'Ștergere eșuată'}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
      <ModalHeader>
        <span style={{ color: 'var(--error-color)' }}>
          ⚠️ Ștergere {itemType}
        </span>
      </ModalHeader>

      <p style={{ marginBottom: '20px', lineHeight: 1.6 }}>
        Ești sigur că vrei să ștergi {itemType.toLowerCase()}{' '}
        <strong>{itemName}</strong>?
        {itemCount > 0 && (
          <>
            <br />
            <br />
            <span style={{ color: 'var(--error-color)' }}>
              ⚠️ Acest {itemType.toLowerCase()} conține {itemCount} obiecte care
              vor fi șterse!
            </span>
          </>
        )}
      </p>

      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isDeleting}
          style={{ flex: 1 }}
        >
          {isDeleting ? '⏳ Se șterge...' : '🗑️ Șterge Definitiv'}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isDeleting}
          style={{ flex: 1 }}
        >
          Anulează
        </Button>
      </ModalFooter>
    </Modal>
  );
}
