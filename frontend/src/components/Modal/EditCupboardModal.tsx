import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { Button } from '../Button/Button';
import type { Cupboard } from '../../types';
import type { ApiService } from '../../services/api';

interface EditCupboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cupboard: Cupboard;
  api: ApiService;
  room: string;
  onSuccess: () => void;
}

export function EditCupboardModal({
  isOpen,
  onClose,
  cupboard,
  api,
  room,
  onSuccess,
}: EditCupboardModalProps) {
  const [name, setName] = useState(cupboard.name);
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
      alert('Numele dulapului este obligatoriu.');
      return;
    }

    setIsSaving(true);
    try {
      let imagePath = cupboard.image;

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');

        let oldImage = '';
        if (cupboard.image?.includes('/api/home_inventar/images/')) {
          const parts = cupboard.image.split('/');
          oldImage = parts[parts.length - 1].split('?')[0];
        } else if (cupboard.image && !cupboard.image.startsWith('/local/')) {
          oldImage = cupboard.image;
        }

        imagePath = await api.uploadImage(imageFile, {
          room,
          cupboard: name,
          old_image: oldImage,
        });
        setUploadStatus('✓ Imagine încărcată');
      }

      await api.updateCupboard(cupboard.id, {
        name,
        image: imagePath,
      });

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>✏️ Editare Dulap: {cupboard.name}</ModalHeader>

      {/* Current/Preview Image */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        {(previewUrl || cupboard.image) && (
          <img
            src={previewUrl || cupboard.image}
            alt={cupboard.name}
            style={{
              maxWidth: '400px',
              maxHeight: '300px',
              borderRadius: '8px',
              objectFit: 'cover',
            }}
          />
        )}
        {!previewUrl && !cupboard.image && (
          <div
            style={{
              width: '150px',
              height: '150px',
              background: 'var(--divider-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3em',
              margin: '0 auto',
            }}
          >
            🗄️
          </div>
        )}
      </div>

      {/* Image Upload */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          {cupboard.image ? 'Schimbă' : 'Adaugă'} imagine
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid var(--divider-color)',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            fontSize: '0.85em',
            marginTop: '6px',
            minHeight: '18px',
            color: uploadStatus.includes('✓')
              ? 'var(--success-color)'
              : 'var(--primary-color)',
          }}
        >
          {uploadStatus}
        </div>
      </div>

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
          Nume dulap
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
