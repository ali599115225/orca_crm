# ORCA — STEP 12 Final Authoritative Reference Gate + Saudi Regulatory Re-check

Date: 2026-08-13
Governance: `governance/orca-workflow-lock`
Jurisdiction snapshot: Saudi Arabia

> Technical/regulatory applicability re-check for the locked ORCA product model. This is not legal advice and does not replace customer-specific legal/compliance review.

## 1. Final authoritative product reference

- Repository: `ali599115225/orca_crm`
- Authoritative product branch: `work/orca-unified-reference-20260813`
- Final reference SHA at this gate: `769b0a3de7ff09e00e2baf3c438886a6b616ab1d`
- ORCA CI run `31673473533` / run number `834`: SUCCESS on the exact SHA.
- STEP 11 isolated runtime evidence: 10/10 selected authenticated operational routes PASS on the exact SHA.
- STEP 9 same-environment full-suite differential: zero new failure identities versus the pre-remediation baseline.
- STEP 10: exactly 10 E2E + exactly 20 Functional Contracts reverified and closed.

No deployment, production mutation, provider activation, migration, or backfill was performed to establish this reference.

## 2. Dependency security evidence

GitHub Actions dependency-audit run: `31675851436`
Job: `94370144351`
Artifact: `step12-dependency-audit-evidence` / ID `9171506132`
Artifact ZIP SHA-256: `3b9ee27681444e171218a6aa3963e25562995997e712866e6e36cdeb51e0fc2c`

Results on the exact product SHA:

- `npm audit --omit=dev`: **0 vulnerabilities** (0 critical / high / moderate / low).
- Full development dependency graph: 2 advisories only:
  - `undici`: high advisory range `<7.29.0`, transitive development dependency, fix available.
  - `esbuild`: low advisory range `>=0.27.3 <0.28.1`, transitive development dependency, fix available.
- Neither advisory is present in the production/runtime dependency audit.

Classification: `DEV_TOOLING_ADVISORY / NO_RUNTIME_PRODUCT_BLOCKER`.
No speculative dependency upgrade was introduced at this gate.

## 3. Saudi regulatory re-check

### SDAIA / Personal Data Protection

Official references reviewed:
- Saudi Data & AI Authority / National Data Governance Platform — Personal Data Protection regulations and services.
- Personal-data breach notification service: qualifying incidents are reported within 72 hours from awareness under the stated implementing-regulation condition.

Classification:
- Personal-data controller obligations, registrations, data-subject handling and qualifying breach notification are organization/customer obligations according to actual processing roles.
- ORCA product obligations remain bounded technical controls: authorization, isolation, auditability, credential protection, and ability to distinguish incidents.
- No contradictory product architecture finding identified.

### National Cybersecurity Authority (NCA)

Official references reviewed:
- `ضوابط الأمن السيبراني لجهات القطاع الخاص من غير ذوات البنى التحتية الحساسة`, issued 2025-12-28.
- NCA cloud cybersecurity controls/guidance, including provider/subscriber perspectives.

Classification:
- The 2025 private-sector controls establish minimum cybersecurity expectations for non-CNI private entities and include governance, cybersecurity strengthening, and third-party cybersecurity.
- Exact organizational applicability/attestation belongs to the deploying/customer/vendor entity as applicable; it does not create a new ORCA workflow step.
- Existing ORCA security/tenant/audit/fail-closed gates remain the technical evidence base.
- No product blocker identified at this gate.

### Communications, Space & Technology Commission (CST)

Official references reviewed:
- Cloud Computing Services Regulations, decision 506/1445.
- Cloud Computing Registration service.

Classification:
- CST registration obligations attach to actually providing regulated cloud-computing services under the applicable service model.
- ORCA supports customer-hosted or vendor-managed deployment under contract; hosting choice alone is not reclassified here as a public SaaS/cloud-provider business.
- If the final commercial deployment makes the vendor a regulated cloud provider, the registration/compliance question must be resolved for that deployment before offering that service.
- `DEPLOYMENT_CONFIGURATION / COMMERCIAL_COMPLIANCE`, not a current product-code defect.

### Real Estate General Authority (REGA)

Official references reviewed:
- Real Estate Brokerage Law and its active Executive Regulations.
- FAL real-estate brokerage/licensing service.
- Current marketing/real-estate advertising regulation.

Classification:
- Brokerage, property services, advertising and electronic real-estate platform activities are licensed/regulatory activities of the real-estate operator/licensee.
- ORCA's locked role remains internal operational software for an existing real-estate company; the software vendor is not represented as broker, advertiser, property manager, or license holder.
- Customer license/advertisement authorization must govern regulated actions.
- No public marketplace/platform scope was introduced.

### Ejar

Official references reviewed:
- Ejar residential/commercial contract registration and documentation services and current user manuals (updated 2026-07-02).
- Electronic documentation is completed through the Ejar network and becomes registered after required party approvals; broker eligibility/credentials are external authority facts.

Classification:
- An internal ORCA contract is not represented as Ejar-registered merely because it exists internally.
- Ejar's returned/documented state remains external authority.
- Customer/broker credentials are customer configuration.
- ORCA Ejar execution path was already verified fail-closed and connection-credential based during STEP 9.

### ZATCA

Official references reviewed:
- Current 2026 Phase 2 e-invoicing integration workshops/guidance.
- ZATCA solution-provider directory current as of 2026-07-29.

Classification:
- Phase 2 integration continues according to ZATCA taxpayer waves and technical requirements.
- Customer/taxpayer applicability and onboarding credentials are customer-specific.
- ORCA must retain supported safe integration and external-authority semantics; missing customer credentials are not a product defect.
- No provider activation was performed.

### Ministry of Commerce

Official references reviewed:
- E-Commerce System portal and current consumer-legislation index.

Classification:
- ORCA is locked as a dedicated B2B software product sold under a separate agreement, not a public subscription storefront.
- SaaS public registration/subscription billing/e-commerce runtime entrypoints remain intentionally disabled.
- Commercial contracting/consumer applicability must be assessed against the actual sale channel and counterparty; no automatic runtime scope expansion is authorized.

### Saudi Authority for Intellectual Property (SAIP)

Official references reviewed:
- Registration of computer software/applications copyright works.

Classification:
- Software/application works can be registered through SAIP; registration is an IP administration action, not a product runtime requirement.
- ORCA software/source/IP remains provider-owned by default subject to the commercial contract; customer data/content remains customer-owned under the locked model.

### Bureau of Experts / Copyright Law

Official reference reviewed:
- Saudi Copyright Law, active; includes computer software as protected works and requires written definition for transferred rights.

Classification:
- Commercial contract must define any license/use/transfer rights.
- No product-code change required.

## 4. Gate decision

FINAL AUTHORITATIVE REFERENCE = `work/orca-unified-reference-20260813@769b0a3de7ff09e00e2baf3c438886a6b616ab1d`

- REQUIRED OUTPUT = COMPLETE
- UNKNOWN = 0
- SCOPE EXPANSION = 0
- UNAUTHORIZED CHANGES = 0
- RUNTIME DEPENDENCY VULNERABILITIES = 0
- REGULATORY PRODUCT BLOCKERS = 0
- CLIENT / DEPLOYMENT CONFIGURATION ITEMS = retained as responsibility-boundary items, not defects
- MIGRATION = 0
- BACKFILL = 0
- PROVIDER ACTIVATION = 0
- PRODUCTION ACTION = 0

STEP 12 = CLOSED
NEXT AUTHORIZED STEP = 13 — FREEZE_ARCHIVE_OLD_BRANCHES
