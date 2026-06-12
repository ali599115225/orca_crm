// app/api/admin/command-center/route.ts
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import {
  getOrCreateSentinelConfig,
  updateOperatingMode,
  updateDelegationLevel,
  updateFallbackPlan,
  updateDeepRepairWait,
  getOpenTasks,
  getPendingApprovals,
  getRecentAuditEvents,
  getOpenIncidents,
  getChatMessages,
  sendOwnerChatMessage,
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

  const [config, openTasks, pendingApprovals, auditEvents, incidents, chatMessages] = await Promise.all([
    getOrCreateSentinelConfig(),
    getOpenTasks(),
    getPendingApprovals(),
    getRecentAuditEvents(20),
    getOpenIncidents(),
    getChatMessages(30),
  ]);

  return NextResponse.json({
    status: config.operatingMode,
    isActive: config.isActive,
    delegationLevel: config.delegationLevel,
    fallbackPlanActive: config.fallbackPlanActive,
    deepRepairWaitMinutes: config.deepRepairWaitMinutes,
    openTasks: openTasks.length,
    pendingApprovals: pendingApprovals.length,
    openIncidents: incidents.length,
    data: {
      config,
      openTasks,
      pendingApprovals,
      auditEvents,
      incidents,
      chatMessages,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized — platform owner only" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "change-mode" && body.mode) {
    const updated = await updateOperatingMode(body.mode);
    return NextResponse.json({ success: true, mode: updated.operatingMode });
  }

  if (action === "delegation-level" && body.level) {
    const updated = await updateDelegationLevel(body.level);
    return NextResponse.json({ success: true, delegationLevel: updated.delegationLevel });
  }

  if (action === "fallback-plan") {
    const updated = await updateFallbackPlan(body.active === true);
    return NextResponse.json({ success: true, fallbackPlanActive: updated.fallbackPlanActive });
  }

  if (action === "deep-repair-wait" && body.minutes) {
    const updated = await updateDeepRepairWait(Number(body.minutes));
    return NextResponse.json({ success: true, deepRepairWaitMinutes: updated.deepRepairWaitMinutes });
  }

  if (action === "chat-send" && body.message) {
    const msg = await sendOwnerChatMessage(String(body.message));
    return NextResponse.json({ success: true, message: msg });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
