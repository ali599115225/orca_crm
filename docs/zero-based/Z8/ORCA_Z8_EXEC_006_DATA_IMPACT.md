# ORCA Z8 — EXEC-006 Data Impact and Compatibility Record

## Scope identity

- Package: `EXEC-006 — Unit Commitment, Reservation and Tours`
- Frozen central base: `5774f64ad42fb77a387c28d6f5c8fac29c31450b`
- Implementation branch: `work/orca-exec-006-unit-commitment-reservation-tours-20260726`
- Implementation PR: `#135`
- Data action authorization: repository schema evidence and disposable PostgreSQL validation only.

## Existing inventory and current source conflicts

| Existing surface | Current behavior | EXEC-006 classification |
|---|---|---|
| `Unit.status` | Mutable text used by legacy screens/actions | Legacy compatibility projection; never the exclusive availability truth |
| `Project.unitsBooked` | Aggregate counter without commitment lineage | Legacy derived/historical field; no Backfill in EXEC-006 |
| `Contract.reservationExpiresAt` | Reservation-like time stored inside Contract | Historical compatibility evidence; not the new Reservation aggregate |
| Legacy `Tour` | Limited statuses and no explicit timezone/history or DB overlap guard | Retained; new forward scheduling source is `tour_appointments_v2` |
| Lead/Opportunity stages | Can contain `RESERVED`, `WON` or similar workflow signals | Customer workflow only; not an exclusive Unit right |
| Accepted Offer | Commercial intent/workflow | Does not reserve a Unit unless a later caller crosses the EXEC-006 boundary |
| Contract relation to Unit | Final contractual linkage | Read by Availability Decision as `CONTRACTUALLY_UNAVAILABLE` |
| Effective RentalLease relation to Unit | Final contractual occupancy linkage | Read by Availability Decision as `CONTRACTUALLY_UNAVAILABLE` while effective |

## New additive data structures

1. `unit_commitment_policies`
   - Bounded duration and Tour-overlap policies.
   - Can be resolved by Company/Branch/Project/Unit type/security role.
   - Default timezone is `Asia/Riyadh`.

2. `unit_availability_sources`
   - Forward inventory source required for authoritative availability.
   - Contains persisted branch, base state, consistency, policy and source version.
   - Missing rows are intentional fail-closed evidence: `UNKNOWN_FAIL_CLOSED`.

3. `unit_operational_restrictions`
   - Effective-dated operational blockers with version and actor.

4. `unit_commitments`
   - Exclusive `HOLD` and `RESERVATION` aggregate.
   - Tenant-safe Unit, Branch, Party, Customer Account and Opportunity references.
   - Version, expiry, conversion links and approval evidence.
   - PostgreSQL exclusion constraint prevents overlapping active exclusive windows.

5. `unit_commitment_history`
   - Append-only lifecycle history.

6. `unit_commitment_audit`
   - Append-only actor/scope/branch/unit/action/audit evidence for commitments and Tours.

7. `unit_commitment_idempotency`
   - Tenant/operation/key uniqueness with payload hash and result identity.

8. `tour_appointments_v2`
   - UTC Tour Appointment with explicit timezone.
   - Staff/resource overlap prevention is mandatory.
   - Unit overlap prevention is enabled by default and policy-configurable.
   - No row in this table creates or implies a Unit commitment.

9. `tour_appointment_history`
   - Append-only previous/next schedule and lifecycle history.

## Integrity and concurrency protections

- Composite tenant-safe foreign keys prevent cross-tenant Unit, Branch, actor, assignment and customer references.
- Party, Customer Account and Opportunity subject consistency is checked by triggers.
- Persisted Unit branch is authoritative; a forged Branch ID is rejected.
- Transaction-scoped advisory locks serialize Unit commitment commands and staff/unit Tour scheduling commands.
- GiST exclusion constraints independently protect commitment and Tour overlaps if application checks are bypassed.
- Optimistic version checks protect Extend, Release, Approval, Conversion and Tour rescheduling/transitions.
- Reused idempotency keys return the previous result only when the payload hash matches.
- Elevated duration approval is verified against a distinct active persisted EXEC-004 assignment inside PostgreSQL.
- Final Contract or effective RentalLease linkage prevents protected commitment release or cancellation.
- Audit and History tables reject Update and Delete.
- Sensitive mutations fail if Audit/History insert cannot complete in the same transaction.

## Availability decision source order

The server function evaluates:

1. presence and consistency of `unit_availability_sources`;
2. Unit base state;
3. final Contract or effective RentalLease linkage;
4. effective operational restrictions;
5. non-expired exclusive commitments;
6. current trusted server time.

An expired commitment does not block availability before cleanup. A missing or inconsistent source returns `UNKNOWN_FAIL_CLOSED`; it never guesses `AVAILABLE`.

## Transition and compatibility strategy

### Forward source

All new Hold/Reservation commands use the EXEC-006 tables and SQL command functions. New Tour scheduling uses `tour_appointments_v2`.

### Legacy projection

- Existing `Unit.status` is retained.
- Direct writes of exclusive meanings such as `HELD`, `RESERVED` or `BOOKED` are blocked by a trigger.
- `exec006_project_legacy_unit_status` is the only allowed controlled projection path for those meanings.
- No historical row is automatically converted into a new Hold or Reservation.

### Runtime paths inventoried but not silently claimed as migrated

The following existing files were inventoried and deliberately left unchanged because EXEC-006 does not rewrite legacy UI/API surfaces without a separately frozen wiring decision:

- `app/actions/properties.ts`
- `app/api/properties/[id]/route.ts`
- `app/actions/projects.ts`
- `app/actions/tours.ts`
- `app/api/v1/tours/route.ts`
- `app/api/v1/tours/[id]/route.ts`
- `lib/domain/transaction-spine/schedule-tour.ts`
- legacy Offer/Lead/Opportunity/Contract entry points that do not cross the new boundary.

The database guard prevents these paths from creating a parallel exclusive Unit truth through `Unit.status`. Legacy Tour writes remain non-exclusive and are not represented as conflict-safe `tour_appointments_v2` records; therefore this package does not claim those legacy Tour entry points are migrated.

## No-Backfill policy

- No INSERT from legacy Unit, Contract, Lead, Opportunity, Offer or Tour rows into EXEC-006 tables.
- No transformation of existing customer data.
- No deletion or alteration of legacy columns.
- No Production seed.
- No Production migration execution.
- No customer-data rehearsal outside disposable GitHub Actions PostgreSQL.

A future migration/backfill requires separate owner authorization, recovery point, reconciliation rules, duplicate/conflict disposition and forward-fix plan.

## Downstream handoff boundary

`ReservationConversionHandoff` emits references only:

- Reservation, Tenant, Branch and Unit IDs;
- Party/Customer Account/Opportunity references;
- downstream reference and conversion timestamp;
- explicit flags that no Contract, Invoice or Payment is created.

EXEC-006 does not implement Offer acceptance, Contract, Invoice, Payment, Refund, ownership transfer or Lease activation.

## Operational scheduling

`ReconcileExpiredCommitments` is directly callable, same-tenant, cursor/batch limited, resumable, idempotent and audited. No Vercel Cron or Production scheduler is created or activated. External scheduling remains outside the closed claim.

## Migration files and execution status

- `prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql`
- `prisma/migrations/20260726161000_exec_006_unit_commitment_integrity_hardening/migration.sql`
- `prisma/migrations/20260726162000_exec_006_authority_availability_hardening/migration.sql`
- `prisma/migrations/20260726163000_exec_006_availability_disambiguation/migration.sql`

Execution permitted in this package:

- disposable PostgreSQL 16 in GitHub Actions only.

Execution prohibited:

- Production;
- customer databases;
- Preview databases containing customer data;
- Backfill or mutation of real records.

## Vercel

`SKIP_BY_DEFAULT`. This package introduces no required browser-only proof. Direct tests, disposable PostgreSQL migration/concurrency validation, TypeScript, Build and ORCA CI are the authoritative gates.
