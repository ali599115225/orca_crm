// app/api/cron/retention/route.ts
// 🧹 Cron Job — Phase 08-G4: Data Retention & Cleanup
// Cleans up temporary/telemetry data. Never touches financial, legal, or CRM operational data.
import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { recordHeartbeat } from "@/lib/sentinel/heartbeat";

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit("cron:retention", 1, 300000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const report = {
    timestamp: new Date().toISOString(),
    operations: [] as Array<{ table: string; action: string; count: number; error?: string }>,
  };

  // ── 1. failed_login_attempts — older than 24 hours ──
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await rawPrisma.$executeRawUnsafe(
      `DELETE FROM failed_login_attempts WHERE created_at < $1`,
      cutoff
    );
    report.operations.push({ table: "failed_login_attempts", action: "DELETED", count: result });
  } catch (e: any) {
    report.operations.push({ table: "failed_login_attempts", action: "ERROR", count: 0, error: e.message });
    console.error("Retention cron failed_login_attempts cleanup failed:", e);
  }

  // ── 2. sentinel_task_orders — DONE/CANCELLED older than 30 days ──
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await rawPrisma.$executeRawUnsafe(
      `DELETE FROM sentinel_task_orders WHERE status IN ('DONE','CANCELLED') AND completed_at IS NOT NULL AND completed_at < $1`,
      cutoff
    );
    report.operations.push({ table: "sentinel_task_orders", action: "DELETED", count: result });
  } catch (e: any) {
    report.operations.push({ table: "sentinel_task_orders", action: "ERROR", count: 0, error: e.message });
    console.error("Retention cron sentinel_task_orders cleanup failed:", e);
  }

  // ── 3. agent_telemetry_logs — older than 90 days ──
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await rawPrisma.$executeRawUnsafe(
      `DELETE FROM agent_telemetry_logs WHERE created_at < $1`,
      cutoff
    );
    report.operations.push({ table: "agent_telemetry_logs", action: "DELETED", count: result });
  } catch (e: any) {
    report.operations.push({ table: "agent_telemetry_logs", action: "ERROR", count: 0, error: e.message });
    console.error("Retention cron agent_telemetry_logs cleanup failed:", e);
  }

  // ── 4. audit_logs — COUNT only (no deletion — requires cold archive first) ──
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await rawPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE created_at < $1`,
      cutoff
    );
    report.operations.push({
      table: "audit_logs",
      action: "COUNTED",
      count: Number(result[0].count),
    });
  } catch (e: any) {
    report.operations.push({ table: "audit_logs", action: "ERROR", count: 0, error: e.message });
    console.error("Retention cron audit_logs count failed:", e);
  }

  const coreTaskFailed = report.operations.some((operation) => operation.action === "ERROR");
  if (!coreTaskFailed) {
    try {
      const heartbeat = await recordHeartbeat({ serviceId: "CRON_RETENTION" });
      if (!heartbeat.success) {
        console.error("Cron heartbeat failed:", heartbeat.error);
      }
    } catch (heartbeatError) {
      console.error("Cron heartbeat failed:", heartbeatError);
    }
  }

  return NextResponse.json({ success: true, report });
}
