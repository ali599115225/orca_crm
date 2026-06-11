// app/actions/saherAgent.ts
// 🤖 وكيل ساهر — محرك التأهيل الذكي وإسناد العملاء + Replay Strategy Engine
// النواة الذكية الأولى لمنصة ORCA
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import {
  buildSaherSystemPrompt,
  type SaherLeadOutput,
} from "@/lib/saher/systemPrompt";
import {
  saherDLQ,
  saherReplayEngine,
  type DLQEntry,
} from "@/lib/saher/replayEngine";

// ─── نموذج الطلب الوارد من واتساب ─────────────────────────────────────────
export interface WhatsAppIncomingMessage {
  senderPhone: string;
  senderName?: string;
  messageText: string;
  timestamp: string;
  chatId?: string;
}

// ─── خوارزمية Round-Robin الذكية ────────────────────────────────────────────

/**
 * يختار المستشار الأمثل بأقل عدد عملاء مسندين في الأسبوع الماضي
 */
async function getNextAvailableAgentRoundRobin(tenantId: string): Promise<{
  id: string;
  name: string;
  email: string;
} | null> {
  try {
    // استعلام Round-Robin مُحسَّن: يختار المستشار بأقل حمل خلال 7 أيام
    const result = await prisma.$queryRaw<
      Array<{ id: string; name: string; email: string; lead_count: bigint }>
    >`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(l.id) as lead_count
      FROM users u
      LEFT JOIN leads l
        ON l.assigned_to = u.id
        AND l.created_at > NOW() - INTERVAL '7 days'
      WHERE
        u.tenant_id = ${tenantId}::uuid
        AND u.is_active = true
        AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
      GROUP BY u.id, u.name, u.email
      ORDER BY lead_count ASC, u.created_at ASC
      LIMIT 1
    `;

    if (result.length === 0) return null;
    return {
      id: result[0].id,
      name: result[0].name,
      email: result[0].email,
    };
  } catch (error) {
    console.error("[ساهر] خطأ في خوارزمية Round-Robin:", error);
    return null;
  }
}

// ─── تسجيل Telemetry في قاعدة البيانات ──────────────────────────────────────

async function logTelemetryEvent(
  tenantId: string,
  agentId: string,
  actionType: string,
  messageAr: string,
  severity: "Info" | "Warning" | "Critical" = "Info"
) {
  try {
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId,
        agentId,
        actionType,
        logMessageAr: messageAr,
        severity,
      },
    });
  } catch (error) {
    console.error("[ساهر] فشل تسجيل Telemetry:", error);
  }
}

// ─── استدعاء Gemini API لتحليل الرسالة ──────────────────────────────────────

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent";
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAY_MS = 1000;

async function callGeminiForLeadQualification(
  systemPrompt: string,
  userMessage: string,
  retryCount = 0
): Promise<SaherLeadOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.error("[ساهر] مفتاح Gemini API غير موجود في متغيرات البيئة");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `رسالة واتساب جديدة واردة للتحليل والتأهيل:\n\n${userMessage}\n\nأعطني النتيجة بصيغة JSON نظيفة فقط دون أي نص إضافي.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      const statusCode = response.status;

      // إعادة المحاولة للأخطاء القابلة للاسترداد (5xx, 429)
      if (retryCount < GEMINI_MAX_RETRIES && (statusCode >= 500 || statusCode === 429)) {
        console.warn(
          `[ساهر] API غير متاح (${statusCode})، إعادة المحاولة ${retryCount + 1}/${GEMINI_MAX_RETRIES}...`
        );
        await new Promise((r) => setTimeout(r, GEMINI_RETRY_DELAY_MS * (retryCount + 1)));
        return callGeminiForLeadQualification(systemPrompt, userMessage, retryCount + 1);
      }

      throw new Error(`Gemini API Error: ${statusCode} — ${err}`);
    }

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // تنظيف JSON من أي markdown wrapping
    const cleanJson = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson) as SaherLeadOutput;

    // معايرة درجة العميل (Lead Score Calibration)
    if (parsed.lead_data && typeof parsed.lead_data.lead_score === "number") {
      // تسقيف الدرجة بين 0 و 100
      parsed.lead_data.lead_score = Math.max(0, Math.min(100, parsed.lead_data.lead_score));

      // إذا كان الإجراء REJECTED ولكن الدرجة مرتفعة، نُصحح تلقائياً
      if (parsed.action === "LEAD_REJECTED" && parsed.lead_data.lead_score >= 60) {
        parsed.action = "MORE_INFO_NEEDED";
        parsed.confidence = Math.min(0.5, parsed.confidence);
      }

      // إذا كان الإجراء QUALIFIED ولكن الدرجة منخفضة جداً، نُصحح
      if (parsed.action === "LEAD_QUALIFIED" && parsed.lead_data.lead_score < 30) {
        parsed.lead_data.lead_score = 35;
      }
    }

    return parsed;
  } catch (error: any) {
    // إعادة المحاولة لأخطاء الشبكة/الوقت المستقطع
    if (retryCount < GEMINI_MAX_RETRIES && error.name === "AbortError") {
      console.warn(
        `[ساهر] انتهت مهلة الطلب، إعادة المحاولة ${retryCount + 1}/${GEMINI_MAX_RETRIES}...`
      );
      await new Promise((r) => setTimeout(r, GEMINI_RETRY_DELAY_MS * (retryCount + 1)));
      return callGeminiForLeadQualification(systemPrompt, userMessage, retryCount + 1);
    }

    console.error("[ساهر] خطأ في استدعاء Gemini:", error);
    return null;
  }
}

// ─── الدالة الرئيسية: معالجة رسالة واتساب ──────────────────────────────────

export async function processSaherWhatsAppLeadAction(
  message: WhatsAppIncomingMessage
): Promise<{
  success: boolean;
  leadId?: string;
  assignedTo?: string;
  responseToClient?: string;
  saherOutput?: SaherLeadOutput;
  error?: string;
}> {
  try {
    const tenant = await getActiveTenant();

    // 1. جلب المستشارين المتاحين لإدراجهم في سياق ساهر
    const availableAgents = await prisma.$queryRaw<
      Array<{ id: string; name: string; lead_count: bigint }>
    >`
      SELECT u.id, u.name, COUNT(l.id) as lead_count
      FROM users u
      LEFT JOIN leads l ON l.assigned_to = u.id AND l.created_at > NOW() - INTERVAL '7 days'
      WHERE u.tenant_id = ${tenant.id}::uuid
        AND u.is_active = true
        AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
      GROUP BY u.id, u.name
      ORDER BY lead_count ASC
      LIMIT 10
    `;

    // 2. بناء الـ System Prompt مع سياق الشركة والمستشارين
    const systemPrompt = buildSaherSystemPrompt({
      tenantId: tenant.id,
      tenantName: tenant.companyName,
      tenantSubdomain: tenant.subdomain,
      subscriptionPlan: tenant.subscriptionPlan,
      availableAgents: availableAgents.map((a) => ({
        id: a.id,
        name: a.name,
        leadsCount: Number(a.lead_count),
      })),
    });

    // 3. استدعاء ساهر (Gemini) لتحليل الرسالة وتأهيل العميل
    const userContext = `
المرسِل: ${message.senderName || "غير معروف"}
رقم الهاتف: ${message.senderPhone}
الرسالة: ${message.messageText}
التوقيت: ${message.timestamp}
    `.trim();

    const saherOutput = await callGeminiForLeadQualification(
      systemPrompt,
      userContext
    );

    if (!saherOutput || saherOutput.action === "MORE_INFO_NEEDED") {
      // تسجيل Telemetry للرسائل غير المكتملة
      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "Lead_Screening",
        `رسالة واتساب من ${message.senderPhone} تحتاج معلومات إضافية — درجة الثقة: ${saherOutput?.confidence || 0}`,
        "Info"
      );

      return {
        success: true,
        responseToClient: saherOutput?.response_to_client_ar ||
          "شكراً لتواصلكم! هل يمكنكم مشاركتنا المزيد من التفاصيل لنتمكن من خدمتكم بشكل أفضل؟",
      };
    }

    if (saherOutput.action === "LEAD_REJECTED") {
      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "Lead_Screening",
        `رسالة مرفوضة من ${message.senderPhone}: ${saherOutput.internal_notes_ar}`,
        "Info"
      );
      return {
        success: true,
        responseToClient: saherOutput.response_to_client_ar,
        saherOutput,
      };
    }

    // 4. عميل مؤهل → تطبيق Round-Robin وإسناد المستشار
    const assignedAgent = await getNextAvailableAgentRoundRobin(tenant.id);

    // 5. إنشاء سجل العميل في قاعدة البيانات
    const leadData = saherOutput.lead_data;

    const newLead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName: leadData.first_name,
        lastName: leadData.last_name || null,
        phone: leadData.phone || message.senderPhone,
        email: null,
        city: leadData.city || "غير محدد",
        source: leadData.source || "WHATSAPP",
        status: "NEW",
        leadScore: leadData.lead_score || 50,
        assignedTo: assignedAgent?.id || null,
      },
    });

    // 6. تسجيل نشاط الإسناد التلقائي
    await prisma.leadActivity.create({
      data: {
        tenantId: tenant.id,
        leadId: newLead.id,
        userId: null, // وكيل آلي
        activityType: "AUTO_ASSIGNED_BY_SAHER",
        description: assignedAgent
          ? `تم إسناد العميل تلقائياً بواسطة الوكيل ساهر عبر خوارزمية Round-Robin إلى المستشار: ${assignedAgent.name}`
          : "تم إنشاء العميل بواسطة الوكيل ساهر — لا يوجد مستشار متاح للإسناد حالياً",
      },
    });

    // 7. تسجيل Audit Log لإنشاء العميل من واتساب
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "WHATSAPP_LEAD_CREATED",
        tableName: "Lead",
        recordId: newLead.id,
        details: JSON.stringify({
          source: "whatsapp",
          senderPhone: message.senderPhone,
          senderName: message.senderName,
          leadScore: leadData.lead_score,
          assignedAgent: assignedAgent?.name || "unassigned",
        }),
      },
    });

    // 8. تسجيل Telemetry للعملية الناجحة
    await logTelemetryEvent(
      tenant.id,
      "SAHER",
      "Lead_Screening",
      `✅ عميل جديد من واتساب: ${leadData.first_name} | درجة التأهيل: ${leadData.lead_score}/100 | مُسند إلى: ${assignedAgent?.name || "—"}`,
      "Info"
    );

    return {
      success: true,
      leadId: newLead.id,
      assignedTo: assignedAgent?.name,
      responseToClient: saherOutput.response_to_client_ar,
      saherOutput,
    };
  } catch (error: any) {
    console.error("[ساهر] خطأ في معالجة رسالة واتساب:", error);

    // 🔄 Replay Engine: تخزين الرسالة في DLQ لإعادة المحاولة تلقائياً
    try {
      const tenant = await getActiveTenant();
      const dlqId = saherReplayEngine.addToQueue(
        "WHATSAPP_MESSAGE",
        {
          senderPhone: message.senderPhone,
          senderName: message.senderName,
          messageText: message.messageText,
          timestamp: message.timestamp,
          chatId: message.chatId,
        },
        tenant.id
      );

      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "Security_Lock",
        `خطأ في معالجة رسالة واتساب — تم إضافتها للـ DLQ (${dlqId}): ${error.message}`,
        "Critical"
      );
    } catch {}

    return { success: false, error: error.message };
  }
}

// ─── دالة تشغيل محرك Telemetry يدوياً ──────────────────────────────────────

export async function runSaherTelemetryScanAction(): Promise<{
  success: boolean;
  report?: object;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();
    const startTime = Date.now();
    const issues: string[] = [];

    // فحص اتصال قاعدة البيانات
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      if (latency > 400) {
        issues.push(`⚠️ بطء قاعدة البيانات: ${latency}ms`);
        await logTelemetryEvent(
          tenant.id, "SAHER", "Lead_Screening",
          `بطء في قاعدة البيانات: ${latency}ms`, "Warning"
        );
      }
    } catch (dbErr: any) {
      issues.push(`🚨 فشل اتصال DB: ${dbErr.message}`);
      await logTelemetryEvent(
        tenant.id, "SAHER", "Security_Lock",
        `فشل اتصال قاعدة البيانات: ${dbErr.message}`, "Critical"
      );
    }

    // فحص مقاعد الوكلاء والسعة
    const activeSlots = await prisma.agentSlot.count({
      where: { tenantId: tenant.id, isActive: true },
    });

    // فحص العملاء غير المسندين
    const unassignedLeads = await prisma.lead.count({
      where: { tenantId: tenant.id, assignedTo: null, status: "NEW" },
    });

    if (unassignedLeads > 0) {
      issues.push(`⚠️ ${unassignedLeads} عميل جديد بدون إسناد`);
    }

    const report = {
      timestamp: new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }),
      tenantName: tenant.companyName,
      latencyMs: Date.now() - startTime,
      activeAgentSlots: activeSlots,
      unassignedLeads,
      issues,
      status: issues.length === 0 ? "✅ كل الأنظمة تعمل بكفاءة" : `⚠️ ${issues.length} مشكلة مرصودة`,
    };

    return { success: true, report };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── دالة جلب تقارير Telemetry الأخيرة ─────────────────────────────────────

export async function getSaherTelemetryLogsAction(limit: number = 50) {
  try {
    const tenant = await getActiveTenant();

    const logs = await prisma.agentTelemetryLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── دالة تشغيل محرك الاسترداد (Replay Engine) ──────────────────────────────

/**
 * تشغيل دورة Replay لمعالجة الرسائل المعلقة في DLQ
 * يجب استدعاؤها من cron job أو عند الخروج من Safe Mode
 */
export async function runSaherReplayCycleAction(): Promise<{
  success: boolean;
  results?: object;
  dlqStatus?: object;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");

    // تسجيل دالة المعالجة في الـ Engine (تنفيذ إعادة المحاولة)
    saherReplayEngine.registerProcessor(async (entry: DLQEntry) => {
      if (entry.type === "WHATSAPP_MESSAGE") {
        const result = await processSaherWhatsAppLeadAction(
          entry.payload as WhatsAppIncomingMessage
        );
        return result.success;
      }
      // أنواع أخرى قابلة للإضافة مستقبلاً
      return true;
    });

    // تشغيل دورة الاسترداد
    const results = await saherReplayEngine.runReplayCycle();
    const dlqStatus = saherReplayEngine.getStatus();

    return { success: true, results, dlqStatus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب حالة الـ DLQ الحالية (للعرض في لوحة التحكم)
 */
export async function getSaherDLQStatusAction(): Promise<{
  success: boolean;
  status?: object;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");

    return {
      success: true,
      status: saherReplayEngine.getStatus(),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
