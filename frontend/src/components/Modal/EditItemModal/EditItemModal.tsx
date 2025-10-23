import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import MoveLocationSelector from './MoveLocationSelector';
import type { Item } from '../../../types';
import { ApiService } from '../../../services/api';
import useEditItemModal from '../../../hooks/items/useEditItemModal';
import { useTranslation } from '../../../i18n/I18nContext';

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

  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>
        ✏️ {t.common.edit} {t.items.title.toLowerCase().slice(0, -1)}
      </ModalHeader>

      <div className="space-y-4">
        <label className="block">
          <span className="text-ha-text text-sm">{t.common.name} *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
          />
        </label>

        <label className="block">
          <span className="text-ha-text text-sm">{t.items.aliases}</span>
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
            {t.items.trackQuantity}
          </label>
        </div>

        {track && (
          <div className="flex gap-3">
            <input
              type="number"
              value={quantity ?? ''}
              placeholder={t.items.quantity}
              onChange={(e) =>
                setQuantity(e.target.value ? +e.target.value : null)
              }
              className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
            <input
              type="number"
              value={minQuantity ?? ''}
              placeholder={t.items.minQuantity}
              onChange={(e) =>
                setMinQuantity(e.target.value ? +e.target.value : null)
              }
              className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
          </div>
        )}

        <div className="bg-ha-secondary-bg p-3 rounded text-sm text-ha-text/80">
          📍 {t.items.location}: {item.location}
        </div>

        {!showMove ? (
          <button
            onClick={startMove}
            className="w-full py-2 border border-ha-primary text-ha-primary rounded hover:bg-ha-secondary-bg"
          >
            🚚 {t.items.moveItem}
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
          {loading ? t.common.saving : `💾 ${t.common.save}`}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-2 bg-ha-error text-white rounded disabled:opacity-50"
        >
          🗑️ {t.common.delete}
        </button>
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
        >
          {t.common.cancel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
