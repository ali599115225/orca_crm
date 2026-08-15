import "server-only";

import {
  hasDatabaseRole,
  type SessionPayload,
} from "@/lib/api-auth-guard";

export const W1E_DATABASE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

export type W1eDatabaseRole = (typeof W1E_DATABASE_ROLES)[number];

export const W1E_PERMISSION_KEYS = [
  "contract-studio.read",
  "contract-studio.draft-create",
  "contract-studio.approval-request",
  "contract-studio.approval-decide",
  "contract-studio.approval-finalize",
  "contract-studio.snapshot-issue",
  "finance-case.read",
  "finance-case.create",
  "finance-case.transition",
  "finance-case.offer-record",
  "finance-case.offer-select",
  "finance-case.authority-record",
] as const;

export type W1ePermissionKey = (typeof W1E_PERMISSION_KEYS)[number];

const CONTRACT_FINANCE_READ_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "READ_ONLY",
] as const satisfies readonly W1eDatabaseRole[];

const AUTHOR_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const satisfies readonly W1eDatabaseRole[];

const FINANCE_DECISION_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
] as const satisfies readonly W1eDatabaseRole[];

const CONTRACT_APPROVER_ROLES = [
  "ADMIN",
] as const satisfies readonly W1eDatabaseRole[];

export type W1ePermissionDefinition = Readonly<{
  key: W1ePermissionKey;
  allowedRoles: readonly W1eDatabaseRole[];
  risk: "READ" | "WRITE" | "APPROVE";
  description: string;
}>;

export const W1E_PERMISSION_CONTRACT = {
  "contract-studio.read": {
    key: "contract-studio.read",
    allowedRoles: CONTRACT_FINANCE_READ_ROLES,
    risk: "READ",
    description: "Read tenant-scoped Contract Studio drafts, approvals, and snapshot metadata.",
  },
  "contract-studio.draft-create": {
    key: "contract-studio.draft-create",
    allowedRoles: AUTHOR_ROLES,
    risk: "WRITE",
    description: "Create a ContractDraft from an already-published tenant template version.",
  },
  "contract-studio.approval-request": {
    key: "contract-studio.approval-request",
    allowedRoles: AUTHOR_ROLES,
    risk: "WRITE",
    description: "Request governed approval for a tenant ContractDraft.",
  },
  "contract-studio.approval-decide": {
    key: "contract-studio.approval-decide",
    allowedRoles: CONTRACT_APPROVER_ROLES,
    risk: "APPROVE",
    description: "Approve or reject a ContractDraft approval request.",
  },
  "contract-studio.approval-finalize": {
    key: "contract-studio.approval-finalize",
    allowedRoles: CONTRACT_APPROVER_ROLES,
    risk: "APPROVE",
    description: "Finalize a ContractDraft only after all persisted approvals are approved.",
  },
  "contract-studio.snapshot-issue": {
    key: "contract-studio.snapshot-issue",
    allowedRoles: CONTRACT_APPROVER_ROLES,
    risk: "APPROVE",
    description: "Issue the immutable approved ContractSnapshot through the verified snapshot service.",
  },
  "finance-case.read": {
    key: "finance-case.read",
    allowedRoles: CONTRACT_FINANCE_READ_ROLES,
    risk: "READ",
    description: "Read tenant-scoped FinanceCase, provider-offer, and lifecycle-event state.",
  },
  "finance-case.create": {
    key: "finance-case.create",
    allowedRoles: AUTHOR_ROLES,
    risk: "WRITE",
    description: "Create a tenant FinanceCase using the verified legacy-reference guard.",
  },
  "finance-case.transition": {
    key: "finance-case.transition",
    allowedRoles: FINANCE_DECISION_ROLES,
    risk: "APPROVE",
    description: "Advance or cancel FinanceCase internal state through the verified state machine.",
  },
  "finance-case.offer-record": {
    key: "finance-case.offer-record",
    allowedRoles: FINANCE_DECISION_ROLES,
    risk: "WRITE",
    description: "Record an evidence-backed external provider offer without calling the provider network.",
  },
  "finance-case.offer-select": {
    key: "finance-case.offer-select",
    allowedRoles: FINANCE_DECISION_ROLES,
    risk: "APPROVE",
    description: "Select exactly one non-expired provider offer for the FinanceCase.",
  },
  "finance-case.authority-record": {
    key: "finance-case.authority-record",
    allowedRoles: FINANCE_DECISION_ROLES,
    risk: "APPROVE",
    description: "Record external provider authority evidence separately from ORCA internal status.",
  },
} as const satisfies Record<W1ePermissionKey, W1ePermissionDefinition>;

export class W1eAuthorizationError extends Error {
  constructor(public readonly code: "W1E_UNAUTHORIZED" | "W1E_FORBIDDEN") {
    super(code);
    this.name = "W1eAuthorizationError";
  }
}

export type W1eActor = Readonly<{
  tenantId: string;
  userId: string;
  role: string;
}>;

function normalizeSession(value: unknown): SessionPayload | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Record<string, unknown>;

  if (
    typeof session.userId !== "string" ||
    !session.userId ||
    typeof session.tenantId !== "string" ||
    !session.tenantId
  ) {
    return null;
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId,
    role: typeof session.role === "string" ? session.role : "",
    tenantSubdomain:
      typeof session.tenantSubdomain === "string"
        ? session.tenantSubdomain
        : undefined,
    name: typeof session.name === "string" ? session.name : undefined,
  };
}

export function w1eRolesForPermission(
  permissionKey: W1ePermissionKey,
): readonly W1eDatabaseRole[] {
  return W1E_PERMISSION_CONTRACT[permissionKey].allowedRoles;
}

export function w1eRoleAllowsPermission(
  role: string,
  permissionKey: W1ePermissionKey,
): role is W1eDatabaseRole {
  return (w1eRolesForPermission(permissionKey) as readonly string[]).includes(role);
}

/**
 * W1E deliberately performs current database-role revalidation and has no
 * platform-owner/super-admin bypass. Tenant and actor identity returned here
 * are the only identities the application facade may pass to W1 domain writes.
 */
export async function authorizeW1eActor(
  value: unknown,
  permissionKey: W1ePermissionKey,
): Promise<W1eActor> {
  const session = normalizeSession(value);
  if (!session) {
    throw new W1eAuthorizationError("W1E_UNAUTHORIZED");
  }

  const allowed = await hasDatabaseRole(
    session,
    w1eRolesForPermission(permissionKey),
  );
  if (!allowed) {
    throw new W1eAuthorizationError("W1E_FORBIDDEN");
  }

  return {
    tenantId: session.tenantId,
    userId: session.userId,
    role: session.role,
  };
}
