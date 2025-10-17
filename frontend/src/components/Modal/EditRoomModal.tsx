import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { Button } from '../Button/Button';
import type { Room } from '../../types';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  room: Room;
}

export function EditRoomModal({
  isOpen,
  onClose,
  onSave,
  room,
}: EditRoomModalProps) {
  const [name, setName] = useState(room.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Numele camerei este obligatoriu.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert(
        `Eroare: ${error instanceof Error ? error.message : 'Salvare eșuată'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
      <ModalHeader>✏️ Editare Cameră: {room.name}</ModalHeader>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          Nume cameră
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid var(--divider-color)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          {isSaving ? '⏳ Se salvează...' : '💾 Salvează'}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          Anulează
        </Button>
      </ModalFooter>
    </Modal>
  );
}
