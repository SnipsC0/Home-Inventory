import { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { Button } from '../Button/Button';
import type { Item } from '../../types';
import type { ApiService } from '../../services/api';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  api: ApiService;
  organizer?: string | null;
  onSuccess: () => void;
}

export function EditItemModal({
  isOpen,
  onClose,
  item,
  api,
  organizer,
  onSuccess,
}: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [aliases, setAliases] = useState(item.aliases || '');
  const [trackQuantity, setTrackQuantity] = useState(item.track_quantity);
  const [quantity, setQuantity] = useState(item.quantity?.toString() || '');
  const [minQuantity, setMinQuantity] = useState(
    item.min_quantity?.toString() || ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const consumeDeepLink = `homeassistant://navigate/home_inventar/consume/${item.id}`;

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

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(consumeDeepLink);
      alert('✓ Link copiat!');
    } catch (error) {
      alert('Nu s-a putut copia: ' + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Numele obiectului este obligatoriu.');
      return;
    }

    setIsSaving(true);
    try {
      let imagePath = item.image;

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');

        const locationMatch = item.location?.match(/^(.+?) › (.+?) › (.+?)$/);
        const room = locationMatch?.[1] || '';
        const cupboard = locationMatch?.[2] || '';
        const shelf = locationMatch?.[3] || '';

        let oldImage = '';
        if (item.image?.includes('/api/home_inventar/images/')) {
          const parts = item.image.split('/');
          oldImage = parts[parts.length - 1].split('?')[0];
        } else if (item.image && !item.image.startsWith('/local/')) {
          oldImage = item.image;
        }

        imagePath = await api.uploadImage(imageFile, {
          room,
          cupboard,
          shelf,
          organizer: organizer || undefined,
          item: name,
          old_image: oldImage,
        });
        setUploadStatus('✓ Imagine încărcată');
      }

      await api.updateItem(item.id, {
        name,
        aliases: aliases || undefined,
        image: imagePath,
        track_quantity: trackQuantity,
        quantity: trackQuantity ? parseInt(quantity) || null : null,
        min_quantity: trackQuantity ? parseInt(minQuantity) || null : null,
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

  const handleDelete = async () => {
    if (!confirm(`Ești sigur că vrei să ștergi obiectul "${item.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteItem(item.id);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      alert(
        `Eroare: ${error instanceof Error ? error.message : 'Ștergere eșuată'}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <ModalHeader>✏️ Editare: {item.name}</ModalHeader>

      {/* Locație */}
      <div
        style={{
          background: 'var(--secondary-background-color)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '0.85em',
            color: 'var(--secondary-text-color)',
            marginBottom: '4px',
          }}
        >
          📍 Locație:
        </div>
        <div style={{ fontWeight: 600 }}>{item.location}</div>
      </div>

      {/* Imagine curentă */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        {previewUrl || item.image ? (
          <img
            src={previewUrl || item.image}
            alt={item.name}
            style={{
              maxWidth: '400px',
              maxHeight: '400px',
              borderRadius: '8px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '120px',
              height: '120px',
              background: 'var(--divider-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3em',
              margin: '0 auto',
            }}
          >
            📦
          </div>
        )}
      </div>

      {/* Upload imagine nouă */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          {item.image ? 'Schimbă' : 'Adaugă'} imagine
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

      {/* Nume */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          Nume obiect *
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

      {/* Aliasuri */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9em',
            marginBottom: '6px',
            color: 'var(--secondary-text-color)',
          }}
        >
          Aliasuri (opțional)
          <span
            style={{ fontSize: '0.85em', color: 'var(--secondary-text-color)' }}
          >
            {' '}
            - separate prin virgulă
          </span>
        </label>
        <input
          type="text"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          placeholder="ex: cutie albastră, container mare"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid var(--divider-color)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: '1px solid var(--divider-color)',
          margin: '20px 0',
        }}
      />

      {/* Tracking cantitate */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={trackQuantity}
            onChange={(e) => setTrackQuantity(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 500 }}>
            Urmărește cantitatea pentru acest obiect
          </span>
        </label>
      </div>

      {trackQuantity && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9em',
                  marginBottom: '6px',
                  color: 'var(--secondary-text-color)',
                }}
              >
                Cantitate curentă
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                placeholder="Ex: 5"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--divider-color)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9em',
                  marginBottom: '6px',
                  color: 'var(--secondary-text-color)',
                }}
              >
                Cantitate minimă (alertă)
              </label>
              <input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                min="0"
                placeholder="Ex: 2"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--divider-color)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Deep Link Section */}
          <div
            style={{
              background: 'var(--info-color)',
              color: 'white',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '1.2em' }}>📱</span>
              <span>Deep Link pentru Scădere Cantitate</span>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.15)',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '0.85em',
                  opacity: 0.9,
                  marginBottom: '6px',
                }}
              >
                🔗 Link aplicație:
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75em',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                  userSelect: 'all',
                }}
              >
                {consumeDeepLink}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleCopyDeepLink}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: '0.85em',
              }}
            >
              📋 Copiază Link
            </Button>

            <div
              style={{
                fontSize: '0.8em',
                opacity: 0.9,
                marginTop: '10px',
                lineHeight: 1.4,
              }}
            >
              💡 <strong>Cum funcționează:</strong>
              <br />• Generează un cod QR din acest link
              <br />• Scanează QR-ul când folosești obiectul
              <br />• Cantitatea se va scădea automat cu 1
            </div>
          </div>

          <div
            style={{
              background: 'var(--secondary-background-color)',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.9em',
            }}
          >
            💡 <strong>Notă:</strong> Vei primi notificări automate când
            cantitatea ajunge sub minimul setat.
          </div>
        </div>
      )}

      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          {isSaving ? '⏳ Se salvează...' : '💾 Salvează Modificările'}
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

      {/* Move & Delete buttons */}
      <div style={{ marginTop: '10px' }}>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isDeleting}
          style={{ width: '100%' }}
        >
          {isDeleting ? '⏳ Se șterge...' : '🗑️ Șterge Obiect'}
        </Button>
      </div>
    </Modal>
  );
}
