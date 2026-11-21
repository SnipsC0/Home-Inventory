import { useMemo, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../Modal';
import { useTranslation } from '../../../i18n/I18nContext';
import { validateDate, formatDateInput } from '../../../utils/helpers';
import { AddItemData } from '../../../types';
import { Camera } from 'lucide-react';
import { BarcodeScanner } from '../../BarcodeScanner';
import { useApi } from '../../../contexts/ApiContext';
import { useGlobalItems } from '../../../hooks/items/useItems';
import { useAppStore } from '../../../store/useAppStore';
import SmartImage from '../../SmartImage';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: AddItemData) => Promise<void>;
  organizerName?: string | null;
}

export default function AddItemModal({
  isOpen,
  onClose,
  onSave,
  organizerName,
}: AddItemModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [expDate, setExpDate] = useState<string>('');
  const [trackQuantity, setTrackQuantity] = useState(false);
  const [barcode, setBarcode] = useState<string | ''>('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const api = useApi();
  const hasNativeScanner = !!api.externalBus?.config?.hasBarCodeScanner;
  const [variant, setVariant] = useState('');
  // 'new' = insert a new row, number = merge into that location row
  const [target, setTarget] = useState<'new' | number | null>(null);

  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const selectedShelf = useAppStore((s) => s.selectedShelf);
  const { data: allItems = [] } = useGlobalItems(api);

  // Existing rows of the same tracked item at the current place
  const existingRows = useMemo(() => {
    const norm = (v?: string | null) => (v ?? '').toLowerCase().trim();
    if (!trackQuantity || !name.trim()) return [];
    const match = allItems.find(
      (it) =>
        it.track_quantity &&
        norm(it.name) === norm(name) &&
        norm(it.aliases) === norm(aliases)
    );
    return (match?.locations ?? []).filter(
      (loc) =>
        norm(loc.room) === norm(selectedRoom) &&
        norm(loc.cupboard) === norm(selectedCupboard) &&
        norm(loc.shelf) === norm(selectedShelf) &&
        norm(loc.organizer) === norm(organizerName)
    );
  }, [
    allItems,
    trackQuantity,
    name,
    aliases,
    selectedRoom,
    selectedCupboard,
    selectedShelf,
    organizerName,
  ]);

  const variantRows = existingRows.filter(
    (r) => (r.variant ?? '') === variant.trim()
  );

  const effectiveTarget: 'new' | number =
    target !== null && (target === 'new' || existingRows.some((r) => r.location_id === target))
      ? target
      : variantRows.length === 1
      ? variantRows[0].location_id
      : existingRows.length === 1
      ? existingRows[0].location_id
      : 'new';

  // A scanned/typed barcode that belongs to a variant of an existing item
  // preselects that item, its variant and (via variantRows) the row to merge into.
  const applyBarcode = (code: string) => {
    setBarcode(code);
    if (!code) return;
    const found = allItems.find((it) =>
      it.variant_barcodes?.some((vb) => vb.barcode === code)
    );
    if (!found) return;
    const vb = found.variant_barcodes!.find((v) => v.barcode === code)!;
    setName(found.name);
    setAliases(found.aliases ?? '');
    setTrackQuantity(found.track_quantity);
    setVariant(vb.variant);
    setTarget(null);
  };

  // Masters are matched by exact (name, aliases), so complete the other field
  // from the single existing master that matches, using its canonical spelling.
  const normText = (s?: string | null) => (s ?? '').toLowerCase().trim();

  const completeFromName = () => {
    if (!name.trim() || aliases.trim()) return;
    const matches = allItems.filter((it) => normText(it.name) === normText(name));
    if (matches.length !== 1) return;
    setName(matches[0].name);
    if (matches[0].aliases) setAliases(matches[0].aliases);
  };

  const completeFromAliases = () => {
    const typed = normText(aliases);
    if (!typed || name.trim()) return;
    const matches = allItems.filter(
      (it) =>
        it.aliases &&
        (normText(it.aliases) === typed ||
          it.aliases.split(',').some((a) => normText(a) === typed))
    );
    if (matches.length !== 1) return;
    setName(matches[0].name);
    setAliases(matches[0].aliases ?? '');
  };

  // Unknown barcode + variant filled on an already existing item (by name):
  // the backend will link the code to that variant.
  const linkHintVariant = useMemo(() => {
    const v = variant.trim();
    if (!barcode || !v || !name.trim()) return null;
    const norm = (s?: string | null) => (s ?? '').toLowerCase().trim();
    const match = allItems.find((it) => norm(it.name) === norm(name));
    if (!match) return null;
    const known =
      match.barcode === barcode ||
      match.variant_barcodes?.some((vb) => vb.barcode === barcode || vb.variant === v);
    const elsewhere = allItems.some(
      (it) =>
        it.barcode === barcode ||
        it.variant_barcodes?.some((vb) => vb.barcode === barcode)
    );
    return known || elsewhere ? null : v;
  }, [allItems, barcode, variant, name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);

    try {
      console.log(trackQuantity, quantity, expDate);
      const expirationDate = trackQuantity
        ? JSON.stringify({ quantity, date: expDate ? expDate : null })
        : null;

      const itemData: AddItemData = {
        name: name.trim(),
        aliases: aliases.trim() || undefined,
        imageFile: imageFile,
        min_quantity: null,
        track_quantity: trackQuantity,
        quantity: trackQuantity ? quantity : null,
        barcode,
        expiration_date: expirationDate,
      };

      if (trackQuantity && existingRows.length > 0) {
        if (effectiveTarget === 'new') {
          itemData.new_row = true;
          if (variant.trim()) itemData.variant = variant.trim();
        } else {
          itemData.merge_location_id = effectiveTarget;
        }
      } else if (variant.trim()) {
        itemData.variant = variant.trim();
      }

      await onSave(itemData);

      onClose();
    } catch (err) {
      // Error already shown to the user; keep the modal open with its input.
      console.error('[AddItemModal] Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader onClose={onClose}>
        {organizerName
          ? t.items.addIn.replace('{organizer}', organizerName)
          : `${t.common.add} ${t.items.addItemWithoutOrganizer}`}
      </ModalHeader>

      <div className="space-y-4">
        {/* Nume */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            {t.items.itemName} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={completeFromName}
            className="field"
            placeholder={`${t.common.name}`}
          />
        </div>

        {/* Aliasuri */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            {t.items.aliases} ({t.common.optional})
          </label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            onBlur={completeFromAliases}
            className="field"
            placeholder={t.items.aliasesPlaceholder}
          />
        </div>

        {/* Variant */}
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

        {/* Preview imagine */}
        {preview && (
          <img
            src={preview}
            alt={t.common.preview}
            className="w-full h-[150px] object-cover rounded border border-ha-divider"
          />
        )}

        {/* Upload imagine */}
        <div>
          <label className="text-ha-text text-sm block mb-1">
            {t.items.image} ({t.common.optional})
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-ha-text text-sm"
          />
        </div>

        <div className="block">
          <span className="text-ha-text text-sm">{t.items.barcode}: </span>
          <div className="flex gap-2 items-center mt-1">
            <input
              value={barcode}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => applyBarcode(e.target.value.replace(/\D/g, ''))}
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
          {linkHintVariant && (
            <p className="text-xs text-ha-primary mt-1">
              {t.items.variantBarcodeLinks.replace('{variant}', linkHintVariant)}
            </p>
          )}
          {!hasNativeScanner && (
            <p className="text-xs text-ha-text/60 mt-1">
              {t.items.scanAppOnly}
            </p>
          )}
        </div>

        {/* Track Quantity */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="track-quantity-add"
            checked={trackQuantity}
            onChange={(e) => setTrackQuantity(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="track-quantity-add" className="text-ha-text text-sm">
            {t.items.trackQuantity}
          </label>
        </div>

        {/* Existing rows at this place: merge into one or start a new row */}
        {trackQuantity && existingRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-ha-text text-sm">{t.items.existingRowsHint}</p>
            {existingRows.map((row) => (
              <label
                key={row.location_id}
                className="surface p-2 flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="add-target"
                  checked={effectiveTarget === row.location_id}
                  onChange={() => setTarget(row.location_id)}
                />
                {row.image && (
                  <SmartImage
                    src={row.image}
                    alt={name}
                    wrapperClassName="w-10 h-10 rounded-md flex-shrink-0"
                    width={480}
                  />
                )}
                <span className="flex-1 text-ha-text text-sm">
                  {row.variant || '—'}
                </span>
                <span className="count-badge">{row.quantity ?? 0}</span>
                <span className="text-xs text-ha-text/60">
                  {t.items.addToExisting}
                </span>
              </label>
            ))}
            <label className="surface p-2 flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="add-target"
                checked={effectiveTarget === 'new'}
                onChange={() => setTarget('new')}
              />
              <span className="text-ha-text text-sm">{t.items.newRow}</span>
            </label>
          </div>
        )}

        {/* Quantity fields */}
        {trackQuantity && (
          <div className="space-y-3">
            <div>
              <label className="text-ha-text text-sm block mb-1">
                {t.items.quantity} *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="field"
              />
            </div>
            <div>
              <label className="text-ha-text text-sm block mb-1">
                {t.items.expDate} ({t.items.expDateHint})
              </label>
              <input
                type="text"
                value={expDate}
                onChange={(e) => setExpDate(formatDateInput(e.target.value, expDate))}
                inputMode="numeric"
                maxLength={10}
                placeholder={t.items.datePlaceholder}
                className={`field ${
                  validateDate(expDate || '')
                    ? 'bg-ha-secondary-bg'
                    : 'bg-red-100 text-black!'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim() || !validateDate(expDate)}
          className={`btn btn-primary flex-1 `}
        >
          {loading ? t.common.saving : `${t.common.add}`}
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
        onScan={(code) => {
          setShowScanner(false);
          applyBarcode(code);
        }}
        onClose={() => setShowScanner(false)}
      />
    )}
    </>
  );
}
