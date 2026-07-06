import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

const SCAN_REGION_ID = 'qr-reader-region';

export default function QRScanner({ onScan, disabled }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    if (isInitializedRef.current) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = scanner;

      const isMobile = window.innerWidth < 640;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: isMobile ? 180 : 250, height: isMobile ? 180 : 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {}
      );

      isInitializedRef.current = true;
      setIsScanning(true);
    } catch (err) {
      console.error('QR Scanner error:', err);
      setError(err.message || 'Failed to start camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
      isInitializedRef.current = false;
    }
  }

  async function stopScanner() {
    if (scannerRef.current && isInitializedRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      scannerRef.current.clear();
      scannerRef.current = null;
      isInitializedRef.current = false;
      setIsScanning(false);
    }
  }

  function handleDecodedText(decodedText) {
    try {
      const url = new URL(decodedText);
      const params = new URLSearchParams(url.search);
      const vehicleId = params.get('vid');
      const plateNumber = params.get('plate')?.toUpperCase();

      if (vehicleId) {
        onScan({ vehicleId, plateNumber, raw: decodedText });
      }
    } catch {
      // Not a URL, try parsing as JSON or raw text
      try {
        const data = JSON.parse(decodedText);
        if (data.vehicleId) {
          onScan(data);
        }
      } catch {
        onScan({ raw: decodedText, vehicleId: null, plateNumber: null });
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        id={SCAN_REGION_ID}
        className="w-full max-w-xs sm:max-w-sm rounded-lg overflow-hidden border"
        style={{ minHeight: isScanning ? 200 : 0 }}
      />

      {!isScanning && (
        <div className="text-center text-sm text-muted-foreground">
          {error || 'Click the button below to start scanning'}
        </div>
      )}

      <div className="flex gap-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            <CameraOff className="h-4 w-4" />
            Stop Scanner
          </button>
        )}
      </div>
    </div>
  );
}
