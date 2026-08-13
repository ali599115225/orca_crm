"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { issueContract } from "@/lib/domain/transaction-spine";
import { runWithTenantContext } from "@/lib/tenant-context";

import { CONTRACT_WRITER_ROLES } from "@/lib/auth/contract-access-policy";
const CONTRACT_READER_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const;

export type ContractWizardErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "TENANT_CONTEXT_UNAVAILABLE"
  | "CLIENT_REQUIRED"
  | "PROPERTY_REQUIRED"
  | "AMOUNT_INVALID"
  | "DATA_LOAD_FAILED"
  | "CONTRACT_ISSUE_FAILED";

export type ContractTermsActionResult =
  | { success: true; error?: undefined }
  | { success: false; error: ContractWizardErrorCode };

function errorCode(
  error: unknown,
  fallback: ContractWizardErrorCode,
): ContractWizardErrorCode {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (
    message.includes("TENANT_CONTEXT") ||
    message.includes("TENANT_SESSION") ||
    message.includes("TENANT_HOST") ||
    message.includes("TENANT_PRIVILEGED")
  ) {
    return "TENANT_CONTEXT_UNAVAILABLE";
  }

  if (
    message === "FORBIDDEN" ||
    message.includes("غير مصرح") ||
    message.includes("صلاحية")
  ) {
    return "FORBIDDEN";
  }

  if (
    message.includes("AUTH") ||
    message.includes("تسجيل الدخول")
  ) {
    return "AUTH_REQUIRED";
  }

  return fallback;
}

export async function saveContractTermsAction(
  terms: string,
): Promise<ContractTermsActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "AUTH_REQUIRED" };
    }

    const tenant = await getActiveTenant();

    return await runWithTenantContext(
      {
        tenantId: tenant.id,
        userId: session.userId as string | undefined,
      },
      async () => {
        const verified = await assertServerActionRole(
          session,
          ["ADMIN"],
        );

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
      },
    );
  } catch (error: unknown) {
    console.error("[ContractTerms] update failed", error);
    return {
      success: false,
      error: errorCode(error, "CONTRACT_ISSUE_FAILED"),
    };
  }
}

export async function getContractWizardDataAction() {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false as const,
        code: "AUTH_REQUIRED" as const,
        clients: [],
        properties: [],
      };
    }

    const tenant = await getActiveTenant();

    return await runWithTenantContext(
      {
        tenantId: tenant.id,
        userId: session.userId as string | undefined,
      },
      async () => {
        await assertServerActionRole(session, CONTRACT_READER_ROLES);

        const [leads, contacts, units] = await Promise.all([
          prisma.lead.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
            take: 100,
          }),
          prisma.contact.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              phone: true,
            },
            take: 100,
          }),
          prisma.unit.findMany({
            where: {
              project: { tenantId: tenant.id },
            },
            include: {
              project: {
                select: { name: true },
              },
              contract: {
                select: { id: true },
              },
            },
            orderBy: [
              { project: { name: "asc" } },
              { unitNumber: "asc" },
            ],
            take: 100,
          }),
        ]);

        const clients = [
          ...leads.map((lead) => ({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName || ""}`.trim(),
            phone: lead.phone,
            type: "lead" as const,
          })),
          ...contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            type: "contact" as const,
          })),
        ];

        const properties = units
          .filter((unit) => !unit.contract)
          .map((unit) => ({
            id: unit.id,
            unitNumber: unit.unitNumber,
            priceSar: Number(unit.priceSar),
            projectName: unit.project?.name || "",
          }));

        return {
          success: true as const,
          clients,
          properties,
        };
      },
    );
  } catch (error: unknown) {
    console.error("[ContractWizard] data load failed", error);
    return {
      success: false as const,
      code: errorCode(error, "DATA_LOAD_FAILED"),
      clients: [],
      properties: [],
    };
  }
}

export async function issueContractActionDirect(data: {
  clientId: string;
  propertyId: string;
  amount: number;
}) {
  const clientId = String(data.clientId || "").trim();
  const propertyId = String(data.propertyId || "").trim();
  const amount = Number(data.amount);

  if (!clientId) {
    return {
      success: false as const,
      code: "CLIENT_REQUIRED" as const,
    };
  }

  if (!propertyId) {
    return {
      success: false as const,
      code: "PROPERTY_REQUIRED" as const,
    };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false as const,
      code: "AMOUNT_INVALID" as const,
    };
  }

  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false as const,
        code: "AUTH_REQUIRED" as const,
      };
    }

    const tenant = await getActiveTenant();

    return await runWithTenantContext(
      {
        tenantId: tenant.id,
        userId: session.userId as string | undefined,
      },
      async () => {
        const verified = await assertServerActionRole(
          session,
          CONTRACT_WRITER_ROLES,
        );

        const contract = await issueContract({
          tenantId: tenant.id,
          userId: verified.userId,
          clientId,
          propertyId,
          amount,
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
          success: true as const,
          contract: {
            id: contract.id,
            buyerName: contract.buyerName,
            buyerPhone: contract.buyerPhone,
            totalVolumeSar: Number(contract.totalVolumeSar),
            signedAt: contract.signedAt?.toISOString() ?? null,
          },
        };
      },
    );
  } catch (error: unknown) {
    console.error("[ContractWizard] issue failed", error);
    return {
      success: false as const,
      code: errorCode(error, "CONTRACT_ISSUE_FAILED"),
    };
  }
}
