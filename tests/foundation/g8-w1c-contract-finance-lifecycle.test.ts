import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isFinanceInternalStatus,
  isFinanceInternalTransitionAllowed,
  type FinanceInternalStatus,
} from "@/lib/domain/contract-finance/finance-case-service";

const ROOT = process.cwd();
const CONTRACT_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-draft-service.ts"),
  "utf8",
);
const FINANCE_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "finance-case-service.ts"),
  "utf8",
);

const HAPPY_PATH: FinanceInternalStatus[] = [
  "DRAFT",
  "ASSESSMENT",
  "READY_FOR_SUBMISSION",
  "AWAITING_PROVIDER",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
  "PROVIDER_APPROVED",
  "READY_FOR_TRANSACTION",
  "COMPLETED",
];

describe("W1C ContractDraft / Approval + FinanceCase lifecycle", () => {
  it("allows only the forward finance happy-path transitions", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i += 1) {
      expect(isFinanceInternalTransitionAllowed(HAPPY_PATH[i], HAPPY_PATH[i + 1])).toBe(true);
    }

    expect(isFinanceInternalTransitionAllowed("ASSESSMENT", "DRAFT")).toBe(false);
    expect(isFinanceInternalTransitionAllowed("AWAITING_PROVIDER", "PROVIDER_APPROVED")).toBe(false);
  });

  it("allows cancellation from non-terminal states and keeps terminal states terminal", () => {
    for (const state of HAPPY_PATH.slice(0, -1)) {
      expect(isFinanceInternalTransitionAllowed(state, "CANCELLED")).toBe(true);
    }

    expect(isFinanceInternalTransitionAllowed("COMPLETED", "CANCELLED")).toBe(false);
    expect(isFinanceInternalTransitionAllowed("CANCELLED", "DRAFT")).toBe(false);
  });

  it("recognizes only the frozen internal finance statuses", () => {
    for (const state of [...HAPPY_PATH, "CANCELLED"] as FinanceInternalStatus[]) {
      expect(isFinanceInternalStatus(state)).toBe(true);
    }
    expect(isFinanceInternalStatus("BANK_APPROVED")).toBe(false);
    expect(isFinanceInternalStatus("UNKNOWN")).toBe(false);
  });

  it("creates drafts only from published tenant-scoped template versions with actor identity", () => {
    expect(CONTRACT_SOURCE).toContain("tx.contractTemplateVersion.findFirst");
    expect(CONTRACT_SOURCE).toContain("tenantId: input.tenantId");
    expect(CONTRACT_SOURCE).toContain('templateVersion.template.status !== "PUBLISHED"');
    expect(CONTRACT_SOURCE).toContain('templateVersion.status !== "PUBLISHED"');
    expect(CONTRACT_SOURCE).toContain("!input.createdBy");
    expect(CONTRACT_SOURCE).toContain('status: "DRAFT"');
    expect(CONTRACT_SOURCE).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("keeps approval transitions fail-closed and requires all approvals before final approval", () => {
    expect(CONTRACT_SOURCE).toContain('status: "PENDING"');
    expect(CONTRACT_SOURCE).toContain('approval.status !== "PENDING"');
    expect(CONTRACT_SOURCE).toContain('approval.draft.status !== "APPROVAL_PENDING"');
    expect(CONTRACT_SOURCE).toContain('input.decision === "REJECTED"');
    expect(CONTRACT_SOURCE).toContain('status: "REJECTED"');
    expect(CONTRACT_SOURCE).toContain("draft.approvals.length === 0");
    expect(CONTRACT_SOURCE).toContain('approval.status !== "APPROVED"');
    expect(CONTRACT_SOURCE).toContain('status: "APPROVED"');
  });

  it("preserves approval request evidence together with decision evidence", () => {
    const decideStart = CONTRACT_SOURCE.indexOf("export async function decideContractApproval");
    const finalizeStart = CONTRACT_SOURCE.indexOf("export async function finalizeContractDraftApproval");
    const decideSource = CONTRACT_SOURCE.slice(decideStart, finalizeStart);

    expect(decideSource).toContain("reason: true");
    expect(decideSource).toContain("evidenceJson: true");
    expect(decideSource).toContain("requestedBy: true");
    expect(decideSource).toContain("requestedAt: true");
    expect(decideSource).toContain("const preservedApprovalEvidence");
    expect(decideSource).toContain("request: {");
    expect(decideSource).toContain("decision: {");
    expect(decideSource).toContain("evidence: approval.evidenceJson ?? {}");
    expect(decideSource).toContain("evidence: input.evidenceJson ?? {}");
    expect(decideSource).toContain("evidenceJson: preservedApprovalEvidence");
  });

  it("does not expose a content-edit path after approval request", () => {
    const requestStart = CONTRACT_SOURCE.indexOf("export async function requestContractApproval");
    const requestAndDecision = CONTRACT_SOURCE.slice(requestStart);

    expect(requestAndDecision).not.toContain("contentJson:");
    expect(requestAndDecision).not.toContain("dataBindingsJson:");
    expect(requestAndDecision).not.toContain("clauseOverridesJson:");
  });

  it("creates FinanceCase as internal DRAFT and appends the creation event atomically", () => {
    expect(FINANCE_SOURCE).toContain("assertW1LegacyReferenceIntegrity");
    expect(FINANCE_SOURCE).toContain('internalStatus: "DRAFT"');
    expect(FINANCE_SOURCE).toContain("authorityStatus: null");
    expect(FINANCE_SOURCE).toContain("authorityProvider: null");
    expect(FINANCE_SOURCE).toContain("authorityReference: null");
    expect(FINANCE_SOURCE).toContain('eventType: "finance_case.created"');
    expect(FINANCE_SOURCE).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(FINANCE_SOURCE).toContain("!input.createdBy");
  });

  it("records every internal status transition with an event in the same transaction", () => {
    const transitionStart = FINANCE_SOURCE.indexOf("export async function transitionFinanceCaseInternalStatus");
    const authorityStart = FINANCE_SOURCE.indexOf("export async function recordFinanceAuthorityEvidence");
    const transitionSource = FINANCE_SOURCE.slice(transitionStart, authorityStart);

    expect(transitionSource).toContain("prisma.$transaction(");
    expect(transitionSource).toContain("isFinanceInternalTransitionAllowed");
    expect(transitionSource).toContain("W1_FINANCE_INTERNAL_STATE_UNKNOWN");
    expect(transitionSource).toContain("tx.financeCase.update");
    expect(transitionSource).toContain("tx.financeCaseEvent.create");
    expect(transitionSource).toContain('eventType: "finance_case.internal_status_changed"');
    expect(transitionSource).toContain("actorId");
  });

  it("requires persisted provider approval evidence before entering or leaving PROVIDER_APPROVED", () => {
    const transitionStart = FINANCE_SOURCE.indexOf("export async function transitionFinanceCaseInternalStatus");
    const authorityStart = FINANCE_SOURCE.indexOf("export async function recordFinanceAuthorityEvidence");
    const transitionSource = FINANCE_SOURCE.slice(transitionStart, authorityStart);

    expect(transitionSource).toContain('nextStatus === "PROVIDER_APPROVED"');
    expect(transitionSource).toContain('nextStatus === "READY_FOR_TRANSACTION"');
    expect(transitionSource).toContain('financeCase.authorityStatus !== "APPROVED"');
    expect(transitionSource).toContain("!financeCase.authorityProvider");
    expect(transitionSource).toContain("!financeCase.authorityReference");
    expect(transitionSource).toContain("tx.financeCaseEvent.findFirst");
    expect(transitionSource).toContain('eventType: "finance_case.authority_evidence_recorded"');
    expect(transitionSource).toContain('authorityStatus: "APPROVED"');
    expect(transitionSource).toContain("provider: financeCase.authorityProvider");
    expect(transitionSource).toContain("W1_FINANCE_PROVIDER_APPROVAL_EVIDENCE_REQUIRED");
    expect(transitionSource).toContain("providerApprovalEvidenceEventId");
  });

  it("keeps external authority evidence separate from internal status and requires evidence", () => {
    const authorityStart = FINANCE_SOURCE.indexOf("export async function recordFinanceAuthorityEvidence");
    const authoritySource = FINANCE_SOURCE.slice(authorityStart);
    const updateBlock = authoritySource.slice(
      authoritySource.indexOf("const updated = await tx.financeCase.update"),
      authoritySource.indexOf("await tx.financeCaseEvent.create"),
    );

    expect(authoritySource).toContain("!input.authorityStatus.trim()");
    expect(authoritySource).toContain("!input.provider.trim()");
    expect(authoritySource).toContain("!input.providerReference.trim()");
    expect(authoritySource).toContain("input.evidenceJson === null");
    expect(authoritySource).toContain("!input.actorId");
    expect(updateBlock).toContain("authorityStatus:");
    expect(updateBlock).toContain("authorityProvider:");
    expect(updateBlock).toContain("authorityReference:");
    expect(updateBlock).not.toContain("internalStatus:");
    expect(authoritySource).toContain('eventType: "finance_case.authority_evidence_recorded"');
  });

  it("does not write Transaction Spine or provider integration surfaces", () => {
    for (const source of [CONTRACT_SOURCE, FINANCE_SOURCE]) {
      expect(source).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/offer\.(?:create|update|delete|upsert)/);
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("axios");
    }
  });
});
