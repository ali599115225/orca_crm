import { NextRequest, NextResponse } from "next/server";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  listDealTimelineByContract,
  type ListDealTimelineByContractInput,
} from "@/lib/domain/deal-passport";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "contracts.read",
    async (session) => {
      const { id } = await params;
      const contractId = typeof id === "string" ? id.trim() : "";
      if (!contractId) {
        return NextResponse.json(
          { error: "Contract id is required" },
          { status: 400 },
        );
      }

      const { searchParams } = new URL(request.url);
      const rawAfterSequence = searchParams.get("afterSequence");
      const rawLimit = searchParams.get("limit");

      let afterSequence: number | undefined = undefined;
      if (rawAfterSequence !== null) {
        if (!/^\d+$/.test(rawAfterSequence)) {
          return NextResponse.json(
            { error: "Invalid afterSequence: must be a non-negative integer" },
            { status: 400 },
          );
        }
        const parsed = Number(rawAfterSequence);
        if (!Number.isSafeInteger(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: "Invalid afterSequence: must be a non-negative integer" },
            { status: 400 },
          );
        }
        afterSequence = parsed;
      }

      let limit: number | undefined = undefined;
      if (rawLimit !== null) {
        if (!/^\d+$/.test(rawLimit)) {
          return NextResponse.json(
            { error: "Invalid limit: must be an integer between 1 and 100" },
            { status: 400 },
          );
        }
        const parsed = Number(rawLimit);
        if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
          return NextResponse.json(
            { error: "Invalid limit: must be an integer between 1 and 100" },
            { status: 400 },
          );
        }
        limit = parsed;
      }

      const input: ListDealTimelineByContractInput = {
        tenantId: session.tenantId,
        contractId,
      };
      if (afterSequence !== undefined) {
        input.afterSequence = afterSequence;
      }
      if (limit !== undefined) {
        input.limit = limit;
      }

      try {
        const result = await listDealTimelineByContract(input);
        return NextResponse.json(result, { status: 200 });
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : String(error ?? "");
        if (message.includes("Contract not found")) {
          return NextResponse.json(
            { error: "Contract not found" },
            { status: 404 },
          );
        }
        if (
          message.includes("Invalid afterSequence") ||
          message.includes("Invalid limit")
        ) {
          return NextResponse.json(
            { error: message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  );
}
