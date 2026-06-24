// app/actions/contract.ts
// Hardened: DB-backed role + tenant FK + audit on all mutations.
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { issueContract } from "@/lib/domain/transaction-spine";

// ─── Allowed roles for contract mutations ─────────────────────────────────────

const CONTRACT_WRITER_ROLES = ["ADMIN", "owner", "SALES_MANAGER"] as const;
const CONTRACT_READER_ROLES = [
  "ADMIN",
  "owner",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "rental_manager",
] as const;

export async function saveContractTermsAction(terms: string) {
  try {
    // Only ADMIN / owner may modify contract templates
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, ["ADMIN", "owner"]);

    const tenant = await getActiveTenant();

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { contractTerms: terms },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "CONTRACT_TERMS_UPDATED",
      tableName: "tenants",
      recordId: tenant.id,
      details: JSON.stringify({ length: terms.length }),
    });

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب بيانات العملاء والوحدات الشاغرة المتاحة للتعاقد من قاعدة البيانات
 */
export async function getContractWizardDataAction() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً.", clients: [], properties: [] };
    await assertServerActionRole(session, CONTRACT_READER_ROLES);

    const tenant = await getActiveTenant();

    // 1. جلب العملاء المستثمرين الفعليين (Leads)
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
      take: 100,
    });

    // 2. جلب جهات الاتصال البديلة (Contacts) لشمولية الفهرس
    const contacts = await prisma.contact.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      take: 100,
    });

    // دمج العملاء في مصفوفة موحدة
    const clients = [
      ...leads.map((l) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName || ""}`.trim(),
        phone: l.phone,
        type: "lead",
      })),
      ...contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        type: "contact",
      })),
    ];

    // 3. جلب الوحدات العقارية غير المرتبطة بعقود مسبقة
    const units = await prisma.unit.findMany({
      where: {
        project: { tenantId: tenant.id },
      },
      include: {
        project: {
          select: { name: true },
        },
        contract: true,
      },
      orderBy: [
        { project: { name: "asc" } },
        { unitNumber: "asc" },
      ],
      take: 100,
    });

    const availableProperties = units
      .filter((u) => !u.contract)
      .map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        priceSar: Number(u.priceSar),
        status: u.status,
        projectName: u.project?.name || "مشروع عام",
      }));

    return {
      success: true,
      clients,
      properties: availableProperties,
    };
  } catch (error: any) {
    console.error("فشل جلب بيانات معالج العقود:", error);
    return { success: false, error: error.message, clients: [], properties: [] };
  }
}

/**
 * إصدار عقد مبيعات حقيقي وربطه بالعميل والوحدة العقارية بشكل ذري وآمن
 */
export async function issueContractActionDirect(data: {
  clientId: string;
  propertyId: string;
  amount: number;
}) {
  try {
    // ── Auth: DB-backed role verification ────────────────────────────────────
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, CONTRACT_WRITER_ROLES);

    const tenant = await getActiveTenant();
    const { clientId, propertyId, amount } = data;

    const contract = await issueContract({
      tenantId: tenant.id,
      userId: verified.userId,
      clientId,
      propertyId,
      amount: Number(amount),
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "CONTRACT_ISSUED",
      tableName: "contracts",
      recordId: contract.id,
      details: JSON.stringify({
        clientId,
        propertyId,
        amount,
        buyerName: contract.buyerName,
      }),
    });

    revalidatePath("/operations/dashboard");
    revalidatePath("/operations/properties");

    return {
      success: true,
      contract: {
        id: contract.id,
        buyerName: contract.buyerName,
        buyerPhone: contract.buyerPhone,
        totalVolumeSar: Number(contract.totalVolumeSar),
        signedAt: contract.signedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("فشل إصدار العقد عبر الـ Server Action:", error);
    return { success: false, error: error.message };
  }
}
