import { useState, useMemo, useCallback } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import OrganizersHeader from '../components/Organizer/OrganizersHeader';
import OrganizerCard from '../components/Organizer/OrganizerCard';
import EditOrganizerModal from '../components/Modal/EditOrganizerModal';
import AddItemModal from '../components/Modal/ItemModal/AddItemModal';
import ItemCard from '../components/Item/ItemCard';
import Loading from '../components/Loading';

import { useOrganizers } from '../hooks/organizers/useOrganizers';
import { useOrganizerActions } from '../hooks/organizers/useOrganizerActions';
import { useOrganizerNavigation } from '../hooks/organizers/useOrganizerNavigation';
import { useGlobalItems } from '../hooks/items/useItems';
import { useItemActions } from '../hooks/items/useItemActions';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import type { ApiService } from '../services/api';
import type { Organizer } from '../types';
import {
  getSpecificLocations,
  normalizeValue,
} from '../utils/items/locationUtils';

export default function OrganizersView({ api }: { api: ApiService }) {
  const { t } = useTranslation();

  // nav
  const selectedShelf = useAppStore((s) => s.selectedShelf);
  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const goBack = useAppStore((s) => s.goBack);

  // Data
  const { data: organizersData, isLoading: organizersLoading } =
    useOrganizers(api);
  const { data: allItemsData, isLoading: itemsLoading } = useGlobalItems(api);
  const { data: config } = useHomeInventarConfig(api);

  const organizers = organizersData?.organizers || [];
  const allItems = allItemsData || [];

  // Filter items that have a location in current shelf WITHOUT organizer
  const directItems = useMemo(() => {
    return allItems?.filter((item) => {
      return item.locations?.some(
        (loc) =>
          normalizeValue(loc.room) === normalizeValue(selectedRoom) &&
          normalizeValue(loc.cupboard) === normalizeValue(selectedCupboard) &&
          normalizeValue(loc.shelf) === normalizeValue(selectedShelf) &&
          !loc.organizer // no organizer
      );
    });
  }, [allItems, selectedRoom, selectedCupboard, selectedShelf]);

  // Mutations
  const { addOrganizer, updateOrganizer } = useOrganizerActions(api);
  const { goToOrganizer } = useOrganizerNavigation();
  const { addItem } = useItemActions(null);

  // ui state
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(
    null
  );
  const [isAddOrganizerOpen, setIsAddOrganizerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  // Derived flags
  const allowEdit = !!config?.allow_structure_modification;
  const hasNoOrganizers = organizers.length === 0;
  const itemsWithoutOrganizer = directItems.length;

  // Sorted data
  const sortedOrganizers = useMemo(
    () => [...organizers].sort((a, b) => a.name.localeCompare(b.name)),
    [organizers]
  );

  const sortedDirectItems = useMemo(
    () => [...directItems].sort((a, b) => a.name.localeCompare(b.name)),
    [directItems]
  );

  // Handlers
  const handleAddOrganizer = useCallback(() => {
    setIsAddOrganizerOpen(true);
  }, []);

  const handleEditOrganizer = useCallback((organizer: Organizer) => {
    setEditingOrganizer(organizer);
  }, []);

  const handleCloseOrganizerModal = useCallback(() => {
    setIsAddOrganizerOpen(false);
    setEditingOrganizer(null);
  }, []);

  const handleSaveOrganizer = useCallback(
    async (name: string, imageFile?: File | null, moveData?: any) => {
      const normalizedFile = imageFile ?? null;
      if (editingOrganizer) {
        await updateOrganizer.mutateAsync({
          id: editingOrganizer.id,
          name,
          imageFile: normalizedFile,
          moveData,
        });
      } else {
        await addOrganizer.mutateAsync({ name, imageFile: normalizedFile });
      }
      handleCloseOrganizerModal();
    },
    [editingOrganizer, updateOrganizer, addOrganizer, handleCloseOrganizerModal]
  );

  const handleAddDirectItem = useCallback(() => {
    setIsAddItemOpen(true);
  }, []);

  const handleCloseItemModal = useCallback(() => {
    setIsAddItemOpen(false);
  }, []);

  const handleSaveItem = useCallback(
    async (itemData: {
      name: string;
      aliases: string | undefined;
      imageFile: File | null;
      min_quantity: null;
      track_quantity: boolean;
      quantity: number | null;
      barcode: string;
      expiration_date: string | null;
    }) => {
      await addItem.mutateAsync(itemData);
      setIsAddItemOpen(false);
    },
    [addItem]
  );

  const organizerCards = useMemo(
    () =>
      sortedOrganizers.map((organizer) => ({
        organizer,
        editable: allowEdit,
        onClick: () => goToOrganizer(organizer.name),
        onEdit: () => handleEditOrganizer(organizer),
      })),
    [sortedOrganizers, allowEdit, goToOrganizer, handleEditOrganizer]
  );

  // Memoized item cards (direct items)
  const itemCards = useMemo(
    () =>
      sortedDirectItems.flatMap((item) =>
        getSpecificLocations(item.locations, {
          room: selectedRoom,
          cupboard: selectedCupboard,
          shelf: selectedShelf,
          organizer: null,
        }).map((loc) => ({
          item,
          organizer: null,
          specificLocation: loc,
        }))
      ),
    [sortedDirectItems, selectedRoom, selectedCupboard, selectedShelf]
  );

  // Guards
  if (!selectedShelf) {
    goBack();
    return null;
  }

  if (organizersLoading || itemsLoading) return <Loading />;

  // Render
  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.organizers.title} (${selectedShelf})`}
        onBack={goBack}
      />

      <OrganizersHeader
        allowEdit={allowEdit}
        onAddOrganizer={handleAddOrganizer}
        onAddDirectItem={handleAddDirectItem}
      />

      {/* Organizer grid */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {hasNoOrganizers ? (
          <p className="text-center text-ha-text py-10">
            {t.organizers.noOrganizers}.
            {allowEdit && ` ${t.organizers.addFirst}!`}
          </p>
        ) : (
          organizerCards.map((props) => (
            <OrganizerCard key={props.organizer.id} {...props} />
          ))
        )}
      </div>

      {/* Items without organizer */}
      {itemsWithoutOrganizer > 0 && (
        <div className="bg-ha-secondary-bg border-ha-primary rounded-lg p-4">
          <h3 className="text-ha-text font-semibold mb-3 text-lg">
            📦{' '}
            {`${t.items.title} ${t.organizers.withoutOrganizer.toLowerCase()} `}
            ({itemsWithoutOrganizer})
          </h3>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
            {itemCards.map((props, i) => (
              <ItemCard key={props.item.id + i} {...props} />
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit organizer */}
      {(isAddOrganizerOpen || editingOrganizer) && allowEdit && (
        <EditOrganizerModal
          isOpen
          organizer={editingOrganizer ?? null}
          currentName={editingOrganizer?.name ?? ''}
          currentImage={editingOrganizer?.image}
          api={api}
          onClose={handleCloseOrganizerModal}
          onSave={handleSaveOrganizer}
        />
      )}

      {/* Add direct item */}
      {isAddItemOpen && allowEdit && (
        <AddItemModal
          isOpen
          onClose={handleCloseItemModal}
          onSave={handleSaveItem}
          organizerName={null}
        />
      )}
    </div>
  );
}
