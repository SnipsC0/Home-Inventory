import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import DeleteModal from './DeleteModal';
import { Room } from '../../types';
import { useApi } from '../../contexts/ApiContext';
import { useRoomMutations } from '../../hooks/rooms/useRoomMutations';
import { useTranslation } from '../../i18n/I18nContext';
import ImagePickerField, { type ImagePickerValue } from './ImagePickerField';

interface EditRoomModalProps {
  room?: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, image: ImagePickerValue) => Promise<void>;
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
  const [image, setImage] = useState<ImagePickerValue>({
    file: null,
    removed: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState<Room | null>(null);

  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const api = useApi();
  const { deleteRoom } = useRoomMutations(api);

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
          {room?.id ? t.common.edit : t.common.add} {t.rooms.room}
        </ModalHeader>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder={t.rooms.roomName}
          />

          <ImagePickerField
            initialImage={room?.image}
            onChange={setImage}
            label={`${t.items.image} (${t.common.optional})`}
          />
        </div>

        <ModalFooter>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? `${t.common.saving}` : `${t.common.save}`}
          </button>
          {room?.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(room);
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
      {room && showDeleteModal !== null ? (
        <DeleteModal
          isOpen={true}
          itemName={room.name}
          itemType={t.rooms.room.toLowerCase()}
          itemCount={room.itemCount}
          cascade={{ type: 'room', id: room.id }}
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
