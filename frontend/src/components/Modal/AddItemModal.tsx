import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: {
    name: string;
    aliases?: string;
    imageFile?: File | null;
    quantity?: number | null;
    min_quantity?: number | null;
    track_quantity: boolean;
  }) => Promise<void>;
  organizerName?: string | null;
}

export function AddItemModal({
  isOpen,
  onClose,
  onSave,
  organizerName,
}: AddItemModalProps) {
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [minQuantity, setMinQuantity] = useState<number | null>(null);
  const [trackQuantity, setTrackQuantity] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        aliases: aliases.trim() || undefined,
        imageFile,
        quantity: trackQuantity ? quantity : null,
        min_quantity: trackQuantity ? minQuantity : null,
        track_quantity: trackQuantity,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>
        ➕ Adaugă Obiect{' '}
        {organizerName ? `în ${organizerName}` : 'Direct pe Raft'}
      </ModalHeader>

      <div className="space-y-4">
        {/* Nume */}
        <div>
          <label className="text-ha-text text-sm block mb-1">Nume *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder="Nume obiect"
          />
        </div>

        {/* Aliasuri */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            Aliasuri (opțional)
          </label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder="Ex: toner negru, cartus negru"
          />
        </div>

        {/* Preview imagine */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-[150px] object-cover rounded border border-ha-divider"
          />
        )}

        {/* Upload imagine */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            Imagine (opțional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-ha-text text-sm"
          />
        </div>

        {/* Track Quantity */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="track-quantity-add"
            checked={trackQuantity}
            onChange={(e) => setTrackQuantity(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="track-quantity-add" className="text-ha-text text-sm">
            Urmărește cantitatea
          </label>
        </div>

        {/* Quantity fields */}
        {trackQuantity && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-ha-text text-sm block mb-1">
                Cantitate
              </label>
              <input
                type="number"
                min="0"
                value={quantity ?? ''}
                onChange={(e) =>
                  setQuantity(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-ha-text text-sm block mb-1">
                Cantitate minimă
              </label>
              <input
                type="number"
                min="0"
                value={minQuantity ?? ''}
                onChange={(e) =>
                  setMinQuantity(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
              />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Se salvează...' : '💾 Adaugă'}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          Anulează
        </button>
      </ModalFooter>
    </Modal>
  );
}
