import { QrCode } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  onClick: () => void;
}

/** "QR / NFC" button for location cards; never triggers the card's own click/long-press. */
export default function LocationLinkButton({ onClick }: Props) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        className="btn btn-secondary m-auto !py-2"
      >
        <QrCode size={16} />
        {t.locationLink.button}
      </button>
    </div>
  );
}
