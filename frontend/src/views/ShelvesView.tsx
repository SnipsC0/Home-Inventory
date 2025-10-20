import { useState } from 'react';
import { Breadcrumb } from '../components/Layout/BreadCrumb';
import ShelvesHeader from '../components/Shelf/ShelvesHeader';
import { useShelves } from '../hooks/useShelves';
import { useHomeInventarConfig } from '../hooks/useHomeInventarConfig';
import { useShelfNavigation } from '../hooks/useShelfNavigation';
import { useShelfActions } from '../hooks/useShelfActions';
import { useAppStore } from '../store/useAppStore';
import { DeleteModal } from '../components/Modal/DeleteModal';
import { EditShelfModal } from '../components/Modal/EditShelfModal';
import type { ApiService } from '../services/api';
import { Shelf } from '../types';

export default function ShelvesView({ api }: { api: ApiService }) {
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const goBack = useAppStore((state) => state.goBack);

  const { data: shelves = [], isLoading } = useShelves(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToShelf } = useShelfNavigation();
  const { addShelf, updateShelf, deleteShelf } = useShelfActions(api);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [deletingShelf, setDeletingShelf] = useState<Shelf | null>(null);

  if (!selectedCupboard) {
    goBack();
    return null;
  }

  if (isLoading) return <div className="text-ha-text">Se încarcă...</div>;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`Rafturi (${selectedCupboard})`}
        onBack={goBack}
      />

      <ShelvesHeader
        cupboardName={selectedCupboard}
        allowEdit={config?.allow_structure_modification}
        onAddShelf={() => setShowAddModal(true)}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {shelves.length === 0 ? (
          <p className="text-center text-ha-text py-10">
            Nu există rafturi.
            {config?.allow_structure_modification && ' Adaugă primul raft!'}
          </p>
        ) : (
          shelves.map((shelf) => (
            <div key={shelf.id} className="bg-ha-card p-4 rounded-lg shadow-ha">
              <div
                onClick={() => goToShelf(shelf.name)}
                className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition"
              >
                <div className="text-3xl mb-2">📚</div>
                <div className="font-semibold text-ha-text mb-1">
                  {shelf.name}
                </div>
                <div className="text-ha-primary text-sm">
                  {shelf.itemCount} obiecte
                </div>
              </div>

              {config?.allow_structure_modification && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingShelf(shelf);
                    }}
                    className="flex-1 py-2 bg-ha-primary text-white text-sm rounded hover:opacity-90 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingShelf(shelf);
                    }}
                    className="flex-1 py-2 bg-ha-error text-white text-sm rounded hover:opacity-90 transition"
                  >
                    🗑️ Șterge
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <EditShelfModal
          isOpen={true}
          currentName=""
          onClose={() => setShowAddModal(false)}
          onSave={async (name) => {
            await addShelf.mutateAsync(name);
            setShowAddModal(false);
          }}
        />
      )}

      {editingShelf && (
        <EditShelfModal
          isOpen={true}
          currentName={editingShelf.name}
          onClose={() => setEditingShelf(null)}
          onSave={async (newName) => {
            await updateShelf.mutateAsync({
              id: editingShelf.id,
              name: newName,
            });
            setEditingShelf(null);
          }}
        />
      )}

      {deletingShelf && (
        <DeleteModal
          isOpen={true}
          itemName={deletingShelf.name}
          itemType="Raft"
          itemCount={deletingShelf.itemCount}
          onClose={() => setDeletingShelf(null)}
          onConfirm={async () => {
            await deleteShelf.mutateAsync(deletingShelf.id);
            setDeletingShelf(null);
          }}
        />
      )}
    </div>
  );
}
