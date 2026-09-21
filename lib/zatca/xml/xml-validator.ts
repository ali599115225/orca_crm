export interface XmlValidationError {
  field: string;
  message: string;
}

export function validateXmlStructure(xml: string): XmlValidationError[] {
  const errors: XmlValidationError[] = [];

  if (!xml || xml.trim().length === 0) {
    errors.push({ field: 'xml', message: 'XML content is empty' });
    return errors;
  }

  if (!xml.startsWith('<?xml')) {
    errors.push({ field: 'xml', message: 'Missing XML declaration' });
  }

  if (!xml.includes('<Invoice') || !xml.includes('</Invoice>')) {
    errors.push({ field: 'xml', message: 'Missing Invoice root element' });
  }

  if (!xml.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
    errors.push({ field: 'xml', message: 'Missing UBL Invoice namespace' });
  }

  if (!xml.includes('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>')) {
    errors.push({ field: 'xml', message: 'Missing or invalid UBLVersionID' });
  }

  if (!xml.includes('<cbc:CustomizationID>INVOICE</cbc:CustomizationID>')) {
    errors.push({ field: 'xml', message: 'Missing or invalid CustomizationID' });
  }

  if (!xml.includes('cbc:ProfileID')) {
    errors.push({ field: 'xml', message: 'Missing ProfileID' });
  }

  if (!xml.includes('cbc:ID>')) {
    errors.push({ field: 'xml', message: 'Missing Invoice ID (number)' });
  }

  if (!xml.includes('cbc:UUID')) {
    errors.push({ field: 'xml', message: 'Missing Invoice UUID' });
  }

  if (!xml.includes('cbc:IssueDate')) {
    errors.push({ field: 'xml', message: 'Missing IssueDate' });
  }

  if (!xml.includes('cbc:IssueTime')) {
    errors.push({ field: 'xml', message: 'Missing IssueTime' });
  }

  if (!xml.includes('cbc:InvoiceTypeCode')) {
    errors.push({ field: 'xml', message: 'Missing InvoiceTypeCode' });
  }

  if (!xml.includes('cbc:DocumentCurrencyCode')) {
    errors.push({ field: 'xml', message: 'Missing DocumentCurrencyCode' });
  }

  if (!xml.includes('AccountingSupplierParty')) {
    errors.push({ field: 'xml', message: 'Missing AccountingSupplierParty' });
  }

  if (!xml.includes('AccountingCustomerParty')) {
    errors.push({ field: 'xml', message: 'Missing AccountingCustomerParty' });
  }

  if (!xml.includes('cac:TaxTotal')) {
    errors.push({ field: 'xml', message: 'Missing TaxTotal' });
  }

  if (!xml.includes('cac:LegalMonetaryTotal')) {
    errors.push({ field: 'xml', message: 'Missing LegalMonetaryTotal' });
  }

  if (!xml.includes('cac:InvoiceLine')) {
    errors.push({ field: 'xml', message: 'Missing InvoiceLine' });
  }

  if (!xml.includes('UBLExtensions')) {
    errors.push({ field: 'xml', message: 'Missing UBLExtensions' });
  }

  if (!xml.includes('PreviousInvoiceHash') && !xml.includes('InvoiceHash')) {
    errors.push({ field: 'xml', message: 'Missing InvoiceHash elements' });
  }

  return errors;
}
