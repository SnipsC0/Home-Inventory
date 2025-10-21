import { useMemo, useState } from 'react';
import { useOrganizers } from '../hooks/useOrganizers';
import { useGlobalItems, useFilteredItems } from '../hooks/useItems';
import { useHomeInventarConfig } from '../hooks/useHomeInventarConfig';
import { useOrganizerNavigation } from '../hooks/useOrganizerNavigation';
import { useOrganizerActions } from '../hooks/useOrganizerActions';
import { useItemActions } from '../hooks/useItemActions';
import { useAppStore } from '../store/useAppStore';
import DeleteModal from '../components/Modal/DeleteModal';
import EditOrganizerModal from '../components/Modal/EditOrganizerModal';
import AddItemModal from '../components/Modal/AddItemModal';
import ItemCard from '../components/Item/ItemCard';
import Breadcrumb from '../components/Layout/BreadCrumb';
import OrganizersHeader from '../components/Organizer/OrganizersHeader';
import type { ApiService } from '../services/api';
import type { Organizer } from '../types';

export default function OrganizersView({ api }: { api: ApiService }) {
  const selectedShelf = useAppStore((state) => state.selectedShelf);
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const goBack = useAppStore((state) => state.goBack);

  const { data: organizersData, isLoading: organizersLoading } =
    useOrganizers(api);

  const { isLoading: itemsLoading } = useGlobalItems(api);

  const directItems = useFilteredItems(api, {
    room: selectedRoom,
    cupboard: selectedCupboard,
    shelf: selectedShelf,
    organizer: null,
  });

  const { data: config } = useHomeInventarConfig(api);
  const { goToOrganizer } = useOrganizerNavigation();
  const { addOrganizer, updateOrganizer, deleteOrganizer } =
    useOrganizerActions(api);
  const { addItem } = useItemActions(api, null);

  const [showAddOrganizerModal, setShowAddOrganizerModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(
    null
  );
  const [deletingOrganizer, setDeletingOrganizer] = useState<Organizer | null>(
    null
  );

  const organizers = organizersData?.organizers || [];
  const itemsWithoutOrganizer = directItems.length;

  const sortedOrganizers = useMemo(() => {
    return [...organizers].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [organizers]);

  const sortedDirectItems = useMemo(() => {
    return [...directItems].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [directItems]);

  if (!selectedShelf) {
    goBack();
    return null;
  }

  if (organizersLoading || itemsLoading) {
    return <div className="text-ha-text">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`Organizatoare (${selectedShelf})`}
        onBack={goBack}
      />

      <OrganizersHeader
        shelfName={selectedShelf}
        allowEdit={config?.allow_structure_modification}
        onAddOrganizer={() => setShowAddOrganizerModal(true)}
        onAddDirectItem={() => setShowAddItemModal(true)}
      />

      {/* Organizatoare */}
      <div>
        <h3 className="text-ha-text font-semibold mb-3 text-lg">
          🗂️ Organizatoare
        </h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {organizers.length === 0 ? (
            <p className="text-center text-ha-text py-10">
              Nu există organizatoare.
              {config?.allow_structure_modification && ' Adaugă prima!'}
            </p>
          ) : (
            sortedOrganizers.map((item) => (
              <div
                key={item.id}
                className="bg-ha-card p-4 rounded-lg shadow-ha"
              >
                <div
                  onClick={() => goToOrganizer(item.name)}
                  className="cursor-pointer p-3 rounded text-center hover:bg-ha-secondary-bg transition"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[15rem] h-[10rem] object-cover rounded mb-2 m-auto"
                    />
                  ) : (
                    <div className="text-3xl mb-2">📦</div>
                  )}
                  <div className="font-semibold text-ha-text mb-1">
                    {item.name}
                  </div>
                  <div className="text-ha-primary text-sm">
                    {item.itemCount} obiecte
                  </div>
                </div>

                {config?.allow_structure_modification && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOrganizer(item);
                      }}
                      className="flex-1 py-2 bg-ha-primary text-white text-sm rounded hover:opacity-90 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingOrganizer(item);
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
      </div>

      {/* Items fără organizator */}
      {itemsWithoutOrganizer > 0 && (
        <div className="bg-ha-secondary-bg border-ha-primary rounded-lg p-4">
          <h3 className="text-ha-text font-semibold mb-3 text-lg">
            📦 Obiecte fără organizator ({itemsWithoutOrganizer})
          </h3>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
            {sortedDirectItems.map((item) => (
              <ItemCard key={item.id} item={item} api={api} organizer={null} />
            ))}
          </div>
        </div>
      )}

      {/* Modal adăugare organizator */}
      {showAddOrganizerModal && (
        <EditOrganizerModal
          isOpen={true}
          currentName=""
          onClose={() => setShowAddOrganizerModal(false)}
          onSave={async (name, imageFile) => {
            await addOrganizer.mutateAsync({ name, imageFile });
            setShowAddOrganizerModal(false);
          }}
        />
      )}

      {/* Modal adăugare item direct */}
      {showAddItemModal && (
        <AddItemModal
          isOpen={true}
          onClose={() => setShowAddItemModal(false)}
          onSave={async (itemData) => {
            await addItem.mutateAsync(itemData);
            setShowAddItemModal(false);
          }}
          organizerName={null}
        />
      )}

      {/* Modal editare organizator */}
      {editingOrganizer && (
        <EditOrganizerModal
          isOpen={true}
          currentName={editingOrganizer.name}
          currentImage={editingOrganizer.image}
          api={api}
          onClose={() => setEditingOrganizer(null)}
          onSave={async (newName, imageFile, moveData) => {
            await updateOrganizer.mutateAsync({
              id: editingOrganizer.id,
              name: newName,
              imageFile,
              moveData,
            });
            setEditingOrganizer(null);
          }}
        />
      )}

      {/* Modal ștergere organizator */}
      {deletingOrganizer && (
        <DeleteModal
          isOpen={true}
          itemName={deletingOrganizer.name}
          itemType="Organizator"
          itemCount={deletingOrganizer.itemCount}
          onClose={() => setDeletingOrganizer(null)}
          onConfirm={async () => {
            await deleteOrganizer.mutateAsync(deletingOrganizer.id);
            setDeletingOrganizer(null);
          }}
        />
      )}
    </div>
  );
}
