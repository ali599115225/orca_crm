import {
  CustomerIdentityError,
  type CommandContext,
  type ResourceScope,
} from "@/lib/customer-identity/contracts";
import {
  requirePermission,
  type AccessContext,
  type ResourceAccessScope,
} from "@/lib/authz/authorization";
import type { PermissionKey } from "@/lib/authz/permission-registry";

export type CustomerIdentityAction =
  | "READ"
  | "WRITE"
  | "VERIFY"
  | "CONVERT"
  | "OPPORTUNITY_STAGE"
  | "OPPORTUNITY_REASSIGN"
  | "MERGE_PREVIEW"
  | "MERGE_EXECUTE"
  | "MERGE_REVERSE"
  | "CONSENT_WRITE"
  | "RETENTION_WRITE";

function canonicalPermission(
  action: CustomerIdentityAction,
  resource: ResourceScope,
): PermissionKey {
  if (resource.resourceType === "LEAD") {
    if (action === "READ" || action === "MERGE_PREVIEW") {
      return "leads.read";
    }

    if (
      action === "WRITE" &&
      (resource.resourceId === "NEW" || !resource.resourceId)
    ) {
      return "leads.create";
    }

    return "leads.update";
  }

  if (resource.resourceType === "OPPORTUNITY") {
    if (action === "READ" || action === "MERGE_PREVIEW") {
      return "opportunities.read";
    }

    return "opportunities.manage";
  }

  if (action === "READ" || action === "MERGE_PREVIEW") {
    return "contacts.read";
  }

  return "contacts.manage";
}

function canonicalResource(
  tenantId: string,
  resource: ResourceScope,
): ResourceAccessScope {
  return {
    tenantId,
    branchId: resource.branchId ?? null,
    departmentId: resource.departmentId ?? null,
    teamId: resource.teamId ?? null,
    resourceType: resource.resourceType ?? null,
    resourceId: resource.resourceId ?? null,
  };
}

function assertCanonicalAuthority(
  context: CommandContext,
  accessContext: AccessContext,
  actorId: string,
  action: CustomerIdentityAction,
  resource: ResourceScope,
  requireCompanyScope: boolean,
): void {
  if (accessContext.tenantId !== context.tenantId) {
    throw new CustomerIdentityError(
      "TENANT_SCOPE_MISMATCH",
      "Customer identity authorization tenant mismatch",
    );
  }

  if (accessContext.userId !== actorId) {
    throw new CustomerIdentityError(
      "AUTHORITY_DENIED",
      "Customer identity authorization actor mismatch",
    );
  }

  const permission = canonicalPermission(action, resource);

  try {
    requirePermission(
      accessContext,
      permission,
      canonicalResource(context.tenantId, resource),
    );
  } catch {
    const hasPermission =
      accessContext.permissionKeys.has(permission);

    throw new CustomerIdentityError(
      hasPermission
        ? "RESOURCE_SCOPE_DENIED"
        : "AUTHORITY_DENIED",
      hasPermission
        ? "Customer identity resource scope denied"
        : "Customer identity permission denied",
      {
        action,
        permission,
      },
    );
  }

  if (requireCompanyScope) {
    try {
      requirePermission(accessContext, permission, {
        tenantId: context.tenantId,
      });
    } catch {
      throw new CustomerIdentityError(
        "RESOURCE_SCOPE_DENIED",
        "Company-wide scope is required for this cross-branch operation",
        {
          action,
          permission,
        },
      );
    }
  }
}

export function validateCommandContext(
  context: CommandContext,
): void {
  if (!context.actorId.trim()) {
    throw new CustomerIdentityError(
      "MISSING_ACTOR",
      "Actor is required",
    );
  }

  if (!context.tenantId.trim()) {
    throw new CustomerIdentityError(
      "MISSING_TENANT",
      "Tenant is required",
    );
  }

  if (!context.auditCorrelationId.trim()) {
    throw new CustomerIdentityError(
      "VALIDATION_ERROR",
      "Audit correlation ID is required",
    );
  }

  if (!context.authorizationContext) {
    throw new CustomerIdentityError(
      "AUTHORITY_DENIED",
      "Canonical authorization context is required",
    );
  }
}

export function assertCustomerAuthority(
  context: CommandContext,
  action: CustomerIdentityAction,
  resource: ResourceScope,
  options: Readonly<{
    authorizationContext?: AccessContext;
    actorId?: string;
    requireCompanyScope?: boolean;
  }> = {},
): void {
  validateCommandContext(context);

  const actorId = options.actorId ?? context.actorId;

  const accessContext =
    options.authorizationContext ??
    (
      actorId === context.actorId
        ? context.authorizationContext
        : undefined
    );

  if (!accessContext) {
    throw new CustomerIdentityError(
      "AUTHORITY_DENIED",
      "Canonical authorization context is required for actor",
      {
        action,
        actorId,
      },
    );
  }

  assertCanonicalAuthority(
    context,
    accessContext,
    actorId,
    action,
    resource,
    options.requireCompanyScope === true,
  );
}
