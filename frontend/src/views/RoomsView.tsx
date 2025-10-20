import RoomsHeader from '../components/Room/RoomsHeader';
import RoomCard from '../components/Room/RoomCard';
import { useRooms } from '../hooks/useRooms';
import { useRoomMutations } from '../hooks/useRoomMutations';
import { useHomeInventarConfig } from '../hooks/useHomeInventarConfig';
import { useRoomNavigation } from '../hooks/useRoomNavigation';
import { EditRoomModal } from '../components/Modal/EditRoomModal';
import { DeleteModal } from '../components/Modal/DeleteModal';
import { useState } from 'react';
import type { ApiService } from '../services/api';
import type { Room } from '../types';

export default function RoomsView({ api }: { api: ApiService }) {
  const { data: rooms = [], isLoading, error } = useRooms(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToRoom, goToAllItems } = useRoomNavigation();
  const { addRoom, updateRoom, deleteRoom } = useRoomMutations(api);

  const [showAddModal, setShowAddModal] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  if (isLoading) return <div className="text-ha-text">Se încarcă...</div>;
  if (error)
    return <div className="text-ha-error">Eroare la încărcarea camerelor</div>;

  return (
    <div className="space-y-4">
      <RoomsHeader
        allowEdit={config?.allow_structure_modification}
        onAllItemsClick={goToAllItems}
        onAddRoom={() => setShowAddModal(true)}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {rooms.length === 0 ? (
          <p className="text-center text-ha-text py-10">
            Nu există camere.
            {config?.allow_structure_modification && ' Adaugă prima cameră!'}
          </p>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              name={room.name}
              count={room.itemCount}
              editable={config?.allow_structure_modification}
              onClick={() => goToRoom(room.name)}
              onEdit={() => setRoomToEdit(room)}
              onDelete={() => setRoomToDelete(room)}
            />
          ))
        )}
      </div>

      {showAddModal && (
        <EditRoomModal
          isOpen={true}
          currentName=""
          onClose={() => setShowAddModal(false)}
          onSave={async (name) => {
            await addRoom.mutateAsync(name);
            setShowAddModal(false);
          }}
        />
      )}

      {roomToEdit && (
        <EditRoomModal
          isOpen={true}
          currentName={roomToEdit.name}
          onClose={() => setRoomToEdit(null)}
          onSave={async (newName) => {
            await updateRoom.mutateAsync({ id: roomToEdit.id, name: newName });
            setRoomToEdit(null);
          }}
        />
      )}

      {roomToDelete && (
        <DeleteModal
          isOpen={true}
          itemName={roomToDelete.name}
          itemType="Cameră"
          itemCount={roomToDelete.itemCount}
          onClose={() => setRoomToDelete(null)}
          onConfirm={async () => {
            await deleteRoom.mutateAsync(roomToDelete.id);
            setRoomToDelete(null);
          }}
        />
      )}
    </div>
  );
}
