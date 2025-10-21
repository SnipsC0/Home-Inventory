import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';

interface EditShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  currentName: string;
}

export default function EditShelfModal({
  isOpen,
  onClose,
  onSave,
  currentName,
}: EditShelfModalProps) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave(name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>✏️ Editează Raft</ModalHeader>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
          placeholder="Nume raft"
        />
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Se salvează...' : '💾 Salvează'}
        </button>

        <button
          onClick={onClose}
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          Anulează
        </button>
      </ModalFooter>
    </Modal>
  );
}
