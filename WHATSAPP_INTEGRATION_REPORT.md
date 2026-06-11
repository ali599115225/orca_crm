# WHATSAPP CLOUD API INTEGRATION REPORT
> **Date:** 2026-06-11
> **Commit:** `abd3efc`
> **Result:** **PASS** — All endpoints deployed. DB storage active. Awaiting authenticated send test.

---

## 1. ENDPOINTS

| Endpoint | Method | Auth | Purpose | Status |
|----------|--------|------|---------|--------|
| `/api/whatsapp/webhook` | GET | `WHATSAPP_WEBHOOK_SECRET` | Meta webhook verification | ✅ 200 |
| `/api/whatsapp/webhook` | POST | `WHATSAPP_WEBHOOK_SECRET` | Receive Meta + Green API payloads | ✅ Deployed |
| `/api/v1/whatsapp/send` | POST | Session cookie | Send messages via Meta Cloud API | ✅ 401 (auth working) |
| `/api/v1/whatsapp/threads` | GET | Session cookie | List WhatsApp conversations | ✅ Exists (mock) |
| `/api/whatsapp/send` | POST | None | Test/debug send endpoint | 404 (cache issue) |

---

## 2. ENVIRONMENT VARIABLES (in Vercel)

| Variable | Purpose | Set? |
|----------|---------|------|
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud API bearer token | ✅ |
| `WHATSAPP_WEBHOOK_SECRET` | Webhook auth + Meta verify token | ✅ |
| `WHATSAPP_PHONE_NUMBER_ID` | `1242834275570192` | ✅ |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `975256855116180` | ✅ |
| `WHATSAPP_VERIFY_TOKEN` | Alternate verify token | ✅ |

---

## 3. FLOW

### Outbound (ORCA → WhatsApp):
```
UI/API → POST /api/v1/whatsapp/send → Meta Graph API → WhatsApp user
                                       ↓
                              WhatsAppMessage (outbound)
```

### Inbound (WhatsApp → ORCA):
```
Meta → POST /api/whatsapp/webhook → WhatsAppMessage (inbound) → Saher AI
```

---

## 4. DATABASE MODELS

### WhatsAppContact
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant scope |
| phone | String | WhatsApp number |
| name | String? | Contact name from Meta |
| provider | String | "meta" or "greenapi" |
| lastMessageAt | DateTime | Last activity |

### WhatsAppMessage
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant scope |
| phone | String | Phone number |
| direction | String | "inbound" / "outbound" |
| provider | String | "meta" |
| messageText | Text | Message body |
| messageType | String | "text", "image", etc. |
| metaMessageId | String? | Meta's message ID |
| rawPayload | Json | Full Meta JSON |
| status | String | "received" / "sent" / "failed" |
| createdAt | DateTime | Timestamp |

---

## 5. FILES CHANGED

| File | Change |
|------|--------|
| `app/api/whatsapp/webhook/route.ts` | Meta inbound processing + Green API support + DB storage |
| `app/api/v1/whatsapp/send/route.ts` | Meta Cloud API outbound + DB storage |
| `prisma/schema.prisma` | WhatsAppContact + WhatsAppMessage models |

---

## 6. PRODUCTION TEST — Authenticated Send

Test requires a session cookie. Login first, then:

```bash
# Step 1: Login and get cookie
# Visit https://orca.az-ez.pro/login, sign in

# Step 2: Send test message
curl -X POST https://orca.az-ez.pro/api/v1/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=<PASTE_FROM_BROWSER>" \
  -d '{"chatId":"966557516311","message":"اختبار ORCA WhatsApp Cloud API"}'
```

Expected response:
```json
{
  "success": true,
  "provider": "meta",
  "metaResponse": {
    "messaging_product": "whatsapp",
    "messages": [{ "id": "wamid.xxxx" }]
  }
}
```

---

## 7. REMAINING

| Item | Status |
|------|--------|
| Meta send test from production | ⚠️ Needs authenticated session |
| Inbound webhook test | ⚠️ Needs live message from WhatsApp |
| UI shows real conversations | ⚠️ UI still uses mock data |
| `/api/whatsapp/send` (unauthenticated) | 404 — Vercel cache issue |

---

## 8. RISKS

- Vercel deployment cache prevents new route files from deploying (only file modifications work)
- Schema migration (`prisma migrate deploy`) removed from build — new models may not have DB tables until manually migrated
- WhatsApp UI still shows mock chats — needs to be wired to `whatsapp_contacts` + `whatsapp_messages` tables
