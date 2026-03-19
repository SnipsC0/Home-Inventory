import { useState, useCallback } from 'react';
import RoomsHeader from '../components/Room/RoomsHeader';
import RoomCard from '../components/Room/RoomCard';
import EditRoomModal from '../components/Modal/EditRoomModal';
import Loading from '../components/Loading';
import { useRooms } from '../hooks/rooms/useRooms';
import { useRoomMutations } from '../hooks/rooms/useRoomMutations';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useRoomNavigation } from '../hooks/rooms/useRoomNavigation';
import { useTranslation } from '../i18n/I18nContext';
import type { ApiService } from '../services/api';
import type { Room } from '../types';

interface RoomsViewProps {
  api: ApiService;
}

export default function RoomsView({ api }: RoomsViewProps) {
  const { t } = useTranslation();
  const { data: config } = useHomeInventarConfig(api);
  const { data: rooms = [], isLoading, error } = useRooms(api);
  const { goToRoom, goToAllItems, goToTrackedItems } = useRoomNavigation();
  const { addRoom, updateRoom } = useRoomMutations(api);

  const [isModalOpen, setIsModalOpen] = useState(false);
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
    async (name: string) => {
      try {
        if (editingRoom) {
          await updateRoom.mutateAsync({ id: editingRoom.id, name });
        } else {
          await addRoom.mutateAsync(name);
        }
        handleCloseModal();
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          t.errors?.unexpected ||
          'Unexpected error';
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
          onAllItemsClick={goToAllItems}
          onAddRoom={handleAddRoom}
        />

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
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
                count={room.itemCount}
                editable={isEditable}
                onClick={() => goToRoom(room.name)}
                onEdit={() => handleEditRoom(room)}
              />
            ))
          )}
        </div>
      </div>

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
