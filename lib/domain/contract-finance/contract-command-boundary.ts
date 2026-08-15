import "server-only";

import { type NextRequest } from "next/server";
import { notFoundResponse } from "@/lib/api-auth-guard";
import {
  beginW1gRequest,
  requiredW1gString,
  W1gRequestError,
} from "./api-boundary";

const W1H_FORBIDDEN_CONTRACT_CALLER_FIELDS = new Set([
  "tenantId",
  "role",
  "requestedBy",
  "decidedBy",
  "approvedBy",
  "createdBy",
  "contractId",
  "approvalSnapshot",
]);

export function isW1hContractCommandsEnabled(): boolean {
  return process.env.ORCA_CONTRACT_STUDIO_COMMANDS_ENABLED === "true";
}

export async function beginW1hContractCommandRequest(request: NextRequest) {
  if (!isW1hContractCommandsEnabled()) {
    return notFoundResponse(request);
  }

  return await beginW1gRequest(request);
}

export function rejectW1hContractCallerIdentityFields(
  body: Record<string, unknown>,
): void {
  for (const field of W1H_FORBIDDEN_CONTRACT_CALLER_FIELDS) {
    if (field in body) {
      throw new W1gRequestError("W1G_INVALID_INPUT");
    }
  }
}

export function requiredW1hApprovalDecision(
  body: Record<string, unknown>,
  key = "decision",
): "APPROVED" | "REJECTED" {
  const value = requiredW1gString(body, key).toUpperCase();
  if (value !== "APPROVED" && value !== "REJECTED") {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value;
}
