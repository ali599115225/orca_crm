import { rawPrisma } from "./prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "LEAD_STATUS_CHANGED"
  | "LEAD_DELETED"
  | "CONTRACT_CREATED"
  | "CONTRACT_UPDATED"
  | "CONTRACT_CANCELLED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REFUNDED"
  | "SUBSCRIPTION_CHANGED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_PERMISSION_CHANGED"
  | "TENANT_UPDATED"
  | "API_KEY_CREATED"
  | "API_KEY_DELETED"
  | "CRON_RUN"
  | "ZATCA_SUBMIT"
  | "BILLING_RUN"
  | "SAHER_APPROVAL_REQUESTED"
  | "SAHER_APPROVAL_APPROVED"
  | "SAHER_APPROVAL_REJECTED"
  | "SAHER_APPROVAL_EXPIRED"
  | "SAHER_ACTION_EXECUTED"
  | "SAHER_ACTION_EXECUTION_FAILED"
  | "SAHER_DUPLICATE_APPROVAL_BLOCKED"
  | "SAHER_DUPLICATE_EXECUTION_BLOCKED"
  | "AGENT_BLOCKED_GLOBAL_KILL_SWITCH"
  | "AGENT_BLOCKED_VACATION_MODE"
  | "AGENT_BLOCKED_EMERGENCY_MODE"
  | "AGENT_BLOCKED_OPERATION_MODE"
  | "PROMPT_INJECTION_DETECTED"
  | "AGENT_OUTPUT_VALIDATION_FAILED"
  | "AGENT_UNSAFE_ACTION_REJECTED"
  | "AGENT_SAFE_FALLBACK_USED"
  | "AGENT_MANUAL_RUN"
  | "AGENT_ACTIVATED"
  | "AGENT_DEACTIVATED";

export async function writeAuditLog(params: {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  tableName: string;
  recordId: string;
  details?: string;
}) {
  try {
    await rawPrisma.auditLog.create({ data: params });
  } catch (e) {
    console.error("[AuditLog Error] Failed to write audit log:", e);
  }
}

export function auditLogin(tenantId: string, userId: string) {
  return writeAuditLog({ tenantId, userId, action: "LOGIN", tableName: "users", recordId: userId, details: "User logged in" });
}

export function auditLogout(tenantId: string, userId: string) {
  return writeAuditLog({ tenantId, userId, action: "LOGOUT", tableName: "users", recordId: userId, details: "User logged out" });
}

export function auditLeadUpdate(tenantId: string, userId: string | null, leadId: string, changes: string) {
  return writeAuditLog({ tenantId, userId, action: "LEAD_UPDATED", tableName: "leads", recordId: leadId, details: changes });
}

export function auditLeadStatusChange(tenantId: string, userId: string | null, leadId: string, from: string, to: string) {
  return writeAuditLog({ tenantId, userId, action: "LEAD_STATUS_CHANGED", tableName: "leads", recordId: leadId, details: `Status changed: ${from} → ${to}` });
}

export function auditContractCreated(tenantId: string, userId: string | null, contractId: string, details: string) {
  return writeAuditLog({ tenantId, userId, action: "CONTRACT_CREATED", tableName: "contracts", recordId: contractId, details });
}

export function auditPaymentReceived(tenantId: string, userId: string | null, recordId: string, details: string) {
  return writeAuditLog({ tenantId, userId, action: "PAYMENT_RECEIVED", tableName: "receipts", recordId, details });
}

export function auditPermissionChange(tenantId: string, userId: string, targetUserId: string, oldRole: string, newRole: string) {
  return writeAuditLog({ tenantId, userId, action: "USER_PERMISSION_CHANGED", tableName: "users", recordId: targetUserId, details: `Role changed: ${oldRole} → ${newRole}` });
}
