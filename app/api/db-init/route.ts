// app/api/db-init/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminInDev } from "@/lib/api-auth-guard";
import { ErrorCode, publicError } from "@/lib/errors";
import { applyDatabaseInitialization } from "@/lib/system-prisma-boundary";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdminInDev(request);
  if (guard) return guard;

  try {
    const appliedStatements = await applyDatabaseInitialization();

    return NextResponse.json({
      success: true,
      appliedStatements,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(ErrorCode.INTERNAL_ERROR, "db-init failed", error),
      { status: 500 },
    );
  }
}
