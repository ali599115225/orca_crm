// أداة توليد QR Code متوافق مع هيئة الزكاة
export const generateZatcaQR = (sellerName: string, vatNumber: string, date: string, total: string, vat: string) => {
  const hex = (tag: number, value: string) => {
    const bytes = Buffer.from(value, 'utf-8');
    const tagHex = Buffer.from([tag]).toString('hex');
    const lenHex = Buffer.from([bytes.length]).toString('hex');
    return `${tagHex}${lenHex}${bytes.toString('hex')}`;
  };

  const tlv = 
    hex(1, sellerName) +
    hex(2, vatNumber) +
    hex(3, date) +
    hex(4, total) +
    hex(5, vat);

  return Buffer.from(tlv, 'hex').toString('base64');
};