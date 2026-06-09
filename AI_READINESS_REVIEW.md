# Phase 9: AI Readiness Review

**Date:** 2026-06-09
**Reviewer:** Architecture Gate
**Scope:** AI dependencies, agent architecture, implemented features, data pipeline (RAG/embeddings), model configuration, usage monitoring, error handling, safety/guarding, cost controls, scalability
**Score:** **4.6/10**

---

## AI-01: No Vector Store or RAG Pipeline [CRITICAL]

**Files:** All AI files — no vector database (Pinecone/Chroma/pgvector), no embeddings library, no RAG framework
**Severity:** Critical
**Status:** Not addressed

The AI system makes direct API calls to Gemini with structured prompts. There is no retrieval-augmented generation (RAG), no vector embeddings, no knowledge base. The Saher prompt (`lib/saher/systemPrompt.ts`) relies entirely on the LLM's pre-trained knowledge plus injected tenant context (name, plan, subdomain). No external documents, regulations, or historical data can be retrieved dynamically.

**Recommendation:** Implement pgvector in Neon (already PostgreSQL-based). Build an embeddings pipeline for: ZATCA regulations, Ejar compliance rules, company documents, and historical lead/contract data. Add a RAG step before Gemini calls to inject relevant context.

---

## AI-02: AI API Cost/Tokens Not Tracked [HIGH]

**Files:** `app/actions/saherAgent.ts` — no token tracking; no cost monitoring
**Severity:** High
**Status:** Not addressed

The application has no visibility into AI operational costs. Gemini API token usage, per-request costs, and aggregate spending are not tracked. The telemetry system (`AgentTelemetryLog`) tracks agent actions but not API consumption.

**Recommendation:** Log token usage from Gemini API responses (Gemini returns `usageMetadata` with `promptTokenCount` and `candidatesTokenCount`). Store per-request token usage in a new `AiUsageLog` table. Add cost calculation (Gemini 2.0 Flash pricing) and weekly/monthly budget alerts.

---

## AI-03: No Rate Limiting on AI Endpoints [HIGH]

**Files:** `app/api/whatsapp/webhook/route.ts` — no rate limit; `app/api/v1/agents/[id]/run/route.ts` — no rate limit; `app/api/v1/ai/lead-score/route.ts` — no rate limit
**Severity:** High
**Status:** Not addressed

While rate limiting exists for auth and general API routes (`lib/rate-limit.ts`), none of the AI-specific endpoints have rate limits configured. The WhatsApp webhook could be flooded with messages, each triggering a Gemini API call.

**Recommendation:** Add DB-backed rate limiting to: WhatsApp webhook (per sender IP), AI agent execution endpoints (per tenant), and AI scoring endpoints. Configure per-tenant daily AI call quotas.

---

## AI-04: Mock/Rule-Based AI Features Not Production-Grade [HIGH]

**Files:** `app/api/v1/ai/lead-score/route.ts:16-30` (keyword matching); `app/api/v1/ai/summarize-conversation/route.ts:19-21` (hardcoded mock); `app/actions/aiActions.ts` (rule-based); `lib/followupEngine.ts` (mock)
**Severity:** High
**Status:** Not addressed

Several AI-labeled features are actually rule-based or return hardcoded responses. Key examples:
- Lead scoring: simple keyword matching ("جاهز", "السعر", "اشتري" → positive; "غالي", "مافيه فلوس" → negative)
- Conversation summarization: returns static Arabic text
- Followup automation: mock implementation

**Recommendation:** Replace mock AI with real Gemini calls using well-structured prompts. The existing API routes already exist — swap the logic from rule-based to LLM-based with proper fallback.

---

## AI-05: In-Memory DLQ Not Production-Scalable [HIGH]

**File:** `lib/saher/replayEngine.ts:8-9` — comment: "نحاكي هنا سلوك Redis FIFO Queue بدون الحاجة لـ Redis"
**Severity:** High
**Status:** Not addressed

The Dead Letter Queue is an in-memory FIFO `Map` limited to 500 entries. It is lost on server restart or scale-out. Code explicitly acknowledges this is a simulation that should be replaced with Redis/Upstash.

**Recommendation:** Replace the in-memory DLQ with a Redis-backed queue or a PostgreSQL-based persistent queue. At minimum, persist pending DLQ items to the database so they survive restarts.

---

## AI-06: No Prompt Injection Protection [MEDIUM]

**Files:** `app/actions/saherAgent.ts:99-158` — WhatsApp messages sent directly to Gemini in structured prompt
**Severity:** Medium
**Status:** Not addressed

WhatsApp messages from unknown senders are injected directly into the Gemini system prompt without sanitization or injection testing. A malicious user could potentially inject instructions that override agent behavior.

**Recommendation:** Add input sanitization for WhatsApp messages. Strip or escape special characters. Implement a prompt injection classifier before sending to Gemini. Add user message delimiters in the prompt template.

---

## AI-07: API Key Exposed in .env File [MEDIUM]

**File:** `.env` — contains `GEMINI_API_KEY=REDACTED` (real key, not placeholder)
**Severity:** Medium
**Status:** Not addressed

The `.env` file contains a seemingly valid Gemini API key. If committed to version control, this is a security exposure. The key is also used as a fallback in `process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY`.

**Recommendation:** Verify the key is not committed. Use Vercel Environment Variables for production secrets. Rotate the current key. Never include real secrets in `.env` files that could be committed.

---

## AI-08: No AI Output Content Filtering [MEDIUM]

**Files:** `app/actions/saherAgent.ts` — no output validation
**Severity:** Medium
**Status:** Not addressed

AI-generated responses (lead assessments, compliance checks, telemetry reports) are accepted from Gemini and used directly without validation or content filtering. There is no mechanism to detect hallucinations, harmful content, or structured output validation.

**Recommendation:** Add JSON schema validation for structured Gemini responses. Implement confidence thresholds (reject responses below a confidence score). Add content safety checks for harmful or inappropriate content.

---

## AI-09: No Concurrency Control for AI API Calls [MEDIUM]

**Files:** `app/actions/saherAgent.ts` — synchronous Gemini calls within request lifecycle
**Severity:** Medium
**Status:** Not addressed

AI API calls are made synchronously within the request lifecycle. There is no queue, no concurrency limiter, no rate limiter for the Gemini API. If 100 WhatsApp messages arrive simultaneously, the system will make 100 concurrent Gemini API calls, potentially hitting rate limits or causing database connection pool exhaustion.

**Recommendation:** Implement a queue for AI task processing. Use the existing ZATCA queue pattern as a model — store AI tasks in a database table, process them via a cron job with concurrency limiting, and use the DLQ for failures.

---

## AI-10: Dependency on Single AI Provider [LOW]

**File:** `app/actions/saherAgent.ts:103` — `process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY`
**Severity:** Low
**Status:** Not addressed

The AI system depends entirely on Google Gemini. There is no fallback provider, no model abstraction layer, and no multi-provider strategy.

**Recommendation:** Abstract AI calls behind a provider-agnostic interface. Add support for OpenAI or Anthropic as fallback. Implement automatic failover if Gemini returns errors.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| AI-01 | No vector store or RAG pipeline | Critical | Not addressed |
| AI-02 | AI API costs not tracked | High | Not addressed |
| AI-03 | No rate limiting on AI endpoints | High | Not addressed |
| AI-04 | Mock AI features not production-grade | High | Not addressed |
| AI-05 | In-memory DLQ not scalable | High | Not addressed |
| AI-06 | No prompt injection protection | Medium | Not addressed |
| AI-07 | API key exposure risk | Medium | Not addressed |
| AI-08 | No output content filtering | Medium | Not addressed |
| AI-09 | No AI concurrency control | Medium | Not addressed |
| AI-10 | Single AI provider dependency | Low | Not addressed |

**Blocking findings:** 1 Critical, 4 High
**Gate verdict:** **BLOCKED** — While the AI agent architecture is well-designed (Saher, Sanad, Baseer, Mansour), the lack of a vector store for RAG and production gaps in the mock AI features make the system unsuitable for production AI workloads. The in-memory DLQ and missing cost tracking add operational risk.
