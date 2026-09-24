# 🔬 ORCA AI Validation — Static Code-Path Analysis
## Agent 4: AI Validation Report | Generated: 2026-06-10

---

## 1. SAHER (ساهر) — Lead Qualification Agent

| # | Metric | File:Line | Result | Status |
|---|--------|-----------|--------|--------|
| 1 | Gemini API call | `saherAgent.ts:99-101` | Model: `gemini-2.0-flash-001`, called at L120 | ✅ |
| 2 | System prompt | `systemPrompt.ts:19` | `SAHER_SYSTEM_PROMPT` (~207 lines), built via `buildSaherSystemPrompt()` L212 | ✅ |
| 3 | WhatsApp message intake | `saherAgent.ts:20-26` | `WhatsAppIncomingMessage` interface: senderPhone, senderName, messageText, timestamp, chatId. Webhook feeds `processSaherWhatsAppLeadAction()` | ✅ |
| 4 | Lead creation | `saherAgent.ts:303-316` | `prisma.lead.create()` with firstName, phone, city, source, status, leadScore, assignedTo | ✅ |
| 5 | Lead scoring (BANT) | `systemPrompt.ts:66-73` | BANT criteria: Budget, Authority, Need, Timeline. Scoring algorithm L96-103. Auto-calibration L176-191 | ✅ |
| 6 | Agent telemetry | `saherAgent.ts:75-95` | `logTelemetryEvent()` → `prisma.agentTelemetryLog.create()` | ✅ |
| 7 | Error handling / retry | `saherAgent.ts:153-159` | Max 3 retries (`GEMINI_MAX_RETRIES=3` at L101). Retries on 5xx/429 (L153) and AbortError (L196) | ✅ |
| 8 | Timeout | `saherAgent.ts:118` | `AbortController` at 30,000ms (30s) | ✅ |
| 9 | Fallback if Gemini fails | `saherAgent.ts:265-279` | Returns `MORE_INFO_NEEDED` with default Arabic response. On exception (L347-376): pushes to DLQ | ✅ |
| 10 | Dead Letter Queue (DLQ) | `replayEngine.ts:26-101` | `InMemoryDLQ` class — FIFO queue, MAX_SIZE=500, MAX_RETRIES=3. Status: PENDING/PROCESSING/FAILED/RESOLVED | ✅ |
| 11 | Round-robin assignment | `saherAgent.ts:33-71` | SQL query: agent with fewest leads in 7 days, active + SALES_EMPLOYEE/SALES_MANAGER role | ✅ |
| 12 | Response to WhatsApp | `saherAgent.ts:277-279` | `responseToClient` field from `saherOutput.response_to_client_ar` | ✅ |
| 13 | Token usage tracking | — | No token counting logic anywhere in Saher pipeline | ❌ |
| 14 | Cost/usage tracking | — | No cost measurement or usage tracking per call | ❌ |
| 15 | Rate limiting on Gemini | — | No throttling/rate limiting. Relies only on Gemini's own 429 responses | ❌ |
| 16 | Input validation | `saherAgent.ts:211-213` | Accepts raw `WhatsAppIncomingMessage` — no empty-check, format validation, phone validation | ❌ |
| 17 | Language enforcement | `systemPrompt.ts:154` | "اللغة العربية أولاً" — enforced via system prompt, responses in Arabic | ✅ |
| 18 | Response format (JSON schema) | `systemPrompt.ts:163-176` | Standard JSON response format. `responseMimeType: "application/json"` at L140 | ✅ |
| 19 | Confidence scoring | `saherAgent.ts:176-191` | Score calibration (0–100 clamp), auto-correction for REJECTED+high-score, QUALIFIED+low-score | ✅ |
| 20 | Edge cases (empty, non-Arabic, long) | — | No handling for empty messages, non-Arabic detection, or message truncation for long input | ❌ |

**SAHER Score: 15/20 = 75%**

---

## 2. MANSOUR (منصور) — Sales Chat Agent

| # | Metric | File:Line | Result | Status |
|---|--------|-----------|--------|--------|
| 1 | System prompt | `mansour.ts:5-136` | `MANSOUR_SYSTEM_PROMPT` (~132 lines). Built via `buildMansourSystemPrompt()` L157 | ✅ |
| 2 | API call | `growth.ts:425-451` | Fetch to `gemini-2.0-flash-001:generateContent`. Temperature=0.4, maxOutputTokens=2048 | ✅ |
| 3 | Fallback | `growth.ts:476-489` | 5 keyword-based fallback responses (brochure/details, price/installments, demo, zatca, default) | ✅ |
| 4 | Encryption | `growth.ts:514` / `crypto.ts:17-23` | AES-256-CBC via `encryptText()`. Key derived from ENCRYPTION_KEY env, IV_LENGTH=16 | ✅ |
| 5 | Chat history | `growth.ts:396-411` | Decrypts `messagesJson`, slices last 10 messages. Built into system prompt at `mansour.ts:163-168` | ✅ |
| 6 | BANT qualification | `mansour.ts:57-61` | Budget, Authority, Need, Timeline criteria. Output schema: `lead_qualification` with score | ✅ |
| 7 | Token usage tracking | — | No token counting | ❌ |
| 8 | Cost/usage tracking | — | No cost measurement | ❌ |
| 9 | Rate limiting | — | No rate limiting on Gemini calls | ❌ |
| 10 | Timeout | `growth.ts:450` | `AbortSignal.timeout(25_000)` — 25 seconds | ✅ |

**MANSOUR Score: 7/10 = 70%**

---

## 3. BASEER (بصير) — Strategy Reports Agent

| # | Metric | File:Line | Result | Status |
|---|--------|-----------|--------|--------|
| 1 | DB queries | `baseer.ts:153-162` | `prisma.contract.findMany()` with installments, unit, project includes | ✅ |
| 2 | Cashflow projections | `baseer.ts:198-225` | 30/60/90 day projections via installment dueDate aggregation | ✅ |
| 3 | What-If scenarios | `baseer.ts:227-264` | 3 scenarios: optimistic (100%), conservative (75%), pessimistic (45%) | ✅ |
| 4 | AI interpretation | `baseer.ts:280-301` | Gemini API call for financial report interpretation. Telemetry logged | ✅ |
| 5 | Telemetry | `baseer.ts:270-278` | `prisma.agentTelemetryLog.create()` with agentId="Baseer" | ✅ |
| 6 | Token usage tracking | — | No token counting | ❌ |
| 7 | Cost/usage tracking | — | No cost measurement | ❌ |
| 8 | Rate limiting | — | No rate limiting | ❌ |
| 9 | Timeout | `baseer.ts:53` | `AbortController` at 30,000ms (30s). Retry delay: 800ms, max 2 retries (L33-34) | ✅ |
| 10 | Error handling / fallback | `baseer.ts:299-301` | AI interpretation failure → returns report without AI field (null). Non-blocking | ✅ |

**BASEER Score: 7/10 = 70%**

---

## 4. KHABEER (خبير) — Legal/Compliance Agent

| # | Metric | File:Line | Result | Status |
|---|--------|-----------|--------|--------|
| 1 | API call | `khabeer.ts:16-101` | Fetch to `gemini-2.0-flash-001:generateContent`. Temperature=0.3, maxOutputTokens=2048 | ✅ |
| 2 | Fallback | `khabeer.ts:103-134` | 4 keyword-based fallback responses: zatca, ejar, contract, default. Returns `isAI: false` | ✅ |
| 3 | Legal disclaimer injection | `khabeer.ts:83-88` | If `disclaimer_included === false`, auto-prepends Arabic legal disclaimer, sets flag to true | ✅ |
| 4 | Topic classification | `khabeerPrompt.ts:69` | 7 topics: REAL_ESTATE_REGULATION, ZATCA_COMPLIANCE, CONTRACT_TERMS, LEASE_AGREEMENT, CMA_COMPLIANCE, GENERAL_LEGAL, OUT_OF_SCOPE | ✅ |
| 5 | Retry logic | `khabeer.ts:64-68` | Max 2 retries (L13) for 5xx/429. Also retries AbortError (L92-96) | ✅ |
| 6 | Token usage tracking | — | No token counting | ❌ |
| 7 | Cost/usage tracking | — | No cost measurement | ❌ |
| 8 | Rate limiting | — | No rate limiting | ❌ |
| 9 | Timeout | `khabeer.ts:30` | `AbortController` at 30,000ms (30s). Retry delay: 1s (L14) | ✅ |
| 10 | Confidence scoring | `khabeer.ts:132` | `confidence: 0.5` in fallback; AI returns confidence field (L73 in prompt schema) | ✅ |

**KHABEER Score: 7/10 = 70%**

---

## 5. SENTINEL (سنينل) — System Monitoring Agent

| # | Metric | File:Line | Result | Status |
|---|--------|-----------|--------|--------|
| 1 | Vercel CLI | `sentinel.ts:79` | `npx vercel ls` via `execPromise()`. Parses deployment URL, status, build time | ✅ |
| 2 | DB health check | `sentinel.ts:118-138` | `SELECT 1` latency check, counts: tenants, users, leads, projects | ✅ |
| 3 | DNS resolution | `sentinel.ts:162-165` | `dns.resolve()` for domain `orca-crm-one.vercel.app` | ✅ |
| 4 | HTTP check | `sentinel.ts:168-169` | HEAD request to `https://{domain}` with 5s timeout | ✅ |
| 5 | Gemini analysis | `sentinel.ts:268-350` | AI analysis of system report via `gemini-2.0-flash-001`. `responseMimeType: "application/json"` | ✅ |
| 6 | Email alert | `sentinel.ts:266` | `sendAdminEmailAlert()` with HTML email. Subject prefixed with 🚨 for critical / 🔍 for routine | ✅ |
| 7 | Self-healing | `route.ts:59-99` | Disconnect/reconnect + `SELECT 1` retry. Max 3 healing attempts. Failover webhook on exhaustion | ✅ |
| 8 | Token usage tracking | — | No token counting | ❌ |
| 9 | Cost/usage tracking | — | No cost measurement | ❌ |
| 10 | SSL mode check | `sentinel.ts:141-150` | Extracts `sslmode=` from DATABASE_URL. Warns if not `verify-full` | ✅ |

**SENTINEL Score: 8/10 = 80%**

---

## 📊 Aggregate Metrics

### Success Rate

| Agent | Passed | Total | Rate |
|-------|--------|-------|------|
| Saher | 15 | 20 | 75% |
| Mansour | 7 | 10 | 70% |
| Baseer | 7 | 10 | 70% |
| Khabeer | 7 | 10 | 70% |
| Sentinel | 8 | 10 | 80% |
| **Total** | **44** | **60** | **73.3%** |

### Fallback Rate (uses fallback vs AI)

| Agent | Has Fallback? | Type | Non-AI Rate |
|-------|---------------|------|-------------|
| Saher | ✅ | DLQ replay + default MORE_INFO_NEEDED response | Only on Gemini failure/null |
| Mansour | ✅ | 5 keyword-based Arabic responses | Only on Gemini failure |
| Baseer | ⚠️ Partial | Returns report without `aiInterpretation` field | AI failure is non-blocking |
| Khabeer | ✅ | 4 keyword-based fallbacks + `isAI: false` flag | Only on Gemini failure |
| Sentinel | ⚠️ Partial | Email alert succeeds regardless; no AI fallback text | AI failure is non-blocking |
| **Overall** | **3/5 robust** | | Baseer & Sentinel: AI optional |

### Error Rate (Error Handling Gaps)

| Gap Category | Saher | Mansour | Baseer | Khabeer | Sentinel | Total |
|---|---|---|---|---|---|---|
| No token counting | ❌ | ❌ | ❌ | ❌ | ❌ | 5 |
| No cost/usage tracking | ❌ | ❌ | ❌ | ❌ | ❌ | 5 |
| No rate limiting | ❌ | ❌ | ❌ | ❌ | ❌ | 5 |
| No input validation | ❌ | — | — | — | — | 1 |
| No edge case handling | ❌ | — | — | — | — | 1 |
| **Total Gaps** | | | | | | **17** |

### Latency (Timeout Patterns)

| Agent | Timeout | Retry Count | Retry Delay | Total Max Wait |
|-------|---------|-------------|-------------|----------------|
| Saher | 30,000ms | 3 | 1s × (retry+1) | ~30s × 4 = 120s |
| Mansour | 25,000ms | 0 | — | 25s |
| Baseer | 30,000ms | 2 | 800ms × (retry+1) | ~30s × 3 = 90s |
| Khabeer | 30,000ms | 2 | 1s × (retry+1) | ~30s × 3 = 90s |
| Sentinel (Gemini) | 25,000ms | 0 | — | 25s |
| Sentinel (HTTP) | 5,000ms | 0 | — | 5s |

---

## 🔍 Key Findings

### Critical Gaps (All 5 Agents)
1. **No token usage counting** — Unable to track Gemini API consumption or budget alerts
2. **No cost tracking** — No per-call or aggregate cost monitoring
3. **No client-side rate limiting** — All agents rely solely on Gemini's own 429 response; risk of billing spikes

### Agent-Specific Findings
4. **Saher**: No input validation on WhatsApp messages (empty, non-Arabic, malformed). DLQ is in-memory only — lost on server restart.
5. **Mansour**: No retry logic on Gemini failure — single attempt with 25s timeout. Chat encryption uses `ENCRYPTION_KEY` env var; falls back to `JWT_SECRET`/`NEXTAUTH_SECRET` which is weak.
6. **Baseer**: Scenarios are hard-coded multipliers (1.0, 0.75, 0.45) — not AI-driven. No marketing ROI analysis despite being in system prompt.
7. **Khabeer**: `needs_human_lawyer` flag always `true` in fallback — conservative but may deter valid AI responses. Built-in knowledge base is static text, not RAG.
8. **Sentinel**: `npx vercel ls` requires Vercel CLI installed locally — will fail in production serverless. Failover mechanism uses in-memory `healingAttempts` counter (resets on server restart).

### Strengths
- All agents use consistent `gemini-2.0-flash-001` model
- Consistent JSON response format (`responseMimeType: "application/json"`)
- All agents log to `AgentTelemetryLog` for audit trail
- Arabic-first design with Saudi market context throughout
- Saher DLQ + Replay Engine provides resilience for WhatsApp message loss

---

## 📋 Recommendations

| Priority | Action | Affected Agent |
|----------|--------|----------------|
| HIGH | Add token counting per Gemini call | All |
| HIGH | Implement client-side rate limiter (token bucket) | All |
| HIGH | Add `process.env.SAHER_DLQ_PERSIST=true` to persist DLQ to DB | Saher |
| MEDIUM | Validate WhatsApp message: empty check, phone format, language detection | Saher |
| MEDIUM | Add retry logic to Mansour Gemini call | Mansour |
| MEDIUM | Replace `npx vercel ls` with Vercel REST API for serverless compatibility | Sentinel |
| MEDIUM | Use dedicated `ENCRYPTION_KEY` only — remove fallback to JWT_SECRET | Mansour, Crypto |
| LOW | Replace hard-coded scenario multipliers with AI-driven dynamic scenarios | Baseer |
| LOW | Add RAG (Retrieval-Augmented Generation) for Khabeer legal knowledge base | Khabeer |
