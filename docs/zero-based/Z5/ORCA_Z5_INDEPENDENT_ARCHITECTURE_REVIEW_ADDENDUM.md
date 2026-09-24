# ORCA Z5 — Independent Security and Quality Architecture Review Addendum

- **Document ID:** ORCA-Z5-REVIEW-ADD-001
- **Version:** 1.0 — Unpublished stacked preparation
- **Date:** 2026-07-22
- **Status:** `PRE-PUBLICATION REVIEW COMPLETE / IMPLEMENTATION NOT ASSESSED`
- **Production action authorized:** `false`

## 1. Purpose

Record an independent architecture review of the Z5 planning candidate and close omissions in the target contract before Z5 is ever published for sequential validation. This addendum does not claim that any control exists in the current repository.

## 2. Review result

The existing Z5 candidate correctly defines protected assets, trust boundaries, deny-by-default authorization, segregation of duties, webhook verification, file security, audit integrity, AI human control, measurable NFRs, test layers, and software supply-chain gates.

The review identified controls that were implied but not explicit enough to support later Z7 conformance classification or direct test design.

## 3. Additional security requirements

| ID | Requirement | Priority | Required acceptance evidence | Current state |
|---|---|---:|---|---|
| SEC-013 | State-changing browser requests validate trusted origin and use framework-appropriate CSRF protection | P0 | cross-site submission and forged-origin tests fail safely | TEXT CONTRACT ADDED |
| SEC-014 | Outbound HTTP access is deny-by-default or allowlisted and protects against SSRF, internal metadata and redirect abuse | P0 | private/link-local/metadata/redirect targets are rejected | TEXT CONTRACT ADDED |
| SEC-015 | Authentication, recovery, exports, uploads, search, webhooks and expensive actions have risk-based rate and abuse controls | P0 | burst, enumeration and resource-exhaustion tests | TEXT CONTRACT ADDED |
| SEC-016 | Browser security policy includes CSP, frame protection, safe MIME handling, referrer policy and transport controls | P0 | response-header and browser execution tests | TEXT CONTRACT ADDED |
| SEC-017 | Session cookies use Secure, HttpOnly, explicit SameSite and bounded scope; sensitive responses are not cached publicly | P0 | cookie/header/cache inspection | TEXT CONTRACT ADDED |
| SEC-018 | Redirects, URLs and callback destinations are validated against explicit schemes and destinations | P0 | open-redirect and malicious callback tests | TEXT CONTRACT ADDED |
| SEC-019 | Serialization, parsing, merge and template boundaries resist prototype pollution, unsafe object paths and code/template injection | P0 | adversarial payload tests | TEXT CONTRACT ADDED |
| SEC-020 | Cryptographic keys and signing secrets have purpose, owner, environment, rotation, revocation and compromise procedure | P0 | key inventory and rotation drill | TEXT CONTRACT ADDED |
| SEC-021 | Deletion, retention expiry and legal hold have domain, audit, backup and provider-consistent behavior | P0 | deletion/hold/backup-expiry scenario evidence | TEXT CONTRACT ADDED |
| SEC-022 | Sensitive exports and downloads enforce authorization at access time and use bounded lifetime, scope and revocation where supported | P0 | expired/revoked/cross-scope access tests | TEXT CONTRACT ADDED |
| SEC-023 | Availability abuse and algorithmic/resource exhaustion are considered for queries, files, reports, jobs and AI context | P1 | bounded-query, payload, timeout and quota tests | TEXT CONTRACT ADDED |
| SEC-024 | Administrative configuration, role, provider and retention changes require strong audit and elevated approval where applicable | P0 | privileged-change negative and audit tests | TEXT CONTRACT ADDED |

## 4. Additional quality requirements

| ID | Requirement | Priority | Acceptance direction |
|---|---|---:|---|
| QUAL-013 | Security response headers and browser policy are tested as executable contracts | P0 | automated header suite plus targeted browser verification |
| QUAL-014 | Abuse/rate-limit tests distinguish user, IP, account, company, resource and provider quota dimensions | P1 | repeatable tests with safe recovery and no false lockout |
| QUAL-015 | Privacy tests cover browser/cache history, generated files, temporary storage, backups and provider copies | P0 | data-path evidence from creation through disposal |
| QUAL-016 | Performance and resilience tests include malicious or pathological inputs, not only expected business traffic | P1 | bounded cost and safe failure under adversarial load |

## 5. Additional supply-chain requirements

| ID | Requirement | Priority | Acceptance direction |
|---|---|---:|---|
| SUP-009 | Dependency source, package name and publisher changes are reviewed for confusion, typosquatting and takeover risk | P0 | dependency-diff and registry-source review |
| SUP-010 | CI actions and reusable workflows are pinned or governed with recorded update evidence | P0 | workflow inventory and immutable reference policy |
| SUP-011 | Release evidence identifies build runner/runtime image and verifies reproducibility or records variance | P1 | clean rebuild comparison and environment identity |
| SUP-012 | Signing/provenance keys and release credentials are separated, rotated and not exposed to untrusted PR execution | P0 | permission/secret-flow review and negative test |

## 6. Z7 verification mapping

Z7 must classify each requirement as `KEEP`, `ADAPT`, `REBUILD`, `RETIRE`, `MISSING`, `DEFER`, or `NOT_PROVEN`, with direct file/config/test evidence. Absence of a finding is not evidence of implementation.

## 7. Gate impact

```text
Z5 ORIGINAL SECURITY REQUIREMENTS: 12
ADDITIONAL SECURITY REQUIREMENTS: 12
Z5 ORIGINAL QUALITY REQUIREMENTS: 12
ADDITIONAL QUALITY REQUIREMENTS: 4
Z5 ORIGINAL SUPPLY-CHAIN REQUIREMENTS: 8
ADDITIONAL SUPPLY-CHAIN REQUIREMENTS: 4
REVISED TARGET REQUIREMENTS: 52
CURRENT IMPLEMENTATION CONFORMANCE: NOT ASSESSED
PUBLICATION AUTHORIZED: NO
PRODUCTION ACTION: NONE
```
