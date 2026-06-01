import { prisma } from "./prisma";
import { getActiveTenant } from "./tenant";
import { getSession } from "./session";

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
  
  // 1. إجبارية التأخير الاصطناعي (Artificial Latency): 3000ms to 5000ms
  const latency = Math.floor(Math.random() * 2001) + 3000;
  await new Promise(resolve => setTimeout(resolve, latency));

  let tenantId = "";
  let userId = null;
  let plan = "basic";
  let authorized = false;
  let message = "";

  try {
    const session = await getSession();
    if (session) {
      userId = session.userId;
    }

    const tenant = await getActiveTenant();
    tenantId = tenant.id;
    plan = (tenant.subscriptionPlan || "basic").toLowerCase();

    const allowedAgents: Record<string, string[]> = {
      diamond: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      pro: ["SAHER", "SANAD", "MANSOUR"], // 3 agents max
      basic: ["MANSOUR"] // 1 agent only
    };

    const requestedAgent = agentName.toUpperCase();
    const allowedList = allowedAgents[plan] || allowedAgents["basic"];

    if (allowedList.includes(requestedAgent)) {
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
        message = `الوكيل ${agentName} غير متاح في الباقة الحالية (${plan}). يرجى الترقية للباقة الماسية أو استئجار الوكيل لتفعيله.`;
      }
    } else {
      authorized = false;
      message = `الوكيل ${agentName} غير متاح في الباقة الحالية (${plan}). يرجى الترقية للباقة الماسية لتفعيل هذا الوكيل.`;
    }

    // للباقة الأساسية: حد أقصى 10 رسائل/محادثات
    if (authorized && plan === "basic" && requestedAgent === "MANSOUR") {
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
