import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../Modal';
import { useTranslation } from '../../../i18n/I18nContext';
import { validateDate } from '../../../utils/helpers';
import { AddItemData } from '../../../types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: AddItemData) => Promise<void>;
  organizerName?: string | null;
}

export default function AddItemModal({
  isOpen,
  onClose,
  onSave,
  organizerName,
}: AddItemModalProps) {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [expDate, setExpDate] = useState<string>('');
  const [trackQuantity, setTrackQuantity] = useState(false);
  const [barcode, setBarcode] = useState<string | ''>('');
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
      console.log(trackQuantity, quantity, expDate);
      const expirationDate = trackQuantity
        ? JSON.stringify({ quantity, date: expDate ? expDate : null })
        : null;

      const itemData: AddItemData = {
        name: name.trim(),
        aliases: aliases.trim() || undefined,
        imageFile: imageFile,
        min_quantity: null,
        track_quantity: trackQuantity,
        quantity: trackQuantity ? quantity : null,
        barcode,
        expiration_date: expirationDate,
      };

      await onSave(itemData);

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>
        {`➕ ${t.common.add} ${
          organizerName
            ? `${language === 'en' ? 'in' : 'în'} ${organizerName}`
            : t.items.addItemWithoutOrganizer
        }`}
      </ModalHeader>

      <div className="space-y-4">
        {/* Nume */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            {t.items.itemName} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder={`${t.common.name}`}
          />
        </div>

        {/* Aliasuri */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            {t.items.aliases} ({t.common.optional})
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
            {t.items.image} ({t.common.optional})
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-ha-text text-sm"
          />
        </div>

        <label className="block">
          <span className="text-ha-text text-sm">{t.items.barcode}:</span>
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
          />
        </label>

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
            {t.items.trackQuantity}
          </label>
        </div>

        {/* Quantity fields */}
        {trackQuantity && (
          <div className="space-y-3">
            <div>
              <label className="text-ha-text text-sm block mb-1">
                {t.items.quantity} *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
              />
            </div>
            <div>
              <label className="text-ha-text text-sm block mb-1">
                {t.items?.expDate} (YYYY/MM/DD sau gol)
              </label>
              <input
                type="text"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                placeholder="YYYY/MM/DD"
                className={`w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded ${
                  validateDate(expDate || '')
                    ? 'bg-ha-secondary-bg'
                    : 'bg-red-100'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim() || !validateDate(expDate)}
          className={`flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 `}
        >
          {loading ? t.common.saving : `💾 ${t.common.add}`}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          {t.common.cancel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
