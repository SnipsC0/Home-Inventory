import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useRooms } from '../../hooks/useRooms';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Cupboard, Shelf } from '../../types';

interface EditOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    newName: string,
    imageFile: File | null,
    moveData?: { room: string; cupboard: string; shelf: string }
  ) => Promise<void>;
  currentName: string;
  currentImage?: string;
  api?: ApiService;
}

export default function EditOrganizerModal({
  isOpen,
  onClose,
  onSave,
  currentName,
  currentImage,
  api,
}: EditOrganizerModalProps) {
  const currentRoom = useAppStore((state) => state.selectedRoom);
  const currentCupboard = useAppStore((state) => state.selectedCupboard);
  const currentShelf = useAppStore((state) => state.selectedShelf);

  const [name, setName] = useState(currentName);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [loading, setLoading] = useState(false);

  // Sistem de mutare
  const [showMove, setShowMove] = useState(false);
  const [moveRoom, setMoveRoom] = useState<string>('');
  const [moveCupboard, setMoveCupboard] = useState<string>('');
  const [moveShelf, setMoveShelf] = useState<string>('');

  const { data: rooms = [] } =
    api && currentName ? useRooms(api) : { data: [] };

  const [availableCupboards, setAvailableCupboards] = useState<Cupboard[]>([]);
  const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
        alert('Organizatorul este deja în această locație!');
        return;
      }
    }

    setLoading(true);
    try {
      const moveData =
        showMove && moveRoom && moveCupboard && moveShelf
          ? { room: moveRoom, cupboard: moveCupboard, shelf: moveShelf }
          : undefined;

      await onSave(name.trim(), imageFile, moveData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isEditMode = !!currentName;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>
        {isEditMode ? '✏️ Editează Organizator' : '➕ Adaugă Organizator'}
      </ModalHeader>

      <div className="space-y-4">
        {/* Nume */}
        <div>
          <label className="text-ha-text text-sm block mb-1">Nume *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nume organizator"
          />
        </div>

        {/* Preview imagine */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-[20rem] object-cover rounded border border-ha-divider"
          />
        )}

        {/* Upload imagine */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            Imagine (opțional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-ha-text text-sm"
          />
        </div>

        {isEditMode && (
          <div className="bg-ha-secondary-bg p-3 rounded">
            <div className="text-ha-text text-sm mb-1">📍 Locație curentă</div>
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
            🚚 Mută organizatorul
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
                  onChange={(e) => setMoveShelf(e.target.value)}
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

            {/* Preview locație nouă */}
            {moveRoom && moveCupboard && moveShelf && (
              <div className="bg-ha-secondary-bg p-2 rounded text-xs text-ha-text/70">
                📍 Locație nouă:{' '}
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
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Se salvează...' : '💾 Salvează'}
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
