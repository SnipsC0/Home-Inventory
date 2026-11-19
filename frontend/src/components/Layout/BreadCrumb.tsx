import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface BreadcrumbProps {
  onBack: () => void;
  currentLabel: string;
}

export default function Breadcrumb({ onBack, currentLabel }: BreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <nav className="mb-2 flex items-center gap-1 text-ha-text flex-wrap text-sm">
      <button onClick={onBack} className="btn btn-ghost !px-3 !py-1.5">
        <ArrowLeft size={16} />
        {t.common.back}
      </button>
      <ChevronRight size={16} className="opacity-40" />
      <span className="font-semibold px-2">{currentLabel}</span>
    </nav>
  );
}
