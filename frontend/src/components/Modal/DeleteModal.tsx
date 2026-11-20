import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { useTranslation } from '../../i18n/I18nContext';
import { useApi } from '../../contexts/ApiContext';
import type { DeletePreview } from '../../services/api';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType: string;
  itemCount?: number;
  /** Romanian grammatical gender hint for the confirm sentence. */
  feminine?: boolean;
  /** When set, the modal loads and lists what the cascade delete will remove. */
  cascade?: { type: 'room' | 'cupboard' | 'shelf' | 'organizer' | 'item_location'; id: number };
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  itemCount = 0,
  feminine = false,
  cascade,
}: DeleteModalProps) {
  const api = useApi();
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, language } = useTranslation();

  const cascadeType = cascade?.type;
  const cascadeId = cascade?.id;
  useEffect(() => {
    if (!cascadeType || cascadeId == null) return;
    let cancelled = false;
    api.getDeletePreview(cascadeType, cascadeId).then((p) => {
      if (!cancelled && p) setPreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [api, cascadeType, cascadeId]);

  const cascadeRows: [number, string][] = preview
    ? [
        [preview.cupboards, t.common.cascadeCupboards],
        [preview.shelves, t.common.cascadeShelves],
        [preview.organizers, t.common.cascadeOrganizers],
        [preview.locations, t.common.cascadeLocations],
        [preview.items, t.common.cascadeItems],
        [preview.images, t.common.cascadeImages],
      ]
    : [];
  const visibleRows = cascadeRows.filter(([n]) => n > 0);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  // German capitalizes nouns, so keep the type label capitalized there.
  const typeLabel =
    language === 'de'
      ? itemType.charAt(0).toUpperCase() + itemType.slice(1)
      : itemType.toLowerCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>
        {t.common.deleteTitle
          ? t.common.deleteTitle.replace('{type}', itemType)
          : `${t.common.delete} ${itemType}`}
      </ModalHeader>

      <div className="text-ha-text leading-relaxed mb-4">
        {language !== 'ro'
          ? t.common.deleteConfirm
          : feminine || itemType === 'camera'
          ? t.common.deleteConfirm
          : t.common.deleteConfirm2}{' '}
        {typeLabel},<strong> {itemName}</strong>?
        {cascade && preview ? (
          visibleRows.length > 0 && (
            <div className="mt-3 p-3 rounded border border-ha-divider bg-ha-secondary-bg text-sm">
              <div className="font-semibold text-ha-error mb-1">
                {t.common.cascadeTitle}
              </div>
              <ul className="list-disc list-inside">
                {visibleRows.map(([n, label]) => (
                  <li key={label}>
                    <strong>{n}</strong> {label}
                  </li>
                ))}
              </ul>
              {preview.locations > 0 && (
                <div className="mt-2 text-ha-secondary-text">
                  {t.common.cascadeNote}
                </div>
              )}
            </div>
          )
        ) : (
          itemCount > 0 && (
          <span className="block mt-2 text-ha-error">
            {t.rooms.containWarning
              .replace('{type}', typeLabel)
              .replace('{n}', String(itemCount))}
          </span>
          )
        )}
      </div>

      <ModalFooter>
        <button
          className="btn btn-danger flex-1"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? t.common.deleting : `${t.common.delete}`}
        </button>
        <button
          className="btn btn-secondary flex-1"
          onClick={onClose}
        >
          {t.common.cancel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
