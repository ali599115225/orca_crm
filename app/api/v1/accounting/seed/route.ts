import { NextRequest, NextResponse } from "next/server";
import { seedChartOfAccounts } from "@/lib/accounting";
import { ACCOUNTING_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  classifyError,
  publicError,
  statusForErrorCode,
} from "@/lib/errors";

export async function POST(request: NextRequest) {
  return runWithExec003DatabasePermission(
    request,
    ACCOUNTING_WRITE_ROLES,
    "accounting.seed.execute",
    async (session) => {
      try {
        await seedChartOfAccounts(session.tenantId);

        return NextResponse.json({
          success: true,
          message: "تم إنشاء دليل الحسابات",
        });
      } catch (error: unknown) {
        const code = classifyError(error);
        return NextResponse.json(
          publicError(code, "accounting seed failed", error),
          { status: statusForErrorCode(code) },
        );
      }
    },
  );
}
