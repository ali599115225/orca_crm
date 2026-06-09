import type { VatType, VatBreakdown } from './types';

const VAT_RATES: Record<VatType, number> = {
  STANDARD: 15.00,
  ZERO_RATED: 0,
  EXEMPT: 0,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateVat(subtotal: number, vatType: VatType): VatBreakdown {
  const vatRate = VAT_RATES[vatType] ?? 15.00;
  const vatAmount = vatType === 'EXEMPT' ? 0 : round2(subtotal * vatRate / 100);
  const totalAmount = round2(subtotal + vatAmount);

  return { subtotal, vatRate, vatAmount, totalAmount, vatType };
}

export function validateVatInput(subtotal: number, vatType: string): string | null {
  if (!subtotal || subtotal <= 0) return 'Subtotal must be positive';
  if (!['STANDARD', 'ZERO_RATED', 'EXEMPT'].includes(vatType)) return 'Invalid VAT type';
  return null;
}

export function validateVatBreakdown(b: VatBreakdown): string | null {
  const expected = calculateVat(b.subtotal, b.vatType);
  if (Math.abs(b.vatAmount - expected.vatAmount) > 0.01) return 'VAT amount mismatch';
  if (Math.abs(b.totalAmount - expected.totalAmount) > 0.01) return 'Total amount mismatch';
  return null;
}
