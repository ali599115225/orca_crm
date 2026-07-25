import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNTING_WRITE_ROLES,
  TENANT_ROLES,
} from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import { reverseJournalEntry } from "@/lib/accounting";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    TENANT_ROLES,
    "accounting.journal_entries.read",
    async (session) => {
      try {
        const { id } = await params;
        const entry = await prisma.journalEntry.findFirst({
          where: { id, tenantId: session.tenantId },
          include: {
            lines: {
              include: {
                account: { select: { code: true, nameAr: true, nameEn: true } },
              },
            },
            reversedBy: true,
            reversals: true,
          },
        });

        if (!entry) {
          return NextResponse.json(
            { success: false, error: "القيد غير موجود" },
            { status: 404 },
          );
        }

        return NextResponse.json({ success: true, entry });
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/accounting/journal-entries/:id failed",
          error,
        );
      }
    },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    ACCOUNTING_WRITE_ROLES,
    "accounting.journal_entries.reverse",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const reason =
          typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim()
            : "عكس يدوي";

        const entry = await prisma.journalEntry.findFirst({
          where: { id, tenantId: session.tenantId },
          select: { id: true },
        });
        if (!entry) {
          return NextResponse.json(
            { success: false, error: "القيد غير موجود" },
            { status: 404 },
          );
        }

        const reversal = await reverseJournalEntry(
          id,
          session.tenantId,
          reason,
        );
        return NextResponse.json({ success: true, reversal });
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/accounting/journal-entries/:id failed",
          error,
        );
      }
    },
  );
}
