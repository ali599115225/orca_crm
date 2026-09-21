export interface TechnicalDelegation {
  tenantId: string;
  operation: string;
  businessActorUserId: string;
  technicalActorId: string;
  assignmentId: string;
  resourceType: string;
  resourceId: string;
  payloadHash: string;
  correlationId: string;
  idempotencyKeyHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function assertDelegation(
  delegation: TechnicalDelegation,
  input: Omit<TechnicalDelegation, "expiresAt" | "consumedAt"> & { now: Date },
): void {
  if (delegation.consumedAt) throw new Error("delegation replay denied");
  if (input.now >= delegation.expiresAt) throw new Error("delegation expired");
  for (const key of [
    "tenantId",
    "operation",
    "businessActorUserId",
    "technicalActorId",
    "assignmentId",
    "resourceType",
    "resourceId",
    "payloadHash",
    "correlationId",
    "idempotencyKeyHash",
  ] as const) {
    if (delegation[key] !== input[key]) throw new Error(`delegation ${key} mismatch`);
  }
}
