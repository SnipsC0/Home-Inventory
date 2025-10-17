import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { Breadcrumb } from '../components/Layout/Breadcrumb';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { DeleteModal } from '../components/Modal/DeleteModal';
import { EditOrganizerModal } from '../components/Modal/EditOrganizerModal';
import { ItemCard } from '../components/Card/ItemCard';
import type { ApiService } from '../services/api';
import type { Organizer, Item } from '../types';

interface Props {
  api: ApiService;
}

export default function OrganizersView({ api }: Props) {
  const queryClient = useQueryClient();
  const { selectedRoom, selectedCupboard, selectedShelf } = useAppStore();
  const setView = useAppStore((state) => state.setView);
  const setSelectedOrganizer = useAppStore(
    (state) => state.setSelectedOrganizer
  );
  const goBack = useAppStore((state) => state.goBack);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrganizerName, setNewOrganizerName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(
    null
  );
  const [deletingOrganizer, setDeletingOrganizer] = useState<Organizer | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ['organizers', selectedRoom, selectedCupboard, selectedShelf],
    queryFn: () =>
      api.getOrganizers(selectedRoom!, selectedCupboard!, selectedShelf!),
    enabled: !!selectedRoom && !!selectedCupboard && !!selectedShelf,
  });

  const { data: itemsWithoutOrganizer = [] } = useQuery({
    queryKey: ['items-direct', selectedRoom, selectedCupboard, selectedShelf],
    queryFn: () =>
      api.getItems(selectedRoom!, selectedCupboard!, selectedShelf!, null),
    enabled: !!selectedRoom && !!selectedCupboard && !!selectedShelf,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const result = await api.addOrganizer(
        selectedRoom!,
        selectedCupboard!,
        selectedShelf!,
        newOrganizerName
      );

      if (imageFile) {
        setUploadStatus('Se încarcă imaginea...');
        const imagePath = await api.uploadImage(imageFile, {
          room: selectedRoom!,
          cupboard: selectedCupboard!,
          shelf: selectedShelf!,
          item: newOrganizerName,
        });
        await api.updateOrganizer(result.id, { image: imagePath });
        setUploadStatus('✓ Imagine încărcată');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizers', selectedRoom, selectedCupboard, selectedShelf],
      });
      setShowAddForm(false);
      setNewOrganizerName('');
      setImageFile(null);
      setUploadStatus('');
    },
    onError: (error: any) => {
      alert(`Eroare: ${error?.message || 'Organizatorul există deja'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteOrganizer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizers', selectedRoom, selectedCupboard, selectedShelf],
      });
      setDeletingOrganizer(null);
    },
  });

  const handleAddOrganizer = () => {
    if (!newOrganizerName.trim()) {
      alert('Te rog introdu numele organizatorului.');
      return;
    }
    addMutation.mutate();
  };

  const handleOrganizerClick = (organizerName: string) => {
    setSelectedOrganizer(organizerName);
    setView('items');
  };

  const handleAddItemDirectClick = () => {
    setSelectedOrganizer(null);
    setView('items');
  };

  if (!selectedRoom || !selectedCupboard || !selectedShelf) {
    goBack();
    return null;
  }

  if (isLoading) {
    return <div>Se încarcă...</div>;
  }

  const organizers = data?.organizers || [];

  return (
    <div>
      <Breadcrumb onBack={goBack} currentLabel={selectedShelf} />

      {/* SECȚIUNEA ORGANIZATOARE */}
      <div style={{ marginBottom: '32px' }}>
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
          <h3
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🗃️</span>
            <span>Organizatoare</span>
          </h3>
          {config?.allow_structure_modification && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              + Adaugă Organizator
            </Button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && config?.allow_structure_modification && (
          <Card style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Nume organizator (ex: Cutie Mare)"
              value={newOrganizerName}
              onChange={(e) => setNewOrganizerName(e.target.value)}
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
              style={{ width: '100%', marginBottom: '10px', padding: '6px' }}
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
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={handleAddOrganizer}
                disabled={addMutation.isPending}
                style={{ flex: 1 }}
              >
                {addMutation.isPending ? 'Se salvează...' : 'Salvează'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewOrganizerName('');
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

        {/* Grid organizatoare */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
            gap: '12px',
          }}
        >
          {organizers.length === 0 ? (
            <p
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--secondary-text-color)',
                padding: '40px',
                background: 'var(--secondary-background-color)',
                borderRadius: '8px',
              }}
            >
              Nu există organizatoare pe acest raft.
              {config?.allow_structure_modification &&
                ' Adaugă primul organizator!'}
            </p>
          ) : (
            organizers.map((org) => (
              <Card
                key={org.id}
                style={{
                  border: '2px solid var(--primary-color)',
                  cursor: 'pointer',
                }}
                onClick={() => handleOrganizerClick(org.name)}
              >
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>
                    {org.image ? (
                      <img
                        src={org.image}
                        alt={org.name}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                        }}
                      />
                    ) : (
                      '🗃️'
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: '8px',
                      fontSize: '1.05em',
                    }}
                  >
                    {org.name}
                  </div>
                  <div
                    style={{ fontSize: '0.9em', color: 'var(--primary-color)' }}
                  >
                    {org.itemCount} obiecte
                  </div>
                </div>

                {/* Actions (stop propagation) */}
                {config?.allow_structure_modification && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      onClick={() => setEditingOrganizer(org)}
                      style={{
                        width: '100%',
                        fontSize: '0.9em',
                        padding: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDeletingOrganizer(org)}
                      style={{
                        width: '100%',
                        fontSize: '0.9em',
                        padding: '8px',
                      }}
                    >
                      🗑️ Șterge
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* SECȚIUNEA OBIECTE DIRECT PE RAFT */}
      <div
        style={{
          borderTop: '2px solid var(--divider-color)',
          paddingTop: '24px',
        }}
      >
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
          <h3
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '1.3em' }}>📦</span>
            <span>Obiecte Direct pe Raft</span>
          </h3>
          <Button
            variant="secondary"
            onClick={handleAddItemDirectClick}
            style={{ border: '1px solid var(--primary-color)' }}
          >
            + Adaugă Obiect
          </Button>
        </div>

        {/* Grid items */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
            gap: '12px',
          }}
        >
          {itemsWithoutOrganizer.length === 0 ? (
            <p
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--secondary-text-color)',
                padding: '40px',
                background: 'var(--secondary-background-color)',
                borderRadius: '8px',
              }}
            >
              Nu există obiecte direct pe raft.
              {config?.allow_structure_modification &&
                ' Adaugă primul obiect sau folosește organizatoarele!'}
            </p>
          ) : (
            itemsWithoutOrganizer.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                api={api}
                onUpdate={() => {
                  queryClient.invalidateQueries({
                    queryKey: [
                      'items-direct',
                      selectedRoom,
                      selectedCupboard,
                      selectedShelf,
                    ],
                  });
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {editingOrganizer && (
        <EditOrganizerModal
          isOpen={true}
          onClose={() => setEditingOrganizer(null)}
          organizer={editingOrganizer}
          api={api}
          room={selectedRoom}
          cupboard={selectedCupboard}
          shelf={selectedShelf}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: [
                'organizers',
                selectedRoom,
                selectedCupboard,
                selectedShelf,
              ],
            });
            setEditingOrganizer(null);
          }}
        />
      )}

      {deletingOrganizer && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingOrganizer(null)}
          onConfirm={() => deleteMutation.mutateAsync(deletingOrganizer.id)}
          itemName={deletingOrganizer.name}
          itemType="Organizator"
          itemCount={deletingOrganizer.itemCount}
        />
      )}
    </div>
  );
}
