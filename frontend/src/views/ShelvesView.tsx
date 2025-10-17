import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { Breadcrumb } from '../components/Layout/BreadCrumb';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { DeleteModal } from '../components/Modal/DeleteModal';
import { EditShelfModal } from '../components/Modal/EditShelfModal';
import type { ApiService } from '../services/api';
import type { Shelf } from '../types';

interface Props {
  api: ApiService;
}

export default function ShelvesView({ api }: Props) {
  const queryClient = useQueryClient();
  const { selectedRoom, selectedCupboard } = useAppStore();
  const setView = useAppStore((state) => state.setView);
  const setSelectedShelf = useAppStore((state) => state.setSelectedShelf);
  const goBack = useAppStore((state) => state.goBack);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [deletingShelf, setDeletingShelf] = useState<Shelf | null>(null);

  const { data: shelves = [], isLoading } = useQuery({
    queryKey: ['shelves', selectedRoom, selectedCupboard],
    queryFn: () => api.getShelves(selectedRoom!, selectedCupboard!),
    enabled: !!selectedRoom && !!selectedCupboard,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.addShelf(selectedRoom!, selectedCupboard!, newShelfName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedRoom, selectedCupboard],
      });
      setShowAddForm(false);
      setNewShelfName('');
    },
    onError: (error: any) => {
      alert(`Eroare: ${error?.message || 'Raftul există deja'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteShelf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shelves', selectedRoom, selectedCupboard],
      });
      setDeletingShelf(null);
    },
  });

  const handleAddShelf = () => {
    if (!newShelfName.trim()) {
      alert('Te rog introdu numele raftului.');
      return;
    }
    addMutation.mutate();
  };

  const handleShelfClick = (shelfName: string) => {
    setSelectedShelf(shelfName);
    setView('organizers');
  };

  if (!selectedRoom || !selectedCupboard) {
    goBack();
    return null;
  }

  if (isLoading) {
    return <div>Se încarcă...</div>;
  }

  const qrRedirectUrl = config?.qr_redirect_url;

  return (
    <div>
      <Breadcrumb onBack={goBack} currentLabel={selectedCupboard} />

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
        <h3 style={{ margin: 0 }}>📚 Rafturi</h3>
        {config?.allow_structure_modification && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            + Adaugă Raft
          </Button>
        )}
      </div>

      {/* QR Info Box */}
      {config?.allow_structure_modification && qrRedirectUrl && (
        <div
          style={{
            background: 'var(--info-color)',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>
            📱 Deep Link pentru QR Code al acestui dulap:
          </div>

          <div
            style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{ fontSize: '0.85em', opacity: 0.9, marginBottom: '6px' }}
            >
              📍 Locație:
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: '1.05em',
                marginBottom: '2px',
              }}
            >
              🏠 {selectedRoom}
            </div>
            <div style={{ fontWeight: 600, fontSize: '1.05em' }}>
              🗄️ {selectedCupboard}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '10px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.75em',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              marginBottom: '12px',
            }}
          >
            {qrRedirectUrl}?data=
            {btoa(
              JSON.stringify({ room: selectedRoom, cupboard: selectedCupboard })
            )}
          </div>

          <div style={{ fontSize: '0.85em', opacity: 0.95, lineHeight: 1.5 }}>
            💡 <strong>Cum funcționează:</strong>
            <br />• Click pe butonul "📱 QR" din pagina dulapuri
            <br />• Codul QR va conține exact acest link
            <br />• Scanează cu aplicația Home Assistant
            <br />• Vei fi redirecționat automat la rafturile acestui dulap
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && config?.allow_structure_modification && (
        <Card style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Nume raft (ex: Raft 1)"
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid var(--divider-color)',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={handleAddShelf}
              disabled={addMutation.isPending}
              style={{ flex: 1 }}
            >
              {addMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewShelfName('');
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
            'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
          gap: '12px',
        }}
      >
        {shelves.length === 0 ? (
          <p
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'var(--secondary-text-color)',
              padding: '40px',
            }}
          >
            Nu există rafturi.
            {config?.allow_structure_modification && ' Adaugă primul raft!'}
          </p>
        ) : (
          shelves.map((shelf) => (
            <Card key={shelf.id}>
              <div
                onClick={() => handleShelfClick(shelf.name)}
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
                <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>📋</div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontSize: '1.1em',
                  }}
                >
                  {shelf.name}
                </div>
                {shelf.organizerCount > 0 && (
                  <div
                    style={{
                      fontSize: '0.85em',
                      color: 'var(--secondary-text-color)',
                    }}
                  >
                    {shelf.organizerCount} organizatoare
                  </div>
                )}
                <div
                  style={{ fontSize: '0.9em', color: 'var(--primary-color)' }}
                >
                  {shelf.itemCount} obiecte
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
                      onClick={() => setEditingShelf(shelf)}
                      style={{ flex: 1, fontSize: '0.9em', padding: '8px' }}
                    >
                      ✏️ Edit
                    </Button>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setDeletingShelf(shelf)}
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
      {editingShelf && (
        <EditShelfModal
          isOpen={true}
          onClose={() => setEditingShelf(null)}
          shelf={editingShelf}
          onSave={async (name) => {
            await api.updateShelf(editingShelf.id, { name });
            queryClient.invalidateQueries({
              queryKey: ['shelves', selectedRoom, selectedCupboard],
            });
          }}
        />
      )}

      {deletingShelf && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingShelf(null)}
          onConfirm={() => deleteMutation.mutateAsync(deletingShelf.id)}
          itemName={deletingShelf.name}
          itemType="Raft"
          itemCount={deletingShelf.itemCount}
        />
      )}
    </div>
  );
}
