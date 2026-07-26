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

  it("applies authority and identity prerequisites before EXEC-006", () => {
    const stepsOffset = workflow.indexOf("\n    steps:");
    expect(stepsOffset).toBeGreaterThan(-1);
    const applicationSteps = workflow.slice(stepsOffset);

    const authority = applicationSteps.indexOf(
      "20260726043000_exec_004_organization_authority",
    );
    const identity = applicationSteps.indexOf(
      "20260726123000_exec_005_customer_identity_lifecycle",
    );
    const identityHardening = applicationSteps.indexOf(
      "20260726124500_exec_005_customer_identity_integrity_hardening",
    );
    const commitment = applicationSteps.indexOf(
      "20260726160000_exec_006_unit_commitment_reservation_tours",
    );
    const commitmentHardening = applicationSteps.indexOf(
      "20260726161000_exec_006_unit_commitment_integrity_hardening",
    );

    expect(authority).toBeGreaterThan(-1);
    expect(identity).toBeGreaterThan(authority);
    expect(identityHardening).toBeGreaterThan(identity);
    expect(commitment).toBeGreaterThan(identityHardening);
    expect(commitmentHardening).toBeGreaterThan(commitment);
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
