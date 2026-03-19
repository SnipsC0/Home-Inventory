import { useCallback, useState } from 'react';
import { Item } from '../../types';
import { ApiService } from '../../services/api';

interface Props {
  item: Item;
  api: ApiService;
  onSuccess: () => void;
  onClose: () => void;
}

export const useEditItemMasterModal = ({
  item,
  api,
  onSuccess,
  onClose,
}: Props) => {
  const [name, setName] = useState(item.name);
  const [aliases, setAliases] = useState(item.aliases || '');
  const [barcode, setBarcode] = useState(item.barcode);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    item.default_image || null
  );
  const [minQuantity, setMinQuantity] = useState<number | null>(
    item.min_quantity
  );

  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLocations, setDeleteLocations] = useState<string[]>([]);

  const handleBarcodeScanned = async (code: string) => {
    setShowScanner(false);
    setBarcode(code);
  };

  const handleFileChange = useCallback(
    (f: File | null) => {
      setFile(f);
      if (f) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(item.default_image || null);
      }
    },
    [item.default_image]
  );

  const handleDeleteRequest = useCallback(async () => {
    setLoading(true);
    try {
      const locations = await api.getItemLocations(item.id);
      const locationStrings = locations.map((loc: any) => loc.location);
      setDeleteLocations(locationStrings);
      setShowDeleteConfirm(true);
    } catch (err) {
      console.error('[EditItemMasterModal] Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  }, [item.id, api]);

  const handleDeleteConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await api.deleteItemMaster(item.id);
      await new Promise((r) => setTimeout(r, 100));

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditItemMasterModal] Delete error:', err);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [item.id, api, onSuccess, onClose]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        aliases: aliases.trim() || null,
        barcode: barcode || null,
        min_quantity: minQuantity,
      };

      if (file) {
        // Get hierarchy from first location for proper image naming
        const firstLocation = item.locations?.[0];

        const imagePath = await api.uploadImage(file, {
          room: firstLocation?.room,
          cupboard: firstLocation?.cupboard,
          shelf: firstLocation?.shelf,
          organizer: firstLocation?.organizer,
          item: name,
          is_default: true,
          old_image:
            item.default_image?.split('/').pop()?.split('?')[0] || undefined,
        });
        data.default_image = `/api/home_inventory/images/${imagePath}`;
      }

      await api.updateItemMaster(item.id, data);
      await new Promise((r) => setTimeout(r, 100));

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditItemMasterModal] Update error:', err);
    } finally {
      setLoading(false);
    }
  }, [name, aliases, barcode, minQuantity, file, item.id, item.default_image, api, onSuccess, onClose]);

  return {
    name,
    aliases,
    barcode,
    file,
    minQuantity,
    preview,
    showScanner,
    loading,
    showDeleteConfirm,
    deleteLocations,

    // setters
    setName,
    setAliases,
    setBarcode,
    setFile,
    setMinQuantity,
    setShowScanner,
    setShowDeleteConfirm,

    //handlers
    handleFileChange,
    handleBarcodeScanned,
    handleSave,
    handleDeleteRequest,
    handleDeleteConfirm,
  };
};
