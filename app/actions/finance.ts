'use server';
import { prisma } from '@/lib/prisma'; // تأكد من مسار الـ Prisma Client

export async function processPayment(invoiceId: string, amount: number, method: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. إنشاء سند القبض
    const receipt = await tx.receipt.create({
      data: { invoiceId, amount, paymentMethod: method }
    });

    // 2. ترحيل القيد للأستاذ العام
    await tx.generalLedger.create({
      data: {
        receiptId: receipt.id,
        debit: amount, // يدخل للصندوق
        credit: 0, // هنا ستحدد حساب الإيراد المقابل
        description: `تحصيل دفعة إيجار للفاتورة ${invoiceId}`
      }
    });

    return receipt;
  });
}