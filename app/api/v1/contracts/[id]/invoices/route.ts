import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";
import { signContract } from "@/lib/domain/transaction-spine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "contracts.invoices.read",
    async (session) => {
      try {
        const { id } = await params;
        const invoices = await prisma.invoice.findMany({
          where: { tenantId: session.tenantId, contractId: id, type: "SALE" },
          include: {
            installments: {
              orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
            },
          },
          orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({
          success: true,
          data: invoices.map((invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoicePrefix: invoice.invoicePrefix,
            totalAmount: Number(invoice.totalAmount),
            status: invoice.status,
            dueDate: invoice.dueDate.toISOString().slice(0, 10),
            installments: invoice.installments.map((item) => ({
              id: item.id,
              installmentNumber: item.installmentNumber,
              amountSar: Number(item.amountSar),
              dueDate: item.dueDate.toISOString().slice(0, 10),
              paymentStatus: item.paymentStatus,
            })),
          })),
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر جلب فواتير العقد.";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "contracts.invoices.issue",
    async (session) => {
      try {
        const { id } = await params;
        const result = await signContract({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
        });
        return NextResponse.json({
          success: true,
          data: {
            invoiceId: result.invoice.id,
            installmentCount: result.installments.length,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر إصدار فاتورة البيع.";
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }
    },
  );
}
