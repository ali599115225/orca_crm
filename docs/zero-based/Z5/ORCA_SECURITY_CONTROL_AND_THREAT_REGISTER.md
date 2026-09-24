# ORCA Z5 — Security Control and Threat Register

- **Document ID:** ORCA-Z5-SEC-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / IMPLEMENTATION CONFORMANCE NOT ASSESSED`
- **Target assurance:** OWASP ASVS 5.0 Level 2 baseline, subject to risk review
- **Production action authorized:** `false`

## 1. Purpose

Define the target security model for ORCA before comparing it with the current repository in Z7. This register does not claim certification, legal compliance, control implementation, or Production readiness.

## 2. Protected assets

| Asset | Security objective | Principal risk |
|---|---|---|
| Identities and sessions | authenticity, bounded lifetime, revocation | account takeover, session fixation, stale privilege |
| Company scope and assignments | isolation and least privilege | cross-company or cross-resource access |
| Customer and personal data | confidentiality, purpose limitation, integrity | exposure, over-collection, unauthorized export |
| Inventory and commitments | integrity and concurrency safety | double reservation, stale availability |
| Offers and contracts | version integrity and authority | unauthorized terms, mutable accepted version |
| Financial records and evidence | exactness, provenance, non-repudiation | false payment, altered evidence, self-approval |
| Documents and templates | controlled access, malware resistance | public URL, malicious upload, wrong version |
| Provider credentials and webhooks | secrecy, authenticity, replay resistance | leaked secret, forged callback, duplicate effect |
| Audit and incident evidence | completeness and tamper resistance | silent deletion, sensitive logging, missing correlation |
| AI prompts and outputs | minimization and human control | prompt injection, leakage, fabricated decision |
| Source, dependencies, build evidence | integrity and provenance | malicious dependency, secret commit, untrusted artifact |

## 3. Trust boundaries

1. Browser and untrusted client input.
2. Authenticated application shell.
3. Server Actions and HTTP APIs.
4. Domain services and authorization context.
5. Database and transactional outbox/inbox.
6. Object/file storage.
7. Background jobs and scheduled invocations.
8. External providers and webhook ingress.
9. CI, package registry, source repository, and deployment platform.
10. Administrative and emergency-access paths.

No client-supplied role, company, branch, resource scope, price, approval, or provider result is trusted without server reconstruction and verification.

## 4. Abuse-case register

| ID | Abuse case | Required prevention/detection | Acceptance direction |
|---|---|---|---|
| THR-001 | user changes `tenantId` or resource ID to read another scope | trusted server context, scoped query, safe not-found | negative isolation tests |
| THR-002 | user calls Server Action directly without UI permission | deny-by-default server authorization | direct-action tests |
| THR-003 | creator approves own high-risk offer/contract/refund | segregation-of-duties rule and compensating exception | SoD tests and audit evidence |
| THR-004 | duplicate reservation wins concurrently | transaction, version/lock constraint, idempotency | concurrency race test |
| THR-005 | internal event marks payment successful without provider evidence | verified evidence and reconciliation state | timeout/unknown/replay tests |
| THR-006 | webhook is forged or replayed | signature, timestamp, account scope, schema, idempotency | invalid/replay tests |
| THR-007 | malicious file is uploaded and executed or publicly shared | type/size validation, malware scan, non-executable storage, short signed URL | upload/download security tests |
| THR-008 | export exposes excessive personal or financial data | field authority, masking, purpose and export permission | export-negative tests |
| THR-009 | logs contain secret, token, PAN, personal document, or prompt content | structured redaction and safe error contract | log scan and incident review |
| THR-010 | stale session retains removed role or assignment | sensitive-action revalidation and revocation | joiner/mover/leaver tests |
| THR-011 | AI output performs legal, financial, or contractual action | human approval and tool/action allowlist | blocked-autonomy tests |
| THR-012 | prompt or retrieved content injects instructions | content separation, grounding, output validation | adversarial prompt tests |
| THR-013 | dependency or build artifact is replaced | lockfile, registry policy, SBOM, provenance, protected branch | supply-chain evidence |
| THR-014 | break-glass becomes normal administrator path | short-lived elevation, strong auth, alert, review | emergency-access drill |
| THR-015 | password reset/account recovery leaks account existence | uniform response and bounded token | enumeration and reuse tests |
| THR-016 | audit evidence is altered or deleted silently | append-oriented evidence, restricted retention, correlation | tamper and deletion tests |

## 5. Control families

### Identity and session

- approved authentication and recovery flows;
- session rotation, bounded expiry, revocation, and inactivity behavior;
- strong authentication for privileged or emergency access when selected;
- no sensitive token in URL, analytics, log, or client storage beyond approved mechanism.

### Authorization

- deny by default;
- server-reconstructed company, organizational, resource, delegation, and job scopes;
- separate read, field-read, write, approve, export, delete, provider-admin, retention-admin, and audit permissions;
- periodic access review and effective-dated lifecycle.

### Input, output, and state integrity

- schema validation and normalization at every boundary;
- parameterized data access;
- safe rendering and content security controls;
- optimistic or transactional concurrency where business truth requires it;
- immutable accepted versions and explicit transitions.

### Secrets and cryptography

- company-owned Production credentials;
- environment/secret store, not repository or database plaintext;
- rotation, revocation, access evidence, and separation by environment;
- approved algorithms and managed TLS; no custom cryptography.

### Files and documents

- deny public-by-default storage;
- allowlisted content and bounded size;
- malware scanning and quarantine state;
- short-lived signed access after authorization;
- legal hold and disposal evidence.

### Logging, detection, and incidents

- correlation and actor/resource/action/result fields;
- privacy masking and secret suppression;
- alertable security events with owner and runbook;
- preserved incident timeline and decision evidence.

## 6. Reference mapping

| Reference | Target use |
|---|---|
| NIST SSDF 1.1 | secure development practices and evidence |
| OWASP ASVS 5.0 | application verification baseline; preliminary L2 |
| OWASP API Security Top 10 2023 | API abuse and authorization coverage |
| OWASP SAMM 2 | maturity baseline and target planning |
| NCA applicable controls | local applicability decision and control mapping |
| ISO/IEC 27001 and 27035 | governance and incident-control reference |

References define planning direction; certification or regulatory applicability remains an owner/evidence decision.

## 7. Risk acceptance rule

- P0/P1 security risk cannot be closed by wording, test-name similarity, or agent report.
- It requires direct evidence, remediation, or formal owner acceptance with expiry and compensating controls.
- Production security exceptions require separate explicit authorization.

## 8. Current result

```text
SECURITY ASSETS: DEFINED
TRUST BOUNDARIES: 10
ABUSE CASES: 16
TARGET ASVS LEVEL: L2 PRELIMINARY
CURRENT IMPLEMENTATION VERIFIED: NO — Z7 REQUIRED
CERTIFICATION CLAIM: NONE
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
