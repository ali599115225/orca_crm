import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/lib/prisma";
import { evaluateRevenueLeakRadar } from "@/lib/revenue-integrity/radar";
import { processRevenueOutbox } from "@/lib/revenue-integrity/events";
import { scoreOpenOpportunities, trainPredictiveModel } from "@/lib/revenue-integrity/predictive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeEqual(actual: string, expected: string) {
  const left = Buffer.from(actual, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return safeEqual(authorization.slice("Bearer ".length), secret);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const bucket = now.toISOString().slice(0, 13);
  const weeklyBucket = `${now.getUTCFullYear()}-W${Math.ceil(
    ((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 1)) /
      86_400_000 +
      new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getUTCDay() +
      1) /
      7,
  )}`;

  const tenants = await rawPrisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const report = {
    timestamp: now.toISOString(),
    tenants: tenants.length,
    radar: [] as Array<Record<string, unknown>>,
    predictive: [] as Array<Record<string, unknown>>,
    errors: [] as Array<{ tenantId: string; stage: string; error: string }>,
    outbox: null as null | Record<string, number>,
  };

  for (const tenant of tenants) {
    try {
      const result = await evaluateRevenueLeakRadar(
        tenant.id,
        null,
        `cron:${tenant.id}:${bucket}`,
      );
      report.radar.push({ tenantId: tenant.id, ...result });
    } catch (error) {
      report.errors.push({
        tenantId: tenant.id,
        stage: "RADAR",
        error: error instanceof Error ? error.message : "UNKNOWN_RADAR_ERROR",
      });
    }

    try {
      const latestModel = await rawPrisma.revenueModelVersion.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { version: "desc" },
      });
      const lastWeeklyTraining = await rawPrisma.revenueDomainEvent.findFirst({
        where: {
          tenantId: tenant.id,
          eventType: { in: ["PREDICTIVE_MODEL_ACTIVATED", "PREDICTIVE_MODEL_NOT_READY"] },
          metadata: { path: ["weeklyBucket"], equals: weeklyBucket },
        },
      });

      let training: unknown = null;
      if (!lastWeeklyTraining) {
        const model = await trainPredictiveModel(tenant.id, null, 30);
        training = { version: model.version, status: model.status };
        await rawPrisma.$executeRaw`
          UPDATE revenue_domain_events
          SET    metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ weeklyBucket })}::jsonb
          WHERE  tenant_id   = ${tenant.id}::uuid
          AND    aggregate_type = ${"RevenueModelVersion"}
          AND    aggregate_id   = ${model.id}
        `;
      }

      const scoring = latestModel?.status === "ACTIVE" || (training as any)?.status === "ACTIVE"
        ? await scoreOpenOpportunities(tenant.id, null)
        : { status: "NOT_READY", scored: 0 };

      report.predictive.push({ tenantId: tenant.id, training, scoring });
    } catch (error) {
      report.errors.push({
        tenantId: tenant.id,
        stage: "PREDICTIVE",
        error: error instanceof Error ? error.message : "UNKNOWN_PREDICTIVE_ERROR",
      });
    }
  }

  try {
    report.outbox = await processRevenueOutbox(200);
  } catch (error) {
    report.errors.push({
      tenantId: "SYSTEM",
      stage: "OUTBOX",
      error: error instanceof Error ? error.message : "UNKNOWN_OUTBOX_ERROR",
    });
  }

  return NextResponse.json(
    {
      ok: report.errors.length === 0,
      report,
    },
    {
      status: report.errors.length === 0 ? 200 : 207,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
