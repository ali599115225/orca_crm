'use server';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';

export async function processPayment(invoiceId: string, amount: number, method: string) {
  try {
    const tenant = await getActiveTenant();
    return await prisma.$transaction(async (tx) => {
    // 1. إنشاء سند القبض
    const receipt = await tx.receipt.create({
      data: { tenantId: tenant.id, invoiceId, amount, paymentMethod: method }
    });

    // 2. ترحيل القيد للأستاذ العام
    await tx.generalLedger.create({
      data: {
        tenantId: tenant.id,
        receiptId: receipt.id,
        debit: amount,
        credit: 0,
        description: `تحصيل دفعة إيجار للفاتورة ${invoiceId}`
      }
    });

      return receipt;
    });
  } catch (error) {
    console.error("[processPayment]", error);
    throw new Error("فشل معالجة الدفعة");
  }
}