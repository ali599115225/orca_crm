// app/api/v1/health/route.ts
// 🏥 نقطة فحص حالة النظام - يستخدمها Safe Mode للتحقق من توفر الخدمة

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // فحص اتصال قاعدة البيانات بسرعة
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "online",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        services: {
          database: "connected",
          api: "operational",
        },
        version: process.env.npm_package_version || "1.0.0",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache",
          "X-Response-Time": `${responseTime}ms`,
        },
      }
    );
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        error: "Database connection failed",
        services: {
          database: "disconnected",
          api: "degraded",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache",
        },
      }
    );
  }
}
