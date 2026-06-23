// app/actions/saherAgent.ts
// 🤖 وكيل ساهر — محرك التأهيل الذكي وإسناد العملاء + Replay Strategy Engine
// النواة الذكية الأولى لمنصة ORCA
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertPlanLimit, PlanLimitError } from "@/lib/plan-guard";
import {
  buildSaherSystemPrompt,
  type SaherLeadOutput,
} from "@/lib/saher/systemPrompt";
import { writeAuditLog } from "@/lib/audit";
import { assertAgentCanRun } from "@/lib/agents/guard";
import {
  sanitizeAgentInput,
  detectInjectionPatterns,
  wrapUntrustedContent,
  validateAllowedAction,
} from "@/lib/agents/prompt-guard";
import {
  AGENT_MANAGER_ROLES,
  AGENT_READ_ROLES,
  requireAgentAccess,
} from "@/lib/agents/access";
import { generateAgentJson } from "@/lib/agents/gemini-client";
import {
  claimAgentRetries,
  completeAgentRetry,
  decodeAgentRetry,
  enqueueAgentRetry,
  failAgentRetry,
  getAgentRetryStatus,
} from "@/lib/agents/persistent-retry";
import {
  maskPhone,
  maskName,
  redactPiiFromPayload,
  sanitizeAuditDetails,
  shortHash,
  hashPhone,
} from "@/lib/privacy-mask";
import { encryptText, decryptText } from "@/lib/crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send-service";

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

async function callGeminiForLeadQualification(
  tenantId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<SaherLeadOutput | null> {
  try {
    const result = await generateAgentJson<SaherLeadOutput>({
      tenantId,
      agentName: "SAHER",
      systemPrompt,
      userPrompt: userMessage,
      allowedActions: [
        "LEAD_QUALIFIED",
        "LEAD_REJECTED",
        "MORE_INFO_NEEDED",
      ],
      enforceRuntimeGuard: false,
      validate: (value): value is SaherLeadOutput => {
        if (!value || typeof value !== "object") return false;
        const candidate = value as Record<string, unknown>;
        return (
          typeof candidate.action === "string" &&
          typeof candidate.confidence === "number" &&
          candidate.confidence >= 0 &&
          candidate.confidence <= 1
        );
      },
    });

    const parsed = result.data;
    if (
      parsed.lead_data &&
      typeof parsed.lead_data.lead_score === "number"
    ) {
      parsed.lead_data.lead_score = Math.max(
        0,
        Math.min(100, parsed.lead_data.lead_score),
      );
      if (
        parsed.action === "LEAD_REJECTED" &&
        parsed.lead_data.lead_score >= 60
      ) {
        parsed.action = "MORE_INFO_NEEDED";
        parsed.confidence = Math.min(0.5, parsed.confidence);
      }
      if (
        parsed.action === "LEAD_QUALIFIED" &&
        parsed.lead_data.lead_score < 30
      ) {
        parsed.lead_data.lead_score = 35;
      }
    }

    return parsed;
  } catch {
    console.error("[SAHER] AI qualification unavailable.");
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
  await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
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
      tenant.id,
      systemPrompt,
      userContext,
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
    const elevatedRisk =
      injectionCheck.riskLevel === "HIGH"
        ? "HIGH"
        : injectionCheck.suspicious
          ? "MEDIUM"
          : "LOW";

    const idempotencyKey =
      `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`;
    const existingApproval = await prisma.sentinelTaskOrder.findFirst({
      where: {
        tenantId: tenant.id,
        source: "WHATSAPP",
        status: { in: ["WAITING_APPROVAL", "OPEN", "IN_PROGRESS", "DONE"] },
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
        details: sanitizeAuditDetails(
          `Duplicate approval blocked for ${maskPhone(message.senderPhone)}`,
        ),
      });
      return {
        success: true,
        approvalRequired: existingApproval.approvalRequired,
        taskOrderId: existingApproval.id,
      };
    }

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
    console.error("[SAHER] WhatsApp qualification failed.");

    try {
      const tenant = await getActiveTenant();
      const correlationId =
        `${tenant.id}_${shortHash(message.senderPhone)}_${message.timestamp}`;
      const retryTask = await enqueueAgentRetry({
        tenantId: tenant.id,
        agentName: "SAHER",
        operation: "WHATSAPP_MESSAGE",
        payload: {
          senderPhone: message.senderPhone,
          senderName: message.senderName,
          messageText: message.messageText,
          timestamp: message.timestamp,
          chatId: message.chatId,
        },
        correlationId,
        error,
      });

      await logTelemetryEvent(
        tenant.id,
        "SAHER",
        "PERSISTENT_RETRY_QUEUED",
        `تعذر تحليل رسالة واتساب وأضيفت لمحرك الاسترداد (${retryTask.id}).`,
        "Critical",
      );
    } catch {
      console.error("[SAHER] Persistent retry queue failed.");
    }

    return {
      success: false,
      error: sanitizeAuditDetails(String(error?.message || "Agent failed")),
    };
  }
}

// ─── تنفيذ إجراء SAHER بعد الموافقة ──────────────────────────────────────────

async function sendApprovedWhatsAppReply(
  tenantId: string,
  phone: string,
  message: string,
): Promise<boolean> {
  const result = await sendWhatsAppMessage(tenantId, phone, message);
  if (!result.success) {
    console.error(
      `[SAHER] Approved WhatsApp send failed: ${result.errorCode || "UNKNOWN"}`,
    );
    return false;
  }
  return true;
}

export async function executeApprovedSaherAction(
  taskOrderId: string,
  approverUserId: string,
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
  if (access.userId !== approverUserId) {
    throw new Error("Approver identity mismatch.");
  }

  const taskOrder = await prisma.sentinelTaskOrder.findFirst({
    where: {
      id: taskOrderId,
      tenantId: access.tenantId,
      approvalRequired: true,
    },
  });
  if (!taskOrder) {
    return { success: false, error: "Task order not found." };
  }
  if (taskOrder.status !== "WAITING_APPROVAL") {
    await writeAuditLog({
      tenantId: access.tenantId,
      userId: access.userId,
      action: "SAHER_DUPLICATE_EXECUTION_BLOCKED",
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: `Task already in status ${taskOrder.status}`,
    });
    return { success: false, error: `Task already ${taskOrder.status}.` };
  }

  const runtimeGuard = await assertAgentCanRun({
    tenantId: access.tenantId,
    userId: access.userId,
    agentName: "SAHER",
    actionType: "EXECUTION",
    source: "APPROVAL",
  });
  if (!runtimeGuard.allowed) {
    return {
      success: false,
      error: `Agent blocked: ${runtimeGuard.reason || "runtime policy"}`,
    };
  }

  const claimed = await prisma.sentinelTaskOrder.updateMany({
    where: {
      id: taskOrderId,
      tenantId: access.tenantId,
      status: "WAITING_APPROVAL",
    },
    data: { status: "IN_PROGRESS" },
  });
  if (claimed.count !== 1) {
    return { success: false, error: "Task was claimed by another request." };
  }

  try {
    if (!taskOrder.executionPayload) {
      throw new Error("Execution payload is missing.");
    }
    const decrypted = decryptText(taskOrder.executionPayload);
    if (!decrypted) {
      throw new Error("Execution payload could not be decrypted.");
    }

    const payload = JSON.parse(decrypted) as Record<string, any>;
    const actionType = String(payload.actionType || "");
    if (
      !validateAllowedAction(actionType, [
        "CREATE_LEAD_AND_SEND_REPLY",
        "SEND_WHATSAPP_REPLY",
      ])
    ) {
      throw new Error("Execution action is not allowlisted.");
    }

    if (actionType === "CREATE_LEAD_AND_SEND_REPLY") {
      const leadData = payload.leadData || {};
      const phone = String(leadData.phone || payload.senderPhone || "").trim();
      if (!phone) throw new Error("Lead phone is required.");

      const phoneHashValue = hashPhone(access.tenantId, phone);
      let lead = await prisma.lead.findFirst({
        where: {
          tenantId: access.tenantId,
          phoneHash: phoneHashValue,
        },
      });
      let created = false;

      let assignedTo: string | null = null;
      if (payload.assignedAgentId) {
        const assignee = await prisma.user.findFirst({
          where: {
            id: String(payload.assignedAgentId),
            tenantId: access.tenantId,
            isActive: true,
            role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] },
          },
          select: { id: true },
        });
        assignedTo = assignee?.id || null;
      }

      if (!lead) {
        lead = await prisma.$transaction(async (tx) => {
          await assertPlanLimit({
            tenantId: access.tenantId,
            feature: "leads",
            tx,
          });
          return tx.lead.create({
            data: {
              tenantId: access.tenantId,
              firstName: sanitizeAgentInput(
                String(leadData.first_name || "عميل واتساب"),
                { maxLength: 100 },
              ).sanitized,
              lastName: leadData.last_name
                ? sanitizeAgentInput(String(leadData.last_name), {
                    maxLength: 100,
                  }).sanitized
                : null,
              phone,
              phoneHash: phoneHashValue,
              email: null,
              city: sanitizeAgentInput(
                String(leadData.city || "غير محدد"),
                { maxLength: 100 },
              ).sanitized,
              source: "WHATSAPP",
              status: "NEW",
              leadScore: Math.max(
                0,
                Math.min(100, Number(leadData.lead_score || 50)),
              ),
              assignedTo,
            },
          });
        });
        created = true;
      }

      if (created) {
        await prisma.leadActivity.create({
          data: {
            tenantId: access.tenantId,
            leadId: lead.id,
            userId: access.userId,
            activityType: "APPROVED_BY_ADMIN_VIA_SAHER",
            description: assignedTo
              ? "تمت الموافقة على إنشاء العميل وإسناده."
              : "تمت الموافقة على إنشاء العميل.",
          },
        });
      }

      if (payload.responseToClient && phone) {
        const sent = await sendApprovedWhatsAppReply(
          access.tenantId,
          phone,
          String(payload.responseToClient),
        );
        if (!sent) {
          throw new Error("Approved WhatsApp reply was not accepted.");
        }
      }

      await writeAuditLog({
        tenantId: access.tenantId,
        userId: access.userId,
        action: "SAHER_ACTION_EXECUTED",
        tableName: "sentinel_task_orders",
        recordId: taskOrderId,
        details: sanitizeAuditDetails(
          `Lead ${created ? "created" : "reused"} via approved SAHER task.`,
        ),
      });

      await prisma.sentinelTaskOrder.updateMany({
        where: {
          id: taskOrderId,
          tenantId: access.tenantId,
          status: "IN_PROGRESS",
        },
        data: { status: "DONE", completedAt: new Date() },
      });

      return { success: true, leadId: lead.id };
    }

    const phone = String(payload.senderPhone || "").trim();
    const message = String(payload.responseToClient || "").trim();
    if (!phone || !message) {
      throw new Error("Approved WhatsApp payload is incomplete.");
    }

    const sent = await sendApprovedWhatsAppReply(
      access.tenantId,
      phone,
      message,
    );
    if (!sent) {
      throw new Error("Approved WhatsApp reply was not accepted.");
    }

    await writeAuditLog({
      tenantId: access.tenantId,
      userId: access.userId,
      action: "SAHER_ACTION_EXECUTED",
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: sanitizeAuditDetails(
        `Approved WhatsApp reply sent to ${maskPhone(phone)}.`,
      ),
    });

    await prisma.sentinelTaskOrder.updateMany({
      where: {
        id: taskOrderId,
        tenantId: access.tenantId,
        status: "IN_PROGRESS",
      },
      data: { status: "DONE", completedAt: new Date() },
    });
    return { success: true };
  } catch (error: any) {
    await prisma.sentinelTaskOrder
      .updateMany({
        where: {
          id: taskOrderId,
          tenantId: access.tenantId,
          status: "IN_PROGRESS",
        },
        data: { status: "WAITING_APPROVAL" },
      })
      .catch(() => {});

    await writeAuditLog({
      tenantId: access.tenantId,
      userId: access.userId,
      action: "SAHER_ACTION_EXECUTION_FAILED",
      tableName: "sentinel_task_orders",
      recordId: taskOrderId,
      details: sanitizeAuditDetails(String(error?.message || "Execution failed")),
    });

    if (error instanceof PlanLimitError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: String(error?.message || "Execution failed"),
    };
  }
}

// ─── دالة تشغيل محرك Telemetry يدوياً ──────────────────────────────────────

export async function runSaherTelemetryScanAction(): Promise<{
  success: boolean;
  report?: object;
  error?: string;
}> {
  try {
    await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
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
    await requireAgentAccess({ roles: AGENT_READ_ROLES });
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

// ─── محرك الاسترداد المستمر ────────────────────────────────────────────────

export async function runSaherReplayCycleAction(): Promise<{
  success: boolean;
  results?: object;
  dlqStatus?: object;
  error?: string;
}> {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const tasks = await claimAgentRetries(access.tenantId, 10);
    const results: Array<{
      taskId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const task of tasks) {
      let envelope: ReturnType<typeof decodeAgentRetry> | null = null;
      try {
        envelope = decodeAgentRetry(task.executionPayload);
        if (
          envelope.agentName !== "SAHER" ||
          envelope.operation !== "WHATSAPP_MESSAGE"
        ) {
          throw new Error("Unsupported persistent retry operation.");
        }

        const result = await processSaherWhatsAppLeadAction(
          envelope.payload as WhatsAppIncomingMessage,
        );
        if (!result.success) {
          throw new Error(result.error || "Replay failed.");
        }

        await completeAgentRetry(access.tenantId, task.id);
        results.push({ taskId: task.id, success: true });
      } catch (error: any) {
        if (envelope) {
          await failAgentRetry({
            tenantId: access.tenantId,
            taskId: task.id,
            envelope,
            error,
          });
        } else {
          await prisma.sentinelTaskOrder.updateMany({
            where: {
              id: task.id,
              tenantId: access.tenantId,
              status: "IN_PROGRESS",
            },
            data: { status: "FAILED" },
          });
        }
        results.push({
          taskId: task.id,
          success: false,
          error: sanitizeAuditDetails(
            String(error?.message || "Replay failed"),
          ),
        });
      }
    }

    return {
      success: true,
      results,
      dlqStatus: await getAgentRetryStatus(access.tenantId),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSaherDLQStatusAction(): Promise<{
  success: boolean;
  status?: object;
  error?: string;
}> {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    return {
      success: true,
      status: await getAgentRetryStatus(access.tenantId),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

