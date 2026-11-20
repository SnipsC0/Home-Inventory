import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import type { ImagePickerValue } from '../../components/Modal/ImagePickerField';
import { resolveImageField } from '../../utils/imageUpload';
import { useTranslation } from '../../i18n/I18nContext';

export function useCupboardActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const { t } = useTranslation();
  const [uploadStatus, setUploadStatus] = useState('');

  const addCupboard = useMutation({
    mutationFn: async ({
      name,
      image,
    }: {
      name: string;
      image?: ImagePickerValue;
    }) => {
      if (image?.file) setUploadStatus(t.common.uploadingImage);
      const imagePath = await resolveImageField(api, image, {
        room: selectedRoom!,
        cupboard: name,
      });
      await api.addCupboard(selectedRoom!, name, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupboards', selectedRoom] });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const updateCupboard = useMutation({
    mutationFn: async ({
      id,
      name,
      image,
    }: {
      id: number;
      name?: string;
      image?: ImagePickerValue;
    }) => {
      if (image?.file) setUploadStatus(t.common.uploadingImage);
      const imagePath = await resolveImageField(api, image, {
        room: selectedRoom!,
        cupboard: name || '',
      });

      const updateData: { name?: string; image?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (imagePath !== undefined) updateData.image = imagePath;

      await api.updateCupboard(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupboards', selectedRoom] });
      setUploadStatus('');
    },
    onError: () => {
      setUploadStatus('');
    },
  });

  const deleteCupboard = useMutation({
    mutationFn: (id: number) => api.deleteCupboard(id),
    onSuccess: () => {
      // Cascade delete: refresh every dependent cache (items, totals, hierarchy)
      for (const key of ['rooms', 'cupboards', 'shelves', 'organizers', 'global-items']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  return {
    addCupboard,
    updateCupboard,
    deleteCupboard,
    uploadStatus,
    setUploadStatus,
  };
}
