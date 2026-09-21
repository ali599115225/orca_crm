import crypto from 'crypto';
import { encryptValue, decryptValue } from './encrypt';

export interface DeviceKeyPair {
  publicKey: string;
  privateKey: string;
}

export function generateEcdsaKeyPair(): DeviceKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

export function generateCsr(
  privateKeyPem: string,
  publicKeyPem: string,
  commonName: string,
  organizationName: string,
  countryName: string = 'SA'
): string {
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  const csr = crypto.createSign('SHA256');
  const subject = [
    `CN=${commonName}`,
    `O=${organizationName}`,
    `C=${countryName}`,
  ].join(', ');

  const publicKeyObj = crypto.createPublicKey(publicKeyPem);
  const publicKeyDer = publicKeyObj.export({ type: 'spki', format: 'der' });

  const certReq: any = {
    subject,
    publicKey: publicKeyObj,
  };

  const csrDer = crypto.createSign('sha256');
  csrDer.update(Buffer.from(subject));
  csrDer.update(publicKeyDer);
  const signature = csrDer.sign(privateKey);

  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${signature.toString('base64')}\n-----END CERTIFICATE REQUEST-----`;
  return csrPem;
}

export function encryptPrivateKey(privateKey: string): string {
  return encryptValue(privateKey);
}

export function decryptPrivateKey(encoded: string): string {
  return decryptValue(encoded);
}
