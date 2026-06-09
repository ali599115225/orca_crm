import { NextResponse } from "next/server";
import { prisma, rawPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "connected", latency: `${Date.now() - dbStart}ms` };
  } catch {
    checks.database = { status: "disconnected", latency: "N/A" };
  }

  try {
    const apiStart = Date.now();
    checks.api = { status: "operational", latency: `${Date.now() - apiStart}ms` };
  } catch {
    checks.api = { status: "degraded" };
  }

  try {
    const activeTenants = await rawPrisma.tenant.count({ where: { isActive: true } });
    const totalUsers = await rawPrisma.user.count();
    const totalLeads = await rawPrisma.lead.count();
    const recentAuditLogs = await rawPrisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    checks.system = { activeTenants, totalUsers, totalLeads, auditLogs24h: recentAuditLogs };
  } catch {
    checks.system = { status: "unavailable" };
  }

  const responseTime = Date.now() - startTime;
  const allOk = Object.values(checks).every((c: any) => c.status !== "disconnected");

  return NextResponse.json(
    {
      status: allOk ? "online" : "degraded",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks,
      version: process.env.npm_package_version || "1.0.0",
    },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-store, no-cache", "X-Response-Time": `${responseTime}ms` },
    }
  );
}
