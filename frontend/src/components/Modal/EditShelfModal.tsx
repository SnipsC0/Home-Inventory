import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useTranslation } from '../../i18n/I18nContext';
import { Shelf } from '../../types';
import { useShelfActions } from '../../hooks/shelves/useShelfActions';
import { useApi } from '../../contexts/ApiContext';
import DeleteModal from './DeleteModal';
import ImagePickerField, { type ImagePickerValue } from './ImagePickerField';

interface EditShelfModalProps {
  shelf?: Shelf;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, image: ImagePickerValue) => Promise<void>;
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
  const [image, setImage] = useState<ImagePickerValue>({
    file: null,
    removed: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(false);

  const api = useApi();
  const { deleteShelf } = useShelfActions(api);

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave(name, image);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader onClose={onClose}>
          {shelf?.id ? t.common.edit : t.common.add} {t.shelves.shelf}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder={t.shelves.shelfName}
          />

          <ImagePickerField
            initialImage={shelf?.image}
            onChange={setImage}
            label={`${t.items.image} (${t.common.optional})`}
          />
        </div>

        <ModalFooter>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="btn btn-primary flex-1"
          >
            {loading ? t.common.saving : `${t.common.save}`}
          </button>

          {shelf?.id ? (
            <button
              onClick={() => {
                setShowDeleteModal(shelf);
              }}
              className="btn btn-primary flex-1"
            >
              {t.common.delete}
            </button>
          ) : (
            ''
          )}

          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
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
          cascade={{ type: 'shelf', id: shelf.id }}
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
