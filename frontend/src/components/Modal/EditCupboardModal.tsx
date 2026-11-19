import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import type { Cupboard } from '../../types';
import { useTranslation } from '../../i18n/I18nContext';
import DeleteModal from './DeleteModal';
import { useCupboardActions } from './../../hooks/cupboards/useCupboardActions';
import { useApi } from '../../contexts/ApiContext';
import ImagePickerField, { type ImagePickerValue } from './ImagePickerField';

interface EditCupboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, image: ImagePickerValue) => Promise<void>;
  cupboard?: Cupboard;
}

export default function EditCupboardModal({
  isOpen,
  onClose,
  onSave,
  cupboard,
}: EditCupboardModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(cupboard?.name || '');
  const [showDeleteModal, setShowDeleteModal] = useState<Cupboard | null>(null);
  const [image, setImage] = useState<ImagePickerValue>({
    file: null,
    removed: false,
  });
  const [loading, setLoading] = useState(false);

  const api = useApi();
  const { deleteCupboard } = useCupboardActions(api);

  const handleSave = async () => {
    setLoading(true);
    await onSave(name, image);
    setLoading(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader onClose={onClose}>
          
          {`${cupboard?.id ? t.common.edit : t.common.add} ${
            t.cupboards.cupboard
          }`}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder={t.cupboards.cupboardName}
          />

          <ImagePickerField initialImage={cupboard?.image} onChange={setImage} />
        </div>

        <ModalFooter>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
            disabled={loading}
          >
            {loading ? t.common.saving : `${t.common.save}`}
          </button>
          {cupboard?.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(cupboard);
              }}
              className="btn btn-danger flex-1"
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
      {cupboard?.id && showDeleteModal ? (
        <DeleteModal
          isOpen={true}
          itemName={cupboard.name}
          itemType={t.cupboards.cupboard}
          itemCount={cupboard.itemCount}
          cascade={{ type: 'cupboard', id: cupboard.id }}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={async () => {
            await deleteCupboard.mutateAsync(cupboard.id);
            onClose();
            setShowDeleteModal(null);
          }}
        />
      ) : (
        ''
      )}
    </>
  );
}
