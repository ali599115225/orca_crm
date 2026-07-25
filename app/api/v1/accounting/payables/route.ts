import { NextRequest, NextResponse } from "next/server";
import {
  getSupplierBalances,
  getPayablesReport,
  getPayablesSummary,
} from "@/lib/accounting";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(request: NextRequest) {
  return runWithExec003DatabasePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "accounting.payables.read",
    async (session) => {
      try {
        const { searchParams } = new URL(request.url);
        const view = searchParams.get("view") || "balances";

        if (view === "report") {
          const items = await getPayablesReport(session.tenantId);
          return NextResponse.json({ success: true, items });
        }

        if (view === "summary") {
          const summary = await getPayablesSummary(session.tenantId);
          return NextResponse.json({ success: true, ...summary });
        }

        const suppliers = await getSupplierBalances(session.tenantId);
        return NextResponse.json({ success: true, suppliers });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر جلب الالتزامات.";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    },
  );
}
