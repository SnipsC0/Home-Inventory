import { useState, useCallback, useMemo } from 'react';
import { useCupboards } from '../hooks/cupboards/useCupboards';
import { useHomeInventarConfig } from '../hooks/global/useHomeInventarConfig';
import { useCupboardNavigation } from '../hooks/cupboards/useCupboardNavigation';
import { useCupboardActions } from '../hooks/cupboards/useCupboardActions';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import CupboardHeader from '../components/Cupboard/CupboardHeader';
import CupboardCard from '../components/Cupboard/CupboardCard';
import EditCupboardModal from '../components/Modal/EditCupboardModal';
import DeleteModal from '../components/Modal/DeleteModal';
import Breadcrumb from '../components/Layout/BreadCrumb';
import Loading from '../components/Loading';

import { downloadQRCode } from '../utils/qr-generator';

import type { ApiService } from '../services/api';
import type { ClickOrTouchEvent, Cupboard } from '../types';

interface Props {
  api: ApiService;
}

export default function CupboardsView({ api }: Props) {
  // i18n
  const { t } = useTranslation();

  // global state (routing context)
  const selectedRoom = useAppStore((s) => s.selectedRoom);
  const goBack = useAppStore((s) => s.goBack);

  // data
  const { data: cupboards = [], isLoading } = useCupboards(api);
  const { data: config } = useHomeInventarConfig(api);
  const { goToCupboard } = useCupboardNavigation();

  // mutations
  const { addCupboard, updateCupboard, deleteCupboard } =
    useCupboardActions(api);

  // ui state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCupboard, setEditingCupboard] = useState<Cupboard | null>(null);
  const [deletingCupboard, setDeletingCupboard] = useState<Cupboard | null>(
    null
  );

  // derived
  const allowEdit = !!config?.allow_structure_modification;
  const hasNoCupboards = cupboards.length === 0;

  // handlers
  const handleAdd = useCallback(() => {
    setEditingCupboard(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((cupboard: Cupboard) => {
    setEditingCupboard(cupboard);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingCupboard(null);
  }, []);

  const handleSave = useCallback(
    async (name: string, imageFile?: File | null) => {
      try {
        const normalizedImageFile = imageFile ?? null;
        if (editingCupboard) {
          await updateCupboard.mutateAsync({
            id: editingCupboard.id,
            name,
            imageFile: normalizedImageFile,
          });
        } else {
          await addCupboard.mutateAsync({
            name,
            imageFile: normalizedImageFile,
          });
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
    [editingCupboard, addCupboard, updateCupboard, handleCloseModal, t]
  );

  const handleDeleteRequest = useCallback((cupboard: Cupboard) => {
    setDeletingCupboard(cupboard);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingCupboard) return;
    try {
      await deleteCupboard.mutateAsync(deletingCupboard.id);
      setDeletingCupboard(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        t.errors?.unexpected ||
        'Unexpected error';
      alert(message);
    }
  }, [deletingCupboard, deleteCupboard, t]);

  const handleDownloadQR = useCallback(
    (e: ClickOrTouchEvent, cupboardName: string) => {
      e.preventDefault();
      e.stopPropagation();
      downloadQRCode(selectedRoom, cupboardName);
    },
    [selectedRoom]
  );

  const cards = useMemo(
    () =>
      cupboards.map((cupboard) => ({
        id: cupboard.id,
        name: cupboard.name,
        count: cupboard.itemCount,
        image: cupboard.image,
        editable: allowEdit,
        onClick: () => goToCupboard(cupboard.name),
        onEdit: () => handleEdit(cupboard),
        onQR: (e: ClickOrTouchEvent) => handleDownloadQR(e, cupboard.name),
        onDelete: allowEdit ? () => handleDeleteRequest(cupboard) : undefined,
      })),
    [
      cupboards,
      allowEdit,
      goToCupboard,
      handleEdit,
      handleDownloadQR,
      handleDeleteRequest,
    ]
  );

  // guards
  if (!selectedRoom) {
    goBack();
    return null;
  }
  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Breadcrumb
        currentLabel={`${t.cupboards.title} (${selectedRoom})`}
        onBack={goBack}
      />

      <CupboardHeader allowEdit={allowEdit} onToggleForm={handleAdd} />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {hasNoCupboards ? (
          <p className="text-center text-ha-text py-10">
            {t.cupboards.noCupboards}
            {allowEdit && ` ${t.cupboards.addFirst}`}
          </p>
        ) : (
          cards.map((props) => <CupboardCard key={props.id} {...props} />)
        )}
      </div>

      {/* Add/Edit */}
      {isModalOpen && allowEdit && (
        <EditCupboardModal
          isOpen
          cupboard={editingCupboard ?? undefined}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {/* Delete */}
      {deletingCupboard && (
        <DeleteModal
          isOpen
          itemName={deletingCupboard.name}
          itemType={t.cupboards.cupboard}
          itemCount={deletingCupboard.itemCount}
          onClose={() => setDeletingCupboard(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
