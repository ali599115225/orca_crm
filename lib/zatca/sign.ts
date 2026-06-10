import crypto from 'crypto';
import { decryptPrivateKey } from './device';

export function signXml(
  unsignedXml: string,
  encryptedPrivateKey: string,
  publicKey: string
): { signedXml: string; signature: string } {
  const privateKeyPem = decryptPrivateKey(encryptedPrivateKey);
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  const sign = crypto.createSign('SHA256');
  sign.update(unsignedXml, 'utf-8');
  const signatureBuffer = sign.sign(privateKey);
  const signatureB64 = signatureBuffer.toString('base64');

  const signedXml = embedSignature(unsignedXml, signatureB64, publicKey);
  return { signedXml, signature: signatureB64 };
}

function embedSignature(
  unsignedXml: string,
  signatureBase64: string,
  publicKeyPem: string
): string {
  const publicKeyDer = crypto
    .createPublicKey(publicKeyPem)
    .export({ type: 'spki', format: 'der' })
    .toString('base64');

  const signatureBlock = `
  <ext:UBLExtension>
    <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
    <ext:ExtensionContent>
      <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">
        <sac:SignatureInformation>
          <cbc:ID>urn:oasis:names:specification:ubl:signature:signature1</cbc:ID>
          <sac:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sac:ReferencedSignatureID>
          <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
            <ds:SignedInfo>
              <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
              <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
              <ds:Reference Id="invoiceSignedData" URI="">
                <ds:Transforms>
                  <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                    <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                  </ds:Transform>
                  <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                    <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                  </ds:Transform>
                  <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                    <ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference)</ds:XPath>
                  </ds:Transform>
                  <ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                </ds:Transforms>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue></ds:DigestValue>
              </ds:Reference>
              <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue></ds:DigestValue>
              </ds:Reference>
            </ds:SignedInfo>
            <ds:SignatureValue>${signatureBase64}</ds:SignatureValue>
            <ds:KeyInfo>
              <ds:X509Data>
                <ds:X509Certificate></ds:X509Certificate>
              </ds:X509Data>
              <ds:KeyValue>
                <ds:ECKeyValue>
                  <ds:NamedCurve>urn:oid:1.2.840.10045.3.1.7</ds:NamedCurve>
                  <ds:PublicKey>${publicKeyDer}</ds:PublicKey>
                </ds:ECKeyValue>
              </ds:KeyValue>
            </ds:KeyInfo>
            <ds:Object>
              <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
                <xades:SignedProperties Id="xadesSignedProperties">
                  <xades:SignedSignatureProperties>
                    <xades:SigningTime></xades:SigningTime>
                    <xades:SigningCertificate></xades:SigningCertificate>
                    <xades:SignaturePolicyIdentifier>
                      <xades:SignaturePolicyId>
                        <xades:SigPolicyId>
                          <xades:Identifier>urn:oasis:names:specification:ubl:schema:xsd:Invoice-2</xades:Identifier>
                        </xades:SigPolicyId>
                        <xades:SigPolicyHash>
                          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                          <ds:DigestValue></ds:DigestValue>
                        </xades:SigPolicyHash>
                      </xades:SignaturePolicyId>
                    </xades:SignaturePolicyIdentifier>
                  </xades:SignedSignatureProperties>
                </xades:SignedProperties>
              </xades:QualifyingProperties>
            </ds:Object>
          </ds:Signature>
        </sac:SignatureInformation>
      </sig:UBLDocumentSignatures>
    </ext:ExtensionContent>
  </ext:UBLExtension>`;

  const closingTag = '</Invoice>';
  const idx = unsignedXml.lastIndexOf(closingTag);
  if (idx === -1) {
    return unsignedXml.replace(
      '</ext:UBLExtensions>',
      `</ext:UBLExtensions>${signatureBlock}`
    );
  }
  return unsignedXml.slice(0, idx) + signatureBlock + closingTag;
}

export function signXmlSimple(
  unsignedXml: string,
  encryptedPrivateKey: string
): string {
  const privateKeyPem = decryptPrivateKey(encryptedPrivateKey);
  const sign = crypto.createSign('SHA256');
  sign.update(unsignedXml, 'utf-8');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = sign.sign(privateKey, 'base64');

  const sigBlock = `\n  <cac:Signature><cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID><cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod><cbc:SignatureValue>${signature}</cbc:SignatureValue></cac:Signature>`;

  const idx = unsignedXml.lastIndexOf('</Invoice>');
  if (idx === -1) return unsignedXml + sigBlock;
  return unsignedXml.slice(0, idx) + sigBlock + '\n</Invoice>';
}
