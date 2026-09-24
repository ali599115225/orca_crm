# ORCA CRM — Non-Visual Knowledge Extraction

SOURCE:
docs/ORCA_CRM_التقنيات_المستخدمة.docx

SOURCE_DATE:
2026-06-01

SOURCE_GIT_BLOB:
41450529708a404a221acb95bf6253d8e60f1240

SOURCE_SHA256:
3ce893275a8bd6d801120d862da389e941d550403256880503500d2f0852712e

CLASSIFICATION:
MIXED — NON-VISUAL EXTRACTION ONLY

AUTHORITY:
Historical technical/functional reference only.
This extraction is not current visual authority and does not override newer TARGET runtime or architecture.

## Preserved non-visual knowledge

### Application architecture

Historical source describes ORCA as a Full-Stack web application based on:

- Next.js App Router
- React
- TypeScript
- Server Components / Client Components
- Server Actions
- REST API routes
- Node.js runtime
- request/proxy middleware boundaries

These are historical technical facts and must be reconciled with the current TARGET before being treated as current version truth.

### Data and persistence

Historical source records:

- PostgreSQL as the primary relational database
- Prisma ORM
- PostgreSQL adapters / connection mechanisms
- migration and seed tooling
- tenant-scoped data concepts
- audit logging concepts

Historical references to multi-tenant SaaS behavior do not become current TARGET authority automatically.

### Authentication and security

Preserve these capability concepts:

- authenticated user sessions
- JWT/token signing
- password hashing
- encryption of sensitive provider/API data
- tenant/company request scoping
- RBAC roles and permission boundaries
- HTTPS / encrypted transport expectations

Specific historical algorithms, role names or implementations remain historical evidence unless independently proven current.

### Deployment and operations

Preserve:

- Vercel hosting/deployment context
- scheduled cron/job capability
- Git/GitHub source-control workflow
- environment-variable configuration
- Node/TypeScript operational scripts

Historical cron times, environment names or deployment implementation details are not automatically current authority.

### External integrations

Historical source identifies integration capabilities involving:

- payment provider
- email delivery
- WhatsApp webhook
- lead ingestion webhook
- ZATCA
- Ejar
- advertising-platform providers

Provider presence in historical documentation does not prove current Production configuration or activation.

### AI / agent capabilities

Historical source records agent-oriented capabilities including:

- compliance checking
- billing/subscription automation
- marketing/ROI analysis
- WhatsApp/follow-up automation
- legal/support automation
- agent licensing/slots
- telemetry/logging
- NLP / lead scoring

Names and historical agent packaging remain reference evidence, not automatic current-runtime proof.

### Business capability inventory

Preserve the existence/intended responsibility of these functional areas:

- Dashboard / analytics
- Leads
- Projects and Units
- Rental and accounting
- financing calculator
- sales performance and commissions
- marketing/growth
- AI/agents
- tasks/reminders
- Helpdesk
- WhatsApp
- system logs
- organization/user settings
- electronic reservation/contracts
- property management
- owner management
- tenant management
- occupancy tracking
- maintenance center
- listings center
- tours/site visits
- document vault
- campaign manager
- landing-page publishing
- AI property matching
- compliance center
- optional marketplace capability

Feature presence in this historical document must not be treated as proof that the same TARGET runtime/page currently exists.

### Property management

Preserve functional concepts:

- properties, lands, units and compounds
- owners and tenants
- property metadata and documents
- occupancy/vacancy/maintenance state
- occupancy tracking
- revenue/occupancy/performance reporting

### Maintenance

Preserve:

- maintenance requests
- category/type
- technician/contractor assignment
- lifecycle state
- before/after evidence
- maintenance invoices
- SLA concepts
- maintenance reporting

### Listings

Preserve:

- property/unit/project listing
- media attachment
- price/area/specification metadata
- publication
- optional external publication
- active/expired/hidden lifecycle
- public listing surface

### Tours

Preserve:

- visit scheduling
- calendar
- reminders
- visit results
- customer feedback
- Lead relationship
- visit reporting

### Document Vault

Preserve:

- document upload
- PDF/image/contract/deed document types
- OCR capability concept
- classification
- access control
- entity linking
- change history
- document search

OCR presence in the historical document is not proof of current TARGET implementation.

### Campaign management

Preserve:

- campaign creation
- provider/channel selection
- A/B testing
- budget tracking
- CPC / CPM / CTR
- CAC
- audience segmentation
- Lead attribution
- performance reporting

### Landing-page capability

Preserve only functional behavior:

- block-based page construction
- Hero / Gallery / Features / Form / Map block concepts
- Lead form
- template saving
- publishing to a dedicated URL
- visit tracking
- conversion tracking

Do not preserve historical color, font, styling, layout or visual-authority rules.

### AI property matching

Preserve:

- customer requirement analysis
- inventory analysis
- scoring/matching
- ranked recommendations
- WhatsApp recommendation delivery
- result history
- learning/improvement concept

No model/provider quality or Production readiness is implied.

### Compliance

Preserve:

- contract checks
- customer-data checks
- license checks
- deed/document checking
- OCR/rule-based validation concept
- compliance alerts
- compliance audit log
- risk reporting

### Optional marketplace

Historical source records an optional marketplace concept with:

- projects
- lands
- units
- offers
- accept/reject flow
- matching engine
- public project page
- commissions
- developer/owner evaluation

This is historical product knowledge only and does not authorize implementation.

### API capability inventory

Historical source records API intent around:

- authentication
- health
- dashboard metrics
- unit inventory
- telemetry
- external lead ingestion
- WhatsApp webhook
- projects
- leads
- tasks
- payment callback
- billing/sentinel/installment cron jobs

Exact route existence and semantics must be verified against current TARGET before use as current contract authority.

### Development tooling

Historical source records:

- Prisma migration tooling
- Prisma seed
- tsx
- dotenv
- TypeScript type definitions
- lint/build workflow

## Visual knowledge explicitly excluded

The following information from the source document is NOT transferred as TARGET authority:

- Cairo font
- Inter font
- Google Fonts selection
- historical font choices
- historical color choices
- color customization rules
- font customization rules
- Dark Mode appearance
- visual styling details
- CSS utility mappings
- Tailwind visual conventions
- layout/composition authority
- page visual design
- historical UI appearance

RTL/LTR is retained only as a functional localization/direction capability, not as a visual-layout authority.

## Preservation rule

This extraction preserves technical, architectural, operational and functional knowledge only.

It MUST NOT:

- reactivate historical SaaS assumptions
- reactivate legacy multi-tenant product authority
- overwrite current TARGET runtime
- overwrite current TARGET RBAC/domain authorities
- authorize provider activation
- authorize migration
- authorize Production changes
- recreate historical UI
- import visual contracts
- import styling or design-system authority

END OF EXTRACTION