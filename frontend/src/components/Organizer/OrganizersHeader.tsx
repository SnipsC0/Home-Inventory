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
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="text-ha-text font-semibold mb-3 text-lg">
        🗂️ {t.organizers.title}
      </h3>

      {allowEdit && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAddOrganizer}
            className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
          >
            + {`${t.common.add} ${t.organizers.organizer}`}
          </button>
          <button
            onClick={onAddDirectItem}
            className="px-3 py-2 bg-ha-secondary-bg border border-ha-primary text-ha-primary rounded hover:bg-ha-card transition"
          >
            + {`${t.common.add} ${t.items.addItemWithoutOrganizer}`}
          </button>
        </div>
      )}
    </div>
  );
}
