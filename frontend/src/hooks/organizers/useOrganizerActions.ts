import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import type { ImagePickerValue } from '../../components/Modal/ImagePickerField';
import { resolveImageField } from '../../utils/imageUpload';

export function useOrganizerActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedShelf = useAppStore((state) => state.selectedShelf);
  const [uploadStatus, setUploadStatus] = useState('');

  const addOrganizer = useMutation({
    mutationFn: async ({
      name,
      image,
    }: {
      name: string;
      image?: ImagePickerValue;
    }) => {
      if (image?.file) setUploadStatus('Uploading image...');
      const imagePath = await resolveImageField(api, image, {
        room: selectedRoom!,
        cupboard: selectedCupboard!,
        shelf: selectedShelf!,
        organizer: name,
      });

      return api.addOrganizer(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        name,
        imagePath
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizers', selectedShelf],
      });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const updateOrganizer = useMutation({
    mutationFn: async ({
      id,
      name,
      image,
      moveData,
    }: {
      id: number;
      name?: string;
      image?: ImagePickerValue;
      moveData?: { room: string; cupboard: string; shelf: string };
    }) => {
      if (image?.file) setUploadStatus('Uploading image...');
      const imagePath = await resolveImageField(api, image, {
        room: moveData?.room || selectedRoom!,
        cupboard: moveData?.cupboard || selectedCupboard!,
        shelf: moveData?.shelf || selectedShelf!,
        organizer: name || '',
      });

      const updateData: {
        name?: string;
        image?: string;
        room?: string;
        cupboard?: string;
        shelf?: string;
      } = {};

      if (name !== undefined) updateData.name = name;
      if (imagePath !== undefined) updateData.image = imagePath;

      if (moveData) {
        updateData.room = moveData.room;
        updateData.cupboard = moveData.cupboard;
        updateData.shelf = moveData.shelf;
      }

      return api.updateOrganizer(id, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizers', selectedShelf],
      });

      if (variables.moveData) {
        queryClient.invalidateQueries({
          queryKey: ['organizers', variables.moveData.shelf],
        });
        queryClient.invalidateQueries({ queryKey: ['organizers'] });
        queryClient.invalidateQueries({ queryKey: ['shelves'] });
        queryClient.invalidateQueries({ queryKey: ['global-items'] });
      }

      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const deleteOrganizer = useMutation({
    mutationFn: (id: number) => api.deleteOrganizer(id),
    onSuccess: () => {
      // Cascade delete: refresh every dependent cache (items, totals, hierarchy)
      for (const key of ['rooms', 'cupboards', 'shelves', 'organizers', 'global-items']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  return {
    addOrganizer,
    updateOrganizer,
    deleteOrganizer,
    uploadStatus,
    setUploadStatus,
  };
}
