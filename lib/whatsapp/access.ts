import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";
import { observeLegacyAuthorization } from "@/lib/authz/audit-mode";

export const WHATSAPP_READ_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

export const WHATSAPP_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const;

export const WHATSAPP_CONNECTION_ROLES = ["ADMIN"] as const;

export interface WhatsAppAccess {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: string;
}

function auditPermissionForRoles(allowedRoles: readonly string[]) {
  if (allowedRoles === WHATSAPP_CONNECTION_ROLES) {
    return { permissionKey: "whatsapp.manage", source: "access:whatsapp.connection" };
  }
  if (allowedRoles === WHATSAPP_WRITE_ROLES) {
    return { permissionKey: "whatsapp.send", source: "access:whatsapp.write" };
  }
  return { permissionKey: "whatsapp.read", source: "access:whatsapp.read" };
}

/**
 * Revalidates the session against the current database state before any
 * WhatsApp read, mutation, or provider call. A stale JWT role is never trusted.
 * G3-06 additionally records a shadow RBAC comparison while the legacy result
 * remains the only effective authorization decision.
 */
export async function requireWhatsAppAccess(
  allowedRoles: readonly string[],
): Promise<WhatsAppAccess> {
  const session = await getSession();
  const tenantId =
    typeof session?.tenantId === "string" ? session.tenantId.trim() : "";
  const userId =
    typeof session?.userId === "string" ? session.userId.trim() : "";

  if (!tenantId || !userId) {
    throw new Error("UNAUTHORIZED");
  }

  return runWithTenantContext(
    { tenantId, userId },
    async () => {
      const [user, tenant] = await Promise.all([
        prisma.user.findFirst({
          where: { id: userId, tenantId, isActive: true },
          select: { id: true, role: true },
        }),
        prisma.tenant.findFirst({
          where: { id: tenantId, isActive: true },
          select: { id: true },
        }),
      ]);

      const legacyAllowed = Boolean(
        user && tenant && allowedRoles.includes(String(user.role)),
      );
      const audit = auditPermissionForRoles(allowedRoles);
      await observeLegacyAuthorization(
        {
          tenantId,
          userId,
          role: user ? String(user.role) : String(session?.role || ""),
        },
        legacyAllowed,
        {
          ...audit,
          resource: { tenantId },
        },
      );

      if (!legacyAllowed || !user || !tenant) {
        throw new Error("FORBIDDEN");
      }

      return Object.freeze({
        tenantId,
        userId: user.id,
        role: String(user.role),
      });
    },
  );
}
