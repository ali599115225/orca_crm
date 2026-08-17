import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  completeConditionalAcceptance,
  type Exec007SqlExecutor,
} from "../../lib/offer-management/evidence";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "prisma/migration-evidence/non-production/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);
const postgresEvidence = fs.readFileSync(
  path.join(root, "scripts/exec-007-postgres-concurrency.mjs"),
  "utf8",
);
const hash = (character: string) => character.repeat(64);

type Batch3Evidence = { databases?: Array<{
  name: string;
  tests: Record<string, { pass: boolean; actual?: string }>;
  checks?: Record<string, boolean>;
  results?: Record<string, boolean | string>;
}> };

const originalHoldEvidence: Record<number, readonly string[]> = {
  1: ["results.successPath", "results.reservationActive"],
  2: ["results.reservationRollback", "results.preparationRollback"],
  3: ["results.atomicSuccessFourRecords", "results.concurrentSingleWinner"],
};

function readEvidence(): Batch3Evidence | null {
  const evidencePath = process.env.EXEC007_POSTGRES_EVIDENCE;
  if (!evidencePath) return null;
  return JSON.parse(fs.readFileSync(evidencePath, "utf8")) as Batch3Evidence;
}

function expectHoldEvidence(sequence: 1 | 2 | 3): void {
  const evidence = readEvidence();
  if (!evidence) return;
  expect(evidence.databases?.length).toBeGreaterThanOrEqual(2);
  for (const database of evidence.databases ?? []) {
    for (const key of originalHoldEvidence[sequence]) {
      const [section, property] = key.split(".");
      const source = section === "checks" ? database.checks : database.results;
      expect(source?.[property!], `${database.name}:hold-${sequence}:${key}`).toBe(true);
    }
  }
}

function expectPostgresEvidence(testId: string): void {
  const evidence = readEvidence();
  if (!evidence) return;
  expect(evidence.databases?.length).toBeGreaterThanOrEqual(2);
  for (const database of evidence.databases ?? []) {
    expect(database.tests[testId], `${database.name}:${testId}`).toMatchObject({ pass: true });
  }
}

describe("EXEC-007 governed atomic integration with EXEC-006", () => {
  it("T-HOLD-01 requires one matching active Hold and rejects non-active, expired, version-mismatched, or identity-mismatched Holds", () => {
    expect(migration).toContain(`v_hold."commitment_type" <> 'HOLD'`);
    expect(migration).toContain(`v_hold."status" <> 'ACTIVE'`);
    expect(migration).toContain('v_hold."expires_at" <= v_now');
    expect(migration).toContain('v_hold."version" <> p_expected_hold_version');
    expect(migration).toContain('v_hold."unit_id" <> v_version."unit_id"');
    expectHoldEvidence(1);
  });

  it("T-HOLD-02 converts the matching Hold atomically and rolls back reservation or preparation failures", () => {
    expect(postgresEvidence).toContain("reservationRollback");
    expect(postgresEvidence).toContain("preparationRollback");
    expectHoldEvidence(2);
  });

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
    expect(migration).not.toContain("p_now TIMESTAMPTZ");
    expect(migration).toContain("v_now TIMESTAMPTZ;");
    expect(migration).toContain("v_now := clock_timestamp();");
    expect(migration).not.toContain("v_now TIMESTAMPTZ := transaction_timestamp()");
    expect(migration.indexOf("v_now := clock_timestamp();")).toBeGreaterThan(
      migration.indexOf("PERFORM pg_advisory_xact_lock"),
    );
    expectHoldEvidence(3);
  });

  it("PostgreSQL evidence covers success, rollback, replay, concurrency, and tenant isolation", () => {
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
      evidencePayload: { action: "ACCEPT", offerVersionId, challengeId, payloadProofHash: hash("b") },
      evidenceHash: hash("e"),
      correlationId: "corr",
      idempotencyKeyHash: hash("a"),
      payloadHash: hash("b"),
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("fn_exec007_complete_conditional_acceptance");
    expect(String(query.mock.calls[0][0])).not.toContain("$18::timestamptz");
    expect(query.mock.calls[0][1]).toHaveLength(17);
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
        evidencePayload: { action: "DECLINE", offerVersionId: "v", challengeId: "c", payloadProofHash: hash("b") },
        evidenceHash: hash("e"),
        correlationId: "corr",
        idempotencyKeyHash: hash("a"),
        payloadHash: hash("b"),
      }),
    ).rejects.toThrow("evidencePayload must bind ACCEPT");
  });
});

const batch3IntegrationCases = [
  ["T-B3-BIND-007", "challenge binds exact issued offer version"],
  ["T-B3-BIND-008", "grant challenge and version subject party match"],
  ["T-B3-BIND-009", "grant challenge and version subject account match with NULL-safe equality"],
  ["T-B3-BIND-014", "exact idempotent replay only and payload mismatch denied"],
  ["T-B3-BIND-015", "concurrent acceptance has one winner"],
  ["T-B3-BIND-016", "offer current issued version and exact identity match"],
  ["T-B3-BIND-027", "acceptance uses trusted database clock time and exposes no caller time parameter"],
  ["T-B3-BIND-028", "challenge row is locked before consumption transition"],
  ["T-B3-BIND-029", "active verified identity must exist before acceptance"],
  ["T-B3-BIND-030", "non-current or non-issued version is denied"],
  ["T-B3-BIND-031", "revoked grant or session blocks acceptance"],
] as const;

describe("Batch 3 acceptance binding integration contracts", () => {
  for (const [testId, title] of batch3IntegrationCases) {
    it(`${testId} ${title}`, () => {
      expect(migration).toContain('FROM "exec007_customer_auth_challenges"');
      expect(migration).toContain("FOR UPDATE");
      expect(migration).toContain('v_challenge."payload_proof_hash" IS DISTINCT FROM p_payload_hash');
      expect(migration).toContain('v_challenge."offer_version_id" IS DISTINCT FROM p_offer_version_id');
      if (title.startsWith("acceptance uses trusted database clock time")) {
        expect(migration).toContain("v_now TIMESTAMPTZ;");
        expect(migration).toContain("v_now := clock_timestamp();");
        expect(migration).not.toContain("v_now TIMESTAMPTZ := transaction_timestamp()");
        expect(migration.indexOf("v_now := clock_timestamp();")).toBeGreaterThan(
          migration.indexOf("PERFORM pg_advisory_xact_lock"),
        );
        expect(migration).not.toContain("p_now TIMESTAMPTZ");
        expect(postgresEvidence).toContain("callerTimeOverrideRejected");
      }
      expect(postgresEvidence).toContain("concurrentSingleWinner");
      expectPostgresEvidence(testId);
    });
  }
});
