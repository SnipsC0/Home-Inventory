import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import {
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../../hooks/useItems';
import { useRooms } from '../../hooks/useRooms';
import type { Item, Cupboard, Shelf, Organizer } from '../../types';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  api: ApiService;
  organizer?: string | null;
  onSuccess: () => void;
}

export function EditItemModal({
  isOpen,
  onClose,
  item,
  api,
  organizer,
  onSuccess,
}: EditItemModalProps) {
  const updateItem = useUpdateItemMutation(api);
  const deleteItem = useDeleteItemMutation(api);

  const currentRoom = useAppStore((state) => state.selectedRoom);
  const currentCupboard = useAppStore((state) => state.selectedCupboard);
  const currentShelf = useAppStore((state) => state.selectedShelf);

  const [name, setName] = useState(item.name);
  const [aliases, setAliases] = useState(item.aliases || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item.image || null);
  const [quantity, setQuantity] = useState<number | null>(
    item.quantity ?? null
  );
  const [minQuantity, setMinQuantity] = useState<number | null>(
    item.min_quantity ?? null
  );
  const [trackQuantity, setTrackQuantity] = useState(item.track_quantity);
  const [loading, setLoading] = useState(false);

  // Sistem de mutare
  const [showMove, setShowMove] = useState(false);
  const [moveRoom, setMoveRoom] = useState<string>('');
  const [moveCupboard, setMoveCupboard] = useState<string>('');
  const [moveShelf, setMoveShelf] = useState<string>('');
  const [moveOrganizer, setMoveOrganizer] = useState<string>('');

  // State pentru date încărcate dinamic
  const [availableCupboards, setAvailableCupboards] = useState<Cupboard[]>([]);
  const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
  const [availableOrganizers, setAvailableOrganizers] = useState<Organizer[]>(
    []
  );

  // Queries pentru mutare
  const { data: rooms = [] } = useRooms(api);

  // Încarcă cupboards când se schimbă camera
  useEffect(() => {
    if (moveRoom) {
      api.getCupboards(moveRoom).then(setAvailableCupboards);
    } else {
      setAvailableCupboards([]);
    }
  }, [moveRoom, api]);

  // Încarcă shelves când se schimbă dulapul
  useEffect(() => {
    if (moveRoom && moveCupboard) {
      api.getShelves(moveRoom, moveCupboard).then(setAvailableShelves);
    } else {
      setAvailableShelves([]);
    }
  }, [moveRoom, moveCupboard, api]);

  // Încarcă organizers când se schimbă raftul
  useEffect(() => {
    if (moveRoom && moveCupboard && moveShelf) {
      api
        .getOrganizers(moveRoom, moveCupboard, moveShelf)
        .then((data) => setAvailableOrganizers(data.organizers));
    } else {
      setAvailableOrganizers([]);
    }
  }, [moveRoom, moveCupboard, moveShelf, api]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0] || null;
    setFile(newFile);

    if (newFile) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(newFile);
    }
  };

  const handleStartMove = () => {
    setShowMove(true);
    // Setează valorile curente ca default
    setMoveRoom(currentRoom || '');
    setMoveCupboard(currentCupboard || '');
    setMoveShelf(currentShelf || '');
    setMoveOrganizer(organizer || '');
  };

  const handleCancelMove = () => {
    setShowMove(false);
    setMoveRoom('');
    setMoveCupboard('');
    setMoveShelf('');
    setMoveOrganizer('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (showMove && moveRoom && moveCupboard && moveShelf) {
      const isSameLocation =
        moveRoom === currentRoom &&
        moveCupboard === currentCupboard &&
        moveShelf === currentShelf &&
        moveOrganizer === (organizer || '');

      if (isSameLocation) {
        alert('Obiectul este deja în această locație!');
        return;
      }
    }

    setLoading(true);
    try {
      const updateData: any = {
        name: name.trim(),
        aliases: aliases.trim() || undefined,
        track_quantity: trackQuantity,
      };

      if (trackQuantity) {
        updateData.quantity = quantity;
        updateData.min_quantity = minQuantity;
      }

      // Dacă se mută obiectul
      if (showMove && moveRoom && moveCupboard && moveShelf) {
        updateData.room = moveRoom;
        updateData.cupboard = moveCupboard;
        updateData.shelf = moveShelf;
        updateData.organizer = moveOrganizer || null;
      }

      if (file) {
        const imagePath = await api.uploadImage(file, {
          room: moveRoom || item.location.split(' › ')[0],
          cupboard: moveCupboard || item.location.split(' › ')[1],
          shelf: moveShelf || item.location.split(' › ')[2],
          organizer: moveOrganizer || organizer || undefined,
          item: name,
        });
        updateData.image = imagePath;
      }

      await updateItem.mutateAsync({ id: item.id, data: updateData });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Ești sigur că vrei să ștergi "${item.name}"?`)) return;

    setLoading(true);
    try {
      await deleteItem.mutateAsync(item.id);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>✏️ Editează Obiect</ModalHeader>

      <div className="space-y-4">
        {/* Nume */}
        <div>
          <label className="text-ha-text text-sm block mb-1">Nume *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder="Nume obiect"
          />
        </div>

        {/* Aliasuri */}
        <div>
          <label className="text-ha-text text-sm block mb-1">Aliasuri</label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            placeholder="Ex: toner negru, cartus negru"
          />
        </div>

        {/* Preview imagine */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-[20rem] object-cover rounded-sm m-auto"
          />
        )}

        {/* Upload imagine */}
        <div>
          <label className="text-ha-text text-sm block mb-1">Imagine</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-ha-text text-sm"
          />
        </div>

        {/* Track Quantity */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="track-quantity-edit"
            checked={trackQuantity}
            onChange={(e) => setTrackQuantity(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="track-quantity-edit" className="text-ha-text text-sm">
            Urmărește cantitatea
          </label>
        </div>

        {/* Quantity fields */}
        {trackQuantity && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-ha-text text-sm block mb-1">
                Cantitate
              </label>
              <input
                type="number"
                min="0"
                value={quantity ?? ''}
                onChange={(e) =>
                  setQuantity(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-ha-text text-sm block mb-1">
                Cantitate minimă
              </label>
              <input
                type="number"
                min="0"
                value={minQuantity ?? ''}
                onChange={(e) =>
                  setMinQuantity(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
              />
            </div>
          </div>
        )}

        {/* Locație curentă */}
        <div className="bg-ha-secondary-bg p-3 rounded">
          <div className="text-ha-text text-sm mb-1">📍 Locație curentă</div>
          <div className="text-ha-text/70 text-xs">{item.location}</div>
        </div>

        {/* Buton mutare */}
        {!showMove && (
          <button
            onClick={handleStartMove}
            className="w-full py-2 bg-ha-card border border-ha-primary text-ha-primary rounded hover:bg-ha-secondary-bg transition"
          >
            🚚 Mută obiectul
          </button>
        )}

        {/* Sistem de mutare */}
        {showMove && (
          <div className="border border-ha-primary rounded-lg p-4 space-y-3 bg-ha-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ha-text font-semibold text-sm">
                🚚 Mută în:
              </span>
              <button
                onClick={handleCancelMove}
                className="text-ha-error text-xs hover:underline"
              >
                Anulează mutarea
              </button>
            </div>

            {/* Cameră */}
            <div>
              <label className="text-ha-text text-xs block mb-1">
                Cameră *
              </label>
              <select
                value={moveRoom}
                onChange={(e) => {
                  setMoveRoom(e.target.value);
                  setMoveCupboard('');
                  setMoveShelf('');
                  setMoveOrganizer('');
                }}
                className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
              >
                <option value="">Selectează camera</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dulap */}
            {moveRoom && (
              <div>
                <label className="text-ha-text text-xs block mb-1">
                  Dulap *
                </label>
                <select
                  value={moveCupboard}
                  onChange={(e) => {
                    setMoveCupboard(e.target.value);
                    setMoveShelf('');
                    setMoveOrganizer('');
                  }}
                  className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
                >
                  <option value="">Selectează dulapul</option>
                  {availableCupboards.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Raft */}
            {moveCupboard && (
              <div>
                <label className="text-ha-text text-xs block mb-1">
                  Raft *
                </label>
                <select
                  value={moveShelf}
                  onChange={(e) => {
                    setMoveShelf(e.target.value);
                    setMoveOrganizer('');
                  }}
                  className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
                >
                  <option value="">Selectează raftul</option>
                  {availableShelves.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Organizator (opțional) */}
            {moveShelf && (
              <div>
                <label className="text-ha-text text-xs block mb-1">
                  Organizator (opțional)
                </label>
                <select
                  value={moveOrganizer}
                  onChange={(e) => setMoveOrganizer(e.target.value)}
                  className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded text-sm"
                >
                  <option value="">Direct pe raft (fără organizator)</option>
                  {availableOrganizers.map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview locație nouă */}
            {moveRoom && moveCupboard && moveShelf && (
              <div className="bg-ha-secondary-bg p-2 rounded text-xs text-ha-text/70">
                📍 Locație nouă:{' '}
                <span className="font-semibold">
                  {moveRoom} › {moveCupboard} › {moveShelf}
                  {moveOrganizer && ` › ${moveOrganizer}`}
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
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Se salvează...' : '💾 Salvează'}
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-2 bg-ha-error text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? '...' : '🗑️ Șterge'}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          Anulează
        </button>
      </ModalFooter>
    </Modal>
  );
}
