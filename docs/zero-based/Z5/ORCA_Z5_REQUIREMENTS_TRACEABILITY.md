# ORCA Z5 — Security and Quality Requirements Traceability

- **Document ID:** ORCA-Z5-RTM-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `REQUIREMENTS REGISTERED / CENTRAL RECONCILIATION PENDING`
- **Production action authorized:** `false`

## 1. Security requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| SEC-001 | Every protected action is deny-by-default and server-authorized | P0 | UI bypass cannot perform action | direct negative tests | TEXT_CONTRACT_DEFINED |
| SEC-002 | Trusted scope is reconstructed from session, assignment and resource context | P0 | client scope changes do not expand access | isolation tests | TEXT_CONTRACT_DEFINED |
| SEC-003 | High-risk duties enforce separation or approved compensating control | P0 | prohibited self-approval is blocked | SoD tests | OWNER_LIMITS_REQUIRED |
| SEC-004 | Sessions support rotation, expiry, revocation and sensitive-action revalidation | P0 | stale/revoked access fails safely | auth lifecycle tests | TEXT_CONTRACT_DEFINED |
| SEC-005 | Input, output, file and event boundaries use explicit validation | P0 | malformed/untrusted data cannot alter state | boundary tests | TEXT_CONTRACT_DEFINED |
| SEC-006 | Webhooks verify signature, time/replay, account, schema and idempotency | P0 | invalid/replayed callback has no effect | webhook security tests | TEXT_CONTRACT_DEFINED |
| SEC-007 | Secrets are environment-separated, company-owned and never logged | P0 | no secret in tree/log/client response | secret/log scans | TEXT_CONTRACT_DEFINED |
| SEC-008 | Documents are private-by-default, scanned and delivered through bounded authorization | P0 | public/permanent/malicious access fails | file security tests | TEXT_CONTRACT_DEFINED |
| SEC-009 | Audit evidence is complete, privacy-safe and protected from silent mutation | P0 | material actions have actor/scope/result/correlation | audit tests | TEXT_CONTRACT_DEFINED |
| SEC-010 | AI remains human-controlled and resists prompt/data injection | P0 | no autonomous financial/legal/contract action | adversarial tests | POLICY_OWNER_REQUIRED |
| SEC-011 | P0/P1 risks require direct evidence, remediation or formal expiring acceptance | P0 | no narrative-only closure | risk review | TEXT_CONTRACT_DEFINED |
| SEC-012 | Emergency access is strongly controlled, time-bounded, alerted and reviewed | P0 | no standing hidden elevation | break-glass drill | OWNER_DECISION_REQUIRED |

## 2. Quality and test requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| QUAL-001 | Each target requirement has a named verification method and evidence identifier | P0 | no unverified closure | RTM review | TEXT_CONTRACT_DEFINED |
| QUAL-002 | Critical state transitions have positive, negative, permission and concurrency tests | P0 | all applicable dimensions covered | test matrix | TEXT_CONTRACT_DEFINED |
| QUAL-003 | Critical APIs/actions/events/providers have typed compatibility tests | P0 | incompatible change is detected | contract tests | TEXT_CONTRACT_DEFINED |
| QUAL-004 | Performance targets use representative p95/p99, volume and environment metadata | P1 | repeatable evidence | load test report | OWNER_NUMERIC_TARGET_REQUIRED |
| QUAL-005 | Provider failure, timeout, quota, duplicate and unknown states are tested | P0 | no false business success | resilience tests | TEXT_CONTRACT_DEFINED |
| QUAL-006 | Critical UI contracts include owner reference and independent accessibility/visual verification | P0 | named reference matched | two-pass visual evidence | ITEM_APPROVAL_REQUIRED |
| QUAL-007 | Test data is synthetic/masked, isolated and reproducible | P0 | no Production secret/data dependency | fixture/environment review | TEXT_CONTRACT_DEFINED |
| QUAL-008 | Required suites are deterministic and blocking | P0 | failed/skipped required check blocks merge | CI evidence | TEXT_CONTRACT_DEFINED |
| QUAL-009 | Backup/restore, rollback and incident recovery are verified by drills | P0 | timed successful exercise | Z6 evidence | Z6_REQUIRED |
| QUAL-010 | UAT is tied to Release 1 outcomes and signed exceptions | P1 | owner acceptance package | UAT register | Z8_REQUIRED |
| QUAL-011 | Accessibility target is WCAG 2.2 AA for critical flows | P0 | automated and manual evidence | accessibility matrix | TEXT_CONTRACT_DEFINED |
| QUAL-012 | No current test/report name alone proves target conformance | P0 | Z7 maps evidence explicitly | gap review | TEXT_CONTRACT_DEFINED |

## 3. Supply-chain requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| SUP-001 | Lockfiles and approved runtime/package manager reproduce clean install | P0 | clean install from source SHA | CI reproduction | TEXT_CONTRACT_DEFINED |
| SUP-002 | Production dependency audit blocks approved severities | P0 | audit pass or expiring exception | audit evidence | TEXT_CONTRACT_DEFINED |
| SUP-003 | Each release candidate has SBOM and artifact/source identity | P0 | machine-readable evidence package | release gate | Z8_IMPLEMENTATION_REQUIRED |
| SUP-004 | Provenance target is recorded without claiming unproven SLSA level | P1 | source/build/artifact chain documented | provenance review | TEXT_CONTRACT_DEFINED |
| SUP-005 | Workflows use least privilege and do not expose secrets to untrusted input | P0 | permissions and trigger review | CI security review | TEXT_CONTRACT_DEFINED |
| SUP-006 | Temporary diagnostics are removed before merge | P0 | final diff contains no temporary tooling | diff/CI review | TEXT_CONTRACT_DEFINED |
| SUP-007 | Protected branches and required checks prevent silent bypass | P0 | red/pending/action-required blocks merge | repository policy review | Z7_CONFORMANCE_REQUIRED |
| SUP-008 | Vulnerability remediation and exception SLA is owner-approved | P0 | Critical/High deadlines and escalation | policy evidence | OWNER_DECISION_REQUIRED |

## 4. Totals

```text
SECURITY REQUIREMENTS: 12
QUALITY/TEST REQUIREMENTS: 12
SUPPLY-CHAIN REQUIREMENTS: 8
TOTAL Z5 REQUIREMENTS: 32
CURRENT IMPLEMENTATION CONFORMANCE: NOT ASSESSED
CENTRAL RTM RECONCILIATION: PENDING
PRODUCTION ACTION: NONE
```
