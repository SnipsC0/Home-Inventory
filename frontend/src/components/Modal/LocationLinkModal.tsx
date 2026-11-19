import { useEffect, useState } from 'react';
import { Copy, Download, Nfc, QrCode } from 'lucide-react';
import { Modal, ModalHeader } from './Modal';
import { useTranslation } from '../../i18n/I18nContext';
import type { LocationTarget } from '../../types';
import {
  buildLocationLink,
  downloadDataUrl,
  fileSafe,
  generateQRDataUrl,
} from '../../utils/location-link';

interface Props {
  target: LocationTarget;
  id: number;
  /** Human-readable location, shown under the QR code (e.g. "Kitchen › Pantry"). */
  label: string;
  linkBase?: string | null;
  onClose: () => void;
}

export default function LocationLinkModal({
  target,
  id,
  label,
  linkBase,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const link = buildLocationLink(linkBase, target, id);

  const [tab, setTab] = useState<'qr' | 'nfc'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    generateQRDataUrl(link)
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch((err) => console.error('QR generation failed:', err));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const fileName = `QR_${fileSafe(label) || target}_${target}${id}.png`;

  const handleDownload = () => {
    if (qrDataUrl) downloadDataUrl(qrDataUrl, fileName);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabClass = (active: boolean) =>
    `btn flex-1 !py-2 ${active ? 'btn-primary' : 'btn-secondary'}`;

  return (
    <Modal isOpen onClose={onClose} maxWidth="420px">
      <ModalHeader onClose={onClose}>{t.locationLink.title}</ModalHeader>

      <div className="flex gap-2 mb-4">
        <button className={tabClass(tab === 'qr')} onClick={() => setTab('qr')}>
          <QrCode size={16} /> {t.locationLink.qr}
        </button>
        <button
          className={tabClass(tab === 'nfc')}
          onClick={() => setTab('nfc')}
        >
          <Nfc size={16} /> {t.locationLink.nfc}
        </button>
      </div>

      {tab === 'qr' && (
        <div className="space-y-4 text-center">
          <div className="bg-white rounded-xl p-3 inline-block">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={label} className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56" />
            )}
          </div>
          <div className="font-semibold text-ha-text">{label}</div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="btn btn-primary w-full"
            >
              <Download size={16} /> {t.locationLink.download}
            </button>
          </div>
        </div>
      )}

      {tab === 'nfc' && (
        <div className="space-y-4">
          <div>
            <label className="text-ha-text text-sm block mb-1">
              {t.locationLink.link}
            </label>
            <div className="flex gap-2">
              <input readOnly value={link} className="field flex-1 text-xs" />
              <button onClick={handleCopy} className="btn btn-secondary !py-2">
                <Copy size={16} />
                {copied ? t.locationLink.copied : t.locationLink.copy}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
