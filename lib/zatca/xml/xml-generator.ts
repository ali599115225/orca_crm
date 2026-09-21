import type { ZatcaInvoiceData, ZatcaLineItem, TaxCategoryId, ZatcaParty } from './xml-types';

function sanitizeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatInvoiceLabel(prefix: string, issueDate: string, number: number): string {
  const year = issueDate.substring(0, 4);
  return `${prefix}-${year}-${String(number).padStart(6, '0')}`;
}

function taxCategoryId(vatType: string | undefined): TaxCategoryId {
  if (!vatType || vatType === 'STANDARD') return 'S';
  if (vatType === 'ZERO_RATED') return 'Z';
  return 'E';
}

function taxPercent(vatType: string | undefined): string {
  if (!vatType || vatType === 'STANDARD') return '15.00';
  return '0.00';
}

function buildPartyXml(party: ZatcaParty, role: 'supplier' | 'customer'): string {
  const isSupplier = role === 'supplier';
  const tag = isSupplier ? 'AccountingSupplierParty' : 'AccountingCustomerParty';
  const partyId = isSupplier ? party.vatNumber || '' : party.vatNumber || party.commercialRegistration || '';

  return `
    <cac:${tag}>
      <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="${isSupplier ? 'VAT' : 'CRN'}">${sanitizeXml(partyId)}</cbc:ID>
        </cac:PartyIdentification>
        ${party.commercialRegistration ? `
        <cac:PartyIdentification>
          <cbc:ID schemeID="CRN">${sanitizeXml(party.commercialRegistration)}</cbc:ID>
        </cac:PartyIdentification>` : ''}
        <cac:PostalAddress>
          <cbc:StreetName>${sanitizeXml(party.address?.street || 'N/A')}</cbc:StreetName>
          <cbc:BuildingNumber>${sanitizeXml(party.address?.buildingNumber || '0')}</cbc:BuildingNumber>
          <cbc:PlotIdentification>${sanitizeXml(party.address?.district || 'N/A')}</cbc:PlotIdentification>
          <cbc:CitySubdivisionName>${sanitizeXml(party.address?.district || 'N/A')}</cbc:CitySubdivisionName>
          <cbc:CityName>${sanitizeXml(party.address?.city || 'N/A')}</cbc:CityName>
          <cbc:PostalZone>${sanitizeXml(party.address?.postalCode || '00000')}</cbc:PostalZone>
          <cbc:CountrySubentity>${sanitizeXml(party.address?.province || 'N/A')}</cbc:CountrySubentity>
          <cac:Country>
            <cbc:IdentificationCode>${sanitizeXml(party.address?.countryCode || 'SA')}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${sanitizeXml(party.name)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:Party>
    </cac:${tag}>`;
}

function buildLineItemXml(line: ZatcaLineItem): string {
  const taxCat = line.taxCategory;
  const taxPct = line.taxPercent.toFixed(2);
  const lineTotal = line.netAmount.toFixed(2);
  const price = line.unitPrice.toFixed(2);

  return `
    <cac:InvoiceLine>
      <cbc:ID>${line.id}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${sanitizeXml(line.unitCode)}">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${lineTotal}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${line.taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="SAR">${lineTotal}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="SAR">${line.taxAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${taxCat}</cbc:ID>
            <cbc:Percent>${taxPct}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>VAT</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${sanitizeXml(line.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${taxCat}</cbc:ID>
          <cbc:Percent>${taxPct}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${price}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
}

function buildSignatureXml(): string {
  return `
    <cac:Signature>
      <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
      <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
    </cac:Signature>`;
}

function buildUblExtensionsXml(previousInvoiceHash: string | undefined): string {
  const pih = previousInvoiceHash || '0000000000000000000000000000000000000000000000000000000000000000';
  return `
    <ext:UBLExtensions>
      <ext:UBLExtension>
        <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
        <ext:ExtensionContent>
          <sac:SignatureInformation>
            <sac:ID>signature1</sac:ID>
          </sac:SignatureInformation>
        </ext:ExtensionContent>
      </ext:UBLExtension>
      <ext:UBLExtension>
        <ext:ExtensionURI>urn:zatca:invoice:hash</ext:ExtensionURI>
        <ext:ExtensionContent>
          <sac:InvoiceHash>${pih}</sac:InvoiceHash>
        </ext:ExtensionContent>
      </ext:UBLExtension>
      <ext:UBLExtension>
        <ext:ExtensionURI>urn:zatca:invoice:previoushash</ext:ExtensionURI>
        <ext:ExtensionContent>
          <sac:PreviousInvoiceHash>${pih}</sac:PreviousInvoiceHash>
        </ext:ExtensionContent>
      </ext:UBLExtension>
    </ext:UBLExtensions>`;
}

export function generateUnsignedInvoiceXml(data: ZatcaInvoiceData): string {
  const invoiceId = formatInvoiceLabel(data.invoicePrefix, data.issueDate, data.invoiceNumber);
  const subtotalStr = data.subtotal.toFixed(2);
  const vatAmountStr = data.vatAmount.toFixed(2);
  const totalStr = data.totalAmount.toFixed(2);

  const sellerParty = buildPartyXml(data.seller, 'supplier');
  const buyerParty = buildPartyXml(data.buyer, 'customer');
  const lineItemsXml = data.lineItems.map(buildLineItemXml).join('');
  const signatureXml = buildSignatureXml();
  const ublExtensions = buildUblExtensionsXml(data.previousInvoiceHash);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>INVOICE</cbc:CustomizationID>
  <cbc:ProfileID>${sanitizeXml(data.profileId)}</cbc:ProfileID>
  <cbc:ID>${sanitizeXml(invoiceId)}</cbc:ID>
  <cbc:UUID schemeID="urn:uuid:standard">${sanitizeXml(data.uuid)}</cbc:UUID>
  <cbc:IssueDate>${sanitizeXml(data.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${sanitizeXml(data.issueTime)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">${sanitizeXml(data.invoiceTypeCode)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${sanitizeXml(data.currency)}</cbc:DocumentCurrencyCode>
  <cbc:TaxPointDate>${sanitizeXml(data.issueDate)}</cbc:TaxPointDate>
  ${ublExtensions}
  ${signatureXml}
  ${sellerParty}
  ${buyerParty}
  <cac:Delivery>
    <cac:DeliveryLocation>
      <cac:Address>
        <cbc:CountrySubentity>${sanitizeXml(data.seller.address?.province || 'N/A')}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:Address>
    </cac:DeliveryLocation>
  </cac:Delivery>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${vatAmountStr}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${subtotalStr}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${vatAmountStr}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${taxCategoryId(data.lineItems[0]?.taxCategory === 'S' ? 'STANDARD' : 'ZERO_RATED')}</cbc:ID>
        <cbc:Percent>${taxPercent(data.lineItems[0]?.taxCategory === 'S' ? 'STANDARD' : 'ZERO_RATED')}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${subtotalStr}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${subtotalStr}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${totalStr}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${totalStr}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItemsXml}
</Invoice>`;
}

export function taxCategoryFromVatType(vatType: string): TaxCategoryId {
  return taxCategoryId(vatType);
}

export { formatInvoiceLabel };
