export type TaxCategoryId = 'S' | 'Z' | 'E';

export interface ZatcaAddress {
  street?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  countryCode?: string;
}

export interface ZatcaParty {
  name: string;
  vatNumber?: string;
  commercialRegistration?: string;
  address?: ZatcaAddress;
}

export interface ZatcaLineItem {
  id: number;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  netAmount: number;
  taxCategory: TaxCategoryId;
  taxPercent: number;
  taxAmount: number;
}

export interface ZatcaInvoiceData {
  uuid: string;
  invoiceNumber: number;
  invoicePrefix: string;
  issueDate: string;
  issueTime: string;
  invoiceTypeCode: string;
  profileId: string;
  currency: string;
  seller: ZatcaParty;
  buyer: ZatcaParty;
  lineItems: ZatcaLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  previousInvoiceHash?: string;
  sellerVatNumber: string;
}
