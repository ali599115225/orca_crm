export type VatType = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT';

export interface VatBreakdown {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  vatType: VatType;
}

export interface QrPayload {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatTotal: string;
}

export interface TaxInvoiceData {
  invoiceNumber: number;
  invoicePrefix: string;
  invoiceLabel: string;
  zatcaUuid: string;
  issueDate: string;
  dueDate: string;
  sellerName: string;
  sellerVat: string;
  sellerCr: string;
  sellerAddress: string;
  customerName: string;
  customerVat?: string;
  unitName: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  qrPayload: QrPayload;
  qrCode: string;
  qrImage: string;
  zatcaStatus: string;
  status: string;
  paidAt: string | null;
  paymentMethod: string | null;
  leaseId: string;
}
