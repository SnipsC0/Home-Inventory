import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import DeleteModal from './DeleteModal';
import { Room } from '../../types';
import { useApi } from '../../contexts/ApiContext';
import { useRoomMutations } from '../../hooks/rooms/useRoomMutations';
import { useTranslation } from '../../i18n/I18nContext';

interface EditRoomModalProps {
  room?: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, newFile: File | null) => Promise<void>;
  currentName: string;
}

export default function EditRoomModal({
  room,
  isOpen,
  onClose,
  onSave,
  currentName,
}: EditRoomModalProps) {
  const [name, setName] = useState(currentName);
  const [showDeleteModal, setShowDeleteModal] = useState<Room | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(room?.image || null);

  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const api = useApi();
  const { deleteRoom } = useRoomMutations(api);

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
          ✏️ {room?.id ? t.common.edit : t.common.add} {t.rooms.room}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder={t.rooms.roomName}
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
            disabled={loading}
            className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? `${t.common.saving}` : `💾 ${t.common.save}`}
          </button>
          {room?.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(room);
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
      {room && showDeleteModal !== null ? (
        <DeleteModal
          isOpen={true}
          itemName={room.name}
          itemType={t.rooms.room.toLowerCase()}
          itemCount={room.itemCount}
          onClose={() => {
            onClose();
            setShowDeleteModal(null);
          }}
          onConfirm={async () => {
            await deleteRoom.mutateAsync(room.id);
            onClose();
          }}
        />
      ) : (
        ''
      )}
    </>
  );
}
