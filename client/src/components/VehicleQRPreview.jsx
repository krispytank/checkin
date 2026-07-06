import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vehicleAPI } from '../lib/api.js';
import { QrCode, Download, Loader2, Printer, X } from 'lucide-react';

export default function VehicleQRPreview({ vehicleId, vehicleName, plateNumber, onClose }) {
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: qrData, isLoading } = useQuery({
    queryKey: ['vehicle-qr', vehicleId],
    queryFn: async () => {
      const res = await vehicleAPI.getQR(vehicleId);
      return res.data?.data || null;
    },
    enabled: !!vehicleId,
  });

  async function handleDownloadPdf() {
    try {
      const res = await vehicleAPI.exportQRPdf(vehicleId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `qr-${plateNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  }

  function handlePrint() {
    if (!qrData?.qrCode) return;
    setIsPrinting(true);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Sticker - ${plateNumber}</title>
        <style>
          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .sticker { width: 80mm; height: 80mm; border-radius: 50%; background: #E8F5E9; border: 2px solid #4CAF50;
                     display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .sticker img { width: 50mm; height: 50mm; }
          .plate { font-size: 10pt; font-weight: bold; margin-top: 2mm; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="sticker">
          <img src="${qrData.qrCode}" alt="QR Code" />
          <div class="plate">${plateNumber}</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => setIsPrinting(false), 1000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">QR Sticker</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {vehicleName} - {plateNumber}
          {qrData?.qrGeneratedYear && (
            <div className="text-xs mt-1">Issued for {qrData.qrGeneratedYear}</div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : qrData?.qrCode ? (
          <div className="flex justify-center">
            <div
              className="rounded-full border-2 border-green-500 overflow-hidden"
              style={{ width: 200, height: 200, background: '#E8F5E9' }}
            >
              <img src={qrData.qrCode} alt="QR Code" className="w-full h-full object-contain p-2" />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No QR code generated yet</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={!qrData?.qrCode}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrData?.qrCode || isPrinting}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
