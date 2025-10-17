import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { Breadcrumb } from '../components/Layout/Breadcrumb';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { ItemCard } from '../components/Card/ItemCard';
import type { ApiService } from '../services/api';

interface Props {
  api: ApiService;
}

export default function ItemsView({ api }: Props) {
  const queryClient = useQueryClient();
  const { selectedRoom, selectedCupboard, selectedShelf, selectedOrganizer } =
    useAppStore();
  const goBack = useAppStore((state) => state.goBack);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [trackQuantity, setTrackQuantity] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [quickNotice, setQuickNotice] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: [
      'items',
      selectedRoom,
      selectedCupboard,
      selectedShelf,
      selectedOrganizer,
    ],
    queryFn: () =>
      api.getItems(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        selectedOrganizer
      ),
    enabled: !!selectedRoom && !!selectedCupboard && !!selectedShelf,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      let imagePath = '';

      if (imageFile) {
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: selectedShelf!,
          organizer: selectedOrganizer || undefined,
          item: newItemName,
        });
      }

      await api.addItem(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        selectedOrganizer,
        {
          name: newItemName,
          image: imagePath,
          quantity: trackQuantity ? parseInt(quantity) || null : null,
          min_quantity: trackQuantity ? parseInt(minQuantity) || null : null,
          track_quantity: trackQuantity,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'items',
          selectedRoom,
          selectedCupboard,
          selectedShelf,
          selectedOrganizer,
        ],
      });

      // Clear form but keep it open for rapid entry
      setNewItemName('');
      setImageFile(null);
      setPreviewUrl(null);
      setTrackQuantity(false);
      setQuantity('');
      setMinQuantity('');

      setQuickNotice(
        'Se adaugă obiectul... Poți continua adăugarea altor obiecte.'
      );
      setTimeout(() => setQuickNotice(''), 2000);
    },
    onError: (error: any) => {
      alert(`Eroare: ${error?.message || 'Adăugare eșuată'}`);
    },
  });

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

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      alert('Te rog introdu numele obiectului.');
      return;
    }
    addMutation.mutate();
  };

  if (!selectedRoom || !selectedCupboard || !selectedShelf) {
    goBack();
    return null;
  }

  if (isLoading) {
    return <div>Se încarcă...</div>;
  }

  return (
    <div>
      <Breadcrumb
        onBack={goBack}
        currentLabel={selectedOrganizer || '📋 Direct pe raft'}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0 }}>
          {selectedOrganizer ? `🗃️ ${selectedOrganizer}` : '📋 Obiecte pe raft'}
        </h3>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          + Adaugă Obiect
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card style={{ marginBottom: '16px' }}>
          {quickNotice && (
            <div
              style={{
                background: 'var(--primary-color)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '0.85em',
                fontWeight: 500,
              }}
            >
              {quickNotice}
            </div>
          )}

          <input
            type="text"
            placeholder="Nume obiect (ex: Orez)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid var(--divider-color)',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />

          {/* Imagine */}
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.9em',
                marginBottom: '6px',
                color: 'var(--secondary-text-color)',
              }}
            >
              📸 Imagine (opțional)
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
                boxSizing: 'border-box',
              }}
            />
            {previewUrl && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '2px solid var(--divider-color)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Tracking cantitate */}
          <div
            style={{
              marginBottom: '10px',
              padding: '12px',
              background: 'var(--secondary-background-color)',
              borderRadius: '6px',
            }}
          >
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
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500 }}>📊 Urmărește cantitatea</span>
            </label>

            {trackQuantity && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.85em',
                        marginBottom: '4px',
                        color: 'var(--secondary-text-color)',
                      }}
                    >
                      Cantitate actuală
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      placeholder="Ex: 5"
                      style={{
                        width: '100%',
                        padding: '8px',
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
                        fontSize: '0.85em',
                        marginBottom: '4px',
                        color: 'var(--secondary-text-color)',
                      }}
                    >
                      Cantitate minimă
                    </label>
                    <input
                      type="number"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      min="0"
                      placeholder="Ex: 1"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--divider-color)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={handleAddItem}
              disabled={addMutation.isPending}
              style={{ flex: 1 }}
            >
              {addMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewItemName('');
                setImageFile(null);
                setPreviewUrl(null);
                setTrackQuantity(false);
                setQuantity('');
                setMinQuantity('');
              }}
              style={{ flex: 1 }}
            >
              Anulează
            </Button>
          </div>
        </Card>
      )}

      {/* Grid cu items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
          gap: '12px',
        }}
      >
        {items.length === 0 ? (
          <p
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'var(--secondary-text-color)',
              padding: '40px',
            }}
          >
            Nu există obiecte{' '}
            {selectedOrganizer
              ? 'în acest organizator'
              : 'direct pe acest raft'}
            . Adaugă primul obiect!
          </p>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              api={api}
              organizer={selectedOrganizer}
              onUpdate={() => {
                queryClient.invalidateQueries({
                  queryKey: [
                    'items',
                    selectedRoom,
                    selectedCupboard,
                    selectedShelf,
                    selectedOrganizer,
                  ],
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
