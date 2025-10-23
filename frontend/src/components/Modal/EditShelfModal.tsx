import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useTranslation } from '../../i18n/I18nContext';
import { Shelf } from '../../types';
import { useShelfActions } from '../../hooks/shelves/useShelfActions';
import { useApi } from '../../contexts/ApiContext';
import DeleteModal from './DeleteModal';

interface EditShelfModalProps {
  shelf?: Shelf;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  currentName: string;
}

export default function EditShelfModal({
  shelf,
  isOpen,
  onClose,
  onSave,
  currentName,
}: EditShelfModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName);
  const [showDeleteModal, setShowDeleteModal] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(false);

  const api = useApi();
  const { deleteShelf } = useShelfActions(api);

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
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader onClose={onClose}>
          ✏️ {t.common.edit} {t.shelves.shelf}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder={t.shelves.shelfName}
          />
        </div>

        <ModalFooter>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? t.common.saving : `💾 ${t.common.save}`}
          </button>

          {shelf?.id ? (
            <button
              onClick={() => {
                setShowDeleteModal(shelf);
              }}
              className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
            >
              {t.common.delete}
            </button>
          ) : (
            ''
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
          >
            {t.common.cancel}
          </button>
        </ModalFooter>
      </Modal>
      {shelf && showDeleteModal ? (
        <DeleteModal
          isOpen={true}
          itemName={shelf.name}
          itemType={t.shelves.shelf.toLowerCase()}
          itemCount={shelf.itemCount}
          onClose={() => {
            onClose();
            setShowDeleteModal(null);
          }}
          onConfirm={async () => {
            await deleteShelf.mutateAsync(shelf.id);
            onClose();
          }}
        />
      ) : (
        ''
      )}
    </>
  );
}
