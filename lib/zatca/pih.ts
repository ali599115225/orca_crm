import crypto from 'crypto';

export function computeInvoiceHash(xml: string): string {
  return crypto.createHash('sha256').update(xml, 'utf-8').digest('hex').toUpperCase();
}

export function getZeroHash(): string {
  return '0'.repeat(64);
}

export function computePreviousInvoiceHash(
  previousSignedXml: string | null | undefined
): string {
  if (!previousSignedXml) return getZeroHash();
  return computeInvoiceHash(previousSignedXml);
}
