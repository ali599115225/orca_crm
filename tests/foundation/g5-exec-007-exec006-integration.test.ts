import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  completeConditionalAcceptance,
  type Exec007SqlExecutor,
} from "../../lib/offer-management/evidence";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);
const postgresEvidence = fs.readFileSync(
  path.join(root, "scripts/exec-007-postgres-concurrency.mjs"),
  "utf8",
);
const hash = (character: string) => character.repeat(64);

describe("EXEC-007 governed atomic integration with EXEC-006", () => {
  it("T-HOLD-03 defines one atomic PostgreSQL acceptance boundary", () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "fn_exec007_complete_conditional_acceptance"');
    expect(migration).toContain('"exec006_convert_hold_to_reservation"(');
    expect(migration).toContain('INSERT INTO "exec007_acceptance_evidence"');
    expect(migration).toContain('INSERT INTO "exec007_acceptance_completion_attempts"');
    expect(migration).toContain('INSERT INTO "exec007_preparation_requests"');
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain('"operation"=\'CONDITIONAL_ACCEPTANCE\'');
    expect(migration).toContain("CUSTOMER_DECISION_STEP_UP");
    expect(migration).toContain("exec007_customer_principal_identities");
  });

  it("T-HOLD-03 PostgreSQL evidence covers success, rollback, replay, concurrency, and tenant isolation", () => {
    for (const marker of [
      "atomicSuccessFourRecords",
      "reservationRollback",
      "preparationRollback",
      "idempotentReplay",
      "idempotencyMismatchRejected",
      "consumedChallengeRejected",
      "expiredChallengeRejected",
      "revokedChallengeRejected",
      "wrongActionRejected",
      "versionPayloadMismatchRejected",
      "concurrentSingleWinner",
      "tenantIsolation",
      "forbiddenWritersUntouched",
    ]) {
      expect(postgresEvidence).toContain(marker);
    }
    expect(postgresEvidence).toContain('CREATE TRIGGER "trg_exec007_test_reject_preparation"');
  });

  it("calls the governed database transaction through one parameterized wrapper", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        acceptance_intent_id: "intent",
        acceptance_evidence_id: "evidence",
        completion_attempt_id: "completion",
        reservation_id: "reservation",
        preparation_request_id: "preparation",
      }],
    });
    const executor: Exec007SqlExecutor = { query };
    const offerVersionId = "00000000-0000-0000-0000-000000000001";
    const challengeId = "00000000-0000-0000-0000-000000000002";

    const result = await completeConditionalAcceptance(executor, {
      tenantId: "00000000-0000-0000-0000-000000000003",
      offerVersionId,
      principalId: "00000000-0000-0000-0000-000000000004",
      subjectGrantId: "00000000-0000-0000-0000-000000000005",
      sessionId: "00000000-0000-0000-0000-000000000006",
      challengeId,
      holdId: "00000000-0000-0000-0000-000000000007",
      actorUserId: "00000000-0000-0000-0000-000000000008",
      assignmentId: "00000000-0000-0000-0000-000000000009",
      expectedHoldVersion: 1,
      reservationExpiresAt: new Date("2026-08-03T12:00:00.000Z"),
      acceptanceMethod: "PORTAL_STEP_UP",
      evidencePayload: { action: "ACCEPT", offerVersionId, challengeId },
      evidenceHash: hash("e"),
      correlationId: "corr",
      idempotencyKeyHash: hash("a"),
      payloadHash: hash("b"),
      now: new Date("2026-07-27T12:15:00.000Z"),
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("fn_exec007_complete_conditional_acceptance");
    expect(result).toEqual({
      acceptanceIntentId: "intent",
      acceptanceEvidenceId: "evidence",
      completionAttemptId: "completion",
      reservationId: "reservation",
      preparationRequestId: "preparation",
    });
  });

  it("rejects a wrapper payload not bound to the exact version and challenge", async () => {
    const executor: Exec007SqlExecutor = { query: vi.fn() };
    await expect(
      completeConditionalAcceptance(executor, {
        tenantId: "t",
        offerVersionId: "v",
        principalId: "p",
        subjectGrantId: "g",
        sessionId: "s",
        challengeId: "c",
        holdId: "h",
        actorUserId: "a",
        assignmentId: "x",
        expectedHoldVersion: 1,
        reservationExpiresAt: new Date("2026-08-03T12:00:00.000Z"),
        acceptanceMethod: "PORTAL_STEP_UP",
        evidencePayload: { action: "DECLINE", offerVersionId: "v", challengeId: "c" },
        evidenceHash: hash("e"),
        correlationId: "corr",
        idempotencyKeyHash: hash("a"),
        payloadHash: hash("b"),
      }),
    ).rejects.toThrow("evidencePayload must bind ACCEPT");
  });
});
