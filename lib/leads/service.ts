// lib/leads/service.ts
// Shared server-side Leads application service used by both the server
// actions (app/actions/leads.ts) and the /api/v1/leads routes so the same
// business rules exist in exactly one place.
import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";
import { hashPhone, hashEmail, normalizePhone } from "@/lib/privacy-mask";
import {
  LEAD_ASSIGNABLE_ROLES,
  isLeadsManagerRole,
  leadFailure,
  type LeadActionFailure,
} from "./model";

export interface CreateLeadInput {
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  source: string | null;
  projectId: string | null;
  assignedTo: string | null;
}

export function parseCreateLeadForm(formData: FormData): CreateLeadInput {
  let firstName = String(formData.get("firstName") || "").trim();
  let lastName = String(formData.get("lastName") || "").trim();
  const investorName = String(formData.get("investorName") || "").trim();

  if (investorName) {
    const parts = investorName.split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }

  return {
    firstName,
    lastName: lastName || null,
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    source: String(formData.get("source") || "").trim() || null,
    projectId: String(formData.get("projectId") || "").trim() || null,
    assignedTo: String(formData.get("assignedTo") || "").trim() || null,
  };
}

export type CreateLeadResult = { success: true; leadId: string } | LeadActionFailure;

/**
 * Single creation core:
 * - explicit input validation
 * - phone normalization + duplicate detection over the tenant phone hash
 *   (archived duplicates are surfaced so the UI can offer restore)
 * - manual assignment only (no findFirst auto-assignment); employees may
 *   only self-assign, managers may assign any active sales user
 * - dedicated deployment: no subscription-count gate in the creation path
 * - notifications fully decoupled from the transaction (never fail creation)
 */
export async function createLeadCore(params: {
  tenant: { id: string; name?: string | null };
  actor: { userId: string; role: string } | null;
  input: CreateLeadInput;
}): Promise<CreateLeadResult> {
  const { tenant, actor, input } = params;

  if (!input.firstName || !input.phone) {
    return leadFailure("VALIDATION", "الاسم ورقم الجوال حقول إلزامية.");
  }

  const normalizedPhone = normalizePhone(input.phone);
  if (normalizedPhone.length < 9) {
    return leadFailure("VALIDATION", "أدخل رقم جوال صحيحًا.");
  }

  const phoneHash = hashPhone(tenant.id, normalizedPhone);
  const duplicate = await prisma.lead.findFirst({
    where: { tenantId: tenant.id, phoneHash },
    select: { id: true, firstName: true, lastName: true, isArchived: true },
  });

  if (duplicate) {
    const name = `${duplicate.firstName} ${duplicate.lastName || ""}`.trim();
    if (duplicate.isArchived) {
      return leadFailure(
        "DUPLICATE_ARCHIVED",
        `هذا الرقم مسجل مسبقًا لعميل مؤرشف (${name}). يمكن استعادته بدل إنشاء سجل مكرر.`,
        { duplicateLeadId: duplicate.id },
      );
    }
    return leadFailure(
      "DUPLICATE_ACTIVE",
      `هذا الرقم مسجل مسبقًا باسم العميل (${name}) لمنع تضارب المبيعات.`,
      { duplicateLeadId: duplicate.id },
    );
  }

  let projectId: string | null = null;
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!project) {
      return leadFailure(
        "VALIDATION",
        "المشروع المحدد غير موجود أو لا يتبع هذه المنشأة.",
      );
    }
    projectId = project.id;
  }

  let assignedTo: string | null = null;
  if (input.assignedTo) {
    if (!actor) {
      return leadFailure("FORBIDDEN", "FORBIDDEN: الإسناد غير متاح في هذا المسار.");
    }
    if (!isLeadsManagerRole(actor.role) && input.assignedTo !== actor.userId) {
      return leadFailure("FORBIDDEN", "FORBIDDEN: لا تملك صلاحية إسناد العميل لمستخدم آخر.");
    }
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.assignedTo,
        tenantId: tenant.id,
        isActive: true,
        role: { in: [...LEAD_ASSIGNABLE_ROLES] as any },
      },
      select: { id: true },
    });
    if (!targetUser) {
      return leadFailure("VALIDATION", "المستخدم المحدد للإسناد غير متاح.");
    }
    assignedTo = targetUser.id;
  }

  const lead = await prisma.$transaction(async (tx) =>
    tx.lead.create({
      data: {
        tenantId: tenant.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        phoneHash,
        email: input.email,
        emailHash: input.email ? hashEmail(input.email, tenant.id) : null,
        city: input.city || "غير محدد",
        source: input.source || "DIRECT",
        status: "NEW",
        projectId,
        assignedTo,
        createdBy: actor?.userId || null,
        updatedBy: actor?.userId || null,
      },
      select: {
        id: true,
        firstName: true,
        phone: true,
        source: true,
        assignedUser: { select: { id: true, name: true, phone: true } },
      },
    }),
  );

  await writeAuditLog({
    tenantId: tenant.id,
    userId: actor?.userId || null,
    action: "LEAD_CREATED",
    tableName: "leads",
    recordId: lead.id,
    details: JSON.stringify({ source: lead.source, assignedTo }),
  });

  // Notifications are decoupled from the core transaction — a failure here
  // must never fail the creation itself.
  try {
    const tenantName = (tenant as any).name || (tenant as any).companyName || "";
    const welcome = tenantName
      ? `مرحباً بك أ. ${lead.firstName}، سعدنا باهتمامك بمشاريع ${tenantName}. سيتواصل معك مستشارك العقاري قريباً.`
      : `مرحباً بك أ. ${lead.firstName}، سعدنا باهتمامك بمشاريعنا. سيتواصل معك مستشارك العقاري قريباً.`;
    await sendSMSNotification(lead.phone, welcome, {
      tenantId: tenant.id,
      leadId: lead.id,
      userId: actor?.userId || null,
    });
  } catch (error) {
    console.error("[Leads Service] welcome SMS failed:", error);
  }

  try {
    if (lead.assignedUser?.phone) {
      await sendWhatsAppNotification(tenant.id, lead.assignedUser.phone, "new_lead_assignment", [
        lead.assignedUser.name,
        lead.firstName,
        lead.source,
      ]);
    }
  } catch (error) {
    console.error("[Leads Service] assignment notification failed:", error);
  }

  return { success: true, leadId: lead.id };
}
