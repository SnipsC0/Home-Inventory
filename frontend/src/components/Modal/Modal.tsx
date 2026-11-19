import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '500px',
}: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overscroll-contain touch-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel bg-ha-card rounded-3xl shadow-ha-lg border border-ha-divider/60 p-6 w-full max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  children,
  onClose,
  className = 'mb-5 pb-4',
}: {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-center gap-3 border-b border-ha-divider/60 ${className}`}
    >
      <h3 className="m-0 text-ha-text text-lg font-bold tracking-tight flex-1">
        {children}
      </h3>
      {onClose && (
        <button
          onClick={onClose}
          aria-label={t.common.close}
          className="btn btn-ghost !p-2 !rounded-full opacity-70 hover:opacity-100"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 mt-6">{children}</div>;
}
