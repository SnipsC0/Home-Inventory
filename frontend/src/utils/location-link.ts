import QRCode from 'qrcode';
import type { LocationTarget } from '../types';

/** Panel deep-link base; the backend sends the same value as `qr_redirect_url`. */
export const DEFAULT_LINK_BASE = 'homeassistant://navigate/home_inventory';

/** Deep link by id: survives renames and has no diacritics issues. */
export function buildLocationLink(
  base: string | null | undefined,
  target: LocationTarget,
  id: number
): string {
  const root = (base || DEFAULT_LINK_BASE).replace(/[?/]+$/, '');
  return `${root}?target=${target}&id=${id}`;
}

/** QR code PNG as a data URL, generated locally (no external service). */
export function generateQRDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Safe file name part (keeps letters incl. diacritics, digits, - and _). */
export function fileSafe(text: string): string {
  return text.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '');
}
