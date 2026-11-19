import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Copy,
  ScanLine,
  Video,
  Keyboard,
  Check,
  History,
  Lightbulb,
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { useTranslation } from '../i18n/I18nContext';

interface BarcodeScannerProps {
  onScan?: (barcode: string) => void;
  onClose?: () => void;
  /** Start the native video scan immediately on mount (app only). */
  autoStartNative?: boolean;
}

type ScanMode = 'native' | 'photo' | 'manual';

export function BarcodeScanner({
  onScan,
  onClose,
  autoStartNative = false,
}: BarcodeScannerProps) {
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; timestamp: Date }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const api = useApi();
  const { t, language } = useTranslation();
  const ts = t.scanner;

  const nativeScanPendingRef = useRef(false);
  const hasNativeScanner = !!api.externalBus?.config?.hasBarCodeScanner;

  useEffect(() => {
    return () => {
      nativeScanPendingRef.current = false;
    };
  }, []);

  const handleDecode = useCallback(
    (decodedText: string, method: ScanMode = 'native') => {
      if (!/^\d+$/.test(decodedText)) {
        setError(ts.onlyNumeric);
        return;
      }
      setResult(decodedText);
      setError(null);

      setScanHistory((prev) => {
        if (prev.length > 0 && prev[0].code === decodedText) {
          return prev;
        }
        return [
          { code: decodedText, timestamp: new Date() },
          ...prev.slice(0, 9),
        ];
      });

      if (onScan) {
        onScan(decodedText);
      }
    },
    [onScan, ts]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);

      const reader = new FileReader();

      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        await decodeImageOnBackend(imageData);
      };

      reader.onerror = () => {
        setError(ts.readFailed);
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setError(ts.loadFailed);
      setIsProcessing(false);
    }
  }, [ts]);

  const decodeImageOnBackend = async (imageData: string) => {
    try {
      const data = await api.decodeBarcode(imageData);

      if (data.success && data.barcodes && data.barcodes.length > 0) {
        handleDecode(data.barcodes[0].data, 'photo');
      } else {
        setError(
          data.error || ts.noBarcodeFound
        );
      }
    } catch (err: any) {
      console.error('Decode error:', err);
      setError(`${ts.processFailed}\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Companion app native scanner (works on http, no secure context needed).
  const handleDecodeRef = useRef(handleDecode);
  handleDecodeRef.current = handleDecode;
  const apiRef = useRef(api);
  apiRef.current = api;
  const autoStartRef = useRef(autoStartNative);
  autoStartRef.current = autoStartNative;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Tap window.externalBus (the app's inbound channel) and always forward
  // to the original handler, so HA's own messaging keeps working.
  useEffect(() => {
    if (!hasNativeScanner) return;
    const w = window as any;
    const original = w.externalBus;
    const tap = (raw: any) => {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (nativeScanPendingRef.current) {
          const cmd = msg?.command ?? msg?.type;
          if (cmd === 'bar_code/scan_result') {
            nativeScanPendingRef.current = false;
            const code = msg.payload?.rawValue;
            if (code) handleDecodeRef.current(String(code), 'photo');
            // The app keeps the native scanner open until told to close.
            const bus = apiRef.current.externalBus;
            (bus?.fireMessage ?? bus?.sendMessage)?.call(bus, {
              type: 'bar_code/close',
            });
          } else if (cmd === 'bar_code/aborted') {
            nativeScanPendingRef.current = false;
            if (autoStartRef.current) onCloseRef.current?.();
          }
        }
      } catch (e) {
        console.error('externalBus tap error', e);
      }
      return original?.(raw);
    };
    w.externalBus = tap;
    return () => {
      if (w.externalBus === tap) w.externalBus = original;
    };
  }, [hasNativeScanner]);

  const startNativeScan = () => {
    setError(null);
    setResult('');
    nativeScanPendingRef.current = true;
    Promise.resolve(
      api.externalBus.sendMessage({
        type: 'bar_code/scan',
        payload: {
          title: ts.nativeTitle,
          description: ts.nativeDescription,
          alternative_option_label: ts.nativeCancel,
        },
      })
    ).catch((e) => console.error('Native scan request failed', e));
  };

  useEffect(() => {
    if (autoStartNative && hasNativeScanner) startNativeScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearHistory = () => {
    setScanHistory([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleManualInput = (value: string) => {
    if (value.trim()) {
      handleDecode(value.trim(), 'manual');
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-md p-4">
      <div className="modal-panel bg-ha-card text-ha-text rounded-3xl shadow-ha-lg border border-ha-divider/60 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ha-card/95 backdrop-blur border-b border-ha-divider/60 p-5 flex items-center justify-between">
          <h2 className="page-title !text-lg">
            <span className="page-title-icon">
              <ScanLine size={20} />
            </span>
            {ts.title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-ghost !p-2 !rounded-full"
              aria-label={t.common.close}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap gap-3 mb-4">
            {hasNativeScanner && (
              <button
                onClick={startNativeScan}
                className="btn btn-primary flex-1 !py-3"
              >
                <Video size={18} />
                {ts.videoScan}
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="btn btn-secondary flex-1 !py-3"
            >
              <Upload size={18} />
              {ts.uploadImage}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />
          </div>

          {isProcessing && (
            <div className="mb-4 bg-ha-primary/10 border border-ha-primary/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-ha-primary/30 border-t-ha-primary animate-spin"></div>
              <div>
                <p className="font-semibold">{ts.processing}</p>
                <p className="text-sm text-ha-text/60">
                  {ts.processingHint}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4 bg-ha-secondary-bg/60 border border-ha-divider/60 p-4 rounded-2xl">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold mb-3">
              <Keyboard size={14} /> {ts.manualLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={ts.manualPlaceholder}
                inputMode="numeric"
                pattern="[0-9]*"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.value = el.value.replace(/\D/g, '');
                }}
                className="field flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value.trim();
                    handleManualInput(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget
                    .previousElementSibling as HTMLInputElement;
                  const value = input.value.trim();
                  handleManualInput(value);
                  input.value = '';
                }}
                className="btn btn-primary"
                aria-label={ts.add}
              >
                <Check size={18} />
              </button>
            </div>
            <p className="text-xs text-ha-text/60 mt-2">
              {ts.manualHint}
            </p>
          </div>

          {/* Errors */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-4 bg-ha-error/10 border border-ha-error/30 text-ha-error rounded-2xl">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <pre className="text-sm whitespace-pre-wrap font-sans flex-1">
                {error}
              </pre>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <CheckCircle
                  size={20}
                  className="text-green-500 flex-shrink-0 mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-600 mb-1">
                    {ts.scannedCode}
                  </p>
                  <p className="text-lg font-bold break-all mb-2">{result}</p>
                  <button
                    onClick={() => copyToClipboard(result)}
                    className="btn btn-ghost !px-2 !py-1 !text-green-600"
                  >
                    <Copy size={16} />
                    <span>{copied ? ts.copied : ts.copyCode}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scan history */}
          {scanHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-ha-text/60 font-semibold">
                  <History size={14} /> {ts.history} ({scanHistory.length})
                </h3>
                <button
                  onClick={clearHistory}
                  className="btn btn-ghost !px-2 !py-1 !text-ha-error"
                >
                  {ts.clearAll}
                </button>
              </div>
              <div className="surface divide-y divide-ha-divider/60 max-h-60 overflow-y-auto">
                {scanHistory.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-ha-secondary-bg/60 cursor-pointer transition"
                    onClick={() => {
                      setResult(item.code);
                      copyToClipboard(item.code);
                    }}
                  >
                    <p className="font-mono text-sm font-medium break-all">
                      {item.code}
                    </p>
                    <p className="text-xs text-ha-text/60 mt-1">
                      {item.timestamp.toLocaleString(language, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ha-text/60 mt-2 inline-flex w-full justify-center items-center gap-1.5">
                <Lightbulb size={14} /> {ts.historyHint}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
