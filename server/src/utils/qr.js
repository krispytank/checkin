import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGO_PATH = join(__dirname, '../assets/judiciary-logo.png');

const STICKER_CONFIG = {
  diameterMm: 80,
  diameterPoints: 226.77,
  bgColor: '#E8F5E9',
  qrSizeMm: 35,
  logoOpacity: 0.15,
};

function loadLogoBase64() {
  try {
    const buf = readFileSync(LOGO_PATH);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function logoToBase64Buffer() {
  try {
    return readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
}

export async function generateQRDataURL(vehicleId, plateNumber, clientUrl) {
  const url = `${clientUrl}/fleet/checkin?vid=${vehicleId}&plate=${encodeURIComponent(plateNumber)}`;
  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  return { dataUrl, url };
}

export async function generateQRBuffer(vehicleId, plateNumber, clientUrl) {
  const url = `${clientUrl}/fleet/checkin?vid=${vehicleId}&plate=${encodeURIComponent(plateNumber)}`;
  const buffer = await QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  return { buffer, url };
}

export function generateStickerSVG(qrDataUrl, vehicleName, plateNumber) {
  const logo = loadLogoBase64();
  const size = 300;
  const center = size / 2;
  const qrSize = 140;
  const bgHex = STICKER_CONFIG.bgColor;

  let logoLayer = '';
  if (logo) {
    logoLayer = `
      <image href="${logo}" x="${center - 75}" y="${center - 75}" 
             width="150" height="150" opacity="${STICKER_CONFIG.logoOpacity}" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="${center}" cy="${center}" r="${center - 2}" />
    </clipPath>
  </defs>
  <circle cx="${center}" cy="${center}" r="${center}" fill="${bgHex}" stroke="#4CAF50" stroke-width="3" />
  <g clip-path="url(#circle-clip)">
    ${logoLayer}
  </g>
  <image href="${qrDataUrl}" x="${center - qrSize / 2}" y="${center - qrSize / 2 - 15}" 
         width="${qrSize}" height="${qrSize}" />
  <text x="${center}" y="${center + qrSize / 2 + 10}" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a1a1a">
    ${plateNumber}
  </text>
</svg>`;
}

export async function generateStickerPDF(qrDataUrl, vehicleName, plateNumber) {
  const pageWidth = 227;
  const pageHeight = 227;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margin: 0,
      autoFirstPage: false,
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });

    const center = pageWidth / 2;
    const radius = 80; // ~28mm radius for the circle
    const logoBuf = logoToBase64Buffer();

    // Green circle background
    doc.save();
    doc.circle(center, center, radius).fill('#E8F5E9');
    doc.restore();

    // Green border
    doc.save();
    doc.circle(center, center, radius).lineWidth(1.5).stroke('#4CAF50');
    doc.restore();

    // Logo at 15% opacity
    if (logoBuf) {
      doc.save();
      doc.opacity(0.15);
      doc.image(logoBuf, center - 25, center - 25, { width: 50, height: 50 });
      doc.restore();
    }

    // QR code (centered, slightly above center)
    const qrBuf = Buffer.from(qrDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const qrSize = 50;
    doc.image(qrBuf, center - qrSize / 2, center - qrSize / 2 - 8, { width: qrSize, height: qrSize });

    // Plate number below QR
    doc.save();
    doc.fontSize(8).fillColor('#1a1a1a').font('Helvetica-Bold')
      .text(plateNumber, 0, center + qrSize / 2 - 2, { width: pageWidth, align: 'center' });
    doc.restore();

    doc.end();
  });
}

export async function generateBatchStickerPDF(vehicles, _clientUrl) {
  const pageWidth = 227;
  const pageHeight = 227;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margin: 0,
      autoFirstPage: false,
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoBuf = logoToBase64Buffer();

    for (const vehicle of vehicles) {
      const qrDataUrl = vehicle.qrCode;

      doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });

      const center = pageWidth / 2;
      const radius = 80;

      // Green circle background
      doc.save();
      doc.circle(center, center, radius).fill('#E8F5E9');
      doc.restore();

      // Green border
      doc.save();
      doc.circle(center, center, radius).lineWidth(1.5).stroke('#4CAF50');
      doc.restore();

      // Logo at 15% opacity
      if (logoBuf) {
        doc.save();
        doc.opacity(0.15);
        doc.image(logoBuf, center - 25, center - 25, { width: 50, height: 50 });
        doc.restore();
      }

      // QR code
      const qrBuf = Buffer.from(vehicle.qrCode.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const qrSize = 50;
      doc.image(qrBuf, center - qrSize / 2, center - qrSize / 2 - 8, { width: qrSize, height: qrSize });

      // Plate number
      doc.save();
      doc.fontSize(8).fillColor('#1a1a1a').font('Helvetica-Bold')
        .text(vehicle.plateNumber, 0, center + qrSize / 2 - 2, { width: pageWidth, align: 'center' });
      doc.restore();
    }

    doc.end();
  });
}
