import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import MoveLocationSelector from './MoveLocationSelector';
import EditItemMasterModal from './EditItemMasterModal';
import type { Item, ItemLocation } from '../../../types';
import { ApiService } from '../../../services/api';
import useEditItemModal from '../../../hooks/items/useEditItemModal';
import { useTranslation } from '../../../i18n/I18nContext';
import { Edit } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  api: ApiService;
  organizer?: string | null;
  onSuccess: () => void;
  location: ItemLocation;
}

export default function EditItemModal({
  isOpen,
  onClose,
  item,
  api,
  organizer,
  location,
  onSuccess,
}: Props) {
  const [showMasterModal, setShowMasterModal] = useState(false);

  const {
    track,
    preview,
    expirationBatches,

    // setters
    setTrack,

    // move
    showMove,
    startMove,
    cancelMove,
    moveState,
    setMoveState,

    // handlers
    handleFileChange,
    handleSave,
    handleDelete,
    addBatch,
    removeBatch,
    updateBatch,

    // others
    locationLabel,
    loading,
    validateDate,
  } = useEditItemModal({ api, item, organizer, onSuccess, onClose, location });

  const { t } = useTranslation();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
        <ModalHeader onClose={onClose}>
          ✏️ {t.common.edit} {t.items.title.toLowerCase().slice(0, -1)}
        </ModalHeader>

        <div className="space-y-4">
          <button
            onClick={() => setShowMasterModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600
              text-white rounded-lg shadow-md transition duration-300 transform
              hover:scale-101 active:scale-95"
          >
            <Edit size={20} />
            Editează obiectul principal
          </button>

          <ImageUploader preview={preview} onChange={handleFileChange} />

        {track && (
          <>

            {expirationBatches.length > 0 && (
              <div className="space-y-2">
                <span className="text-ha-text text-sm font-medium">
                  Loturi existente cu date expirare:
                </span>
                {expirationBatches.map((batch, index) => {
                  console.log(expirationBatches);
                  const count = expirationBatches.length;

                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={batch.quantity ?? 0}
                        onChange={(e) =>
                          updateBatch(index, 'quantity', +e.target.value)
                        }
                        placeholder="Cantitate"
                        className="w-24 px-2 py-1 border bg-ha-secondary-bg text-ha-text rounded"
                      />
                      <input
                        type="text"
                        value={batch.date ?? ''}
                        onChange={(e) =>
                          updateBatch(index, 'date', e.target.value)
                        }
                        placeholder="YYYY/MM/DD (gol pentru fără expirare)"
                        className={`flex-1 px-2 py-1 border text-ha-text ${
                          validateDate(batch.date || '')
                            ? 'bg-ha-secondary-bg'
                            : 'bg-red-100 text-black'
                        } rounded`}
                      />
                      <button
                        onClick={() => removeBatch(index)}
                        disabled={count === 1}
                        className={`px-2 py-1  text-white rounded ${
                          count !== 1
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-red-300'
                        } `}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={addBatch}
              className="w-full py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
            >
              + Adaugă lot (cu sau fara expirare)
            </button>
          </>
        )}

        <div className="bg-ha-secondary-bg p-3 rounded text-sm text-ha-text/80">
          📍 {t.items.location}: {locationLabel}
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
          disabled={
            loading ||
            (track &&
              expirationBatches.some(
                (batch) => !validateDate(batch.date || '')
              ))
          }
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

    {showMasterModal && (
      <EditItemMasterModal
        isOpen={showMasterModal}
        onClose={() => setShowMasterModal(false)}
        item={item}
        api={api}
        onSuccess={onSuccess}
      />
    )}
    </>
  );
}
