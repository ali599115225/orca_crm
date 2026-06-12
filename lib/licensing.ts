import { prisma } from "./prisma";
import { getActiveTenant } from "./tenant";
import { getSession } from "./session";
import { normalizePlan, PLAN_LIMITS, type CanonicalPlan } from "./plan-guard";

// AI agent lists by canonical plan — order reflects graduated access tiers
const ALL_AGENTS = ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"];

function getAllowedAgents(agentCount: number): string[] {
  if (agentCount >= 5) return [...ALL_AGENTS];
  if (agentCount >= 2) return ["SAHER", "MANSOUR"];
  return ["MANSOUR"];
}

/**
 * دالة التحقق من رخصة وصول المستأجر للوكلاء الذكيين
 * تتضمن تأخيراً اصطناعياً للضغط واختبار التحميل (3000ms - 5000ms)
 * وتوثق المحاولة في جدول audit_logs
 */
export async function authorizeAgentAccess(agentName: string): Promise<{
  authorized: boolean;
  message?: string;
}> {
  const startTime = Date.now();

  let tenantId = "";
  let userId = null;
  let canonicalPlan: CanonicalPlan = "basic";
  let authorized = false;
  let message = "";

  try {
    const session = await getSession();
    if (session) {
      userId = session.userId as string;
    }

    const tenant = await getActiveTenant();
    tenantId = tenant.id;
    canonicalPlan = normalizePlan(tenant.subscriptionPlan);
    const agentLimit = PLAN_LIMITS[canonicalPlan].aiAgents ?? 1;

    const allowedAgents = getAllowedAgents(agentLimit);
    const requestedAgent = agentName.toUpperCase();

    if (allowedAgents.includes(requestedAgent)) {
      authorized = true;
    } else if (tenantId) {
      // Check if there is a valid active lease for this agent
      const lease = await prisma.agentLease.findFirst({
        where: {
          tenantId,
          agentId: requestedAgent,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });
      if (lease) {
        authorized = true;
      } else {
        authorized = false;
        message = `الوكيل ${agentName} غير متاح في الباقة الحالية (${canonicalPlan}). يرجى الترقية للباقة الذهبية أو استئجار الوكيل لتفعيله.`;
      }
    } else {
      authorized = false;
      message = `الوكيل ${agentName} غير متاح في الباقة الحالية (${canonicalPlan}). يرجى الترقية للباقة الذهبية لتفعيل هذا الوكيل.`;
    }

    // للباقة الأساسية: حد أقصى 10 رسائل/محادثات
    if (authorized && canonicalPlan === "basic" && requestedAgent === "MANSOUR") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyChatsCount = await prisma.mansourChat.count({
        where: {
          tenantId,
          createdAt: { gte: today }
        }
      });
      if (dailyChatsCount >= 10) {
        authorized = false;
        message = "لقد وصلت للحد الأقصى للمحادثات اليومية المتاحة في الباقة الأساسية (10 محادثات).";
      }
    }
  } catch (err: any) {
    authorized = false;
    message = err.message || "حدث خطأ أثناء فحص الرخصة.";
  }

  const responseTime = Date.now() - startTime;

  // 2. التسجيل: أي محاولة وصول يجب أن تُسجل فوراً في جدول AuditLog
  if (tenantId) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: authorized ? "AGENT_ACCESS_GRANTED" : "AGENT_ACCESS_DENIED",
          tableName: "platform_connections",
          recordId: agentName,
          details: `محاولة الوصول للوكيل ${agentName}. النتيجة: ${authorized ? "مسموح" : "مرفوض"}. زمن الاستجابة: ${responseTime}ms. الرسالة: ${message || "نجاح"}`
        }
      });
    } catch (auditErr) {
      console.error("Failed to write licensing audit log:", auditErr);
    }
  }

  return { authorized, message };
}
