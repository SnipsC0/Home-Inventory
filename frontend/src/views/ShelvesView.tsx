import { useState, useCallback, useMemo } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import ShelvesHeader from '../components/Shelf/ShelvesHeader';
import ShelfCard from '../components/Shelf/ShelfCard';
import EditShelfModal from '../components/Modal/EditShelfModal';
import Loading from '../components/Loading';

import { useShelves } from '../hooks/shelves/useShelves';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useShelfActions } from '../hooks/shelves/useShelfActions';
import { useShelfNavigation } from '../hooks/shelves/useShelfNavigation';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import type { ApiService } from '../services/api';
import type { Shelf } from '../types';

interface ShelvesViewProps {
  api: ApiService;
}

export default function ShelvesView({ api }: ShelvesViewProps) {
  const { t } = useTranslation();

  // global navigation context
  const selectedCupboard = useAppStore((s) => s.selectedCupboard);
  const goBack = useAppStore((s) => s.goBack);

  // data hooks
  const { data: shelves = [], isLoading } = useShelves(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToShelf } = useShelfNavigation();

  // mutations
  const { addShelf, updateShelf } = useShelfActions(api);

  // local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);

  // derived
  const allowEdit = !!config?.allow_structure_modification;
  const hasNoShelves = shelves.length === 0;

  // handlers
  const handleAdd = useCallback(() => {
    setEditingShelf(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((shelf: Shelf) => {
    setEditingShelf(shelf);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingShelf(null);
  }, []);

  const handleSave = useCallback(
    async (name: string) => {
      try {
        if (editingShelf) {
          await updateShelf.mutateAsync({ id: editingShelf.id, name });
        } else {
          await addShelf.mutateAsync(name);
        }
        handleCloseModal();
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          t.errors?.unexpected ||
          'Unexpected error';
        alert(message);
      }
    },
    [editingShelf, addShelf, updateShelf, handleCloseModal, t]
  );

  // memoize shelf cards (optional micro-opt)
  const cards = useMemo(
    () =>
      shelves.map((shelf) => ({
        shelf,
        editable: allowEdit,
        onClick: () => goToShelf(shelf.name),
        onEdit: () => handleEdit(shelf),
      })),
    [shelves, allowEdit, goToShelf, handleEdit]
  );

  // guards
  if (!selectedCupboard) {
    goBack();
    return null;
  }

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.shelves.title} (${selectedCupboard})`}
        onBack={goBack}
      />

      <ShelvesHeader
        cupboardName={selectedCupboard}
        allowEdit={allowEdit}
        onAddShelf={handleAdd}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {hasNoShelves ? (
          <p className="text-center text-ha-text py-10">
            {t.shelves.noShelves}.{allowEdit && ` ${t.shelves.addFirst}!`}
          </p>
        ) : (
          cards.map((props) => <ShelfCard key={props.shelf.id} {...props} />)
        )}
      </div>

      {/* Add/Edit shelf modal */}
      {isModalOpen && allowEdit && (
        <EditShelfModal
          isOpen
          shelf={editingShelf ?? undefined}
          currentName={editingShelf?.name ?? ''}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
