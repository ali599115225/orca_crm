import {
  authorize,
  type AccessContext,
  type ResourceAccessScope,
} from "@/lib/authz/authorization";
import type { PermissionKey } from "@/lib/authz/permission-registry";
import {
  UnitCommitmentError,
  type Exec006PermissionKey,
  type UnitCommandContext,
  type UnitResourceScope,
} from "@/lib/unit-commitment/contracts";

export type UnitAuthorityEvidence = Readonly<{
  id: string;
}>;

const CANONICAL_PERMISSION: Readonly<
  Record<Exec006PermissionKey, PermissionKey>
> = {
  UNIT_AVAILABILITY_READ: "unit-commitments.availability-read",
  UNIT_HOLD_CREATE: "unit-commitments.hold-create",
  UNIT_HOLD_EXTEND: "unit-commitments.hold-extend",
  UNIT_HOLD_RELEASE: "unit-commitments.hold-release",
  UNIT_HOLD_OVERRIDE: "unit-commitments.hold-override",
  RESERVATION_CREATE: "unit-commitments.reservation-create",
  RESERVATION_APPROVE: "unit-commitments.reservation-approve",
  RESERVATION_EXTEND: "unit-commitments.reservation-extend",
  RESERVATION_RELEASE: "unit-commitments.reservation-release",
  RESERVATION_CANCEL: "unit-commitments.reservation-cancel",
  RESERVATION_CONVERT: "unit-commitments.reservation-convert",
  TOUR_CREATE: "tours.schedule",
  TOUR_CONFIRM: "tours.update-status",
  TOUR_RESCHEDULE: "tours.update-status",
  TOUR_COMPLETE: "tours.update-status",
  TOUR_CANCEL: "tours.update-status",
  COMMITMENT_AUDIT_READ: "unit-commitments.audit-read",
};

function canonicalResource(
  tenantId: string,
  resource: UnitResourceScope,
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

export function validateUnitCommandContext(
  context: UnitCommandContext,
): void {
  if (!context.actorId.trim()) {
    throw new UnitCommitmentError(
      "MISSING_ACTOR",
      "Actor is required",
    );
  }

  if (!context.tenantId.trim()) {
    throw new UnitCommitmentError(
      "MISSING_TENANT",
      "Tenant is required",
    );
  }

  if (!context.auditCorrelationId.trim()) {
    throw new UnitCommitmentError(
      "VALIDATION_ERROR",
      "Audit correlation ID is required",
    );
  }

  if (
    context.authorizationContext.tenantId !== context.tenantId ||
    context.authorizationContext.userId !== context.actorId
  ) {
    throw new UnitCommitmentError(
      "AUTHORITY_DENIED",
      "Canonical authorization context does not match command actor",
    );
  }
}

export function assertUnitCommitmentAuthority(
  context: UnitCommandContext,
  permission: Exec006PermissionKey,
  resource: UnitResourceScope,
  options: Readonly<{
    authorizationContext?: AccessContext;
    actorId?: string;
    requireCompanyScope?: boolean;
  }> = {},
): UnitAuthorityEvidence {
  validateUnitCommandContext(context);

  const actorId = options.actorId ?? context.actorId;

  const accessContext =
    options.authorizationContext ??
    (
      actorId === context.actorId
        ? context.authorizationContext
        : undefined
    );

  if (!accessContext) {
    throw new UnitCommitmentError(
      "AUTHORITY_DENIED",
      "Independent actor requires explicit canonical authorization context",
    );
  }

  if (
    accessContext.tenantId !== context.tenantId ||
    accessContext.userId !== actorId
  ) {
    throw new UnitCommitmentError(
      "AUTHORITY_DENIED",
      "Canonical authorization context identity mismatch",
    );
  }

  const canonicalPermission =
    CANONICAL_PERMISSION[permission];

  const decision = authorize(
    accessContext,
    canonicalPermission,
    canonicalResource(
      context.tenantId,
      resource,
    ),
  );

  if (
    !decision.allowed ||
    !decision.matchedRoleAssignmentId
  ) {
    const code =
      decision.reasonCode === "CROSS_TENANT"
        ? "TENANT_SCOPE_MISMATCH"
        : (
            decision.reasonCode === "SCOPE_MISMATCH" ||
            decision.reasonCode === "SCOPE_NOT_ALLOWED"
          )
          ? "RESOURCE_SCOPE_DENIED"
          : "AUTHORITY_DENIED";

    throw new UnitCommitmentError(
      code,
      "Canonical Unit Commitment authority denied",
      {
        permission,
        canonicalPermission,
        authorityCode: decision.reasonCode,
      },
    );
  }

  if (options.requireCompanyScope) {
    const companyDecision = authorize(
      accessContext,
      canonicalPermission,
      {
        tenantId: context.tenantId,
      },
    );

    if (!companyDecision.allowed) {
      throw new UnitCommitmentError(
        "RESOURCE_SCOPE_DENIED",
        "Company scope is required for this override",
      );
    }
  }

  return {
    id: decision.matchedRoleAssignmentId,
  };
}

export function assertIndependentApproval(
  context: UnitCommandContext,
  initiatedByActorId: string | null | undefined,
): void {
  if (!initiatedByActorId?.trim()) {
    throw new UnitCommitmentError(
      "MISSING_INITIATOR",
      "Persisted initiator evidence is required",
    );
  }

  if (initiatedByActorId === context.actorId) {
    throw new UnitCommitmentError(
      "SELF_APPROVAL_DENIED",
      "The reservation initiator cannot approve the same request",
    );
  }
}

export function canDiscloseBlockingCustomer(
  context: UnitCommandContext,
  resource: UnitResourceScope,
): boolean {
  try {
    assertUnitCommitmentAuthority(
      context,
      "COMMITMENT_AUDIT_READ",
      resource,
    );

    return true;
  } catch {
    return false;
  }
}
