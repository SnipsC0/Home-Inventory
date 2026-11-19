import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { BarcodeScanner } from '../BarcodeScanner';
import { Modal, ModalHeader } from './Modal';
import ItemCard from '../Item/ItemCard';
import { useGlobalItems } from '../../hooks/items/useItems';
import { useApi } from '../../contexts/ApiContext';
import { useTranslation } from '../../i18n/I18nContext';
import type { ApiService } from '../../services/api';
import type { Item } from '../../types';

interface Props {
  api: ApiService;
  onClose: () => void;
}

type Step = 'scan' | 'manual' | 'result';

export default function FindByBarcodeModal({ api, onClose }: Props) {
  const { t } = useTranslation();
  const hassApi = useApi();
  const { data: allItems = [] } = useGlobalItems(api);

  // Native scanner exists only in the HA Companion app.
  const hasNativeScanner = !!hassApi.externalBus?.config?.hasBarCodeScanner;

  const [step, setStep] = useState<Step>(hasNativeScanner ? 'scan' : 'manual');
  const [code, setCode] = useState('');

  const handleScan = useCallback((scanned: string) => {
    setCode(scanned);
    setStep('result');
  }, []);

  const submitManual = () => {
    const value = code.trim();
    if (value) setStep('result');
  };

  const restart = () => {
    setCode('');
    setStep(hasNativeScanner ? 'scan' : 'manual');
  };

  if (step === 'scan') {
    return (
      <BarcodeScanner
        autoStartNative
        onScan={handleScan}
        // Fired when the user dismisses the native scanner without a result.
        onClose={() => setStep('manual')}
      />
    );
  }

  if (step === 'manual') {
    return (
      <Modal isOpen onClose={onClose} maxWidth="360px">
        <ModalHeader onClose={onClose} className="mb-3 pb-2">
          {t.items.findByBarcode}
        </ModalHeader>
        {hasNativeScanner && (
          <button
            className="btn btn-secondary w-full mb-3"
            onClick={() => setStep('scan')}
          >
            {t.items.scanAgain}
          </button>
        )}
        {hasNativeScanner && (
          <p className="text-sm text-ha-text/70 mb-3">
            {t.items.enterBarcodeManually}
          </p>
        )}
        <div className="flex gap-2">
          <input
            autoFocus
            value={code}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t.items.barcode}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitManual();
            }}
            className="field flex-1"
          />
          <button
            onClick={submitManual}
            disabled={!code.trim()}
            className="btn btn-primary"
            aria-label={t.items.findByBarcode}
          >
            <Search size={18} />
          </button>
        </div>
      </Modal>
    );
  }

  const item: Item | undefined =
    allItems.find((i) => i.barcode === code) ??
    allItems.find((i) => i.variant_barcodes?.some((vb) => vb.barcode === code));
  const matchedVariant = item?.variant_barcodes?.find(
    (vb) => vb.barcode === code
  )?.variant;

  return (
    <Modal isOpen onClose={onClose} maxWidth="360px">
      <ModalHeader onClose={onClose}>
        {t.items.barcode}: {code}
      </ModalHeader>
      {item && matchedVariant && (
        <p className="text-center text-ha-text text-sm mb-2">
          {t.items.matchedVariant}: <strong>{matchedVariant}</strong>
        </p>
      )}
      {item ? (
        <ItemCard
          item={item}
          variant="compact"
          showMultipleLocations={item.track_quantity}
        />
      ) : (
        <p className="text-center text-ha-text py-4">
          {t.items.barcodeNotFound}
        </p>
      )}
      <div className="flex gap-3 mt-6">
        <button className="btn btn-secondary flex-1" onClick={restart}>
          {t.items.scanAgain}
        </button>
      </div>
    </Modal>
  );
}
