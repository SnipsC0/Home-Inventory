import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useTranslation } from '../../i18n/I18nContext';

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
  const { t, language } = useTranslation();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>
        {t.common.delete} {itemType}
      </ModalHeader>

      <div className="text-ha-text leading-relaxed mb-4">
        {language === 'en'
          ? t.common.deleteConfirm
          : itemType === 'camera'
          ? t.common.deleteConfirm
          : t.common.deleteConfirm2}{' '}
        {itemType.toLowerCase()},<strong> {itemName}</strong>?
        {itemCount > 0 && (
          <span className="block mt-2 text-ha-error">
            ⚠ {t.rooms.this} {itemType.toLowerCase()} {t.rooms.contain}{' '}
            {itemCount} {t.rooms.containItems}!
          </span>
        )}
      </div>

      <ModalFooter>
        <button
          className="flex-1 py-2 bg-ha-error text-white rounded hover:opacity-90 transition disabled:opacity-50"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? t.common.deleting : `🗑️ ${t.common.delete}`}
        </button>
        <button
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
          onClick={onClose}
        >
          {t.common.cancel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
