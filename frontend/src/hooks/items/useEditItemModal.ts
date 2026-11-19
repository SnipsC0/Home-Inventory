import { useCallback, useState } from 'react';
import { ExpirationBatch, Item, ItemLocation } from '../../types';
import { ApiService } from '../../services/api';
import { useMoveLocation } from '../global/useMoveLocation';
import { validateDate } from '../../utils/helpers';
import { sortBatchesByDate } from '../../utils/items/expiryUtils';
import { useItemActions } from './useItemActions';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  item: Item;
  api: ApiService;
  organizer?: string | null;
  location: ItemLocation;
  onSuccess: () => void;
  onClose: () => void;
}

export default function useEditItemModal({
  api,
  item,
  organizer,
  location,
  onSuccess,
  onClose,
}: Props) {
  const { deleteItem, updateItem } = useItemActions();
  const { t } = useTranslation();

  const loc: ItemLocation | undefined = location;

  const selectedRoom = loc?.room ?? '';
  const selectedCupboard = loc?.cupboard ?? '';
  const selectedShelf = loc?.shelf ?? '';
  const selectedOrganizer = loc?.organizer ?? organizer ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [variant, setVariant] = useState<string>(location?.variant ?? '');
  const initialVariantBarcode =
    item.variant_barcodes?.find((vb) => vb.variant === (location?.variant ?? null))
      ?.barcode ?? '';
  const [variantBarcode, setVariantBarcode] = useState<string>(initialVariantBarcode);
  // Without a variant the field edits the item's main barcode (items_master.barcode),
  // shared by all locations of the item.
  const initialMasterBarcode = item.barcode ?? '';
  const [masterBarcode, setMasterBarcode] = useState<string>(initialMasterBarcode);
  const hasVariant = variant.trim() !== '';
  const barcodeValue = hasVariant ? variantBarcode : masterBarcode;
  const setBarcodeValue = (v: string) =>
    hasVariant ? setVariantBarcode(v) : setMasterBarcode(v);
  const [track, setTrack] = useState(item.track_quantity);
  const [preview, setPreview] = useState<string | null>(
    loc?.image || item.default_image || null
  );
  const [expirationBatches, setExpirationBatches] = useState<ExpirationBatch[]>(
    () => {
      try {
        if (!loc?.expiration_dates) {
          return loc?.quantity ? [{ quantity: loc.quantity, date: '' }] : [];
        }
        if (typeof loc.expiration_dates === 'string') {
          return sortBatchesByDate(JSON.parse(loc.expiration_dates));
        }
        return sortBatchesByDate(loc.expiration_dates as ExpirationBatch[]);
      } catch {
        return loc?.quantity ? [{ quantity: loc.quantity, date: '' }] : [];
      }
    }
  );

  const addBatch = () => {
    setExpirationBatches([...expirationBatches, { quantity: 1, date: '' }]);
  };

  const removeBatch = (index: number) => {
    setExpirationBatches(expirationBatches.filter((_, i) => i !== index));
  };

  const updateBatch = (
    index: number,
    field: 'quantity' | 'date',
    value: string | number
  ) => {
    const updated = [...expirationBatches];
    if (field === 'quantity') {
      updated[index].quantity = value as number;
    } else {
      updated[index].date = value as string;
    }
    setExpirationBatches(updated);
  };

  const [loading, setLoading] = useState(false);

  const {
    showMove,
    startMove,
    cancelMove,
    moveState,
    setMoveState,
    isSameLocation,
  } = useMoveLocation(api, {
    current: {
      room: selectedRoom,
      cupboard: selectedCupboard,
      shelf: selectedShelf,
      organizer: selectedOrganizer,
    },
  });

  const handleFileChange = useCallback(
    (f: File | null) => {
      setFile(f);
      if (f) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(loc?.image || item.default_image || null);
      }
    },
    [loc?.image, item.default_image]
  );

  const handleSave = useCallback(async () => {
    if (
      track &&
      expirationBatches.some((batch) => !validateDate(batch.date || ''))
    ) {
      alert(t.errors.invalidDates);
      return;
    }

    if (showMove && isSameLocation(moveState)) {
      alert(t.errors.alreadyInLocation);
      return;
    }

    const qty =
      track && expirationBatches.length > 0
        ? expirationBatches.reduce(
            (sum, batch) => sum + (batch.quantity || 0),
            0
          )
        : null;

    setLoading(true);
    try {
      const data: Record<string, any> = {
        track_quantity: track,
        quantity: qty,
      };

      if (track && expirationBatches.length > 0) {
        data.expiration_dates = JSON.stringify(expirationBatches);
      }

      if ((variant.trim() || null) !== (loc?.variant ?? null)) {
        data.variant = variant.trim();
      }

      if (hasVariant) {
        if (variantBarcode.trim() !== initialVariantBarcode) {
          data.variant_barcode = variantBarcode.trim();
        }
      } else if (
        masterBarcode.trim() &&
        masterBarcode.trim() !== initialMasterBarcode
      ) {
        data.barcode = masterBarcode.trim();
      }

      if (showMove) Object.assign(data, moveState);

      if (file) {
        const imagePath = await api.uploadImage(file, {
          ...(showMove
            ? moveState
            : {
                room: selectedRoom,
                cupboard: selectedCupboard,
                shelf: selectedShelf,
                organizer: selectedOrganizer,
              }),
          item: item.name,
          old_image: loc?.image?.split('/').pop()?.split('?')[0] || undefined,
        });
        data.image = `/api/home_inventory/images/${imagePath}`;
      }

      await updateItem.mutateAsync({
        id: item.id,
        data,
        location_id: loc?.location_id,
      });
      await new Promise((r) => setTimeout(r, 100));

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditItemModal] Update error:', err);
    } finally {
      setLoading(false);
    }
  }, [
    track,
    file,
    showMove,
    moveState,
    isSameLocation,
    loc,
    item.id,
    item.name,
    api,
    onSuccess,
    onClose,
    expirationBatches,
    variant,
    hasVariant,
    variantBarcode,
    initialVariantBarcode,
    masterBarcode,
    initialMasterBarcode,
    updateItem,
    selectedRoom,
    selectedCupboard,
    selectedShelf,
    selectedOrganizer,
    t,
  ]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      await deleteItem.mutateAsync({ itemId: item.id, locationId: loc.location_id });
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }, [item.id, item.name, loc.location_id, deleteItem, onSuccess, onClose]);

  const locationLabel = loc
    ? [loc.room, loc.cupboard, loc.shelf, loc.organizer]
        .filter(Boolean)
        .join(' / ')
    : '';

  return {
    // variables
    track,
    preview,
    expirationBatches,

    // setters
    setTrack,
    variant,
    setVariant,
    hasVariant,
    barcodeValue,
    setBarcodeValue,

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
  };
}
