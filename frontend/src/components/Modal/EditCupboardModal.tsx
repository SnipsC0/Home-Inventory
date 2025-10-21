import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import type { Cupboard } from '../../types';

interface EditCupboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, newFile: File | null) => Promise<void>;
  cupboard: Cupboard;
}

export default function EditCupboardModal({
  isOpen,
  onClose,
  onSave,
  cupboard,
}: EditCupboardModalProps) {
  const [name, setName] = useState(cupboard.name);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(cupboard.image || null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0] || null;
    setFile(newFile);

    if (newFile) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(newFile);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave(name, file);
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>✏️ Editează Dulap</ModalHeader>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
          placeholder="Nume dulap"
        />

        {/* Preview imagine */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-3/5 m-auto object-cover rounded border border-ha-divider"
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-ha-text text-sm"
        />
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
          disabled={loading}
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
