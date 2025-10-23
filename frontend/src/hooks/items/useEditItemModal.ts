import { useCallback, useState } from 'react';
import { useDeleteItemMutation, useUpdateItemMutation } from './useItems';
import { Item } from '../../types';
import { ApiService } from '../../services/api';
import { useMoveLocation } from '../global/useMoveLocation';

interface Props {
  item: Item;
  api: ApiService;
  organizer?: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export default function useEditItemModal({
  api,
  item,
  organizer,
  onSuccess,
  onClose,
}: Props) {
  const updateItem = useUpdateItemMutation(api);
  const deleteItem = useDeleteItemMutation(api);

  const [selectedRoom, selectedCupboard, selectedShelf] =
    item.location.split(' / ');

  const [name, setName] = useState(item.name);
  const [aliases, setAliases] = useState(item.aliases || '');
  const [preview, setPreview] = useState<string | null>(item.image || null);
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState(item.track_quantity);
  const [quantity, setQuantity] = useState<number | null>(
    item.quantity ?? null
  );
  const [minQuantity, setMinQuantity] = useState<number | null>(
    item.min_quantity ?? null
  );
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
      organizer,
    },
  });

  const handleFileChange = useCallback(
    (f: File | null) => {
      setFile(f);
      if (f) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else setPreview(item.image || null);
    },
    [item.image]
  );

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (showMove && isSameLocation(moveState)) {
      alert('Obiectul este deja în această locație!');
      return;
    }

    let qty: number | null;

    if (track) {
      if (quantity === null || quantity < 0) {
        qty = 0;
      } else {
        qty = quantity;
      }
    } else {
      qty = null;
    }

    setLoading(true);
    try {
      const data: any = {
        name: name.trim(),
        aliases: aliases.trim() || undefined,
        track_quantity: track,
        quantity: qty,
        min_quantity: track ? minQuantity : null,
      };

      if (showMove) Object.assign(data, moveState);

      if (file) {
        const imagePath = await api.uploadImage(file, {
          ...moveState,
          item: name,
          old_image: item.image?.split('/').pop()?.split('?')[0],
        });
        data.image = `/api/home_inventory/images/${imagePath}`;
      }

      await updateItem.mutateAsync({ id: item.id, data });
      await new Promise((r) => setTimeout(r, 100));
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  }, [name, aliases, track, quantity, minQuantity, showMove, moveState, file]);

  const handleDelete = async () => {
    if (!confirm(`Ștergi "${item.name}"?`)) return;
    setLoading(true);
    try {
      await deleteItem.mutateAsync(item.id);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
