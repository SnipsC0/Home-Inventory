import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/I18nContext';

export function useShelfActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const [uploadStatus, setUploadStatus] = useState('');
  const { t } = useTranslation();

  const addShelf = useMutation({
    mutationFn: async ({
      name,
      imageFile,
    }: {
      name: string;
      imageFile?: File | null;
    }) => {
      let imagePath = '';
      if (imageFile) {
        setUploadStatus(t.common.uploadingImage);
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: name,
        });
        setUploadStatus(t.common.imageUploaded);
      }
      await api.addShelf(selectedRoom!, selectedCupboard!, name, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const updateShelf = useMutation({
    mutationFn: async ({
      id,
      name,
      imageFile,
    }: {
      id: number;
      name?: string;
      imageFile?: File | null;
    }) => {
      let imagePath: string | undefined = undefined;

      if (imageFile) {
        setUploadStatus(t.common.uploadingImage);
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: name || '',
        });
        setUploadStatus(t.common.imageUploaded);
      }

      const updateData: { name?: string; image?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (imagePath !== undefined) updateData.image = imagePath;

      await api.updateShelf(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const deleteShelf = useMutation({
    mutationFn: (id: number) => api.deleteShelf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedCupboard],
      });
    },
  });

  return {
    addShelf,
    updateShelf,
    deleteShelf,
    uploadStatus,
    setUploadStatus,
  };
}
