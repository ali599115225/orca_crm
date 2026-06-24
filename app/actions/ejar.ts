// app/actions/ejar.ts
// 🏛️ ORCA CRM — Ejar API Integration (Saudi Trust Gate Build 1)
//
// Authorization → Tenant Validation → Trust Gate → Idempotency →
//   Provider Call → Persistence → Audit/Event/Outbox
//
// Hardened guarantees:
//   - DB-backed role check before any operation
//   - Contract FK validated against session tenant
//   - Gate evaluated fresh per-operation (no stale Tenant state)
//   - PayrollCommission only created AFTER a real ejarContractId from the API
//   - Sandbox / mock are BLOCKED — no legal/financial state change without provider confirmation
//   - Idempotent: same contractId returns cached result (no double-commission)
"use server";

import { assertServerActionRole, isProductionRuntime } from "@/lib/api-auth-guard";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { sendAdminEmailAlert } from "@/lib/email";
import { revalidatePath } from "next/cache";
import {
  postCommissionEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from "@/lib/accounting";
import { writeAuditLog } from "@/lib/audit";
import { SaudiTrustGateService } from "@/lib/saudi-trust-gate";
import {
  buildIdempotencyKey,
  checkAndReserve,
  markProcessing,
  markDelivered,
  markRetrying,
} from "@/lib/saudi-trust-gate/idempotency";

// ─── Public interfaces (unchanged — no UI breakage) ──────────────────────────

/**
 * Input for registering a real-estate contract via Ejar.
 * contractId is the ORCA DB Contract.id — NOT lead.id.
 */
export interface EjarContractData {
  contractId: string;       // Contract.id (ORCA) — idempotency key entity
  leadId: string;           // Still accepted for lead activity update
  propertyType: "APARTMENT" | "VILLA" | "LAND" | "COMMERCIAL";
  propertyAddress: string;
  landlordNationalId: string;
  tenantNationalId: string;
  contractStartDate: string;
  contractEndDate: string;
  monthlyRent: number;
  totalContractValue: number;
  salesRepUserId: string;
}

export interface EjarContractResponse {
  success: boolean;
  ejarContractId?: string;
  contractNumber?: string;
  registrationTimestamp?: string;
  commissionCalculated?: number;
  // Idempotency metadata
  idempotent?: boolean;
  outboxStatus?: string;
  error?: string;
}

// ─── Commission rate ──────────────────────────────────────────────────────────

const COMMISSION_RATE = 0.025; // 2.5%

// ─── 1. Submit Contract to Ejar (Hardened) ───────────────────────────────────

export async function submitContractToEjarAction(
  data: EjarContractData
): Promise<EjarContractResponse> {
  try {
    // ── Auth: DB-backed role + active tenant ──────────────────────────────────
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const verifiedSession = await assertServerActionRole(session, [
      "ADMIN",
      "rental_manager",
      "owner",
    ]);

    const tenant = await getActiveTenant();
    const tenantId = tenant.id;
    const userId = verifiedSession.userId;

    // ── Input validation (local — before any DB write) ────────────────────────
    if (!data.contractId) {
      return { success: false, error: "contractId مطلوب." };
    }
    if (!data.landlordNationalId || data.landlordNationalId.length !== 10) {
      return { success: false, error: "رقم الهوية الوطنية للمؤجر يجب أن يكون 10 أرقام." };
    }
    if (!data.tenantNationalId || data.tenantNationalId.length !== 10) {
      return { success: false, error: "رقم الهوية الوطنية للمستأجر يجب أن يكون 10 أرقام." };
    }
    if (data.totalContractValue <= 0) {
      return { success: false, error: "قيمة العقد يجب أن تكون أكبر من صفر." };
    }

    // ── FK: Contract belongs to this tenant (TX_1 pre-check) ─────────────────
    const contract = await prisma.contract.findFirst({
      where: { id: data.contractId, tenantId },
      select: { id: true, status: true },
    });
    if (!contract) {
      return { success: false, error: "العقد غير موجود أو لا يتبع هذه المنشأة." };
    }

    // FK: salesRepUserId belongs to this tenant
    const salesRep = await prisma.user.findFirst({
      where: { id: data.salesRepUserId, tenantId },
      select: { id: true, name: true, email: true },
    });
    if (!salesRep) {
      return { success: false, error: "مندوب المبيعات غير موجود أو لا يتبع هذه المنشأة." };
    }

    // ── Gate evaluation ────────────────────────────────────────────────────────
    const gateResult = await SaudiTrustGateService.evaluate({
      provider: "EJAR",
      operation: "EJAR_REGISTER_CONTRACT",
      tenantId,
      contractId: data.contractId,
    });

    if (gateResult.status !== "READY") {
      // Audit every gate block
      await writeAuditLog({
        tenantId,
        userId,
        action: gateResult.status === "PROVIDER_UNAVAILABLE"
          ? "SAUDI_TRUST_GATE_PROVIDER_UNAVAILABLE"
          : "SAUDI_TRUST_GATE_BLOCKED",
        tableName: "government_outbox",
        recordId: data.contractId,
        details: JSON.stringify({
          reason: (gateResult as any).reason,
          detail: (gateResult as any).detail,
          operation: "EJAR_REGISTER_CONTRACT",
        }),
      });

      const reason = (gateResult as any).reason ?? gateResult.status;
      return {
        success: false,
        error: `بوابة الثقة السعودية حظرت العملية: ${reason}`,
      };
    }

    // ── Audit: Gate passed ─────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId,
      userId,
      action: "SAUDI_TRUST_GATE_PASSED",
      tableName: "government_outbox",
      recordId: data.contractId,
      details: JSON.stringify({ operation: "EJAR_REGISTER_CONTRACT" }),
    });

    // ── Build Ejar payload (constructed before TX_1) ──────────────────────────
    const ejarPayload = {
      contractType: "RESIDENTIAL",
      propertyType: data.propertyType,
      propertyAddress: data.propertyAddress,
      landlord: { nationalId: data.landlordNationalId, type: "INDIVIDUAL" },
      tenant: { nationalId: data.tenantNationalId, type: "INDIVIDUAL" },
      contractPeriod: {
        startDate: data.contractStartDate,
        endDate: data.contractEndDate,
      },
      financials: {
        monthlyRent: data.monthlyRent,
        totalValue: data.totalContractValue,
        currency: "SAR",
      },
      agencyInfo: {
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
      },
    };
    const payloadJson = JSON.stringify(ejarPayload);

    // ── Idempotency: reserve outbox slot (TX_1 equivalent) ────────────────────
    const idempotencyParams = {
      tenantId,
      provider: "EJAR" as const,
      operation: "EJAR_REGISTER_CONTRACT" as const,
      businessEntityType: "contract" as const,
      businessEntityId: data.contractId, // Contract.id — NEVER lead.id
      payload: payloadJson,
    };

    const idempotencyKey = buildIdempotencyKey(idempotencyParams);
    const reservation = await checkAndReserve(idempotencyParams);

    switch (reservation.type) {
      case "SUCCEEDED": {
        // Already DELIVERED — return cached result without calling Ejar again
        const cached = JSON.parse(reservation.providerResponse);
        await writeAuditLog({
          tenantId,
          userId,
          action: "EJAR_CONTRACT_IDEMPOTENT_RETURN",
          tableName: "government_outbox",
          recordId: reservation.outboxId,
          details: JSON.stringify({ idempotencyKey, cached }),
        });
        return {
          success: true,
          idempotent: true,
          ejarContractId: cached.ejarContractId,
          contractNumber: cached.contractNumber,
          registrationTimestamp: cached.registrationTimestamp,
          commissionCalculated: cached.commissionCalculated,
        };
      }

      case "IN_PROGRESS":
        return {
          success: false,
          outboxStatus: "IN_PROGRESS",
          error: "الطلب قيد المعالجة. يرجى الانتظار.",
        };

      case "FAILED_RETRYABLE":
        // Retry window passed — idempotency service reset the slot; fall through to proceed
        break;

      case "FAILED_FINAL":
        return {
          success: false,
          outboxStatus: "FAILED_FINAL",
          error: `فشل نهائي: ${reservation.reason}. يرجى التواصل مع الدعم.`,
        };

      case "NEW":
        // Fresh slot reserved — proceed with external call
        break;
    }

    const outboxId = reservation.outboxId;

    // Mark as PROCESSING before external call
    await markProcessing(outboxId);

    await writeAuditLog({
      tenantId,
      userId,
      action: "GOVERNMENT_OUTBOX_ENQUEUED",
      tableName: "government_outbox",
      recordId: outboxId,
      details: JSON.stringify({ idempotencyKey, operation: "EJAR_REGISTER_CONTRACT" }),
    });

    // ── External call (OUTSIDE any DB transaction) ────────────────────────────
    const configuredUrl = (process.env.EJAR_API_URL ?? "").trim();
    const configuredKey = (process.env.EJAR_API_KEY ?? "").trim();

    // This point is only reached when Gate passed, which already verified credentials.
    // Double-check: never call a sandbox URL with financial intent.
    if (!configuredUrl || !configuredKey) {
      // Gate should have caught this — fail-closed defensively
      await markRetrying(outboxId, "EJAR credentials missing at call time", 0);
      return {
        success: false,
        error: "بيانات اعتماد إيجار غير مكتملة. لا يمكن إتمام العملية.",
      };
    }

    let ejarContractId: string;
    let contractNumber: string;
    let apiRetryCount = 0;

    try {
      const response = await fetch(`${configuredUrl}/contracts/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${configuredKey}`,
          "X-Agency-Id": tenant.subdomain,
        },
        body: payloadJson,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          `Ejar API Error ${response.status}: ${(errorBody as any).message || response.statusText}`
        );
      }

      const ejarResponse = await response.json();
      ejarContractId = ejarResponse.contractId;
      contractNumber = ejarResponse.contractNumber ?? `CR-${Date.now()}`;

      if (!ejarContractId) {
        throw new Error("Ejar API returned no contractId — response invalid");
      }
    } catch (apiError: any) {
      // External call failed — record for retry, do NOT mutate DB state
      await markRetrying(outboxId, apiError.message, apiRetryCount);
      await writeAuditLog({
        tenantId,
        userId,
        action: "GOVERNMENT_OUTBOX_RETRYING",
        tableName: "government_outbox",
        recordId: outboxId,
        details: JSON.stringify({ error: apiError.message }),
      });
      return {
        success: false,
        error: `فشل التواصل مع منصة إيجار: ${apiError.message}`,
      };
    }

    // ── TX_2: Persist results ONLY after confirmed ejarContractId ─────────────
    // PayrollCommission is created HERE — never before a real provider response.
    const commissionAmount = data.totalContractValue * COMMISSION_RATE;
    const registrationTimestamp = new Date().toISOString();

    const providerResponsePayload = {
      ejarContractId,
      contractNumber,
      registrationTimestamp,
      commissionCalculated: commissionAmount,
    };

    await prisma.$transaction(async (tx) => {
      // 1. Mark outbox DELIVERED
      await markDelivered(outboxId, JSON.stringify(providerResponsePayload));

      // 2. Create commission ONLY after real ejarContractId confirmed
      await tx.payrollCommission.create({
        data: {
          tenantId,
          userId: data.salesRepUserId,
          amount: commissionAmount,
          contractId: ejarContractId, // Real Ejar contract ID — not a mock
          status: "PENDING",
        },
      });

      // 3. Update lead status
      if (data.leadId) {
        await tx.lead.update({
          where: { id: data.leadId, tenantId },
          data: { status: "CONTRACT_SIGNED", updatedAt: new Date() },
        });

        // 4. Lead activity entry
        await tx.leadActivity.create({
          data: {
            tenantId,
            leadId: data.leadId,
            userId,
            activityType: "CONTRACT_SIGNED",
            description: `✅ تم تسجيل العقد عبر إيجار. رقم العقد: ${contractNumber}. العمولة: ${commissionAmount.toFixed(2)} ر.س`,
          },
        });
      }
    });

    // ── Audit: TX_2 committed ──────────────────────────────────────────────────
    await writeAuditLog({
      tenantId,
      userId,
      action: "EJAR_CONTRACT_TX2_COMMITTED",
      tableName: "government_outbox",
      recordId: outboxId,
      details: JSON.stringify({ ejarContractId, contractNumber, commissionAmount }),
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: "EJAR_CONTRACT_SUBMITTED",
      tableName: "contracts",
      recordId: data.contractId,
      details: JSON.stringify({
        ejarContractId,
        contractNumber,
        totalContractValue: data.totalContractValue,
        commissionCalculated: commissionAmount,
      }),
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: "GOVERNMENT_OUTBOX_DELIVERED",
      tableName: "government_outbox",
      recordId: outboxId,
      details: JSON.stringify({ idempotencyKey }),
    });

    // ── Email notification ─────────────────────────────────────────────────────
    const emailHtml = `
      <div style="font-family:'Cairo','Inter',Arial,sans-serif;direction:rtl;text-align:right;padding:30px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#10b981;border-bottom:2px solid #10b981;padding-bottom:12px;">
          🏛️ إيجار: تم تسجيل عقد عقاري جديد بنجاح
        </h2>
        <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
          <p><strong>الشركة:</strong> ${tenant.companyName}</p>
          <p><strong>رقم العقد (إيجار):</strong> ${contractNumber}</p>
          <p><strong>معرف إيجار:</strong> ${ejarContractId}</p>
          <p><strong>قيمة العقد:</strong> ${data.totalContractValue.toLocaleString("ar-SA")} ر.س</p>
          <p><strong>مندوب المبيعات:</strong> ${salesRep.name ?? "غير محدد"}</p>
          <p><strong>العمولة المستحقة:</strong> <span style="color:#10b981;font-weight:bold;">${commissionAmount.toFixed(2)} ر.س</span></p>
          <p><strong>تاريخ التسجيل:</strong> ${new Date().toLocaleDateString("ar-SA")}</p>
        </div>
        <p style="font-size:11px;color:#94a3b8;text-align:center;">
          تم توليد هذا الإشعار آلياً من نظام ORCA عبر تكامل منصة إيجار.
        </p>
      </div>
    `;

    await sendAdminEmailAlert(
      `🏛️ عقد إيجار جديد: ${tenant.companyName} - قيمة ${data.totalContractValue.toLocaleString("ar-SA")} ر.س`,
      emailHtml
    );

    revalidatePath("/operations/leads");
    revalidatePath("/operations/sales");
    revalidatePath("/operations/agents");

    return {
      success: true,
      ejarContractId,
      contractNumber,
      registrationTimestamp,
      commissionCalculated: commissionAmount,
    };
  } catch (error: any) {
    console.error("[ejar] submitContractToEjarAction error:", error);
    return { success: false, error: error.message };
  }
}

// ─── 2. Get Payroll Commissions (Role-hardened) ───────────────────────────────

export async function getPayrollCommissionsAction(userId?: string) {
  try {
    // DB-backed role check — was missing before this patch
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");
    await assertServerActionRole(session, ["ADMIN", "owner", "rental_manager"]);

    const tenant = await getActiveTenant();

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (userId) where.userId = userId;

    const commissions = await prisma.payrollCommission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPending = commissions
      .filter((c) => c.status === "PENDING")
      .reduce((acc, c) => acc + Number(c.amount), 0);

    const totalPaid = commissions
      .filter((c) => c.status === "PAID")
      .reduce((acc, c) => acc + Number(c.amount), 0);

    return { success: true, commissions, totalPending, totalPaid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 3. Mark Commission Paid (Role-hardened + FK-validated) ──────────────────

export async function markCommissionPaidAction(commissionId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");

    // Only ADMIN and owner may pay commissions
    await assertServerActionRole(session, ["ADMIN", "owner"]);

    const tenant = await getActiveTenant();
    await seedChartOfAccounts(tenant.id);

    // FK: commission must belong to this tenant
    const commission = await prisma.payrollCommission.findFirst({
      where: { id: commissionId, tenantId: tenant.id },
    });
    if (!commission) throw new Error("العمولة غير موجودة أو لا تتبع هذه المنشأة.");

    return await prisma.$transaction(async (tx) => {
      await tx.payrollCommission.update({
        where: { id: commissionId },
        data: { status: "PAID" },
      });

      const payment = await tx.commissionPayment.create({
        data: {
          commissionId,
          tenantId: tenant.id,
          amount: commission.amount,
          method: "BANK_TRANSFER",
          status: "PAID",
        },
      });

      const expenseAccount = await findAccountByCode(tenant.id, "5.1");
      const cashAccount = await findAccountByCode(tenant.id, "1.1.1");
      if (expenseAccount && cashAccount) {
        await postCommissionEntry(
          tenant.id,
          commissionId,
          Number(commission.amount),
          expenseAccount.id,
          cashAccount.id
        );
      }

      return payment;
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
