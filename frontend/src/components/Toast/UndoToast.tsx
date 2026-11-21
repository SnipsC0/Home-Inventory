import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, Undo2, X } from 'lucide-react';
import { useApi } from '../../contexts/ApiContext';
import { useTranslation } from '../../i18n/I18nContext';
import { useUndoStore } from '../../store/useUndoStore';
import { useRestoreTrash } from '../../hooks/trash/useTrash';

const HIDE_AFTER_MS = 8000;
const RESULT_HIDE_AFTER_MS = 3500;

type Kind = 'info' | 'success' | 'error';

const KIND_STYLES: Record<Kind, { accent: string; tile: string }> = {
  info: { accent: 'bg-ha-primary', tile: 'bg-ha-primary/15 text-ha-primary' },
  success: { accent: 'bg-ha-success', tile: 'bg-ha-success/15 text-ha-success' },
  error: { accent: 'bg-ha-error', tile: 'bg-ha-error/15 text-ha-error' },
};

export default function UndoToast() {
  const api = useApi();
  const { t } = useTranslation();
  const trashId = useUndoStore((s) => s.trashId);
  const hide = useUndoStore((s) => s.hide);
  const restore = useRestoreTrash(api);
  const [result, setResult] = useState<{ text: string; kind: Kind } | null>(
    null
  );

  useEffect(() => {
    if (trashId == null) return;
    setResult(null);
    const timer = setTimeout(hide, HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [trashId, hide]);

  // After a restore attempt, show the outcome briefly
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      setResult(null);
      hide();
    }, RESULT_HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [result, hide]);

  if (trashId == null) return null;

  const handleUndo = async () => {
    const res = await restore.mutateAsync(trashId);
    if (res.ok) {
      setResult({ text: t.trash.restored, kind: 'success' });
    } else if (res.error === 'parent_missing') {
      setResult({
        text: t.trash.parentMissing.replace('{parent}', res.parent_label ?? ''),
        kind: 'error',
      });
    } else {
      setResult({ text: t.trash.restoreFailed, kind: 'error' });
    }
  };

  const kind: Kind = result?.kind ?? 'info';
  const styles = KIND_STYLES[kind];
  const Icon = result
    ? result.kind === 'success'
      ? CheckCircle2
      : AlertTriangle
    : Trash2;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-0 sm:pb-6"
      role="status"
      aria-live="polite"
    >
      <div
        // Re-mount on result change so the entrance animation replays
        key={result ? 'result' : trashId}
        className="toast-in pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-ha-divider bg-ha-card text-ha-text shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex items-center gap-3 py-3 pl-3 pr-2 sm:gap-4 sm:py-3.5 sm:pl-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.tile}`}
          >
            <Icon size={20} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug sm:text-base">
            {result?.text ?? t.trash.movedToBin}
          </span>
          {!result && (
            <button
              onClick={handleUndo}
              disabled={restore.isPending}
              className="btn btn-primary shrink-0 !px-3 !py-1.5"
            >
              <Undo2 size={16} />
              {t.trash.undo}
            </button>
          )}
          <button
            onClick={hide}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ha-text/60 transition-colors hover:bg-ha-secondary-bg hover:text-ha-text"
          >
            <X size={16} />
          </button>
        </div>
        {/* Countdown bar */}
        <div className="h-1 w-full bg-ha-secondary-bg">
          <div
            className={`toast-progress h-full ${styles.accent}`}
            style={{
              animationDuration: `${result ? RESULT_HIDE_AFTER_MS : HIDE_AFTER_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
