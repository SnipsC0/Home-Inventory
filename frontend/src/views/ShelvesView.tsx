import { useState } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import ShelvesHeader from '../components/Shelf/ShelvesHeader';
import { useShelves } from '../hooks/shelves/useShelves';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useShelfActions } from '../hooks/shelves/useShelfActions';
import { useAppStore } from '../store/useAppStore';
import EditShelfModal from '../components/Modal/EditShelfModal';
import type { ApiService } from '../services/api';
import { Shelf } from '../types';
import ShelfCard from '../components/Shelf/ShelfCard';
import { useShelfNavigation } from './../hooks/shelves/useShelfNavigation';
import { useTranslation } from '../i18n/I18nContext';

export default function ShelvesView({ api }: { api: ApiService }) {
  const { t } = useTranslation();
  const selectedCupboard = useAppStore((state) => state.selectedCupboard);
  const goBack = useAppStore((state) => state.goBack);

  const { data: shelves = [], isLoading } = useShelves(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToShelf } = useShelfNavigation();
  const { addShelf, updateShelf } = useShelfActions(api);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);

  if (!selectedCupboard) {
    goBack();
    return null;
  }

  if (isLoading) return <div className="text-ha-text">{t.common.loading}</div>;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.shelves.title} (${selectedCupboard})`}
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
            {t.shelves.noShelves}.
            {config?.allow_structure_modification && ` ${t.shelves.addFirst}!`}
          </p>
        ) : (
          shelves.map((shelf) => (
            <ShelfCard
              key={shelf.id}
              shelf={shelf}
              editable={config?.allow_structure_modification}
              onClick={() => goToShelf(shelf.name)}
              onEdit={() => setEditingShelf(shelf)}
            />
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
          shelf={editingShelf}
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
    </div>
  );
}
