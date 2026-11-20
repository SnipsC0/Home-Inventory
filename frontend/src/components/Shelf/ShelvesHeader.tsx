import { Library, Plus } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  allowEdit?: boolean;
  onAddShelf: () => void;
}

export default function ShelvesHeader({ allowEdit, onAddShelf }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
      <h3 className="page-title">
        <span className="page-title-icon">
          <Library size={22} />
        </span>
        {t.shelves.title}
      </h3>

      {allowEdit && (
        <button onClick={onAddShelf} className="btn btn-primary">
          <Plus size={16} />
          {t.common.add} {t.shelves.shelf}
        </button>
      )}
    </div>
  );
}
