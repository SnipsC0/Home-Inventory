import { Modal, ModalHeader, ModalFooter } from '../Modal';
import ImageUploader from './ImageUploader';
import type { Item } from '../../../types';
import { ApiService } from '../../../services/api';
import { useEditItemMasterModal } from '../../../hooks/items/useEditItemMasterModal';
import { useTranslation } from '../../../i18n/I18nContext';
import { Camera } from 'lucide-react';
import { BarcodeScanner } from '../../BarcodeScanner';

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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
        <ModalHeader onClose={onClose}>
          ✏️ Editare Item Principal
        </ModalHeader>

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
                disabled
                value={barcode ?? ''}
                className="flex-1 px-3 py-2 border bg-ha-secondary-bg text-ha-text rounded opacity-60"
              />
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
                  text-white rounded-lg shadow-md transition duration-300 transform
                  hover:scale-101 active:scale-95"
              >
                <Camera size={20} />
                {t.items.scanButton}
              </button>
            </div>
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
            className="flex-1 py-2 bg-ha-primary text-white rounded disabled:opacity-50"
          >
            {loading ? t.common.saving : `💾 ${t.common.save}`}
          </button>
          <button
            onClick={handleDeleteRequest}
            disabled={loading}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
          >
            🗑️ {t.common.delete || 'Șterge'}
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

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
          autoStop={true}
        />
      )}

      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          maxWidth="600px"
        >
          <ModalHeader onClose={() => setShowDeleteConfirm(false)}>
            ⚠️ Confirmare Ștergere
          </ModalHeader>

          <div className="space-y-4">
            <p className="text-ha-text">
              Ești sigur că vrei să ștergi <strong>{item.name}</strong>?
            </p>

            <p className="text-ha-text">
              Această acțiune va șterge itemul principal și{' '}
              <strong className="text-red-500">
                toate {deleteLocations.length} locații asociate
              </strong>
              , precum și imaginile fizice.
            </p>

            {deleteLocations.length > 0 && (
              <div className="space-y-2">
                <p className="text-ha-text font-semibold">Locații care vor fi șterse:</p>
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
              {loading ? 'Se șterge...' : '✓ Confirmă Ștergerea'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              className="flex-1 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
            >
              {t.common.cancel}
            </button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
