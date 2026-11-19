import { useState, useCallback } from 'react';
import RoomsHeader from '../components/Room/RoomsHeader';
import RoomCard from '../components/Room/RoomCard';
import EditRoomModal from '../components/Modal/EditRoomModal';
import FindByBarcodeModal from '../components/Modal/FindByBarcodeModal';
import Loading from '../components/Loading';
import { useRooms } from '../hooks/rooms/useRooms';
import { useRoomMutations } from '../hooks/rooms/useRoomMutations';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useRoomNavigation } from '../hooks/rooms/useRoomNavigation';
import { useTranslation } from '../i18n/I18nContext';
import type { ApiService } from '../services/api';
import type { Room } from '../types';
import type { ImagePickerValue } from '../components/Modal/ImagePickerField';

interface RoomsViewProps {
  api: ApiService;
}

export default function RoomsView({ api }: RoomsViewProps) {
  const { t } = useTranslation();
  const { data: config } = useHomeInventarConfig(api);
  const { data: rooms = [], isLoading, error } = useRooms(api);
  const { goToRoom, goToAllItems, goToTrackedItems, goToExpiring } = useRoomNavigation();
  const { addRoom, updateRoom } = useRoomMutations(api);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  /** Handlers */
  const handleAddRoom = useCallback(() => {
    setEditingRoom(null);
    setIsModalOpen(true);
  }, []);

  const handleEditRoom = useCallback((room: Room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRoom(null);
  }, []);

  const handleSaveRoom = useCallback(
    async (name: string, image: ImagePickerValue) => {
      try {
        if (editingRoom) {
          await updateRoom.mutateAsync({ id: editingRoom.id, name, image });
        } else {
          await addRoom.mutateAsync({ name, image });
        }
        handleCloseModal();
      } catch (err: any) {
        const message = err?.response?.data?.error || t.errors.unexpected;
        alert(message);
      }
    },
    [editingRoom, addRoom, updateRoom, handleCloseModal, t]
  );

  if (isLoading) return <Loading />;
  if (error)
    return (
      <div className="text-ha-error text-center py-6">
        {t.errors.getRoomsError}
      </div>
    );

  const isEditable = !!config?.allow_structure_modification;
  const hasNoRooms = rooms.length === 0;

  return (
    <>
      <div className="space-y-4">
        <RoomsHeader
          allowEdit={isEditable}
          onTrackStock={goToTrackedItems}
          onExpiring={goToExpiring}
          onAllItemsClick={goToAllItems}
          onAddRoom={handleAddRoom}
          onFindByBarcode={() => setIsBarcodeOpen(true)}
        />

        <div className="stagger grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {hasNoRooms ? (
            <p className="text-center text-ha-text py-10">
              {t.rooms.noExist}
              {isEditable && ` ${t.rooms.addFirst}`}
            </p>
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                name={room.name}
                image={room.image}
                count={room.itemCount}
                editable={isEditable}
                onClick={() => goToRoom(room.name)}
                onEdit={() => handleEditRoom(room)}
              />
            ))
          )}
        </div>
      </div>

      {isBarcodeOpen && (
        <FindByBarcodeModal api={api} onClose={() => setIsBarcodeOpen(false)} />
      )}

      {isModalOpen && (
        <EditRoomModal
          room={editingRoom}
          isOpen={isModalOpen}
          currentName={editingRoom?.name || ''}
          onClose={handleCloseModal}
          onSave={handleSaveRoom}
        />
      )}
    </>
  );
}
