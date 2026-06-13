// app/actions/saherAgent.ts
// 🤖 وكيل ساهر — محرك التأهيل الذكي وإسناد العملاء + Replay Strategy Engine
// النواة الذكية الأولى لمنصة ORCA
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import {
  buildSaherSystemPrompt,
  type SaherLeadOutput,
} from "@/lib/saher/systemPrompt";
import {
  saherDLQ,
  saherReplayEngine,
  type DLQEntry,
} from "@/lib/saher/replayEngine";
import { writeAuditLog } from "@/lib/audit";
import { assertAgentCanRun } from "@/lib/agents/guard";
import {
  sanitizeAgentInput,
  detectInjectionPatterns,
  wrapUntrustedContent,
  safeJsonParseAgentOutput,
  validateAllowedAction,
} from "@/lib/agents/prompt-guard";
import {
  maskPhone,
  maskName,
  redactPiiFromPayload,
  sanitizeAuditDetails,
  shortHash,
  hashPhone,
} from "@/lib/privacy-mask";
import { encryptText, decryptText } from "@/lib/crypto";

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
  saherOutput?: SaherLeadOutput | null;
  approvalRequired?: boolean;
  taskOrderId?: string;
  error?: string;
}> {
  try {
    const tenant = await getActiveTenant();

    const runtimeGuard = await assertAgentCanRun({
      tenantId: tenant.id,
      agentName: "SAHER",
      actionType: "ANALYSIS",
    });
    if (!runtimeGuard.allowed) {
      return { success: false, error: "الوكلاء الذكيون معطلون مؤقتًا." };
    }

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

    // 3. Sanitize input + detect threats before Gemini
    const sanitizedMessage = sanitizeAgentInput(message.messageText, { maxLength: 2000 });
    const sanitizedName = sanitizeAgentInput(message.senderName || "", { maxLength: 100 });
    const injectionCheck = detectInjectionPatterns(message.messageText);
    if (injectionCheck.suspicious) {
      await writeAuditLog({
        tenantId: tenant.id,
        userId: null,
        action: "PROMPT_INJECTION_DETECTED" as any,
        tableName: "sentinel_command",
        recordId: shortHash(message.senderPhone),
        details: JSON.stringify({
          agentName: "SAHER",
          source: "WHATSAPP",
          riskLevel: injectionCheck.riskLevel,
          patterns: injectionCheck.patterns,
          originalLength: sanitizedMessage.originalLength,
          sanitizedLength: sanitizedMessage.sanitizedLength,
        }),
      });

      if (injectionCheck.riskLevel === "HIGH") {
        return {
          success: false,
          error: "High risk prompt injection blocked",
          responseToClient: "عذراً، لا يمكننا معالجة طلبك حالياً لدواعي أمنية."
        };
      }
    }

    const userContext = wrapUntrustedContent("WHATSAPP_MESSAGE", [
      `المرسِل: ${sanitizedName.sanitized}`,
      `الرسالة: ${sanitizedMessage.sanitized}`,
      `التوقيت: ${message.timestamp}`,
    ].join("\n"));

    const saherOutput = await callGeminiForLeadQualification(
      systemPrompt,
      userContext
    );

    // 4. Validate AI output before trusting it
    if (saherOutput) {
      const validActions = ["LEAD_QUALIFIED", "LEAD_REJECTED", "MORE_INFO_NEEDED"];
      if (!validateAllowedAction(saherOutput.action, validActions)) {
        await writeAuditLog({
          tenantId: tenant.id,
          userId: null,
          action: "AGENT_UNSAFE_ACTION_REJECTED" as any,
          tableName: "sentinel_command",
          recordId: shortHash(message.senderPhone),
          details: JSON.stringify({
            agentName: "SAHER",
            invalidAction: saherOutput.action,
            expectedActions: validActions,
          }),
        });
        saherOutput.action = "MORE_INFO_NEEDED";
        await writeAuditLog({
          tenantId: tenant.id,
          userId: null,
          action: "AGENT_SAFE_FALLBACK_USED" as any,
          tableName: "sentinel_command",
          recordId: shortHash(message.senderPhone),
          details: JSON.stringify({
            agentName: "SAHER",
            reason: "INVALID_ACTION",
            fallbackType: "MORE_INFO_NEEDED",
            source: "WHATSAPP",
          }),
        });
      }
      if (saherOutput.lead_data && typeof saherOutput.lead_data.lead_score === "number") {
        saherOutput.lead_data.lead_score = Math.max(0, Math.min(100, saherOutput.lead_data.lead_score));
      }
      if (typeof saherOutput.confidence === "number") {
        saherOutput.confidence = Math.max(0, Math.min(1, saherOutput.confidence));
      }
    }

    const isSuspicious = injectionCheck.suspicious;
    const elevatedRisk = injectionCheck.riskLevel === "HIGH" ? "HIGH" : injectionCheck.suspicious ? "MEDIUM" : "LOW";

    if (!saherOutput || saherOutput.action === "MORE_INFO_NEEDED") {
      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "Lead_Screening",
        `رسالة واتساب من ${maskPhone(message.senderPhone)} تحتاج معلومات إضافية — درجة الثقة: ${saherOutput?.confidence || 0}`,
        "Info"
      );

      const replyText = saherOutput?.response_to_client_ar ||
        "شكراً لتواصلكم! هل يمكنكم مشاركتنا المزيد من التفاصيل لنتمكن من خدمتكم بشكل أفضل؟";

      const displaySummary = redactPiiFromPayload({
        actionType: "SEND_WHATSAPP_REPLY",
        senderPhone: message.senderPhone,
      });
      const executionPayloadRaw = {
        actionType: "SEND_WHATSAPP_REPLY",
        responseToClient: replyText,
        senderPhone: message.senderPhone,
      };

      const taskOrder = await prisma.sentinelTaskOrder.create({
        data: {
          tenantId: tenant.id,
          createdBy: "SAHER",
          assignedToType: "OWNER",
          assignedToName: "Customer Admin",
          title: `SAHER: رد تلقائي — ${maskName(message.senderName) || maskPhone(message.senderPhone)}`,
          description: JSON.stringify(displaySummary),
          executionPayload: encryptText(JSON.stringify(executionPayloadRaw)),
          priority: "MEDIUM",
          riskLevel: "LOW",
          approvalRequired: true,
          status: "WAITING_APPROVAL",
          source: "WHATSAPP",
          correlationId: `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`,
        },
      });

      await writeAuditLog({
        tenantId: tenant.id,
        userId: null,
        action: "SAHER_APPROVAL_REQUESTED",
        tableName: "sentinel_task_orders",
        recordId: taskOrder.id,
        details: sanitizeAuditDetails(`SAHER proposed info-request reply to ${maskPhone(message.senderPhone)}`),
      });

      return {
        success: true,
        approvalRequired: true,
        taskOrderId: taskOrder.id,
        saherOutput,
      };
    }

    if (saherOutput.action === "LEAD_REJECTED") {
      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "Lead_Screening",
        `رسالة مرفوضة من ${maskPhone(message.senderPhone)}: ${saherOutput.internal_notes_ar?.substring(0, 100) || "—"}`,
        "Info"
      );

      const taskOrder = await prisma.sentinelTaskOrder.create({
        data: {
          tenantId: tenant.id,
          createdBy: "SAHER",
          assignedToType: "OWNER",
          assignedToName: "Customer Admin",
          title: `SAHER: رد رفض — ${maskName(message.senderName) || maskPhone(message.senderPhone)}`,
          description: JSON.stringify(redactPiiFromPayload({ actionType: "SEND_WHATSAPP_REPLY", senderPhone: message.senderPhone })),
          executionPayload: encryptText(JSON.stringify({ actionType: "SEND_WHATSAPP_REPLY", responseToClient: saherOutput.response_to_client_ar, senderPhone: message.senderPhone })),
          priority: "LOW",
          riskLevel: "LOW",
          approvalRequired: true,
          status: "WAITING_APPROVAL",
          source: "WHATSAPP",
          correlationId: `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`,
        },
      });

      await writeAuditLog({
        tenantId: tenant.id,
        userId: null,
        action: "SAHER_APPROVAL_REQUESTED",
        tableName: "sentinel_task_orders",
        recordId: taskOrder.id,
        details: sanitizeAuditDetails(`SAHER proposed rejection reply to ${maskPhone(message.senderPhone)}`),
      });

      return {
        success: true,
        approvalRequired: true,
        taskOrderId: taskOrder.id,
        saherOutput,
      };
    }

    // 4. عميل مؤهل → إنشاء Approval بدل التنفيذ المباشر
    const assignedAgent = await getNextAvailableAgentRoundRobin(tenant.id);
    const leadData = saherOutput.lead_data;

    // Idempotency: منع تكرار approval لنفس الرسالة
    const idempotencyKey = `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`;
    const existingApproval = await prisma.sentinelTaskOrder.findFirst({
      where: {
        tenantId: tenant.id,
        source: "WHATSAPP",
        status: { in: ["WAITING_APPROVAL", "OPEN", "IN_PROGRESS"] },
        correlationId: idempotencyKey,
      },
    });
    if (existingApproval) {
      await writeAuditLog({
        tenantId: tenant.id,
        userId: null,
        action: "SAHER_DUPLICATE_APPROVAL_BLOCKED",
        tableName: "sentinel_task_orders",
        recordId: existingApproval.id,
        details: sanitizeAuditDetails(`Duplicate approval blocked for sender ${maskPhone(message.senderPhone)}`),
      });
      return {
        success: true,
        approvalRequired: true,
        taskOrderId: existingApproval.id,
      };
    }

    const proposedPayload = {
      actionType: "CREATE_LEAD_AND_SEND_REPLY",
      leadData: { ...leadData, phone: leadData.phone || message.senderPhone },
      assignedAgentId: assignedAgent?.id || null,
      assignedAgentName: assignedAgent?.name || null,
      responseToClient: saherOutput.response_to_client_ar,
      saherConfidence: saherOutput.confidence,
      senderPhone: message.senderPhone,
      senderName: message.senderName,
    };

    const taskOrder = await prisma.sentinelTaskOrder.create({
      data: {
        tenantId: tenant.id,
        createdBy: "SAHER",
        assignedToType: "OWNER",
        assignedToName: "Customer Admin",
        title: `SAHER: ${maskName(leadData.first_name)} — ${leadData.lead_score}/100${isSuspicious ? " ⚠" : ""}`,
        description: JSON.stringify(redactPiiFromPayload(proposedPayload)),
        executionPayload: encryptText(JSON.stringify(proposedPayload)),
        priority: leadData.urgency_level === "URGENT" ? "HIGH" : isSuspicious ? "HIGH" : "MEDIUM",
        riskLevel: elevatedRisk,
        approvalRequired: true,
        status: "WAITING_APPROVAL",
        source: "WHATSAPP",
        correlationId: `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`,
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: null,
      action: "SAHER_APPROVAL_REQUESTED",
      tableName: "sentinel_task_orders",
      recordId: taskOrder.id,
      details: sanitizeAuditDetails(`SAHER proposed lead creation: ${maskName(leadData.first_name)}, score ${leadData.lead_score}, confidence ${saherOutput.confidence}`),
    });

    await logTelemetryEvent(
      tenant.id,
      "SAHER",
      "Lead_Screening",
      `🔄 اقتراح إنشاء عميل: ${maskName(leadData.first_name)} | درجة: ${leadData.lead_score}/100 | بانتظار الموافقة`,
      "Info"
    );

    return {
      success: true,
      approvalRequired: true,
      taskOrderId: taskOrder.id,
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

// ─── تنفيذ إجراء SAHER بعد الموافقة ──────────────────────────────────────────

const WHATSAPP_API_SENDER = process.env.GREEN_API_TOKEN_INSTANCE && process.env.GREEN_API_ID_INSTANCE
  ? {
      token: process.env.GREEN_API_TOKEN_INSTANCE,
      instanceId: process.env.GREEN_API_ID_INSTANCE,
      url: process.env.GREEN_API_URL || "https://7107.api.greenapi.com",
    }
  : null;

async function sendApprovedWhatsAppReply(chatId: string, message: string): Promise<void> {
  if (WHATSAPP_API_SENDER && WHATSAPP_API_SENDER.token && !WHATSAPP_API_SENDER.token.startsWith("ضع_هنا")) {
    try {
      await fetch(
        `${WHATSAPP_API_SENDER.url}/waInstance${WHATSAPP_API_SENDER.instanceId}/sendMessage/${WHATSAPP_API_SENDER.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: `${chatId}@c.us`, message, linkPreview: false }),
        }
      );
    } catch {}
  }
  console.log(`[SAHER Approved] WhatsApp reply to ${maskPhone(chatId)}: ${message.substring(0, 50)}`);
}

export async function executeApprovedSaherAction(
  taskOrderId: string,
  approverUserId: string
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const session = await getSession();
  if (!session || !session.tenantId) {
    throw new Error("Unauthorized");
  }

  const taskOrder = await prisma.sentinelTaskOrder.findFirst({
    where: { id: taskOrderId },
  });
  if (!taskOrder) return { success: false, error: "Task order not found" };

  const tenantId = taskOrder.tenantId;
  if (!tenantId) return { success: false, error: "Task order has no tenant" };

  if (session.tenantId !== tenantId) {
    throw new Error("Unauthorized: Cross-tenant execution blocked");
  }

  const runtimeGuard = await assertAgentCanRun({
    tenantId,
    userId: approverUserId,
    agentName: "SAHER",
    actionType: "EXECUTION",
    source: "APPROVAL",
  });
  if (!runtimeGuard.allowed) {
    return { success: false, error: `Agent blocked: ${runtimeGuard.reason}` };
  }

  if (taskOrder.status !== "WAITING_APPROVAL" && taskOrder.status !== "OPEN") {
    await writeAuditLog({
      tenantId,
      userId: approverUserId,
      action: "SAHER_DUPLICATE_EXECUTION_BLOCKED",
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: `Task already in status ${taskOrder.status}`,
    });
    return { success: false, error: `Task already ${taskOrder.status}` };
  }

  let payload: any;
  if (taskOrder.executionPayload) {
    const decrypted = decryptText(taskOrder.executionPayload);
    if (!decrypted) {
      await writeAuditLog({
        tenantId,
        userId: approverUserId,
        action: "SAHER_ACTION_EXECUTION_FAILED" as any,
        tableName: "sentinel_task_orders",
        recordId: taskOrderId,
        details: "Failed to decrypt execution payload",
      });
      return { success: false, error: "Execution payload decryption failed" };
    }
    try { payload = JSON.parse(decrypted); } catch {
      await writeAuditLog({
        tenantId,
        userId: approverUserId,
        action: "SAHER_ACTION_EXECUTION_FAILED" as any,
        tableName: "sentinel_task_orders",
        recordId: taskOrderId,
        details: "Failed to parse execution payload JSON",
      });
      return { success: false, error: "Execution payload JSON parse failed" };
    }
  } else {
    await writeAuditLog({
      tenantId,
      userId: approverUserId,
      action: "SAHER_ACTION_EXECUTION_FAILED" as any,
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: "Missing execution payload — old approval, requires manual handling",
    });
    return { success: false, error: "Missing execution payload. This is an old approval that must be recreated." };
  }

  const actionType = payload.actionType as string;

  // Mark as IN_PROGRESS
  await prisma.sentinelTaskOrder.update({
    where: { id: taskOrderId },
    data: { status: "IN_PROGRESS" },
  });

  try {
    if (actionType === "CREATE_LEAD_AND_SEND_REPLY") {
      const leadData = payload.leadData;

      const newLead = await prisma.$transaction(async (tx) => {
        await assertPlanLimit({ tenantId, feature: "leads", tx });
        return tx.lead.create({
          data: {
            tenantId,
            firstName: leadData.first_name,
            lastName: leadData.last_name || null,
            phone: leadData.phone || payload.senderPhone,
            phoneHash: hashPhone(tenantId, leadData.phone || payload.senderPhone),
            email: null,
            city: leadData.city || "غير محدد",
            source: leadData.source || "WHATSAPP",
            status: "NEW",
            leadScore: leadData.lead_score || 50,
            assignedTo: payload.assignedAgentId || null,
          },
        });
      });

      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: newLead.id,
          userId: null,
          activityType: "APPROVED_BY_ADMIN_VIA_SAHER",
          description: payload.assignedAgentName
            ? `تمت الموافقة على إنشاء العميل وإسناده إلى ${payload.assignedAgentName}`
            : "تمت الموافقة على إنشاء العميل",
        },
      });

      await writeAuditLog({
        tenantId,
        userId: approverUserId,
        action: "SAHER_ACTION_EXECUTED",
        tableName: "leads",
        recordId: newLead.id,
        details: `Lead created via SAHER approval: ${leadData.first_name}, assigned to ${payload.assignedAgentName || "unassigned"}`,
      });

      // Send the approved reply
      if (payload.responseToClient && payload.senderPhone) {
        await sendApprovedWhatsAppReply(payload.senderPhone, payload.responseToClient);
        await writeAuditLog({
          tenantId,
          userId: approverUserId,
          action: "SAHER_ACTION_EXECUTED",
          tableName: "whatsapp_messages",
          recordId: newLead.id,
          details: `WhatsApp reply sent to ${maskPhone(payload.senderPhone)} after approval`,
        });
      }

      await prisma.sentinelTaskOrder.update({
        where: { id: taskOrderId },
        data: { status: "DONE", completedAt: new Date() },
      });

      return { success: true, leadId: newLead.id };
    }

    if (actionType === "SEND_WHATSAPP_REPLY") {
      if (payload.responseToClient && payload.senderPhone) {
        await sendApprovedWhatsAppReply(payload.senderPhone, payload.responseToClient);
      }
      await writeAuditLog({
        tenantId,
        userId: approverUserId,
        action: "SAHER_ACTION_EXECUTED",
        tableName: "whatsapp_messages",
        recordId: taskOrderId,
        details: `WhatsApp reply sent to ${maskPhone(payload.senderPhone)} after approval`,
      });

      await prisma.sentinelTaskOrder.update({
        where: { id: taskOrderId },
        data: { status: "DONE", completedAt: new Date() },
      });

      return { success: true };
    }

    return { success: false, error: `Unknown action type: ${actionType}` };

  } catch (error: any) {
    await prisma.sentinelTaskOrder.update({
      where: { id: taskOrderId },
      data: { status: "OPEN" },
    }).catch(() => {});

    await writeAuditLog({
      tenantId,
      userId: approverUserId,
      action: "SAHER_ACTION_EXECUTION_FAILED",
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: error.message,
    });

    if (error instanceof PlanLimitError) {
      return { success: false, error: error.message };
    }
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
