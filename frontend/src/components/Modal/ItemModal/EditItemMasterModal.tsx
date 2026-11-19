import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import type { Item } from '../../../types';
import { ApiService } from '../../../services/api';
import { useEditItemMasterModal } from '../../../hooks/items/useEditItemMasterModal';
import { useTranslation } from '../../../i18n/I18nContext';
import { Camera } from 'lucide-react';
import { BarcodeScanner } from '../../BarcodeScanner';
import { useApi } from '../../../contexts/ApiContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  api: ApiService;
  onSuccess: () => void;
}

export default function EditItemMasterModal({
  isOpen,
  onClose,
  item,
  api,
  onSuccess,
}: Props) {
  const {
    name,
    aliases,
    barcode,
    minQuantity,
    preview,
    showScanner,
    loading,
    showDeleteConfirm,
    deleteLocations,

    setName,
    setBarcode,
    setAliases,
    setMinQuantity,
    setShowScanner,
    setShowDeleteConfirm,

    handleFileChange,
    handleBarcodeScanned,
    handleSave,
    handleDeleteRequest,
    handleDeleteConfirm,
  } = useEditItemMasterModal({ api, item, onSuccess, onClose });

  const { t } = useTranslation();
  const hasNativeScanner =
    !!useApi().externalBus?.config?.hasBarCodeScanner;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
        <ModalHeader onClose={onClose}>{t.items.editMainItem}</ModalHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="text-ha-text text-sm">*{t.common.name}:</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
          </label>

          <label className="block">
            <span className="text-ha-text text-sm">{t.items.aliases}:</span>
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
          </label>

          <div className="block">
            <span className="text-ha-text text-sm">{t.items.barcode}: </span>
            <div className="flex gap-2 items-center mt-1">
              <input
                value={barcode ?? ''}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
              />
              {hasNativeScanner && (
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
                  text-white rounded-lg shadow-md transition duration-300 transform
                  hover:scale-101 active:scale-95"
                >
                  <Camera size={20} />
                  {t.items.scanButton}
                </button>
              )}
            </div>
            {!hasNativeScanner && (
              <p className="text-xs text-ha-text/60 mt-1">
                {t.items.scanAppOnly}
              </p>
            )}
          </div>

          <ImageUploader preview={preview} onChange={handleFileChange} />

          <label className="block">
            <span className="text-ha-text text-sm">{t.items.minQuantity}:</span>
            <input
              type="number"
              value={minQuantity ?? ''}
              placeholder={t.items.minQuantity}
              onChange={(e) =>
                setMinQuantity(e.target.value ? +e.target.value : null)
              }
              className="w-full px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded"
            />
          </label>
        </div>

        <ModalFooter>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="btn btn-primary flex-1"
          >
            {loading ? t.common.saving : `${t.common.save}`}
          </button>
          <button
            onClick={handleDeleteRequest}
            disabled={loading}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
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

      {showScanner && (
        <BarcodeScanner
          autoStartNative
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          maxWidth="600px"
        >
          <ModalHeader onClose={() => setShowDeleteConfirm(false)}>
            {t.items.confirmDeletion}
          </ModalHeader>

          <div className="space-y-4">
            <p className="text-ha-text">
              {t.items.deleteMasterConfirm
                .split('{name}')
                .flatMap((part, i, arr) =>
                  i < arr.length - 1
                    ? [part, <strong key={i}>{item.name}</strong>]
                    : [part]
                )}
            </p>

            <p className="text-ha-text">
              {t.items.deleteMasterBefore}
              <strong className="text-red-500">
                {t.items.deleteMasterLocations.replace(
                  '{n}',
                  String(deleteLocations.length)
                )}
              </strong>
              {t.items.deleteMasterAfter}
            </p>

            {deleteLocations.length > 0 && (
              <div className="space-y-2">
                <p className="text-ha-text font-semibold">
                  {t.items.deleteMasterList}
                </p>
                <ul className="list-disc list-inside space-y-1 max-h-48 overflow-y-auto bg-ha-secondary-bg p-3 rounded border border-ha-divider">
                  {deleteLocations.map((location, idx) => (
                    <li key={idx} className="text-ha-text text-sm">
                      {location}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <ModalFooter>
            <button
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
            >
              {loading ? t.common.deleting : t.items.confirmDeletion}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              className="btn btn-secondary flex-1"
            >
              {t.common.cancel}
            </button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
