import { Archive, Plus } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  allowEdit?: boolean;
  onToggleForm: () => void;
}

export default function CupboardHeader({ allowEdit, onToggleForm }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
      <h3 className="page-title">
        <span className="page-title-icon">
          <Archive size={22} />
        </span>
        {t.cupboards.title}
      </h3>

      {allowEdit && (
        <button onClick={onToggleForm} className="btn btn-primary">
          <Plus size={16} />
          {t.common.add} {t.cupboards.cupboard}
        </button>
      )}
    </div>
  );
}
