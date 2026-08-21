import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import { useTranslation } from '../../i18n/I18nContext';

export function useRoomMutations(api: ApiService) {
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState('');
  const { t } = useTranslation();

  const addRoom = useMutation({
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
        imagePath = await api.uploadImage(imageFile, { room: name });
        setUploadStatus(t.common.imageUploaded);
      }
      await api.addRoom(name, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const updateRoom = useMutation({
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
        imagePath = await api.uploadImage(imageFile, { room: name || '' });
        setUploadStatus(t.common.imageUploaded);
      }

      const updateData: { name?: string; image?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (imagePath !== undefined) updateData.image = imagePath;

      await api.updateRoom(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => api.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  return {
    addRoom,
    updateRoom,
    deleteRoom,
    uploadStatus,
    setUploadStatus,
  };
}
