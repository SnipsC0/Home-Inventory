import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import type { Cupboard } from '../../types';
import { useTranslation } from '../../i18n/I18nContext';
import DeleteModal from './DeleteModal';
import { useCupboardActions } from './../../hooks/cupboards/useCupboardActions';
import { useApi } from '../../contexts/ApiContext';

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
  const { t } = useTranslation();
  const [name, setName] = useState(cupboard.name);
  const [showDeleteModal, setShowDeleteModal] = useState<Cupboard | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(cupboard.image || null);
  const [loading, setLoading] = useState(false);

  const api = useApi();
  const { deleteCupboard } = useCupboardActions(api);

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
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader onClose={onClose}>
          ✏️ {t.common.edit} {t.cupboards.cupboard}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder={t.cupboards.cupboardName}
          />

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
            {loading ? t.common.saving : `💾 ${t.common.save}`}
          </button>
          {cupboard?.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(cupboard);
              }}
              className="flex-1 py-2 bg-ha-error text-white rounded text-sm hover:opacity-90 transition"
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
      {showDeleteModal ? (
        <DeleteModal
          isOpen={true}
          itemName={cupboard.name}
          itemType={t.cupboards.cupboard}
          itemCount={cupboard.itemCount}
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
