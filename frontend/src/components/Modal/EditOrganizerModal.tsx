import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { Button } from '../Button/Button';
import type { Organizer } from '../../types';
import type { ApiService } from '../../services/api';

interface EditOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizer: Organizer;
  api: ApiService;
  room: string;
  cupboard: string;
  shelf: string;
  onSuccess: () => void;
}

export function EditOrganizerModal({
  isOpen,
  onClose,
  organizer,
  api,
  room,
  cupboard,
  shelf,
  onSuccess,
}: EditOrganizerModalProps) {
  const [name, setName] = useState(organizer.name);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Numele organizatorului este obligatoriu.');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {};

      if (name !== organizer.name) {
        updateData.name = name;
      }

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');

        let oldImage = '';
        if (organizer.image?.includes('/api/home_inventar/images/')) {
          const parts = organizer.image.split('/');
          oldImage = parts[parts.length - 1].split('?')[0];
        } else if (organizer.image && !organizer.image.startsWith('/local/')) {
          oldImage = organizer.image;
        }

        updateData.image = await api.uploadImage(imageFile, {
          room,
          cupboard,
          shelf,
          item: name,
          old_image: oldImage,
        });
        setUploadStatus('✓ Imagine încărcată');
      }

      if (Object.keys(updateData).length === 0) {
        alert('Nicio modificare detectată.');
        return;
      }

      await api.updateOrganizer(organizer.id, updateData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert(
        `Eroare: ${error instanceof Error ? error.message : 'Salvare eșuată'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
      <ModalHeader>✏️ Editare Organizator</ModalHeader>

      {/* Current/Preview Image */}
      {(previewUrl || organizer.image) && (
        <div
          style={{
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <img
            src={previewUrl || organizer.image}
            alt={organizer.name}
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '8px',
              border: '1px solid var(--divider-color)',
            }}
          />
        </div>
      )}

      {/* Name Input */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          Nume organizator
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid var(--divider-color)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Image Upload */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          Imagine (opțional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--divider-color)',
          }}
        />
        <div
          style={{
            fontSize: '0.9em',
            marginTop: '6px',
            minHeight: '20px',
            color: uploadStatus.includes('✓')
              ? 'var(--success-color)'
              : 'var(--primary-color)',
          }}
        >
          {uploadStatus}
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          {isSaving ? '⏳ Se salvează...' : '💾 Salvează'}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          Anulează
        </Button>
      </ModalFooter>
    </Modal>
  );
}
