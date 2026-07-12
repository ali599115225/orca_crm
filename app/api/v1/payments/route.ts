import { NextRequest, NextResponse } from 'next/server';
import { TENANT_ROLES, runWithDatabaseSession } from '@/lib/api-auth-guard';
import { ErrorCode } from '@/lib/errors';
import { httpErrorResponse } from '@/lib/http-error-response';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status')?.trim() || '';
      const provider = searchParams.get('provider')?.trim() || '';
      const invoiceId = searchParams.get('invoiceId')?.trim() || '';
      const contractId = searchParams.get('contractId')?.trim() || '';
      const requestedLimit = Number(searchParams.get('limit') || 50);
      const take = Number.isInteger(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 100)
        : 50;

      const where: Record<string, unknown> = {
        tenantId: session.tenantId,
      };

      if (status) where.status = status;
      if (provider) where.provider = provider;
      if (invoiceId) where.invoiceId = invoiceId;

      if (contractId) {
        where.OR = [
          { invoice: { is: { contractId } } },
          { installment: { is: { contractId } } },
        ];
      }

      const transactions = await prisma.paymentTransaction.findMany({
        where,
        take,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              invoicePrefix: true,
              totalAmount: true,
              status: true,
              type: true,
              contractId: true,
              leaseId: true,
              lease: {
                select: {
                  tenantName: true,
                  unitName: true,
                },
              },
              contract: {
                select: {
                  buyerName: true,
                  unit: {
                    select: {
                      unitNumber: true,
                      project: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          installment: {
            select: {
              id: true,
              contractId: true,
              paymentPlanId: true,
              installmentNumber: true,
              amountSar: true,
              dueDate: true,
              paymentStatus: true,
            },
          },
        },
      });

      const payments = transactions.map((payment: (typeof transactions)[number]) => {
        const invoice = payment.invoice;
        const paymentDate =
          payment.paidAt || payment.processedAt || payment.createdAt;

        return {
          id: payment.id,
          invoiceId: payment.invoiceId,
          installmentId: payment.installmentId,
          contractId:
            invoice?.contractId || payment.installment?.contractId || null,
          paymentPlanId: payment.installment?.paymentPlanId || null,
          customerName:
            invoice?.lease?.tenantName || invoice?.contract?.buyerName || null,
          unitName:
            invoice?.lease?.unitName ||
            (invoice?.contract?.unit
              ? `${invoice.contract.unit.project.name} · ${invoice.contract.unit.unitNumber}`
              : null),
          amount: Number(payment.amount),
          fee: Number(payment.fee),
          netAmount: Number(payment.netAmount),
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          provider: payment.provider,
          providerReference: payment.providerReference,
          date: paymentDate.toISOString(),
          paidAt: payment.paidAt?.toISOString() || null,
          createdAt: payment.createdAt.toISOString(),
          invoice: invoice
            ? {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                invoicePrefix: invoice.invoicePrefix,
                totalAmount: Number(invoice.totalAmount),
                status: invoice.status,
                type: invoice.type,
                contractId: invoice.contractId,
                leaseId: invoice.leaseId,
              }
            : null,
          installment: payment.installment
            ? {
                id: payment.installment.id,
                installmentNumber: payment.installment.installmentNumber,
                amountSar: Number(payment.installment.amountSar),
                dueDate: payment.installment.dueDate.toISOString().split('T')[0],
                paymentStatus: payment.installment.paymentStatus,
              }
            : null,
        };
      });

      return NextResponse.json({ success: true, payments });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        'GET /api/v1/payments failed',
        error,
      );
    }
  });
}
