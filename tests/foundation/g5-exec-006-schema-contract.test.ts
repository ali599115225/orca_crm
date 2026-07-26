import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql",
  "utf8",
);
const freeze = readFileSync(
  "docs/zero-based/Z8/ORCA_Z8_EXEC_006_FREEZE.md",
  "utf8",
);
const contracts = readFileSync("lib/unit-commitment/contracts.ts", "utf8");
const authority = readFileSync("lib/unit-commitment/authority.ts", "utf8");
const service = readFileSync("lib/unit-commitment/service.ts", "utf8");

describe("EXEC-006 schema and frozen-boundary contract", () => {
  it("creates a dedicated forward availability source without Backfill", () => {
    expect(migration).toContain('CREATE TABLE "unit_availability_sources"');
    expect(migration).toContain("missing source fails closed");
    expect(migration).not.toMatch(/UPDATE\s+"unit_availability_sources"/i);
    expect(freeze).toContain("No backfill");
  });

  it("keeps Tours outside exclusive Unit commitments", () => {
    expect(migration).toContain('CREATE TABLE "unit_commitments"');
    expect(migration).toContain('CREATE TABLE "tour_appointments_v2"');
    expect(migration).toContain("A Tour never creates an exclusive Unit commitment");
    expect(contracts).toContain('"HOLD", "RESERVATION"');
  });

  it("enforces database-level exclusive commitment overlap protection", () => {
    expect(migration).toContain("unit_commitments_active_exclusivity");
    expect(migration).toContain("EXCLUDE USING GIST");
    expect(migration).toContain('"exclusive_window" WITH &&');
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("enforces staff, resource and Unit Tour conflict protection", () => {
    expect(migration).toContain("tour_appointments_v2_staff_no_overlap");
    expect(migration).toContain("tour_appointments_v2_resource_no_overlap");
    expect(migration).toContain("tour_appointments_v2_unit_no_overlap");
    expect(migration).toContain('"unit_overlap_blocked" = TRUE');
  });

  it("uses tenant-safe composite foreign keys for core references", () => {
    expect(migration).toContain("unit_commitments_unit_tenant_fkey");
    expect(migration).toContain("unit_commitments_party_tenant_fkey");
    expect(migration).toContain("unit_commitments_account_tenant_fkey");
    expect(migration).toContain("unit_commitments_opportunity_tenant_fkey");
    expect(migration).toContain("tour_appointments_v2_staff_tenant_fkey");
  });

  it("makes Audit and History append-only", () => {
    expect(migration).toContain("unit_commitment_history_no_mutation");
    expect(migration).toContain("unit_commitment_audit_no_mutation");
    expect(migration).toContain("tour_appointment_history_no_mutation");
    expect(migration).toContain("exec006_deny_append_only_mutation");
  });

  it("guards legacy Unit status from becoming a parallel exclusive truth", () => {
    expect(migration).toContain("units_exec006_legacy_status_guard");
    expect(migration).toContain("exclusive unit status must be projected");
    expect(migration).toContain("exec006_project_legacy_unit_status");
  });

  it("fails Availability closed on missing or inconsistent source data", () => {
    expect(migration).toContain("exec006_evaluate_unit_availability");
    expect(migration).toContain("UNKNOWN_FAIL_CLOSED");
    expect(service).toContain('state: "UNKNOWN_FAIL_CLOSED"');
    expect(service).not.toContain('state: "AVAILABLE", reasonCode: "UNKNOWN');
  });

  it("binds sensitive SQL commands to persisted assignment evidence", () => {
    expect(migration).toContain("exec006_assert_scope_assignment");
    expect(migration).toContain("missing or expired persisted scope assignment");
    expect(migration).toContain("technical role has no automatic commercial authority");
    expect(authority).toContain("ROLE_PERMISSION_MATRIX");
  });

  it("enforces idempotency payload equality and version conflicts", () => {
    expect(migration).toContain('CREATE TABLE "unit_commitment_idempotency"');
    expect(migration).toContain("idempotency payload mismatch");
    expect(migration).toContain("concurrency conflict");
    expect(service).toContain("IDEMPOTENCY_PAYLOAD_MISMATCH");
    expect(service).toContain("CONCURRENCY_CONFLICT");
  });

  it("implements resumable same-tenant expiry reconciliation", () => {
    expect(migration).toContain("exec006_reconcile_expired_commitments");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("p_cursor");
    expect(migration).toContain("p_limit > 500");
    expect(service).toContain("nextCursor");
  });

  it("does not implement later financial or contractual packages", () => {
    expect(freeze).toContain("No Offer acceptance, Contract, Invoice, Payment");
    expect(service).toContain("createsContract: false");
    expect(service).toContain("createsInvoice: false");
    expect(service).toContain("recordsPayment: false");
    expect(migration).not.toMatch(/CREATE TABLE\s+"(?:invoices|payments|refunds)"/i);
  });

  it("contains no destructive legacy schema operation", () => {
    expect(migration).not.toMatch(/DROP\s+(?:TABLE|COLUMN)/i);
    expect(migration).not.toMatch(/TRUNCATE\s+/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"(?:units|contracts|tours|leads|opportunities|offers)"/i);
  });
});