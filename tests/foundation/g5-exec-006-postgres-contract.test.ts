import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  ".github/workflows/exec-006-migration-validation.yml",
  "utf8",
);
const foundation = readFileSync(
  "prisma/migration-evidence/non-production/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql",
  "utf8",
);
const hardening = readFileSync(
  "prisma/migration-evidence/non-production/20260726161000_exec_006_unit_commitment_integrity_hardening/migration.sql",
  "utf8",
);
const authorityAvailability = readFileSync(
  "prisma/migration-evidence/non-production/20260726162000_exec_006_authority_availability_hardening/migration.sql",
  "utf8",
);
const availabilityDisambiguation = readFileSync(
  "prisma/migration-evidence/non-production/20260726163000_exec_006_availability_disambiguation/migration.sql",
  "utf8",
);
const reconciliationHardening = readFileSync(
  "prisma/migration-evidence/non-production/20260726164000_exec_006_reconciliation_race_hardening/migration.sql",
  "utf8",
);
const lifecycleApprovalHardening = readFileSync(
  "prisma/migration-evidence/non-production/20260726165000_exec_006_lifecycle_approval_guard_hardening/migration.sql",
  "utf8",
);
const exactScopeHardening = readFileSync(
  "prisma/migration-evidence/non-production/20260726166000_exec_006_exact_scope_hardening/migration.sql",
  "utf8",
);
const drill = readFileSync(
  "scripts/exec-006-postgres-concurrency.mjs",
  "utf8",
);
const exactScopeDrill = readFileSync(
  "scripts/exec-006-postgres-exact-scope.sql",
  "utf8",
);

describe("EXEC-006 disposable PostgreSQL validation contract", () => {
  it("runs only against disposable PostgreSQL 16", () => {
    expect(workflow).toContain("image: postgres:16");
    expect(workflow).toContain("orca_exec006");
    expect(workflow).toContain("database=disposable-github-actions-postgres");
    expect(workflow).toContain("production=false");
    expect(workflow).toContain("customer_data=false");
    expect(workflow).toContain("backfill=false");
  });

  it("applies prerequisite and EXEC-006 migrations in step order", () => {
    const applicationSteps = workflow.slice(workflow.indexOf("\n    steps:"));
    const names = [
      "Apply EXEC-004 authority prerequisite",
      "Apply EXEC-005 identity foundation",
      "Apply EXEC-005 integrity hardening",
      "Apply EXEC-006 commitment foundation",
      "Apply EXEC-006 integrity hardening",
      "Apply EXEC-006 authority and availability hardening",
      "Apply EXEC-006 availability disambiguation",
      "Apply EXEC-006 reconciliation race hardening",
      "Apply EXEC-006 lifecycle approval guard hardening",
      "Apply EXEC-006 exact persisted scope hardening",
    ];
    let previous = -1;
    for (const name of names) {
      const current = applicationSteps.indexOf(`- name: ${name}`);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it("runs real multi-connection conflict races", () => {
    expect(workflow).toContain("node scripts/exec-006-postgres-concurrency.mjs");
    expect(drill).toContain("const left = new Client");
    expect(drill).toContain("const right = new Client");
    expect(drill).toContain("Promise.allSettled");
    expect(drill).toContain("concurrent Hold race");
    expect(drill).toContain("concurrent Hold/Reservation race");
    expect(drill).toContain("concurrent Release/Extend race");
    expect(drill).toContain("conversion/expiry race");
  });

  it("proves database exclusivity and optimistic concurrency", () => {
    expect(foundation).toContain("unit_commitments_active_exclusivity");
    expect(foundation).toContain("pg_advisory_xact_lock");
    expect(hardening).toContain("exec006_extend_commitment");
    expect(hardening).toContain('v_before."version" <> p_expected_version');
    expect(drill).toContain("exactlyOneFulfilled");
    expect(drill).toContain("lost or incoherent update");
  });

  it("proves conversion and expiry converge after both commands", () => {
    expect(reconciliationHardening).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_reconcile_expired_commitments"',
    );
    expect(reconciliationHardening).toContain("FOR UPDATE");
    expect(reconciliationHardening).not.toMatch(/FOR UPDATE\s+SKIP LOCKED/i);
    expect(reconciliationHardening).toContain(
      "rechecks state and records append-only History/Audit",
    );
    expect(drill).toContain(
      "conversion/expiry race did not converge to EXPIRED",
    );
  });

  it("permits lifecycle expiry without bypassing policy guards", () => {
    expect(lifecycleApprovalHardening).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_validate_commitment_approval_policy"',
    );
    expect(lifecycleApprovalHardening).toContain(
      'NEW."expires_at" IS DISTINCT FROM OLD."expires_at"',
    );
    expect(lifecycleApprovalHardening).toContain(
      "lifecycle-only state transitions remain valid",
    );
    expect(lifecycleApprovalHardening).toContain(
      'CREATE TRIGGER "00_unit_commitments_direct_scope_guard"',
    );
    expect(lifecycleApprovalHardening).toContain(
      "cross-tenant Unit reference mismatch",
    );
  });

  it("enforces exact persisted assignment scope", () => {
    expect(exactScopeHardening).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_assert_scope_assignment"',
    );
    expect(exactScopeHardening).toContain("WHEN 'DEPARTMENT' THEN");
    expect(exactScopeHardening).toContain("WHEN 'TEAM' THEN");
    expect(exactScopeHardening).toContain(
      'v_assignment."assigned_resource_type" = \'UNIT\'',
    );
    expect(exactScopeHardening).toContain(
      'v_assignment."assigned_resource_type" = \'UNIT_COMMITMENT\'',
    );
    expect(exactScopeHardening).toContain(
      'v_assignment."assigned_resource_type" = \'TOUR_APPOINTMENT\'',
    );
    expect(exactScopeHardening).toContain(
      'CREATE TRIGGER "00_tour_appointments_v2_staff_exact_scope_guard"',
    );
    expect(workflow).toContain("Prove exact persisted assignment scope");
    expect(workflow).toContain("scripts/exec-006-postgres-exact-scope.sql");
    expect(exactScopeDrill).toContain(
      "department assignment unexpectedly authorized branch-wide access",
    );
    expect(exactScopeDrill).toContain(
      "team assignment unexpectedly authorized branch-wide access",
    );
    expect(exactScopeDrill).toContain(
      "wrong resource type unexpectedly authorized Unit access",
    );
    expect(exactScopeDrill).toContain("exec006_exact_scope=PASS");
  });

  it("proves independent approval and final contractual blocking", () => {
    expect(authorityAvailability).toContain(
      "exec006_assert_independent_approval",
    );
    expect(authorityAvailability).toContain("self approval denied");
    expect(authorityAvailability).toContain(
      "unit_commitments_final_link_release_guard",
    );
    expect(exactScopeHardening).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_assert_independent_approval"',
    );
    expect(drill).toContain("self-approved long Hold duration was accepted");
    expect(drill).toContain("independentLongDurationApproval");
    expect(drill).toContain("active RentalLease did not block availability");
    expect(drill).toContain("rentalLeaseBlocksAvailability");
  });

  it("keeps fully qualified fail-closed availability behavior", () => {
    expect(availabilityDisambiguation).toContain(
      'availability_source."tenant_id" = p_tenant_id',
    );
    expect(availabilityDisambiguation).toContain(
      'rental_record."tenant_id" = p_tenant_id',
    );
    expect(availabilityDisambiguation).toContain(
      'commitment_record."tenant_id" = p_tenant_id',
    );
    expect(drill).toContain("UNKNOWN_FAIL_CLOSED");
  });

  it("proves Tours are non-exclusive and integrity records are immutable", () => {
    expect(foundation).toContain("exec006_create_tour_appointment");
    expect(drill).toContain("Tour incorrectly blocked Unit availability");
    expect(drill).toContain("tourDoesNotReserve");
    expect(drill).toContain("cross-tenant Unit reference was accepted");
    expect(drill).toContain("Audit UPDATE was not denied");
    expect(drill).toContain("History DELETE was not denied");
  });

  it("does not deploy, activate providers or start EXEC-007", () => {
    expect(workflow).toContain("deployment=false");
    expect(workflow).toContain("provider_activation=false");
    expect(workflow).toContain("exec_007=false");
    expect(workflow).not.toContain("vercel deploy");
    expect(workflow).not.toContain("prisma migrate deploy");
  });
});
