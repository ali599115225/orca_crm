// app/api/admin/command-center/route.ts
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import {
  getOrCreateSentinelConfig,
  updateOperatingMode,
  getOpenTasks,
  getPendingApprovals,
  getRecentAuditEvents,
  getOpenIncidents,
} from "@/lib/sentinel/task-order";

async function authenticatePlatformOwner() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;
  const payload = await decrypt(sessionToken);
  if (!payload?.email) return null;
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!superAdminEmails.includes(String(payload.email).toLowerCase())) return null;
  return payload;
}

export async function GET() {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized — platform owner only" }, { status: 401 });
  }

  const [config, openTasks, pendingApprovals, auditEvents, incidents] = await Promise.all([
    getOrCreateSentinelConfig(),
    getOpenTasks(),
    getPendingApprovals(),
    getRecentAuditEvents(20),
    getOpenIncidents(),
  ]);

  return NextResponse.json({
    status: config.operatingMode,
    isActive: config.isActive,
    openTasks: openTasks.length,
    pendingApprovals: pendingApprovals.length,
    openIncidents: incidents.length,
    data: {
      config,
      openTasks,
      pendingApprovals,
      auditEvents,
      incidents,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized — platform owner only" }, { status: 401 });
  }

  const body = await request.json();
  const { action, mode } = body;

  if (action === "change-mode" && mode) {
    const updated = await updateOperatingMode(mode);
    return NextResponse.json({ success: true, mode: updated.operatingMode });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
