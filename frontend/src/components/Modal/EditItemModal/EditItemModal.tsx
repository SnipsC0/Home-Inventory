import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import MoveLocationSelector from './MoveLocationSelector';
import type { Item } from '../../../types';
import { ApiService } from '../../../services/api';
import useEditItemModal from '../../../hooks/useEditItemModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  api: ApiService;
  organizer?: string | null;
  onSuccess: () => void;
}

export default function EditItemModal({
  isOpen,
  onClose,
  item,
  api,
  organizer,
  onSuccess,
}: Props) {
  const {
    name,
    aliases,
    track,
    quantity,
    minQuantity,
    showMove,
    moveState,
    setName,
    startMove,
    cancelMove,
    setMoveState,
    setAliases,
    preview,
    setTrack,
    setQuantity,
    setMinQuantity,
    loading,
    handleFileChange,
    handleSave,
    handleDelete,
  } = useEditItemModal({ api, item, organizer, onSuccess, onClose });

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>✏️ Editează Obiect</ModalHeader>

      <div className="space-y-4">
        <label className="block">
          <span className="text-ha-text text-sm">Nume *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
          />
        </label>

        <label className="block">
          <span className="text-ha-text text-sm">Aliasuri</span>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
          />
        </label>

        <ImageUploader preview={preview} onChange={handleFileChange} />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={track}
            onChange={(e) => setTrack(e.target.checked)}
            id="track-item"
          />
          <label htmlFor="track-item" className="text-ha-text text-sm">
            Urmărește cantitatea
          </label>
        </div>

        {track && (
          <div className="flex gap-3">
            <input
              type="number"
              value={quantity ?? ''}
              placeholder="Cantitate"
              onChange={(e) =>
                setQuantity(e.target.value ? +e.target.value : null)
              }
              className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
            <input
              type="number"
              value={minQuantity ?? ''}
              placeholder="Cantitate minimă"
              onChange={(e) =>
                setMinQuantity(e.target.value ? +e.target.value : null)
              }
              className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
          </div>
        )}

        <div className="bg-ha-secondary-bg p-3 rounded text-sm text-ha-text/80">
          📍 {item.location}
        </div>

        {!showMove ? (
          <button
            onClick={startMove}
            className="w-full py-2 border border-ha-primary text-ha-primary rounded hover:bg-ha-secondary-bg"
          >
            🚚 Mută obiectul
          </button>
        ) : (
          <MoveLocationSelector
            api={api}
            state={moveState}
            setState={setMoveState}
            onCancel={cancelMove}
          />
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-2 bg-ha-primary text-white rounded disabled:opacity-50"
        >
          {loading ? 'Se salvează...' : '💾 Salvează'}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-2 bg-ha-error text-white rounded disabled:opacity-50"
        >
          🗑️ Șterge
        </button>
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
        >
          Anulează
        </button>
      </ModalFooter>
    </Modal>
  );
}
