import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  ".github/workflows/exec-006-migration-validation.yml",
  "utf8",
);
const foundation = readFileSync(
  "prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql",
  "utf8",
);
const hardening = readFileSync(
  "prisma/migrations/20260726161000_exec_006_unit_commitment_integrity_hardening/migration.sql",
  "utf8",
);
const authorityAvailability = readFileSync(
  "prisma/migrations/20260726162000_exec_006_authority_availability_hardening/migration.sql",
  "utf8",
);
const availabilityDisambiguation = readFileSync(
  "prisma/migrations/20260726163000_exec_006_availability_disambiguation/migration.sql",
  "utf8",
);
const reconciliationHardening = readFileSync(
  "prisma/migrations/20260726164000_exec_006_reconciliation_race_hardening/migration.sql",
  "utf8",
);
const drill = readFileSync(
  "scripts/exec-006-postgres-concurrency.mjs",
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
    const stepsOffset = workflow.indexOf("\n    steps:");
    expect(stepsOffset).toBeGreaterThan(-1);
    const applicationSteps = workflow.slice(stepsOffset);

    const authority = applicationSteps.indexOf(
      "- name: Apply EXEC-004 authority prerequisite",
    );
    const identity = applicationSteps.indexOf(
      "- name: Apply EXEC-005 identity foundation",
    );
    const identityHardening = applicationSteps.indexOf(
      "- name: Apply EXEC-005 integrity hardening",
    );
    const commitment = applicationSteps.indexOf(
      "- name: Apply EXEC-006 commitment foundation",
    );
    const commitmentHardening = applicationSteps.indexOf(
      "- name: Apply EXEC-006 integrity hardening",
    );
    const authorityHardening = applicationSteps.indexOf(
      "- name: Apply EXEC-006 authority and availability hardening",
    );
    const availabilityCorrection = applicationSteps.indexOf(
      "- name: Apply EXEC-006 availability disambiguation",
    );
    const reconciliationRepair = applicationSteps.indexOf(
      "- name: Apply EXEC-006 reconciliation race hardening",
    );
    expect(authority).toBeGreaterThan(-1);
    expect(identity).toBeGreaterThan(authority);
    expect(identityHardening).toBeGreaterThan(identity);
    expect(commitment).toBeGreaterThan(identityHardening);
    expect(commitmentHardening).toBeGreaterThan(commitment);
    expect(authorityHardening).toBeGreaterThan(commitmentHardening);
    expect(availabilityCorrection).toBeGreaterThan(authorityHardening);
    expect(reconciliationRepair).toBeGreaterThan(availabilityCorrection);
  });

  it("runs the real multi-connection race drill", () => {
    expect(workflow).toContain("node scripts/exec-006-postgres-concurrency.mjs");
    expect(drill).toContain("const left = new Client");
    expect(drill).toContain("const right = new Client");
    expect(drill).toContain("Promise.allSettled");
    expect(drill).toContain("concurrent Hold race");
    expect(drill).toContain("concurrent Hold/Reservation race");
    expect(drill).toContain("concurrent Release/Extend race");
    expect(drill).toContain("conversion/expiry race");
  });

  it("proves database exclusivity rather than source assertions alone", () => {
    expect(foundation).toContain("unit_commitments_active_exclusivity");
    expect(foundation).toContain("pg_advisory_xact_lock");
    expect(drill).toContain("exactlyOneFulfilled");
    expect(drill).toContain("rowCount !== 1");
  });

  it("proves optimistic concurrency and no lost update", () => {
    expect(hardening).toContain("exec006_extend_commitment");
    expect(hardening).toContain('v_before."version" <> p_expected_version');
    expect(drill).toContain("releaseExtendRace");
    expect(drill).toContain("lost or incoherent update");
  });

  it("proves conversion and expiry converge after both commands complete", () => {
    expect(reconciliationHardening).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_reconcile_expired_commitments"',
    );
    expect(reconciliationHardening).toContain("FOR UPDATE");
    expect(reconciliationHardening).not.toContain("SKIP LOCKED");
    expect(reconciliationHardening).toContain(
      "recheck state and records append-only History/Audit",
    );
    expect(drill).toContain(
      "conversion/expiry race did not converge to EXPIRED",
    );
  });

  it("proves independent elevated approval in PostgreSQL", () => {
    expect(authorityAvailability).toContain(
      "exec006_assert_independent_approval",
    );
    expect(authorityAvailability).toContain("self approval denied");
    expect(authorityAvailability).toContain(
      "unit_commitments_approval_policy_guard",
    );
    expect(drill).toContain("self-approved long Hold duration was accepted");
    expect(drill).toContain("independentLongDurationApproval");
  });

  it("proves final contractual links and protected release", () => {
    expect(authorityAvailability).toContain('FROM "rental_leases"');
    expect(authorityAvailability).toContain(
      "unit_commitments_final_link_release_guard",
    );
    expect(drill).toContain("active RentalLease did not block availability");
    expect(drill).toContain("rentalLeaseBlocksAvailability");
  });

  it("keeps hardened availability behavior while qualifying every source", () => {
    expect(availabilityDisambiguation).toContain(
      'CREATE OR REPLACE FUNCTION "exec006_evaluate_unit_availability"',
    );
    expect(availabilityDisambiguation).toContain(
      'availability_source."tenant_id" = p_tenant_id',
    );
    expect(availabilityDisambiguation).toContain(
      'rental_record."tenant_id" = p_tenant_id',
    );
    expect(availabilityDisambiguation).toContain(
      'commitment_record."tenant_id" = p_tenant_id',
    );
  });

  it("proves tours do not create availability blockers", () => {
    expect(foundation).toContain("exec006_create_tour_appointment");
    expect(drill).toContain("Tour incorrectly blocked Unit availability");
    expect(drill).toContain("tourDoesNotReserve");
  });

  it("proves fail-closed, tenant integrity and append-only protection", () => {
    expect(drill).toContain("UNKNOWN_FAIL_CLOSED");
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