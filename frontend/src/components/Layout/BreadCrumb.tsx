import { useTranslation } from '../../i18n/I18nContext';

interface BreadcrumbProps {
  onBack: () => void;
  currentLabel: string;
}

export default function Breadcrumb({ onBack, currentLabel }: BreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center gap-2 text-ha-text flex-wrap">
      <button
        onClick={onBack}
        className="text-ha-primary hover:underline px-1 py-1 transition"
      >
        ← {t.common.back}
      </button>
      <span className="text-ha-text opacity-60">/</span>
      <span className="font-semibold text-ha-text">{currentLabel}</span>
    </div>
  );
}
