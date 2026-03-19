import { useState, useMemo, useCallback } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import AddItemModal from '../components/Modal/ItemModal/AddItemModal';
import ItemCard from '../components/Item/ItemCard';
import Loading from '../components/Loading';

import { useGlobalItems } from '../hooks/items/useItems';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useItemActions } from '../hooks/items/useItemActions';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import type { ApiService } from '../services/api';
import type { Item, ItemLocation } from '../types';

interface ItemsViewProps {
  api: ApiService;
}

export default function ItemsView({ api }: ItemsViewProps) {
  const { t } = useTranslation();

  // navigation + context
  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const selectedShelf = useAppStore((s) => s.selectedShelf);
  const selectedOrganizer = useAppStore((s) => s.selectedOrganizer);
  const goBack = useAppStore((s) => s.goBack);

  // data
  const { data: allItems = [], isLoading } = useGlobalItems(api);
  const { data: config } = useHomeInventarConfig(api);
  const { addItem } = useItemActions(selectedOrganizer);

  // ui state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // guards
  if (!selectedOrganizer) {
    goBack();
    return null;
  }
  if (isLoading) return <Loading />;

  // helpers
  const normalize = useCallback(
    (v?: string | null) => v?.toLowerCase().trim() || null,
    []
  );

  // Filter items that have at least one location in current organizer
  const filteredItems = useMemo(() => {
    return allItems.filter((item) =>
      item.locations?.some(
        (loc) =>
          normalize(loc.room) === normalize(selectedRoom) &&
          normalize(loc.cupboard) === normalize(selectedCupboard) &&
          normalize(loc.shelf) === normalize(selectedShelf) &&
          normalize(loc.organizer) === normalize(selectedOrganizer)
      )
    );
  }, [allItems, selectedRoom, selectedCupboard, selectedShelf, selectedOrganizer, normalize]);

  // Sort items alphabetically
  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [filteredItems]
  );

  // derived values
  const allowEdit = !!config?.allow_structure_modification;
  const hasNoItems = sortedItems.length === 0;

  const getSpecificLocation = useCallback(
    (
      locations: ItemLocation[] | undefined | null
    ): ItemLocation | undefined => {
      if (!locations) return undefined;
      return locations.find(
        (loc) =>
          normalize(loc.room) === normalize(selectedRoom) &&
          normalize(loc.cupboard) === normalize(selectedCupboard) &&
          normalize(loc.shelf) === normalize(selectedShelf) &&
          normalize(loc.organizer) === normalize(selectedOrganizer)
      );
    },
    [
      normalize,
      selectedRoom,
      selectedCupboard,
      selectedShelf,
      selectedOrganizer,
    ]
  );

  // handlers
  const handleAdd = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(
    async (itemData: any) => {
      await addItem.mutateAsync(itemData);
      setIsModalOpen(false);
    },
    [addItem]
  );

  // precompute cards
  const cards = useMemo(
    () =>
      sortedItems.map((item) => ({
        item,
        organizer: selectedOrganizer,
        specificLocation: getSpecificLocation(item.locations),
      })),
    [sortedItems, selectedOrganizer, getSpecificLocation]
  );

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.items.title} (${selectedOrganizer})`}
        onBack={goBack}
      />

      {allowEdit && (
        <button
          onClick={handleAdd}
          className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
        >
          + {t.items.addItem}
        </button>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {hasNoItems ? (
          <p className="text-center text-ha-text py-10">
            {t.items.noItems}.{allowEdit && ` ${t.items.addFirst}!`}
          </p>
        ) : (
          cards.map((props) => <ItemCard key={props.item.id} {...props} />)
        )}
      </div>

      {isModalOpen && allowEdit && (
        <AddItemModal
          isOpen
          onClose={handleCloseModal}
          onSave={handleSave}
          organizerName={selectedOrganizer}
        />
      )}
    </div>
  );
}
