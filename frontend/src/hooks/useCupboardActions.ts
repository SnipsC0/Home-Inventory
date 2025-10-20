import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function useCupboardActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const [uploadStatus, setUploadStatus] = useState('');

  const addCupboard = useMutation({
    mutationFn: async ({
      name,
      imageFile,
    }: {
      name: string;
      imageFile: File | null;
    }) => {
      let imagePath = '';
      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: name,
        });
        setUploadStatus('✓ Imagine încărcată');
      }
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
      imageFile,
    }: {
      id: number;
      name?: string;
      imageFile?: File | null;
    }) => {
      let imagePath: string | undefined = undefined;

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: name || '',
        });
        setUploadStatus('✓ Imagine încărcată');
      }

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
      queryClient.invalidateQueries({ queryKey: ['cupboards', selectedRoom] });
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
