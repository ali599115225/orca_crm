import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

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

/**
 * Revalidates the session against the current database state before any
 * WhatsApp read, mutation, or provider call. A stale JWT role is never trusted.
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

      if (!user || !tenant || !allowedRoles.includes(String(user.role))) {
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
