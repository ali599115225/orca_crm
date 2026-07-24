# ORCA Z7 — Dependency and Critical-Path Map

- **Document ID:** ORCA-Z7-CRITICAL-PATH-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `COMPLETE / INPUT TO Z8`

## 1. Critical path

```text
OWNER DECISIONS
  → SCOPE / REPOSITORY HYGIENE
  → ORGANIZATION / RBAC / PRIVACY FOUNDATION
  → CUSTOMER + INVENTORY COMMITMENT SPINE
  → OFFER + CONTRACT + FINANCE SPINE
  → WORKFLOW + COMMUNICATION + DOCUMENT EVIDENCE
  → REPORTING / EXPORT / AI CONTROLS
  → DIRECT P0/P1 SECURITY AND CONCURRENCY TESTS
  → OWNER-APPROVED VISUAL / ACCESSIBILITY CYCLES
  → PROVIDER + STAGING + REPRESENTATIVE RECOVERY
  → UAT / TRAINING / HANDOVER
  → SEPARATE PRODUCTION ACTIVATION EVIDENCE
```

## 2. Proposed Z8 package candidates

| Package | Purpose | Gap inputs | Prerequisites | Authorized intent | Completion evidence |
|---|---|---|---|---|---|
| EXEC-00 | Owner decision closure | GAP-Z7-002/005/008/009/010/019/020/029/030 | None | Approved decisions only; no code | Owner decisions linked to target requirements. |
| EXEC-01 | Repository and scope hygiene | GAP-Z7-001/025/026 | EXEC-00 scope decision | Publish the verified dependency-security issue form from candidate `ed4ea9087b2fe9c6ba1335610080870eb38efd4a`, add lint, retire SaaS residues, and archive generated artifacts | Issue form exists on central; no reachable legacy SaaS flow; CI remains green. |
| EXEC-02 | Organization, RBAC and privacy foundation | GAP-Z7-002/003/019/027/031 | EXEC-00 | Models, permissions, direct tests; non-Production migrations only when separately authorized | Every P0/P1 action is scoped and denied by default. |
| EXEC-03 | Customer and inventory spine | GAP-Z7-004/005/006/007 | EXEC-00/02 | Lead identity, project hierarchy, commitments and tours | Concurrency/lifecycle/outcome tests pass. |
| EXEC-04 | Offer, contract and finance spine | GAP-Z7-008/009/010/030 | EXEC-03 + owner policies | Versioned offers, authority, contract activation, money corrections | Exact-version, SoD, retry and reconciliation evidence passes. |
| EXEC-05 | Workflow, communications and documents | GAP-Z7-011/012/013/028/032 | EXEC-02 + providers/storage decisions | Durable workflow, provider truth, evidence-safe documents | Failure/replay/file/retention tests pass. |
| EXEC-06 | Reporting, export and AI | GAP-Z7-014/015/031 | EXEC-02/04 + owner policies | Metric lineage/export gateway; AI remains provider-gated | KPI reconciliation, export negative tests and AI safety tests pass. |
| EXEC-07 | Direct security/quality evidence | GAP-Z7-016/025/027/028 | EXEC-02..06 stable contracts | Close 25 P0/P1 then lower-priority direct-test gaps | No mandatory P0/P1 contract remains `NOT_PROVEN`. |
| EXEC-08 | Visual reference and accessibility queue | GAP-Z7-017/018 | Approved release scope | One surface per cycle; no bulk tab redesign | Owner-approved reference and independent verification per surface. |
| EXEC-09 | Provider and staging readiness | GAP-Z7-020/021/023/032 | EXEC-00, stable non-Production build | Company accounts, deterministic staging, recovery drills | Provider failure/E2E/recovery evidence passes. |
| EXEC-10 | UAT, training and handover | GAP-Z7-022 | EXEC-03..09 | Execute approved journeys and operational handover | Named owner sign-off with tracked defects and runbooks. |
| EXEC-11 | Production activation evidence | GAP-Z7-024 | All prior packages and explicit owner authorization | Evidence package only; no automatic action | Six G8 activation conditions verified for one SHA. |

## 3. Sequencing rules

- Z8 may authorize planning/build packages, but may not silently authorize `main`, Production, provider purchases, secrets, migrations, or data writes.
- Data and schema changes require their own reviewed migration/backfill/rollback package.
- Visual work is serialized by surface and independent reference approval.
- Provider work remains `NOT_CONFIGURED` until company-owned account and contract evidence exists.
- `EXEC-11` is an evidence template and stop gate, not deployment permission.
