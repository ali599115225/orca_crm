import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

export const DOCUMENT_READ_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

export const DOCUMENT_UPLOAD_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
] as const;

export const DOCUMENT_DELETE_ROLES = ["ADMIN", "SALES_MANAGER"] as const;

export class DocumentAccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DocumentAccessError";
  }
}

export interface DocumentAccessContext {
  tenantId: string;
  userId: string;
  role: string;
  name: string;
}

export async function requireDocumentAccess(
  allowedRoles: readonly string[] = DOCUMENT_READ_ROLES,
): Promise<DocumentAccessContext> {
  const session = await getSession();
  const tenantId =
    typeof session?.tenantId === "string" ? session.tenantId : "";
  const userId =
    typeof session?.userId === "string" ? session.userId : "";

  if (!tenantId || !userId) {
    throw new DocumentAccessError(
      "DOCUMENT_UNAUTHENTICATED",
      401,
      "Authentication is required.",
    );
  }

  const actor = await runWithTenantContext(
    { tenantId, userId },
    async () =>
      await prisma.user.findFirst({
        where: {
          id: userId,
          tenantId,
          isActive: true,
        },
        select: {
          id: true,
          tenantId: true,
          role: true,
          name: true,
        },
      }),
  );

  if (!actor) {
    throw new DocumentAccessError(
      "DOCUMENT_ACTOR_NOT_FOUND",
      401,
      "Active tenant user was not found.",
    );
  }

  const role = String(actor.role);
  if (!allowedRoles.includes(role)) {
    throw new DocumentAccessError(
      "DOCUMENT_FORBIDDEN",
      403,
      "Insufficient permission for this document operation.",
    );
  }

  return {
    tenantId: actor.tenantId,
    userId: actor.id,
    role,
    name: actor.name || "غير محدد",
  };
}

export async function runWithDocumentAccess<T>(
  allowedRoles: readonly string[],
  operation: (access: DocumentAccessContext) => Promise<T>,
): Promise<T> {
  const access = await requireDocumentAccess(allowedRoles);
  return await runWithTenantContext(
    { tenantId: access.tenantId, userId: access.userId },
    () => operation(access),
  );
}
