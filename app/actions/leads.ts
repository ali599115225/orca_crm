// app/actions/leads.ts
// Server-action entry points for the Leads page.
// Flow: UI → these typed actions → lib/leads service → Prisma. All reads and
// writes are tenant-scoped and role-guarded on the server. `status` is the
// single source of truth — the legacy `stage` column is never read or
// written here.
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { hashPhone, hashEmail, normalizePhone } from "@/lib/privacy-mask";
import {
  LEAD_STATUS_VALUES,
  LEADS_READER_ROLES,
  LEADS_WRITER_ROLES,
  LEADS_MANAGER_ROLES,
  LEAD_ASSIGNABLE_ROLES,
  isLeadStatus,
  leadFailure,
  type LeadActionErrorCode,
  type LeadActionFailure,
  type LeadStatusValue,
} from "@/lib/leads/model";
import { createLeadCore, parseCreateLeadForm } from "@/lib/leads/service";
import type { LeadStatus, Prisma } from "@prisma/client";

export async function getLeadStatusValues(): Promise<readonly LeadStatusValue[]> {
  return LEAD_STATUS_VALUES;
}

function mapCaughtError(error: unknown): LeadActionFailure {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") {
    return leadFailure("UNAUTHORIZED", "UNAUTHORIZED: يجب تسجيل الدخول أولاً.");
  }
  if (message === "FORBIDDEN") {
    return leadFailure("FORBIDDEN", "FORBIDDEN: لا تملك صلاحية تنفيذ هذه العملية.");
  }
  console.error("[Leads Actions]", message);
  return leadFailure("INTERNAL", "تعذر تنفيذ العملية، حاول مرة أخرى.");
}

// ── Serializable shapes ──────────────────────────────────────────────────────

export interface LeadListRow {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  city: string;
  source: string;
  status: LeadStatusValue;
  leadScore: number;
  createdAt: string;
  lastContactedAt: string | null;
  assignedTo: string | null;
  assignedUserName: string | null;
  projectId: string | null;
  projectName: string | null;
  isArchived: boolean;
}

export interface LeadListKpis {
  total: number;
  newCount: number;
  qualifiedCount: number;
  wonCount: number;
  conversion: number;
}

export type LeadSortField = "createdAt" | "leadScore" | "firstName" | "lastContactedAt";

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: LeadStatusValue | "ALL";
  sort?: LeadSortField;
  dir?: "asc" | "desc";
  includeArchived?: boolean;
}

export interface GetLeadsResult {
  success: boolean;
  data: LeadListRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  kpis: LeadListKpis;
  error?: string;
  code?: LeadActionErrorCode;
}

const EMPTY_KPIS: LeadListKpis = {
  total: 0,
  newCount: 0,
  qualifiedCount: 0,
  wonCount: 0,
  conversion: 0,
};

const SORT_FIELDS: readonly LeadSortField[] = [
  "createdAt",
  "leadScore",
  "firstName",
  "lastContactedAt",
];

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// ── List (server pagination + search + filter + sort + KPIs) ────────────────

export async function getLeadsAction(params: GetLeadsParams = {}): Promise<GetLeadsResult> {
  const page = Math.max(1, Math.floor(params.page || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit || 10)));

  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();

    const where: Prisma.LeadWhereInput = {
      tenantId: tenant.id,
      ...(params.includeArchived ? {} : { isArchived: false }),
    };

    if (params.status && params.status !== "ALL" && isLeadStatus(params.status)) {
      where.status = params.status as LeadStatus;
    }

    const q = (params.q || "").trim();
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { source: { contains: q, mode: "insensitive" } },
      ];
    }

    const sortField: LeadSortField = SORT_FIELDS.includes(params.sort as LeadSortField)
      ? (params.sort as LeadSortField)
      : "createdAt";
    const sortDir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";

    const [leads, total, statusGroups] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          city: true,
          source: true,
          status: true,
          leadScore: true,
          createdAt: true,
          lastContactedAt: true,
          assignedTo: true,
          projectId: true,
          isArchived: true,
          assignedUser: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { [sortField]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId: tenant.id, isArchived: false },
        _count: { _all: true },
      }),
    ]);

    const kpiMap = new Map<string, number>(
      (statusGroups || []).map((group: any) => [
        String(group.status),
        Number(group._count?._all || 0),
      ]),
    );
    const kpiTotal = Array.from(kpiMap.values()).reduce((sum, n) => sum + n, 0);
    const wonCount = kpiMap.get("WON") || 0;

    return {
      success: true,
      data: leads.map((lead) => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        source: lead.source,
        status: lead.status as LeadStatusValue,
        leadScore: lead.leadScore,
        createdAt: toIso(lead.createdAt) || "",
        lastContactedAt: toIso(lead.lastContactedAt),
        assignedTo: lead.assignedTo,
        assignedUserName: lead.assignedUser?.name || null,
        projectId: lead.projectId,
        projectName: lead.project?.name || null,
        isArchived: lead.isArchived,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      kpis: {
        total: kpiTotal,
        newCount: kpiMap.get("NEW") || 0,
        qualifiedCount: kpiMap.get("QUALIFIED") || 0,
        wonCount,
        conversion: kpiTotal > 0 ? Math.round((wonCount / kpiTotal) * 100) : 0,
      },
    };
  } catch (error) {
    const mapped = mapCaughtError(error);
    return {
      success: false,
      data: [],
      page,
      limit,
      total: 0,
      totalPages: 1,
      kpis: EMPTY_KPIS,
      error: mapped.error,
      code: mapped.code,
    };
  }
}

// ── Projects & assignable users (for the unified form) ──────────────────────

export async function getProjectsAction() {
  try {
    const session = await getSession();
    if (!session) return [];
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();
    return await prisma.project.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("[Leads Actions] getProjectsAction:", error);
    return [];
  }
}

export interface AssignableUser {
  id: string;
  name: string;
  role: string;
}

export async function getAssignableUsersAction(): Promise<AssignableUser[]> {
  try {
    const session = await getSession();
    if (!session) return [];
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: [...LEAD_ASSIGNABLE_ROLES] as any },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return users.map((u) => ({ id: u.id, name: u.name, role: String(u.role) }));
  } catch (error) {
    console.error("[Leads Actions] getAssignableUsersAction:", error);
    return [];
  }
}

// ── Detail (official detail page data) ───────────────────────────────────────

export async function getLeadDetailAction(leadId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        archivedBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        emailMessages: { orderBy: { createdAt: "desc" }, take: 50 },
        leadActivities: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true } } },
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          take: 50,
          include: { assignedUser: { select: { name: true } } },
        },
        tours: { orderBy: { startAt: "desc" }, take: 50 },
        opportunities: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { offers: { orderBy: { createdAt: "desc" } } },
        },
      },
    });

    if (!lead) {
      return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");
    }

    const history = await prisma.auditLog.findMany({
      where: { tenantId: tenant.id, tableName: "leads", recordId: leadId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, details: true, createdAt: true, userId: true },
    });

    const historyUserIds = Array.from(
      new Set(history.map((h) => h.userId).filter((v): v is string => Boolean(v))),
    );
    const historyUsers = historyUserIds.length
      ? await prisma.user.findMany({
          where: { tenantId: tenant.id, id: { in: historyUserIds } },
          select: { id: true, name: true },
        })
      : [];
    const historyUserMap = new Map(historyUsers.map((u) => [u.id, u.name]));

    return {
      success: true as const,
      viewerRole: verified.role,
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        source: lead.source,
        status: lead.status as LeadStatusValue,
        lostReason: lead.lostReason,
        leadScore: lead.leadScore,
        createdAt: toIso(lead.createdAt) || "",
        lastContactedAt: toIso(lead.lastContactedAt),
        isArchived: lead.isArchived,
        archivedAt: toIso(lead.archivedAt),
        archiveReason: lead.archiveReason,
        archivedByName: lead.archivedBy?.name || null,
        assignedTo: lead.assignedTo,
        assignedUser: lead.assignedUser
          ? {
              id: lead.assignedUser.id,
              name: lead.assignedUser.name,
              email: lead.assignedUser.email,
            }
          : null,
        project: lead.project ? { id: lead.project.id, name: lead.project.name } : null,
        emailMessages: lead.emailMessages.map((msg) => ({
          id: msg.id,
          to: msg.to,
          from: msg.from,
          subject: msg.subject,
          status: msg.status,
          direction: msg.direction,
          createdAt: toIso(msg.createdAt) || "",
          sentAt: toIso(msg.sentAt),
          errorMessage: msg.errorMessage,
        })),
        leadActivities: lead.leadActivities.map((activity) => ({
          id: activity.id,
          activityType: activity.activityType,
          description: activity.description,
          createdAt: toIso(activity.createdAt) || "",
          userName: activity.user?.name || null,
        })),
        tasks: lead.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: toIso(task.dueDate) || "",
          priority: String(task.priority),
          status: String(task.status),
          assignedUserName: task.assignedUser?.name || null,
        })),
        // Tours are linked through leadId and the official Tour.offerId
        // relation — no auditLog parsing anywhere.
        tours: lead.tours.map((tour) => ({
          id: tour.id,
          opportunityId: tour.opportunityId,
          offerId: tour.offerId,
          unitId: tour.unitId,
          startAt: toIso(tour.startAt) || "",
          endAt: toIso(tour.endAt),
          location: tour.location,
          status: String(tour.status),
        })),
        opportunities: lead.opportunities.map((opportunity) => ({
          id: opportunity.id,
          value: Number(opportunity.value),
          probability: opportunity.probability,
          closeDate: toIso(opportunity.closeDate) || "",
          status: opportunity.status,
          unitId: opportunity.unitId,
          offers: opportunity.offers.map((offer) => ({
            id: offer.id,
            linkedOpportunityId: offer.linkedOpportunityId,
            unitId: offer.unitId,
            price: Number(offer.price),
            validUntil: toIso(offer.validUntil) || "",
            status: offer.status,
            createdAt: toIso(offer.createdAt),
          })),
        })),
        history: history.map((entry) => ({
          id: entry.id,
          action: entry.action,
          details: entry.details,
          createdAt: toIso(entry.createdAt) || "",
          userName: entry.userId ? historyUserMap.get(entry.userId) || null : null,
        })),
      },
    };
  } catch (error) {
    return mapCaughtError(error);
  }
}

export type LeadDetailResult = Awaited<ReturnType<typeof getLeadDetailAction>>;
export type LeadDetailData = Extract<LeadDetailResult, { success: true }>["lead"];

// ── Creation (shared core, two authorization entry points) ──────────────────

/** Authorized dashboard creation (unified form on /operations/leads). */
export async function createManagedLeadAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_WRITER_ROLES);

    const tenant = await getActiveTenant();
    const result = await createLeadCore({
      tenant,
      actor: { userId: verified.userId, role: verified.role },
      input: parseCreateLeadForm(formData),
    });

    if (result.success) {
      revalidatePath("/operations/leads");
      revalidatePath("/operations");
    }
    return result;
  } catch (error) {
    return mapCaughtError(error);
  }
}

/**
 * Public capture path (demo/marketing forms, e.g. app/demo). Keeps the
 * legacy export name so out-of-scope consumers stay unbroken. No session;
 * tenant resolved from the requesting host; the lead is always created
 * unassigned and shares the exact same business rules (normalization,
 * dedup, plan limit, decoupled notifications).
 */
export async function createLeadAction(formData: FormData) {
  try {
    const clientHost = String(formData.get("clientHost") || "") || undefined;
    const tenant = await getActiveTenant(clientHost);
    const input = parseCreateLeadForm(formData);
    input.assignedTo = null;

    const result = await createLeadCore({ tenant, actor: null, input });
    if (result.success) {
      revalidatePath("/operations/leads");
    }
    return result;
  } catch (error) {
    return mapCaughtError(error);
  }
}

// ── Status change ─────────────────────────────────────────────────────────────

/** Uniform mutation result: optional fields keep both branches accessible. */
export interface LeadMutationResult {
  success: boolean;
  error?: string;
  code?: LeadActionErrorCode;
  duplicateLeadId?: string;
}

export async function updateLeadStatusAction(
  leadId: string,
  newStatus: LeadStatusValue,
): Promise<LeadMutationResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_WRITER_ROLES);

    if (!isLeadStatus(newStatus)) {
      return leadFailure("VALIDATION", "قيمة الحالة غير معتمدة.");
    }

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!lead) return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");

    const previousStatus = lead.status;

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: {
        status: newStatus as LeadStatus,
        updatedBy: verified.userId,
        ...(newStatus === "CONTACTED" ? { lastContactedAt: new Date() } : {}),
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_STATUS_UPDATED",
      tableName: "leads",
      recordId: leadId,
      details: JSON.stringify({ from: previousStatus, to: newStatus }),
    });

    revalidatePath("/operations/leads");
    revalidatePath(`/operations/leads/${leadId}`);
    revalidatePath("/operations");
    return { success: true as const };
  } catch (error) {
    return mapCaughtError(error);
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string | null;
  phone?: string;
  email?: string | null;
  city?: string;
  source?: string;
  projectId?: string | null;
}

export async function updateLeadAction(
  leadId: string,
  input: UpdateLeadInput,
): Promise<LeadMutationResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_WRITER_ROLES);

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, phone: true },
    });
    if (!lead) return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");

    const data: Prisma.LeadUpdateInput = { updatedBy: verified.userId };

    if (input.firstName !== undefined) {
      const firstName = input.firstName.trim();
      if (!firstName) return leadFailure("VALIDATION", "الاسم الأول إلزامي.");
      data.firstName = firstName;
    }
    if (input.lastName !== undefined) data.lastName = input.lastName?.trim() || null;
    if (input.email !== undefined) {
      const email = input.email?.trim() || null;
      data.email = email;
      data.emailHash = email ? hashEmail(email, tenant.id) : null;
    }
    if (input.city !== undefined) data.city = input.city.trim() || "غير محدد";
    if (input.source !== undefined) data.source = input.source.trim() || "DIRECT";
    if (input.projectId !== undefined) {
      data.project = input.projectId ? { connect: { id: input.projectId } } : { disconnect: true };
    }

    if (input.phone !== undefined) {
      const normalizedPhone = normalizePhone(input.phone);
      if (normalizedPhone.length < 9) return leadFailure("VALIDATION", "أدخل رقم جوال صحيحًا.");
      const phoneHash = hashPhone(tenant.id, normalizedPhone);
      const duplicate = await prisma.lead.findFirst({
        where: { tenantId: tenant.id, phoneHash, id: { not: leadId } },
        select: { id: true, firstName: true, lastName: true, isArchived: true },
      });
      if (duplicate) {
        const name = `${duplicate.firstName} ${duplicate.lastName || ""}`.trim();
        return leadFailure(
          duplicate.isArchived ? "DUPLICATE_ARCHIVED" : "DUPLICATE_ACTIVE",
          `هذا الرقم مسجل مسبقًا باسم العميل (${name}).`,
          { duplicateLeadId: duplicate.id },
        );
      }
      data.phone = input.phone.trim();
      data.phoneHash = phoneHash;
    }

    await prisma.lead.update({ where: { id: leadId, tenantId: tenant.id }, data });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_UPDATED",
      tableName: "leads",
      recordId: leadId,
      details: JSON.stringify(Object.keys(input)),
    });

    revalidatePath("/operations/leads");
    revalidatePath(`/operations/leads/${leadId}`);
    return { success: true as const };
  } catch (error) {
    return mapCaughtError(error);
  }
}

// ── Assignment (managers only; supports unassign & reassign) ─────────────────

export async function assignLeadAction(
  leadId: string,
  userId: string | null,
): Promise<LeadMutationResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_MANAGER_ROLES);

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, assignedTo: true },
    });
    if (!lead) return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");

    if (userId) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: userId,
          tenantId: tenant.id,
          isActive: true,
          role: { in: [...LEAD_ASSIGNABLE_ROLES] as any },
        },
        select: { id: true },
      });
      if (!targetUser) return leadFailure("VALIDATION", "المستخدم المحدد للإسناد غير متاح.");
    }

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: { assignedTo: userId, updatedBy: verified.userId },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_ASSIGNED",
      tableName: "leads",
      recordId: leadId,
      details: JSON.stringify({ from: lead.assignedTo, to: userId }),
    });

    revalidatePath("/operations/leads");
    revalidatePath(`/operations/leads/${leadId}`);
    return { success: true as const };
  } catch (error) {
    return mapCaughtError(error);
  }
}

// ── Archive / restore (never hard delete) ────────────────────────────────────

export async function archiveLeadAction(
  leadId: string,
  reason: string,
): Promise<LeadMutationResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_MANAGER_ROLES);

    const trimmedReason = (reason || "").trim();
    if (!trimmedReason) return leadFailure("VALIDATION", "سبب الأرشفة إلزامي.");

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, isArchived: true },
    });
    if (!lead) return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");
    if (lead.isArchived) return leadFailure("VALIDATION", "العميل مؤرشف مسبقًا.");

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: trimmedReason,
        archivedById: verified.userId,
        updatedBy: verified.userId,
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_ARCHIVED",
      tableName: "leads",
      recordId: leadId,
      details: JSON.stringify({ reason: trimmedReason }),
    });

    revalidatePath("/operations/leads");
    revalidatePath(`/operations/leads/${leadId}`);
    return { success: true as const };
  } catch (error) {
    return mapCaughtError(error);
  }
}

export async function restoreLeadAction(leadId: string): Promise<LeadMutationResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const verified = await assertServerActionRole(session, LEADS_MANAGER_ROLES);

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, isArchived: true },
    });
    if (!lead) return leadFailure("NOT_FOUND", "العميل غير موجود أو لا يتبع هذه المنشأة.");
    if (!lead.isArchived) return leadFailure("VALIDATION", "العميل غير مؤرشف.");

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        archivedById: null,
        updatedBy: verified.userId,
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_RESTORED",
      tableName: "leads",
      recordId: leadId,
    });

    revalidatePath("/operations/leads");
    revalidatePath(`/operations/leads/${leadId}`);
    return { success: true as const };
  } catch (error) {
    return mapCaughtError(error);
  }
}
