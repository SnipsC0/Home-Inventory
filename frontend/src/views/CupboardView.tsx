import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { Breadcrumb } from '../components/Layout/BreadCrumb';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { DeleteModal } from '../components/Modal/DeleteModal';
import { downloadQRCode } from '../utils/qr-generator';
import { EditCupboardModal } from './../components/Modal/EditCupboardModal';
import type { ApiService } from '../services/api';
import type { Cupboard } from '../types';

interface Props {
  api: ApiService;
}

export default function CupboardsView({ api }: Props) {
  const queryClient = useQueryClient();
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const setView = useAppStore((state) => state.setView);
  const setSelectedCupboard = useAppStore((state) => state.setSelectedCupboard);
  const goBack = useAppStore((state) => state.goBack);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCupboardName, setNewCupboardName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const [editingCupboard, setEditingCupboard] = useState<Cupboard | null>(null);
  const [deletingCupboard, setDeletingCupboard] = useState<Cupboard | null>(
    null
  );

  const { data: cupboards = [], isLoading } = useQuery({
    queryKey: ['cupboards', selectedRoom],
    queryFn: () => api.getCupboards(selectedRoom!),
    enabled: !!selectedRoom,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      let imagePath = '';
      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');
        imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: newCupboardName,
        });
        setUploadStatus('✓ Imagine încărcată');
      }

      await api.addCupboard(selectedRoom!, newCupboardName, imagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupboards', selectedRoom] });
      setShowAddForm(false);
      setNewCupboardName('');
      setImageFile(null);
      setUploadStatus('');
    },
    onError: (error: any) => {
      alert(`Eroare: ${error?.message || 'Dulapul există deja'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCupboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupboards', selectedRoom] });
      setDeletingCupboard(null);
    },
  });

  const handleAddCupboard = () => {
    if (!newCupboardName.trim()) {
      alert('Te rog introdu numele dulapului.');
      return;
    }
    addMutation.mutate();
  };

  const handleCupboardClick = (cupboardName: string) => {
    setSelectedCupboard(cupboardName);
    setView('shelves');
  };

  if (!selectedRoom) {
    goBack();
    return null;
  }

  if (isLoading) {
    return <div>Se încarcă...</div>;
  }

  return (
    <div>
      <Breadcrumb onBack={goBack} currentLabel={selectedRoom} />

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
        <h3 style={{ margin: 0 }}>🗄️ Dulapuri</h3>
        {config?.allow_structure_modification && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            + Adaugă Dulap
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && config?.allow_structure_modification && (
        <Card style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Nume dulap (ex: Dulap mare)"
            value={newCupboardName}
            onChange={(e) => setNewCupboardName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid var(--divider-color)',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <div
            style={{
              fontSize: '0.9em',
              marginBottom: '10px',
              minHeight: '20px',
            }}
          >
            {uploadStatus}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={handleAddCupboard}
              disabled={addMutation.isPending}
              style={{ flex: 1 }}
            >
              {addMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewCupboardName('');
                setImageFile(null);
                setUploadStatus('');
              }}
              style={{ flex: 1 }}
            >
              Anulează
            </Button>
          </div>
        </Card>
      )}

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '12px',
        }}
      >
        {cupboards.length === 0 ? (
          <p
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'var(--secondary-text-color)',
              padding: '40px',
            }}
          >
            Nu există dulapuri.
            {config?.allow_structure_modification && ' Adaugă primul dulap!'}
          </p>
        ) : (
          cupboards.map((cupboard) => (
            <Card key={cupboard.id}>
              {/* Image */}
              {cupboard.image ? (
                <img
                  src={cupboard.image}
                  alt={cupboard.name}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    marginBottom: '12px',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '150px',
                    background: 'var(--divider-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3em',
                    marginBottom: '12px',
                  }}
                >
                  🗄️
                </div>
              )}

              {/* Content */}
              <div
                onClick={() => handleCupboardClick(cupboard.name)}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  marginBottom: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'var(--secondary-background-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '6px',
                    fontSize: '1.05em',
                  }}
                >
                  {cupboard.name}
                </div>
                <div
                  style={{ fontSize: '0.9em', color: 'var(--primary-color)' }}
                >
                  {cupboard.itemCount} obiecte
                </div>
              </div>

              {/* Actions */}
              {config?.allow_structure_modification && (
                <>
                  <div
                    style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                  >
                    <Button
                      variant="primary"
                      onClick={() => setEditingCupboard(cupboard)}
                      style={{ flex: 1, fontSize: '0.9em', padding: '8px' }}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        downloadQRCode(selectedRoom, cupboard.name)
                      }
                      style={{ flex: 1, fontSize: '0.9em', padding: '8px' }}
                    >
                      📱 QR
                    </Button>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setDeletingCupboard(cupboard)}
                    style={{ width: '100%', fontSize: '0.9em', padding: '8px' }}
                  >
                    🗑️ Șterge
                  </Button>
                </>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      {editingCupboard && (
        <EditCupboardModal
          isOpen={true}
          onClose={() => setEditingCupboard(null)}
          cupboard={editingCupboard}
          api={api}
          room={selectedRoom}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['cupboards', selectedRoom],
            });
            setEditingCupboard(null);
          }}
        />
      )}

      {deletingCupboard && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingCupboard(null)}
          onConfirm={() => deleteMutation.mutateAsync(deletingCupboard.id)}
          itemName={deletingCupboard.name}
          itemType="Dulap"
          itemCount={deletingCupboard.itemCount}
        />
      )}
    </div>
  );
}
