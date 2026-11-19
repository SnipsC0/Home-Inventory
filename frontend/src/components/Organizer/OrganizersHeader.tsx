import { FolderOpen, Plus } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  allowEdit?: boolean;
  onAddOrganizer: () => void;
  onAddDirectItem: () => void;
}

export default function OrganizersHeader({
  allowEdit,
  onAddOrganizer,
  onAddDirectItem,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
      <h3 className="page-title">
        <span className="page-title-icon">
          <FolderOpen size={22} />
        </span>
        {t.organizers.title}
      </h3>

      {allowEdit && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={onAddOrganizer} className="btn btn-primary">
            <Plus size={16} />
            {`${t.common.add} ${t.organizers.organizer}`}
          </button>
          <button onClick={onAddDirectItem} className="btn btn-outline">
            <Plus size={16} />
            {`${t.common.add} ${t.items.addItemWithoutOrganizer}`}
          </button>
        </div>
      )}
    </div>
  );
}
