import type { QrPayload } from '@/lib/vat/types';
import QRCode from 'qrcode';

function encodeTlvTag(tag: number, value: string): Buffer {
  const buf = Buffer.from(value, 'utf-8');
  return Buffer.concat([
    Buffer.from([tag]),
    Buffer.from([buf.length]),
    buf,
  ]);
}

export function buildQrPayload(params: {
  sellerName: string;
  vatNumber: string;
  total: number;
  vatTotal: number;
}): QrPayload {
  return {
    sellerName: params.sellerName,
    vatNumber: params.vatNumber,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    total: params.total.toFixed(2),
    vatTotal: params.vatTotal.toFixed(2),
  };
}

export function encodeTlv(payload: QrPayload): Buffer {
  return Buffer.concat([
    encodeTlvTag(1, payload.sellerName),
    encodeTlvTag(2, payload.vatNumber),
    encodeTlvTag(3, payload.timestamp),
    encodeTlvTag(4, payload.total),
    encodeTlvTag(5, payload.vatTotal),
  ]);
}

export function encodeQrCode(payload: QrPayload): string {
  const tlv = encodeTlv(payload);
  return tlv.toString('base64');
}

export async function generateQrImage(qrCode: string): Promise<string> {
  return QRCode.toDataURL(qrCode, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

export function formatInvoiceLabel(prefix: string, year: number, number: number): string {
  return `${prefix}-${year}-${String(number).padStart(6, '0')}`;
}
