import { FC, ReactElement, useState } from 'react';
import {
  Trash2,
  Undo2,
  Home,
  Archive,
  Layers,
  Box,
  Package,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import type { ApiService } from '../services/api';
import type { TrashEntry, TrashKind, TrashWarning } from '../types';
import {
  useTrash,
  useRestoreTrash,
  useDeleteTrashEntry,
  useEmptyTrash,
} from '../hooks/trash/useTrash';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';
import Breadcrumb from '../components/Layout/BreadCrumb';
import Loading from '../components/Loading';

interface Props {
  api: ApiService;
}

const KIND_ICONS: Record<TrashKind, LucideIcon> = {
  room: Home,
  cupboard: Archive,
  shelf: Layers,
  organizer: Box,
  item_master: Package,
  item_location: MapPin,
};

const DAY_MS = 86_400_000;

interface Feedback {
  text: string;
  parentTrashId?: number | null;
}

const TrashView: FC<Props> = ({ api }): ReactElement => {
  const { t } = useTranslation();
  const goBack = useAppStore((s) => s.goBack);
  const { data, isLoading, error } = useTrash(api);
  const restore = useRestoreTrash(api);
  const deleteEntry = useDeleteTrashEntry(api);
  const emptyTrash = useEmptyTrash(api);
  // per-entry message from the last failed restore attempt
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});

  if (isLoading) return <Loading />;

  const entries = data?.entries ?? [];

  const summaryText = (e: TrashEntry) => {
    const s = e.summary;
    const parts: [number | undefined, string][] = [
      [s.cupboards, t.common.cascadeCupboards],
      [s.shelves, t.common.cascadeShelves],
      [s.organizers, t.common.cascadeOrganizers],
      [s.locations, t.common.cascadeLocations],
      [s.items, t.common.cascadeItems],
      [s.images, t.common.cascadeImages],
    ];
    return parts
      .filter(([n]) => n && n > 0)
      .map(([n, label]) => `${n} ${label}`)
      .join(', ');
  };

  const expiry = (e: TrashEntry) => {
    if (!e.expires_at) return null;
    const days = Math.ceil(
      (new Date(e.expires_at).getTime() - Date.now()) / DAY_MS
    );
    return {
      urgent: days <= 1,
      label:
        days <= 0
          ? t.trash.expiresToday
          : t.trash.expiresDays.replace('{n}', String(days)),
    };
  };

  const warningText = (w: TrashWarning) => {
    switch (w.code) {
      case 'renamed':
        return t.trash.warnRenamed
          .replace('{from}', w.from)
          .replace('{to}', w.to);
      case 'item_merged':
        return t.trash.warnItemMerged.replace('{name}', w.name);
      case 'barcode_dropped':
        return t.trash.warnBarcodeDropped
          .replace('{barcode}', w.barcode)
          .replace('{name}', w.name);
      case 'variant_barcode_skipped':
        return t.trash.warnVariantBarcodeSkipped
          .replace('{barcode}', w.barcode)
          .replace('{variant}', w.variant);
    }
  };

  const handleRestore = async (entry: TrashEntry) => {
    const result = await restore.mutateAsync(entry.id);
    if (result.ok) {
      if (result.warnings.length > 0) {
        // the entry disappears from the list, so surface the warnings here
        window.alert(result.warnings.map(warningText).join('\n'));
      }
      return;
    }
    const text =
      result.error === 'parent_missing'
        ? t.trash.parentMissing.replace('{parent}', result.parent_label ?? '')
        : t.trash.restoreFailed;
    setFeedback((f) => ({
      ...f,
      [entry.id]: {
        text,
        parentTrashId:
          result.error === 'parent_missing' ? result.parent_trash_id : null,
      },
    }));
  };

  const handleDelete = (entry: TrashEntry) => {
    if (
      window.confirm(t.trash.deleteForeverConfirm.replace('{name}', entry.label))
    ) {
      deleteEntry.mutate(entry.id);
    }
  };

  const handleEmpty = () => {
    if (window.confirm(t.trash.emptyConfirm)) emptyTrash.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Breadcrumb onBack={goBack} currentLabel={t.trash.title} />

      <div className="flex items-center justify-between gap-3">
        <h3 className="page-title min-w-0">
          <span className="page-title-icon">
            <Trash2 size={22} />
          </span>
          <span className="truncate">{t.trash.title}</span>
        </h3>
        {entries.length > 0 && (
          <button
            onClick={handleEmpty}
            disabled={emptyTrash.isPending}
            className="btn btn-danger shrink-0"
          >
            <Trash2 size={16} />
            {t.trash.emptyBin}
          </button>
        )}
      </div>

      {error ? (
        <div className="text-ha-error text-center py-6">
          {t.trash.loadError}
        </div>
      ) : entries.length === 0 ? (
        <div className="surface text-center py-12">
          <Trash2 className="w-12 h-12 text-ha-secondary mx-auto mb-3" />
          <p className="text-ha-text font-medium">{t.trash.empty}</p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {entries.map((entry) => {
            const Icon = KIND_ICONS[entry.kind] ?? Package;
            const exp = expiry(entry);
            const fb = feedback[entry.id];
            const summary = summaryText(entry);
            const parent =
              fb?.parentTrashId != null
                ? entries.find((x) => x.id === fb.parentTrashId)
                : undefined;
            return (
              <div key={entry.id} className="surface p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ha-secondary-bg text-ha-primary">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ha-text truncate">
                      {entry.label}
                      <span className="ml-2 text-xs text-ha-secondary">
                        {t.trash.kinds[entry.kind]}
                      </span>
                    </div>
                    {entry.path && (
                      <div className="text-sm text-ha-secondary truncate">
                        {entry.path}
                      </div>
                    )}
                    {summary && (
                      <div className="text-sm text-ha-secondary">{summary}</div>
                    )}
                  </div>
                  {exp && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                        exp.urgent ? 'bg-amber-500' : 'bg-ha-primary'
                      }`}
                    >
                      {exp.label}
                    </span>
                  )}
                </div>

                {fb && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ha-error">
                    <span>{fb.text}</span>
                    {parent && (
                      <button
                        className="btn btn-secondary !py-1"
                        onClick={() => handleRestore(parent)}
                      >
                        {t.trash.restoreParent.replace('{parent}', parent.label)}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={restore.isPending}
                    onClick={() => handleRestore(entry)}
                  >
                    <Undo2 size={16} />
                    {t.trash.restore}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={deleteEntry.isPending}
                    onClick={() => handleDelete(entry)}
                  >
                    <Trash2 size={16} />
                    {t.trash.deleteForever}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashView;
