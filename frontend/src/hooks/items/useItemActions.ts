import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import type { Item, ItemLocation, UpdateItemData } from '../../types';
import { useApi } from '../../contexts/ApiContext';

export function useItemActions(organizerName?: string | null) {
  const api = useApi();

  const queryClient = useQueryClient();

  // Context din store
  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const selectedShelf = useAppStore((s) => s.selectedShelf);
  const selectedOrganizer = useAppStore((s) => s.selectedOrganizer);

  const effectiveOrganizer =
    organizerName !== undefined
      ? organizerName
      : typeof selectedOrganizer === 'string'
      ? selectedOrganizer
      : null;

  /** 🔁 Invalidate toate cache-urile relevante */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['global-items'] });
    queryClient.invalidateQueries({ queryKey: ['organizers'] });
    queryClient.invalidateQueries({ queryKey: ['expiring-batches'] });
  };

  const addItem = useMutation({
    mutationFn: async (itemData: {
      name: string;
      barcode: string;
      aliases?: string;
      imageFile: File | null;
      quantity: number | null;
      min_quantity: number | null;
      track_quantity: boolean;
      expiration_date: string | null;
      variant?: string;
      merge_location_id?: number;
      new_row?: boolean;
    }) => {
      // 1. Upload the image (if any)
      let imageData: any = '';
      if (itemData.imageFile) {
        const uploadResult = await api.uploadImage(itemData.imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: selectedShelf!,
          organizer: effectiveOrganizer || undefined,
          item: itemData.name,
          create_default_copy: true,
        });

        if (uploadResult && typeof uploadResult === 'object') {
          if ('path' in uploadResult && 'default_path' in uploadResult) {
            imageData = {
              path: uploadResult.path,
              default_path: uploadResult.default_path,
            };
          } else if ('path' in uploadResult) {
            imageData = uploadResult.path;
          }
        }
      }

      // 3. Create the item
      const result = await api.addItem(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        effectiveOrganizer,
        {
          name: itemData.name,
          aliases: itemData.aliases,
          barcode: itemData.barcode,
          imageFile: imageData,
          quantity: itemData.quantity,
          track_quantity: itemData.track_quantity,
          expiration_date: itemData.expiration_date,
          variant: itemData.variant,
          merge_location_id: itemData.merge_location_id,
          new_row: itemData.new_row,
        }
      );
      // api.safeCall already alerted the error and returned undefined:
      // reject so callers keep their modal open.
      if (!result) throw new Error('Add item failed');
      return result;
    },
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      location_id,
      data,
    }: {
      id: number;
      location_id?: number | null;
      data: UpdateItemData;
    }) => {
      return api.updateItem(id, { ...data, location_id });
    },

    onMutate: async ({ id, data, location_id }) => {
      await queryClient.cancelQueries({ queryKey: ['global-items'] });

      const previousItems = queryClient.getQueryData<Item[]>(['global-items']);

      if (!data.image) {
        queryClient.setQueryData<Item[]>(['global-items'], (old = []) =>
          old.map((item) => {
            if (item.id !== id) return item;

            const updatedLocations: ItemLocation[] =
              item.locations?.map((loc) => {
                if (location_id && loc.location_id === location_id) {
                  return {
                    ...loc,
                    quantity:
                      'quantity' in data
                        ? data.quantity ?? loc.quantity
                        : loc.quantity,
                    expiration_dates:
                      'expiration_dates' in data
                        ? data.expiration_dates ?? loc.expiration_dates
                        : loc.expiration_dates,
                    image:
                      'image' in data ? data.image ?? loc.image : loc.image,
                  } as ItemLocation;
                }
                return loc;
              }) ?? item.locations;

            return { ...item, locations: updatedLocations };
          })
        );
      }

      return { previousItems };
    },

    onError: (_, __, ctx) => {
      if (ctx?.previousItems) {
        queryClient.setQueryData(['global-items'], ctx.previousItems);
      }
    },

    onSuccess: (_, { data }) => {
      if (data.image) {
        queryClient.refetchQueries({ queryKey: ['global-items'] });
      } else {
        invalidate();
      }
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (params: { itemId: number; locationId: number }) =>
      api.deleteItem(params.locationId),

    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['global-items'] });
      const previousItems = queryClient.getQueryData<Item[]>(['global-items']);

      // Optimistic update: filter out the location, not the entire item
      queryClient.setQueryData<Item[]>(
        ['global-items'],
        (old = []) =>
          old
            .map((item) => {
              if (item.id !== params.itemId) return item;
              const updatedLocations = item.locations?.filter(
                (loc) => loc.location_id !== params.locationId
              );
              // If no locations left, remove the item entirely
              return updatedLocations?.length
                ? { ...item, locations: updatedLocations }
                : null;
            })
            .filter(Boolean) as Item[]
      );

      return { previousItems };
    },

    onError: (_, __, ctx) => {
      if (ctx?.previousItems) {
        queryClient.setQueryData(['global-items'], ctx.previousItems);
      }
    },

    onSuccess: invalidate,
  });

  return { addItem, updateItem, deleteItem };
}
