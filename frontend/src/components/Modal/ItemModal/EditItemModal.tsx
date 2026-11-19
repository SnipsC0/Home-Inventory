import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import MoveLocationSelector from './MoveLocationSelector';
import LocationPhotos from '../../LocationPhotos';
import DeleteModal from '../DeleteModal';
import EditItemMasterModal from './EditItemMasterModal';
import type { Item, ItemLocation } from '../../../types';
import { ApiService } from '../../../services/api';
import useEditItemModal from '../../../hooks/items/useEditItemModal';
import { useTranslation } from '../../../i18n/I18nContext';
import {
  Pencil,
  ChevronRight,
  Layers,
  Trash2,
  Plus,
  Truck,
  MapPin,
} from 'lucide-react';
import { formatDateInput } from '../../../utils/helpers';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    track,
    preview,
    expirationBatches,

    // setters
    setTrack,
    variant,
    hasVariant,
    barcodeValue,
    setBarcodeValue,
    setVariant,

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
          {t.items.editItem}
        </ModalHeader>

        <div className="space-y-4">
          <button
            onClick={() => setShowMasterModal(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-ha-secondary-bg/60
              border border-ha-divider/60 rounded-2xl text-ha-text hover:border-ha-primary
              transition active:scale-[0.98]"
          >
            <span className="flex items-center gap-3 font-medium">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-ha-primary/15 text-ha-primary">
                <Pencil size={18} />
              </span>
              {t.items.editMainItem}
            </span>
            <ChevronRight size={18} className="text-ha-text/50" />
          </button>

          <ImageUploader preview={preview} onChange={handleFileChange} />

          <div>
            <label className="text-ha-text text-sm block mb-1">
              {t.items.variant} ({t.common.optional})
            </label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="field"
              placeholder={t.items.variantPlaceholder}
            />
          </div>

          <div>
            <label className="text-ha-text text-sm block mb-1">
              {hasVariant ? t.items.variantBarcode : t.items.barcode} ({t.common.optional})
            </label>
            <input
              type="text"
              value={barcodeValue}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setBarcodeValue(e.target.value.replace(/\D/g, ''))}
              className="field"
            />
            {!hasVariant && (
              <p className="text-xs text-ha-text/60 mt-1">
                {t.items.barcodeAppliesToItem}
              </p>
            )}
          </div>

        {track && (
          <>

            {expirationBatches.length > 0 && (
              <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold">
                  <Layers size={14} />
                  {t.items.existingBatches.replace(/:\s*$/, '')}
                </div>
                {expirationBatches.map((batch, index) => {
                  const count = expirationBatches.length;

                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={batch.quantity ?? 0}
                        onChange={(e) =>
                          updateBatch(index, 'quantity', +e.target.value)
                        }
                        placeholder={t.items.quantity}
                        className="w-24 px-2 py-1 border bg-ha-secondary-bg text-ha-text rounded"
                      />
                      <input
                        type="text"
                        value={batch.date ?? ''}
                        onChange={(e) =>
                          updateBatch(
                            index,
                            'date',
                            formatDateInput(e.target.value, batch.date ?? '')
                          )
                        }
                        inputMode="numeric"
                        maxLength={10}
                        placeholder={t.items.batchDatePlaceholder}
                        className={`flex-1 px-2 py-1 border text-ha-text ${
                          validateDate(batch.date || '')
                            ? 'bg-ha-secondary-bg'
                            : 'bg-red-100 text-black!'
                        } rounded`}
                      />
                      <button
                        onClick={() => removeBatch(index)}
                        disabled={count === 1}
                        title={t.common.delete}
                        aria-label={t.common.delete}
                        className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full text-ha-error
                          hover:bg-ha-error/10 transition disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={addBatch}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed
                border-ha-primary text-ha-primary rounded-2xl hover:bg-ha-primary/10 transition"
            >
              <Plus size={18} />
              {t.items.addBatch.replace(/^\+\s*/, '')}
            </button>
          </>
        )}

        <div className="bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl text-sm text-ha-text/80">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-1">
            <MapPin size={14} /> {t.items.location}
          </div>
          <div className="font-semibold text-ha-text">{locationLabel}</div>
          {(location.room_image ||
            location.cupboard_image ||
            location.shelf_image ||
            location.organizer_image) && (
          <LocationPhotos
            className="mt-2"
            room={{ name: location.room, image: location.room_image }}
            cupboard={{ name: location.cupboard, image: location.cupboard_image }}
            shelf={{ name: location.shelf, image: location.shelf_image }}
            organizer={{
              name: location.organizer,
              image: location.organizer_image,
            }}
          />
          )}
        </div>

        {!showMove ? (
          <button
            onClick={startMove}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-ha-primary
              text-ha-primary rounded-2xl hover:bg-ha-primary/10 transition"
          >
            <Truck size={18} />
            {t.items.moveItem}
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
          className="btn btn-primary flex-1"
        >
          {loading ? t.common.saving : `${t.common.save}`}
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={loading}
          className="btn btn-danger flex-1"
        >
          {t.common.delete}
        </button>
        <button
          onClick={onClose}
          disabled={loading}
          className="btn btn-secondary flex-1"
        >
          {t.common.cancel}
        </button>
      </ModalFooter>
    </Modal>

    {showDeleteModal && location?.location_id != null && (
      <DeleteModal
        isOpen
        itemName={item.name}
        itemType={t.items.location}
        feminine
        cascade={{ type: 'item_location', id: location.location_id }}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await handleDelete();
          setShowDeleteModal(false);
        }}
      />
    )}

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
