import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useRooms } from '../../hooks/rooms/useRooms';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Cupboard, Organizer, Shelf } from '../../types';
import { useTranslation } from '../../i18n/I18nContext';
import DeleteModal from './DeleteModal';
import { useOrganizerActions } from '../../hooks/organizers/useOrganizerActions';
import { useApi } from '../../contexts/ApiContext';
import SmartImage from '../SmartImage';
import ImagePickerField, { type ImagePickerValue } from './ImagePickerField';

interface EditOrganizerModalProps {
  organizer: Organizer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    newName: string,
    image: ImagePickerValue,
    moveData?: { room: string; cupboard: string; shelf: string }
  ) => Promise<void>;
  currentName: string;
  currentImage?: string;
  api: ApiService;
}

export default function EditOrganizerModal({
  organizer,
  isOpen,
  onClose,
  onSave,
  currentName,
  currentImage,
  api,
}: EditOrganizerModalProps) {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currentRoom = useAppStore((state) => state.selectedRoom);
  const currentCupboard = useAppStore((state) => state.selectedCupboard);
  const currentShelf = useAppStore((state) => state.selectedShelf);

  const [name, setName] = useState(organizer?.name || '');
  const [image, setImage] = useState<ImagePickerValue>({
    file: null,
    removed: false,
  });
  const [loading, setLoading] = useState(false);

  const [showMove, setShowMove] = useState(false);
  const [moveRoom, setMoveRoom] = useState<string>('');
  const [moveCupboard, setMoveCupboard] = useState<string>('');
  const [moveShelf, setMoveShelf] = useState<string>('');

  const { data: rooms = [] } =
    api && currentName ? useRooms(api) : { data: [] };

  const [availableCupboards, setAvailableCupboards] = useState<Cupboard[]>([]);
  const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);

  const { deleteOrganizer } = useOrganizerActions(api);

  const roomImage = rooms.find((r) => r.name === moveRoom)?.image;
  const cupboardImage = availableCupboards.find(
    (c) => c.name === moveCupboard
  )?.image;
  const shelfImage = availableShelves.find((s) => s.name === moveShelf)?.image;

  const renderThumb = (src?: string | null, alt?: string) =>
    src ? (
      <SmartImage
        src={src}
        alt={alt ?? ''}
        width={96}
        wrapperClassName="w-24 h-24 rounded-md mt-2"
      />
    ) : null;

  useEffect(() => {
    if (moveRoom && api) {
      api.getCupboards(moveRoom).then(setAvailableCupboards);
    } else {
      setAvailableCupboards([]);
    }
  }, [moveRoom, api]);

  useEffect(() => {
    if (moveRoom && moveCupboard && api) {
      api.getShelves(moveRoom, moveCupboard).then(setAvailableShelves);
    } else {
      setAvailableShelves([]);
    }
  }, [moveRoom, moveCupboard, api]);

  const handleStartMove = () => {
    setShowMove(true);
    setMoveRoom(currentRoom || '');
    setMoveCupboard(currentCupboard || '');
    setMoveShelf(currentShelf || '');
  };

  const handleCancelMove = () => {
    setShowMove(false);
    setMoveRoom('');
    setMoveCupboard('');
    setMoveShelf('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (showMove && moveRoom && moveCupboard && moveShelf) {
      const isSameLocation =
        moveRoom === currentRoom &&
        moveCupboard === currentCupboard &&
        moveShelf === currentShelf;

      if (isSameLocation) {
        alert(t.errors.sameLocationOrganizer);
        return;
      }
    }

    setLoading(true);
    try {
      const moveData =
        showMove && moveRoom && moveCupboard && moveShelf
          ? { room: moveRoom, cupboard: moveCupboard, shelf: moveShelf }
          : undefined;

      await onSave(name.trim(), image, moveData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isEditMode = !!currentName;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalHeader onClose={onClose}>
          {isEditMode
            ? `${t.common.edit} ${t.organizers.organizer}`
            : `${t.common.add} ${t.organizers.organizer}`}
        </ModalHeader>

        <div className="space-y-4">
          <div>
            <label className="text-ha-text text-sm block mb-1">
              {t.common.name} *
            </label>
            <input
              type="text"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.organizers.organizerName}
            />
          </div>

          <ImagePickerField
            initialImage={currentImage}
            onChange={setImage}
            label={`${t.items.image} (${t.common.optional})`}
            previewClassName="w-full h-[20rem] object-cover rounded border border-ha-divider"
          />

          {isEditMode && (
            <div className="bg-ha-secondary-bg p-3 rounded">
              <div className="text-ha-text text-sm mb-1">
                {t.trackedItems.locationLabel}
              </div>
              <div className="text-ha-text/70 text-xs">
                {currentRoom} › {currentCupboard} › {currentShelf}
              </div>
            </div>
          )}

          {isEditMode && !showMove && (
            <button
              onClick={handleStartMove}
              className="w-full py-2 bg-ha-card border border-ha-primary text-ha-primary rounded hover:bg-ha-secondary-bg transition"
            >
              🚚 {t.organizers.moveOrganizer}
            </button>
          )}

          {/* Sistem de mutare */}
          {showMove && (
            <div className="border border-ha-primary rounded-lg p-4 space-y-3 bg-ha-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ha-text font-semibold text-sm">
                  🚚 {t.organizers.moveIn}
                </span>
                <button
                  onClick={handleCancelMove}
                  className="text-ha-error text-xs hover:underline"
                >
                  {t.organizers.cancelMove}
                </button>
              </div>

              {/* Room */}
              <div>
                <label className="text-ha-text text-xs block mb-1">
                  {t.rooms.room} *
                </label>
                <select
                  value={moveRoom}
                  onChange={(e) => {
                    setMoveRoom(e.target.value);
                    setMoveCupboard('');
                    setMoveShelf('');
                  }}
                  className="field"
                >
                  <option value="">
                    {t.common.select} {t.rooms.room.toLowerCase()}
                  </option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {renderThumb(roomImage, moveRoom)}
              </div>

              {/* Cupboard */}
              {moveRoom && (
                <div>
                  <label className="text-ha-text text-xs block mb-1">
                    {t.cupboards.cupboard} *
                  </label>
                  <select
                    value={moveCupboard}
                    onChange={(e) => {
                      setMoveCupboard(e.target.value);
                      setMoveShelf('');
                    }}
                    className="field"
                  >
                    <option value="">
                      {t.common.select} {t.cupboards.cupboard.toLowerCase()}
                    </option>
                    {availableCupboards.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {renderThumb(cupboardImage, moveCupboard)}
                </div>
              )}

              {/* Shelf */}
              {moveCupboard && (
                <div>
                  <label className="text-ha-text text-xs block mb-1">
                    {t.shelves.shelf} *
                  </label>
                  <select
                    value={moveShelf}
                    onChange={(e) => setMoveShelf(e.target.value)}
                    className="field"
                  >
                    <option value="">
                      {t.common.select} {t.shelves.shelf.toLowerCase()}
                    </option>
                    {availableShelves.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {renderThumb(shelfImage, moveShelf)}
                </div>
              )}

              {moveRoom && moveCupboard && moveShelf && (
                <div className="bg-ha-secondary-bg p-2 rounded text-xs text-ha-text/70">
                  {t.items.newLocation}{' '}
                  <span className="font-semibold">
                    {moveRoom} › {moveCupboard} › {moveShelf}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <ModalFooter>
          <button
            onClick={handleSave}
            disabled={
              loading ||
              !name.trim() ||
              (showMove && (!moveRoom || !moveCupboard || !moveShelf))
            }
            className="btn btn-primary flex-1"
          >
            {loading ? t.common.saving : `${t.common.save}`}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary flex-1"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="btn btn-danger flex-1"
          >
            {t.common.delete}
          </button>
        </ModalFooter>
      </Modal>
      {showDeleteModal && organizer ? (
        <DeleteModal
          isOpen={true}
          itemName={name}
          itemType={t.organizers.organizer}
          itemCount={organizer?.itemCount}
          cascade={{ type: 'organizer', id: organizer.id }}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            await deleteOrganizer.mutateAsync(organizer.id);
            setShowDeleteModal(false);
            onClose();
          }}
        />
      ) : (
        ''
      )}
    </>
  );
}
