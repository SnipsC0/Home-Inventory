import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  cupboardName: string;
  allowEdit?: boolean;
  onAddShelf: () => void;
}

export default function ShelvesHeader({
  cupboardName,
  allowEdit,
  onAddShelf,
}: Props) {
  const { t, language } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="m-0 text-ha-text text-lg font-semibold">
        📚 {t.shelves.title} {language === 'en' ? 'from' : 'din'} {cupboardName}
      </h3>

      {allowEdit && (
        <button
          onClick={onAddShelf}
          className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
        >
          + {t.common.add} {t.shelves.shelf}
        </button>
      )}
    </div>
  );
}
