import { useState, useMemo, useCallback } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import AddItemModal from '../components/Modal/ItemModal/AddItemModal';
import ItemCard from '../components/Item/ItemCard';
import Loading from '../components/Loading';

import { useGlobalItems } from '../hooks/items/useItems';
import { useItemActions } from '../hooks/items/useItemActions';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import type { ApiService } from '../services/api';
import type { ItemLocation } from '../types';

interface ItemsViewProps {
  api: ApiService;
}

export default function ItemsView({ api }: ItemsViewProps) {
  const { t, language } = useTranslation();

  // navigation + context
  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const selectedShelf = useAppStore((s) => s.selectedShelf);
  const selectedOrganizer = useAppStore((s) => s.selectedOrganizer);
  const goBack = useAppStore((s) => s.goBack);

  // data
  const { data: allItems = [], isLoading } = useGlobalItems(api);
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
    () =>
      [...filteredItems].sort((a, b) => a.name.localeCompare(b.name, language)),
    [filteredItems, language]
  );

  // derived values
  // Items are never locked by allow_structure_modification.
  const allowEdit = true;
  const hasNoItems = sortedItems.length === 0;

  const getSpecificLocations = useCallback(
    (locations: ItemLocation[] | undefined | null): ItemLocation[] =>
      (locations ?? []).filter(
        (loc) =>
          normalize(loc.room) === normalize(selectedRoom) &&
          normalize(loc.cupboard) === normalize(selectedCupboard) &&
          normalize(loc.shelf) === normalize(selectedShelf) &&
          normalize(loc.organizer) === normalize(selectedOrganizer)
      ),
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
      sortedItems.flatMap((item) =>
        getSpecificLocations(item.locations).map((loc) => ({
          item,
          organizer: selectedOrganizer,
          specificLocation: loc,
        }))
      ),
    [sortedItems, selectedOrganizer, getSpecificLocations]
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
          className="btn btn-primary"
        >
          + {t.items.addItem}
        </button>
      )}

      <div className="stagger grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {hasNoItems ? (
          <p className="text-center text-ha-text py-10">
            {t.items.noItems}.{allowEdit && ` ${t.items.addFirst}!`}
          </p>
        ) : (
          cards.map((props) => (
            <ItemCard key={props.specificLocation.location_id} {...props} />
          ))
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
