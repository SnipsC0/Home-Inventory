import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import {
  CameraOff,
  CheckCircle,
  AlertCircle,
  Upload,
  Video,
  X,
  Copy,
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';

interface BarcodeScannerProps {
  onScan?: (barcode: string) => void;
  onClose?: () => void;
  autoStop?: boolean;
}

type ScanMode = 'video' | 'photo' | 'manual';

export function BarcodeScanner({
  onScan,
  onClose,
  autoStop = true,
}: BarcodeScannerProps) {
  const [result, setResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; timestamp: Date }>
  >([]);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [isSecureContext, setIsSecureContext] = useState(
    window.isSecureContext
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const api = useApi();

  useEffect(() => {
    setIsSecureContext(window.isSecureContext);

    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleDecode = useCallback(
    (decodedText: string, method: ScanMode = 'video') => {
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

      if (autoStop) {
        setIsScanning(false);
        setScanMode(null);
      }
    },
    [onScan, autoStop]
  );

  const { ref: videoRef } = useZxing({
    paused: !isScanning || scanMode !== 'video',
    onDecodeResult(result) {
      handleDecode(result.getText(), 'video');
    },
    onError(error) {
      console.error('Video streaming error:', error);
      handleCameraError(error as any);
    },
    timeBetweenDecodingAttempts: 300,
    constraints: {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
  });

  const handleCameraError = (error: Error) => {
    let errorMessage = 'Eroare necunoscută';

    if (error.name === 'NotAllowedError') {
      errorMessage =
        '🚫 Acces la cameră refuzat.\n\nPași:\n1. Click pe iconița 🔒 din bara de adrese\n2. Permite accesul la cameră\n3. Reîncarcă pagina';
    } else if (error.name === 'NotFoundError') {
      errorMessage = '📷 Nu s-a găsit camera pe dispozitiv.';
    } else if (error.name === 'NotReadableError') {
      errorMessage =
        '⚠️ Camera este folosită de altă aplicație.\n\nÎnchide alte aplicații care folosesc camera.';
    } else {
      errorMessage = `❌ Eroare: ${error.message}`;
    }

    setError(errorMessage);
    setIsScanning(false);
    setScanMode(null);
  };

  const capturePhotoAndDecode = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoStreamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = photoCanvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;

      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      await decodeImageOnBackend(imageData);
    } catch (err: any) {
      console.error('Photo capture error:', err);
      handleCameraError(err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
        setError('❌ Eroare la citirea fișierului.');
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setError('❌ Eroare la încărcarea fișierului.');
      setIsProcessing(false);
    }
  }, []);

  const decodeImageOnBackend = async (imageData: string) => {
    try {
      const data = await api.decodeBarcode(imageData);

      if (data.success && data.barcodes && data.barcodes.length > 0) {
        handleDecode(data.barcodes[0].data, 'photo');
      } else {
        setError(
          data.error ||
            '❌ Nu s-a găsit niciun cod de bare în imagine.\n\nSfaturi:\n• Asigură-te că luminozitatea este bună\n• Poziționează codul în centrul imaginii\n• Încearcă să fii mai aproape de cod'
        );
      }
    } catch (err: any) {
      console.error('Decode error:', err);
      setError(`❌ Eroare la procesarea imaginii:\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVideoScan = () => {
    setScanMode('video');
    setIsScanning(true);
    setError(null);
    setResult('');
  };

  const startPhotoScan = () => {
    setScanMode('photo');
    setResult('');
    capturePhotoAndDecode();
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanMode(null);
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            📷 Scanare Cod de Bare
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            {isSecureContext ? (
              <>
                {!isScanning ? (
                  <button
                    onClick={startVideoScan}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold 
                      rounded-lg shadow-md bg-green-500 hover:bg-green-600 text-white 
                      transition duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <Video size={20} />
                    <span>Scanare Video</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold 
                      rounded-lg shadow-md bg-red-500 hover:bg-red-600 text-white transition duration-300"
                  >
                    <CameraOff size={20} />
                    <span>Oprește</span>
                  </button>
                )}
              </>
            ) : (
              ''
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold 
                rounded-lg shadow-md bg-purple-500 hover:bg-purple-600 text-white 
                transition duration-300 transform hover:scale-105 active:scale-95 
                disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Upload size={20} />
              <span>Încarcă Imagine</span>
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

          <canvas ref={photoCanvasRef} className="hidden" />

          {isSecureContext && scanMode === 'video' && isScanning && (
            <div className="relative w-full mb-4 rounded-xl overflow-hidden">
              <video
                ref={videoRef as React.LegacyRef<HTMLVideoElement>}
                className="w-full rounded-xl shadow-lg border-4 border-green-400"
                style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                muted
                playsInline
                autoPlay
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/3 border-2 border-red-500 rounded-lg shadow-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500"></div>
                </div>
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm font-medium bg-black bg-opacity-50 inline-block px-4 py-2 rounded-full">
                  📱 Poziționează codul în dreptunghi
                </p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-blue-800 font-medium">
                    Procesare imagine...
                  </p>
                  <p className="text-blue-600 text-sm">
                    Căutăm coduri de bare în imagine
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⌨️ Sau introdu codul manual:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Introdu codul de bare..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white 
                    rounded-lg font-medium transition"
                >
                  ✓
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Apasă Enter sau butonul ✓ pentru a adăuga
              </p>
            </div>
          </div>

          {/* Erori */}
          {error && (
            <div className="mb-4">
              <div
                className="flex items-start gap-2 p-4 bg-red-100 border border-red-400 
                text-red-700 rounded-lg"
              >
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <pre className="text-sm whitespace-pre-wrap font-sans flex-1">
                  {error}
                </pre>
              </div>
            </div>
          )}

          {/* Rezultat */}
          {result && (
            <div className="mb-4">
              <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle
                    size={20}
                    className="text-green-600 flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 mb-1">
                      Cod scanat {scanMode === 'video' && '(Video)'}
                      {scanMode === 'photo' && '(Poză)'}
                      {scanMode === 'manual' && '(Manual)'}:
                    </p>
                    <p className="text-lg font-bold text-green-900 break-all mb-2">
                      {result}
                    </p>
                    <button
                      onClick={() => copyToClipboard(result)}
                      className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 
                        font-medium transition"
                    >
                      <Copy size={16} />
                      <span>{copied ? 'Copiat! ✓' : 'Copiază cod'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Istoric scanări */}
          {scanHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-700">
                  📜 Istoric Scanări ({scanHistory.length})
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-500 hover:text-red-700 font-medium underline"
                >
                  Șterge tot
                </button>
              </div>
              <div
                className="bg-white rounded-lg shadow border border-gray-200 divide-y 
                divide-gray-200 max-h-60 overflow-y-auto"
              >
                {scanHistory.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {
                      setResult(item.code);
                      copyToClipboard(item.code);
                    }}
                  >
                    <p className="font-mono text-sm font-medium text-gray-800 break-all">
                      {item.code}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.timestamp.toLocaleString('ro-RO', {
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
              <p className="text-xs text-gray-500 mt-2 text-center">
                💡 Click pe un cod pentru a-l selecta și copia
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
