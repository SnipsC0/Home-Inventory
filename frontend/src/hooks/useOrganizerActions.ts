import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function useOrganizerActions(api: ApiService) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedShelf = useAppStore((state) => state.selectedShelf);
  const [uploadStatus, setUploadStatus] = useState('');

  const addOrganizer = useMutation({
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
          cupboard: selectedCupboard!,
          shelf: selectedShelf!,
          organizer: name,
        });
        setUploadStatus('✓ Imagine încărcată');
      }

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
      imageFile,
      moveData,
    }: {
      id: number;
      name?: string;
      imageFile?: File | null;
      moveData?: { room: string; cupboard: string; shelf: string };
    }) => {
      let imagePath: string | undefined = undefined;

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');
        imagePath = await api.uploadImage(imageFile, {
          room: moveData?.room || selectedRoom!,
          cupboard: moveData?.cupboard || selectedCupboard!,
          shelf: moveData?.shelf || selectedShelf!,
          organizer: name || '',
        });
        setUploadStatus('✓ Imagine încărcată');
      }

      const updateData: {
        name?: string;
        image?: string;
        room?: string;
        cupboard?: string;
        shelf?: string;
      } = {};

      if (name !== undefined) updateData.name = name;
      if (imagePath !== undefined) updateData.image = imagePath;

      // Adaugă datele de mutare dacă există
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
      queryClient.invalidateQueries({
        queryKey: ['organizers', selectedShelf],
      });
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
