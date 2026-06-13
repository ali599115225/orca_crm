# WhatsApp CRM Integration — Sprint Report

**Project**: ORCA CRM  
**Sprint**: WhatsApp Cloud API v3 Integration  
**Date**: 2026-06-11  
**Status**: COMPLETE  

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Cloud API                        │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │  Meta Cloud API   │  │  Green API (Fallback)           │  │
│  │  v25.0            │  │  Instance 7107636615            │  │
│  └────────┬─────────┘  └──────────────┬──────────────────┘  │
└───────────┼──────────────────────────┼──────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────────────────────────────────────────────┐
│  Webhook Handler (app/api/whatsapp/webhook/route.ts)          │
│  - Token-based auth (WHATSAPP_WEBHOOK_SECRET)                 │
│  - Meta hub.verify_token + Green API token validation         │
│  - Inbound message routing → handleMetaInbound / handleGreen  │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  Saher Agent (app/actions/saherAgent.ts)                      │
│  - Gemini 2.0 Flash AI lead qualification                     │
│  - Round-Robin agent assignment                               │
│  - Lead creation + telemetry logging                          │
│  - DLQ / Replay Engine for failed messages                    │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  Database (Prisma + PostgreSQL)                               │
│  - whatsapp_contacts: conversation tracking                   │
│  - whatsapp_messages: full message history                    │
│  - whatsapp_attachments: media files                          │
│  - leads: linked via WhatsAppContact.leadId                   │
│  - audit_logs: all security events recorded                   │
└───────────────────────────────────────────────────────────────┘
```

### Flow Summary
1. Inbound WhatsApp messages arrive via Meta Cloud API webhook or Green API
2. Webhook validates token, routes to appropriate handler
3. Messages stored in `whatsapp_messages` + `whatsapp_contacts`
4. Saher AI agent (Gemini) analyzes message, qualifies lead, auto-assigns to sales agent
5. Outbound messages sent via Meta Cloud API (with Green API fallback)
6. All write operations logged to `audit_logs`
7. Dashboard displays WhatsApp stats via `getWhatsAppDashboardStats()`

---

## 2. Database Changes

### New Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `whatsapp_contacts` | Track conversations per phone number | id, tenant_id, phone, name, lead_id, provider, last_message_at |
| `whatsapp_messages` | Full message history | id, tenant_id, phone, direction, message_text, meta_message_id, raw_payload, status |
| `whatsapp_attachments` | Media/files from WhatsApp | id, message_id, type, url, mime_type |

### New Fields on Existing Tables
| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `tenants` | `whatsapp_connected` | Boolean | Toggle WhatsApp integration per tenant |
| `whatsapp_contacts` | `lead_id` | UUID → leads | Link WhatsApp contact to CRM lead |

### New Relations
- `WhatsAppContact.leadId` → `Lead.id` (optional, SetNull on delete)
- `WhatsAppContact.tenantId` → `Tenant.id` (Cascade delete)
- `WhatsAppMessage.tenantId` → `Tenant.id` (Cascade delete)
- `WhatsAppAttachment.messageId` → `WhatsAppMessage.id` (Cascade delete)

### Unique Constraints
- `whatsapp_contacts`: (tenant_id, phone) — one contact per tenant per phone
- `whatsapp_messages`: indexed on (tenant_id, phone, created_at) and (meta_message_id)

---

## 3. All API Routes

### Webhook Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/whatsapp/webhook` | Hub verify token / Green token | Meta + Green API verification |
| POST | `/api/whatsapp/webhook` | Signature / Bearer / Query token | Inbound message reception from both providers |
| GET | `/api/whatsapp/meta` | hub.verify_token | Meta webhook verification (standalone) |
| POST | `/api/whatsapp/meta` | Signature / Query token | Meta inbound messages (standalone) |

### API Routes (v1)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/v1/whatsapp/send` | `authenticateRequest()` (session) | Send outbound WhatsApp message |
| GET | `/api/v1/whatsapp/threads` | `authenticateRequest()` (session) | List conversation threads |

### Direct Endpoint

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/whatsapp/send` | `authenticateRequest()` (session) | Send outbound message (inline) |

---

## 4. All Server Actions

### Core WhatsApp Actions (`app/actions/whatsapp.ts`)
| Action | Description |
|--------|-------------|
| `toggleWhatsAppConnectionAction(connected)` | Enable/disable WhatsApp per tenant |
| `getCloudAPIStatusAction()` | Check Meta Cloud API connection health |
| `getWhatsAppChatsAction()` | List conversations + messages (with lead linkage) |
| `sendWhatsAppMessageAction(chatId, text)` | Send outbound message via Meta Cloud API |
| `deleteWhatsAppConversationAction(contactId)` | Delete conversation + messages (tenant-scoped) |

### WhatsApp CRM Actions (`app/actions/whatsapp-crm.ts`)
| Action | Description | Phase |
|--------|-------------|-------|
| `createWhatsAppTaskAction(formData)` | Create task from WhatsApp conversation | F |
| `getWhatsAppDashboardStats()` | Dashboard WhatsApp metrics | J |
| `logWhatsAppActivity(tenantId, leadId, ...)` | Log message as LeadActivity in CRM timeline | C |
| `classifyWhatsAppLead(leadId, messageText)` | AI keyword-based hot/warm/cold classification | E |

### Saher AI Agent Actions (`app/actions/saherAgent.ts`)
| Action | Description |
|--------|-------------|
| `processSaherWhatsAppLeadAction(message)` | Main pipeline: qualify → create lead → assign agent |
| `runSaherTelemetryScanAction()` | System health check |
| `runSaherReplayCycleAction()` | Replay failed messages from DLQ |
| `getSaherDLQStatusAction()` | DLQ status dashboard |

---

## 5. AI Integration Points

| Integration | Model/Engine | Location | Phase |
|-------------|-------------|----------|-------|
| Lead Qualification | Gemini 2.0 Flash | `saherAgent.ts:104` | B |
| Round-Robin Assignment | Custom SQL algorithm | `saherAgent.ts:33` | B |
| Keyword Classification | Rule-based (hot/warm/cold) | `whatsapp-crm.ts:131` | E |
| Auto-reply Generation | Gemini via Saher system prompt | `saherAgent.ts:260` | B |
| Replay/Recovery Engine | DLQ with retry logic | `saherAgent.ts:467` | B |

---

## 6. Dashboard Integration

WhatsApp statistics are now displayed on the main dashboard (`/operations/dashboard`):

- **WhatsApp Conversations Card**: Total active conversations via `whatsapp_contacts` count
- **New WhatsApp Leads Card**: Leads created from WhatsApp source in last 7 days
- **Unread Messages Card** (conditional): Inbound messages with `read_at = null`, only shown when > 0

Data fetched via `getWhatsAppDashboardStats()` server action, executed in parallel with other dashboard queries.

---

## 7. Phase Completion Matrix

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| A | Prisma schema + DB models | PASS | `whatsapp_contacts`, `whatsapp_messages`, `whatsapp_attachments` tables created |
| B | Saher AI agent qualification | PASS | Gemini 2.0 Flash lead analysis + round-robin assignment + DLQ |
| C | CRM timeline integration | PASS | `logWhatsAppActivity()` logs messages as LeadActivity |
| D | WhatsAppView UI component | PASS | Chat list, message view, send, delete conversation |
| E | AI lead classification | PASS | Keyword-based hot/warm/cold via `classifyWhatsAppLead()` |
| **F** | **Task automation** | **PASS** | "Create Task" button in WhatsAppView → creates task linked to lead |
| G | WhatsAppView page | PASS | Server-rendered page at `/operations/whatsapp` |
| H | Cloud API connection toggle | PASS | `toggleWhatsAppConnectionAction()` + UI toggle |
| I | Cloud API status display | PASS | Connection health card in WhatsAppView |
| **J** | **Dashboard integration** | **PASS** | 3 WhatsApp stat cards on main dashboard |
| **K** | **Security hardening** | **PASS** | Auth on all endpoints, audit logs, tenant scoping |
| L | Webhook processing | PASS | Dual Meta + Green API inbound message handling |

### Phase F Details
- Added `createWhatsAppTaskAction` in `app/actions/whatsapp-crm.ts`
- Button ("+") on each conversation in WhatsAppView opens a task creation modal
- Form fields: task title (text input) + task type (select: Call, Visit, Follow-up, Send Offer)
- Task due date: 1 hour from creation; priority auto-mapped from type
- Auto-links task to lead via `WhatsAppContact.leadId` → `Lead.assignedTo`
- Success toast on completion

### Phase J Details
- Added `getWhatsAppDashboardStats()` server action returning `conversationsCount`, `newLeadsCount`, `unreadMessagesCount`
- Added 3 `SmartCard` components to `DashboardView.tsx` in the KPI grid
- Dashboard page fetches stats in parallel via `Promise.all()`
- Unread card conditionally renders only when `unreadMessagesCount > 0`

### Phase K Details
- **Webhook auth**: `app/api/whatsapp/webhook/route.ts` validates against `WHATSAPP_WEBHOOK_SECRET` via signature/bearer/query token
- **Meta webhook auth**: `app/api/whatsapp/meta/route.ts` POST now validates signature/query token against `WHATSAPP_WEBHOOK_SECRET`
- **Send endpoint auth**: `app/api/whatsapp/send/route.ts` now uses `authenticateRequest()` (was unauthenticated)
- **V1 endpoints**: Already authenticated via `authenticateRequest()`
- **Delete scoping**: `deleteWhatsAppConversationAction` checks `tenantId` in where clause for both find and delete
- **Audit logs added**:
  - `WHATSAPP_MESSAGE_SENT` — on outbound message send
  - `WHATSAPP_CONVERSATION_DELETED` — on conversation delete
  - `WHATSAPP_LEAD_CREATED` — on Saher lead creation from WhatsApp
  - All other write ops auto-audited via Prisma `$extends` middleware

---

## 8. Remaining Technical Debt

| Item | Severity | Description |
|------|----------|-------------|
| WhatsAppContact/Message not in Prisma isolation list | Medium | Models accessed via `(prisma as any)` — should be added to `modelsWithTenantId` in `lib/prisma.ts` for automatic tenant scoping |
| Read receipts not implemented | Low | `whatsapp_messages.read_at` field exists but never populated on read |
| Webhook replay on failure | Low | DLQ stores failed messages but replay must be triggered manually via `runSaherReplayCycleAction()` |
| No rate limiting on webhook | Medium | Webhook endpoint has no rate limiting — vulnerable to DoS |
| Hardcoded sales phone number | Low | `createTaskAction` in `tasks.ts` uses hardcoded `+966505123456` for notifications |
| No WhatsApp template management UI | Low | Templates referenced in code but no UI to manage them |
| Green API credentials as fallback only | Low | Green API used as fallback; primary path is Meta Cloud API |

---

## 9. Final Decision

**RECOMMENDATION: APPROVE for production deployment.**

The WhatsApp CRM integration is functionally complete across all 12 phases. The core pipeline — webhook reception → AI qualification → lead creation → agent assignment → reply — is operational. The dashboard, task automation, and security hardening phases are complete.

**Pre-deployment checklist**:
- [ ] Add `WhatsAppContact` and `WhatsAppMessage` to `modelsWithTenantId` in `lib/prisma.ts`
- [ ] Set `WHATSAPP_WEBHOOK_SECRET` in Vercel environment variables
- [ ] Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in Vercel
- [ ] Set `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` for Saher AI
- [ ] Configure Meta webhook callback URL to `https://<domain>/api/whatsapp/webhook`
- [ ] Verify webhook verification succeeds (GET with hub.mode=subscribe)
- [ ] Run database migration for WhatsApp tables if not already applied
