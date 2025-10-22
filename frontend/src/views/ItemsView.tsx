import { useMemo, useState } from 'react';
import { useFilteredItems, useGlobalItems } from '../hooks/useItems';
import { useHomeInventarConfig } from '../hooks/useHomeInventarConfig';
import { useItemActions } from '../hooks/useItemActions';
import { useAppStore } from '../store/useAppStore';
import AddItemModal from '../components/Modal/AddItemModal';
import ItemCard from '../components/Item/ItemCard';
import Breadcrumb from '../components/Layout/BreadCrumb';
import type { ApiService } from '../services/api';
import { useTranslation } from '../i18n/I18nContext';

export default function ItemsView({ api }: { api: ApiService }) {
  const { t } = useTranslation();
  const selectedOrganizer = useAppStore((state) => state.selectedOrganizer);
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const selectedShelf = useAppStore((state) => state.selectedShelf);
  const goBack = useAppStore((state) => state.goBack);

  const { isLoading } = useGlobalItems(api);
  const items = useFilteredItems(api, {
    room: selectedRoom,
    cupboard: selectedCupboard,
    shelf: selectedShelf,
    organizer: selectedOrganizer,
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [items]);

  const { data: config } = useHomeInventarConfig(api);
  const { addItem } = useItemActions(api);

  const [showAddModal, setShowAddModal] = useState(false);

  if (!selectedOrganizer) {
    goBack();
    return null;
  }

  if (isLoading) return <div className="text-ha-text">Se încarcă...</div>;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.items.title} (${selectedOrganizer})`}
        onBack={goBack}
      />

      {config?.allow_structure_modification && (
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
        >
          + {t.items.addItem}
        </button>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {items.length === 0 ? (
          <p className="text-center text-ha-text py-10">
            {t.items.noItems}.
            {config?.allow_structure_modification && ` ${t.items.addFirst}!`}
          </p>
        ) : (
          sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              api={api}
              organizer={selectedOrganizer}
            />
          ))
        )}
      </div>

      {showAddModal && (
        <AddItemModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          onSave={async (itemData) => {
            await addItem.mutateAsync(itemData);
            setShowAddModal(false);
          }}
          organizerName={selectedOrganizer}
        />
      )}
    </div>
  );
}
