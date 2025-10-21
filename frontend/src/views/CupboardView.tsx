import { useState } from 'react';
import { useCupboards } from '../hooks/useCupboards';
import { useHomeInventarConfig } from '../hooks/useHomeInventarConfig';
import { useCupboardNavigation } from '../hooks/useCupboardNavigation';
import { useCupboardActions } from '../hooks/useCupboardActions';
import CupboardHeader from '../components/Cupboard/CupboardHeader';
import CupboardAddForm from '../components/Cupboard/CupboardAddForm';
import CupboardCard from '../components/Cupboard/CupboardCard';
import { downloadQRCode } from '../utils/qr-generator';
import EditCupboardModal from '../components/Modal/EditCupboardModal';
import DeleteModal from '../components/Modal/DeleteModal';
import Breadcrumb from '../components/Layout/BreadCrumb';
import type { ApiService } from '../services/api';
import type { ClickOrTouchEvent, Cupboard } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  api: ApiService;
}

export default function CupboardsView({ api }: Props) {
  const selectedRoom = useAppStore((state) => state.selectedRoom);
  const goBack = useAppStore((state) => state.goBack);
  const { data: cupboards = [], isLoading } = useCupboards(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToCupboard } = useCupboardNavigation();
  const { addCupboard, updateCupboard, deleteCupboard, uploadStatus } =
    useCupboardActions(api);

  const [showForm, setShowForm] = useState(false);
  const [editingCupboard, setEditingCupboard] = useState<Cupboard | null>(null);
  const [deletingCupboard, setDeletingCupboard] = useState<Cupboard | null>(
    null
  );

  const { t } = useTranslation();

  if (!selectedRoom) {
    goBack();
    return null;
  }

  if (isLoading) return <div className="text-ha-text">{t.common.loading}</div>;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.cupboards.title} (${selectedRoom})`}
        onBack={goBack}
      />

      <CupboardHeader
        allowEdit={config?.allow_structure_modification}
        onToggleForm={() => setShowForm((prev) => !prev)}
      />

      {showForm && config?.allow_structure_modification && (
        <CupboardAddForm
          uploadStatus={uploadStatus}
          pending={addCupboard.isPending}
          onSubmit={(name, file) =>
            addCupboard.mutate({ name, imageFile: file })
          }
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {cupboards.length === 0 ? (
          <p className="text-center text-ha-text py-10">
            {t.cupboards.noCupboards}
            {config?.allow_structure_modification && ` ${t.cupboards.addFirst}`}
          </p>
        ) : (
          cupboards.map((cupboard) => (
            <CupboardCard
              key={cupboard.id}
              name={cupboard.name}
              count={cupboard.itemCount}
              image={cupboard.image}
              editable={config?.allow_structure_modification}
              onClick={() => goToCupboard(cupboard.name)}
              onEdit={(e: ClickOrTouchEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingCupboard(cupboard);
              }}
              onDelete={() => setDeletingCupboard(cupboard)}
              onQR={() => downloadQRCode(selectedRoom, cupboard.name)}
            />
          ))
        )}
      </div>

      {editingCupboard && (
        <EditCupboardModal
          isOpen={true}
          cupboard={editingCupboard}
          onClose={() => setEditingCupboard(null)}
          onSave={async (newName, imageFile) => {
            await updateCupboard.mutateAsync({
              id: editingCupboard.id,
              name: newName,
              imageFile,
            });
            setEditingCupboard(null);
          }}
        />
      )}

      {deletingCupboard && (
        <DeleteModal
          isOpen={true}
          itemName={deletingCupboard.name}
          itemType={t.cupboards.cupboard}
          itemCount={deletingCupboard.itemCount}
          onClose={() => setDeletingCupboard(null)}
          onConfirm={async () => {
            await deleteCupboard.mutateAsync(deletingCupboard.id);
            setDeletingCupboard(null);
          }}
        />
      )}
    </div>
  );
}
