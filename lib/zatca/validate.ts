export interface ValidationError {
  field: string;
  message: string;
}

export function validateVatNumber(vatNumber: string): string | null {
  if (!vatNumber || vatNumber.trim().length === 0) {
    return 'VAT number is required';
  }
  const cleaned = vatNumber.replace(/\s+/g, '');
  if (!/^\d{15}$/.test(cleaned) && !/^3\d{14}$/.test(cleaned)) {
    return 'VAT number must be 15 digits, starting with 3';
  }
  return null;
}

export function validateUuid(uuid: string): string | null {
  if (!uuid || uuid.trim().length === 0) {
    return 'UUID is required';
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid.trim())) {
    return 'Invalid UUID format';
  }
  return null;
}

export function validateInvoiceNumber(invoiceNumber: number): string | null {
  if (!Number.isInteger(invoiceNumber) || invoiceNumber <= 0) {
    return 'Invoice number must be a positive integer';
  }
  return null;
}

export function validateTotals(
  subtotal: number,
  vatAmount: number,
  totalAmount: number
): string | null {
  if (subtotal < 0) return 'Subtotal cannot be negative';
  if (vatAmount < 0) return 'VAT amount cannot be negative';
  if (totalAmount < 0) return 'Total amount cannot be negative';
  const expectedTotal = Math.round((subtotal + vatAmount) * 100) / 100;
  if (Math.abs(expectedTotal - totalAmount) > 0.01) {
    return `Total mismatch: subtotal(${subtotal}) + vat(${vatAmount}) = ${expectedTotal}, but totalAmount = ${totalAmount}`;
  }
  return null;
}

export function validateInvoiceDate(issueDate: string): string | null {
  if (!issueDate) return 'Issue date is required';
  const date = new Date(issueDate);
  if (isNaN(date.getTime())) return 'Invalid issue date format';
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  if (date.getTime() > tomorrow.getTime()) {
    return 'Issue date cannot be in the future';
  }
  return null;
}

export function validateLineItemTotals(
  lineItems: { netAmount: number; taxAmount: number }[],
  expectedSubtotal: number,
  expectedVatAmount: number
): string | null {
  const lineNetSum = Math.round(lineItems.reduce((s, i) => s + i.netAmount, 0) * 100) / 100;
  const lineTaxSum = Math.round(lineItems.reduce((s, i) => s + i.taxAmount, 0) * 100) / 100;

  if (Math.abs(lineNetSum - expectedSubtotal) > 0.02) {
    return `Line items net total (${lineNetSum}) does not match invoice subtotal (${expectedSubtotal})`;
  }
  if (Math.abs(lineTaxSum - expectedVatAmount) > 0.02) {
    return `Line items tax total (${lineTaxSum}) does not match invoice vatAmount (${expectedVatAmount})`;
  }
  return null;
}

export function validatePreSubmission(
  invoice: {
    id?: string;
    invoiceNumber: number;
    vatNumber?: string | null;
    zatcaUuid: string;
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
    issueDate?: Date | string;
    lineItems?: { netAmount: number; taxAmount: number }[];
  },
  sellerVatNumber?: string | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  const numberErr = validateInvoiceNumber(invoice.invoiceNumber);
  if (numberErr) errors.push({ field: 'invoiceNumber', message: numberErr });

  const uuidErr = validateUuid(invoice.zatcaUuid);
  if (uuidErr) errors.push({ field: 'zatcaUuid', message: uuidErr });

  const totalsErr = validateTotals(invoice.subtotal, invoice.vatAmount, invoice.totalAmount);
  if (totalsErr) errors.push({ field: 'totals', message: totalsErr });

  if (invoice.issueDate) {
    const dateStr = typeof invoice.issueDate === 'string' ? invoice.issueDate : invoice.issueDate.toISOString().split('T')[0];
    const dateErr = validateInvoiceDate(dateStr);
    if (dateErr) errors.push({ field: 'issueDate', message: dateErr });
  }

  const sellerVatErr = sellerVatNumber ? validateVatNumber(sellerVatNumber) : 'Seller VAT number is not configured';
  if (sellerVatErr) errors.push({ field: 'sellerVatNumber', message: sellerVatErr });

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    const lineErr = validateLineItemTotals(invoice.lineItems, invoice.subtotal, invoice.vatAmount);
    if (lineErr) errors.push({ field: 'lineItems', message: lineErr });
  }

  if (invoice.vatNumber) {
    const buyerVatErr = validateVatNumber(invoice.vatNumber);
    if (buyerVatErr) errors.push({ field: 'buyerVatNumber', message: buyerVatErr });
  }

  return errors;
}
