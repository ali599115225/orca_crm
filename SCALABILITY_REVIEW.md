# Phase 5: Scalability Architecture Review

**Date:** 2026-06-09
**Reviewer:** Architecture Gate
**Scope:** Caching, DB connections, background jobs, rate limiting, CDN, serverless readiness, N+1 patterns, pagination, file uploads, bundle size, real-time infrastructure
**Score:** **4.5/10**

---

## SC-01: Database Connection Pool Capped at 1 [CRITICAL]

**File:** `lib/prisma.ts:18`
**Severity:** Critical
**Status:** Not addressed

`pg.Pool` is created with `max: 1`, limiting the entire application to a single database connection at a time. Though the Neon pooled connection string (`*-pooler*.neon.tech`) provides infrastructure-level pooling, the application-side pool of 1 connection creates a bottleneck. With multiple serverless functions executing concurrently, they will queue up waiting for the single connection.

**Recommendation:** Increase `max` to `10-20` connections. Consider switching from `@prisma/adapter-pg` to `@prisma/adapter-neon` (already installed but unused in `package.json:15`) for better serverless connection handling.

---

## SC-02: No Distributed Cache Layer [CRITICAL]

**Files:** `lib/tenant.ts:4,7` — React `cache()` only; `lib/saher/replayEngine.ts:8-9` — in-memory DLQ with comment to "swap to Redis/Upstash later"
**Severity:** Critical
**Status:** Not addressed

There is no Redis, Upstash, Memcached, or any distributed caching system. The only caching mechanisms are:
- React `cache()` — per-request, in-memory, not shared across instances
- HTTP `Cache-Control` headers on QR code responses (route.ts:41,48)
- `revalidatePath` from `next/cache` for ISR

Every API request hits the database directly. As tenant count grows, database load will increase linearly with no cache absorption.

**Recommendation:** Deploy an Upstash Redis instance. Cache tenant metadata, frequently-accessed lookup data, and session tokens. Replace the in-memory DLQ in `replayEngine.ts` with a Redis-backed queue.

---

## SC-03: N+1 Query Pattern in ZATCA Cron [CRITICAL]

**File:** `app/api/cron/zatca/route.ts:62-141`
**Severity:** Critical
**Status:** Not addressed

The ZATCA cron job processes queue items one-by-one in a `for` loop, making sequential `prisma.zatcaQueue.update()`, `prisma.zatcaDevice.findFirst()`, and `prisma.$transaction()` calls per item. No batching, concurrency, or chunking. At 100+ tenants with multiple pending items, this will exceed Vercel's 60-second cron timeout.

**Recommendation:** Batch database operations using `updateMany()`, process items in parallel with `Promise.all()` (with concurrency limiting), and add a processing deadline to gracefully timeout.

---

## SC-04: No Pagination Parameters on Any API Route [HIGH]

**Files:** `app/api/v1/leads/route.ts:22`, `app/api/v1/contacts/route.ts:16`, `app/api/v1/opportunities/route.ts:16`, `app/api/v1/offers/route.ts:16`, `app/api/v1/tasks/route.ts:28`, `app/api/properties/route.ts:92`, `app/api/projects/route.ts:56`, and 9 more
**Severity:** High
**Status:** Not addressed

All 16+ list endpoints use hardcoded `take` values (mostly 100). None accept `skip`, `cursor`, or `page` query parameters. A pagination helper exists at `lib/pagination.ts` but is not consistently used. As data grows, these endpoints will either time out or return incomplete results.

**Recommendation:** Implement cursor-based pagination on all list endpoints. Use the existing `lib/pagination.ts` helper consistently. Default to `take: 50` with configurable limits via query parameters.

---

## SC-05: In-Memory Rate Limiting Not Suitable for Serverless [HIGH]

**File:** `lib/rate-limit.ts:51-60`
**Severity:** High
**Status:** Not addressed

The rate limiter has two modes: DB-backed (uses Prisma `RateLimitEntry` table) and in-memory (uses `Map<string, { count, resetAt }>`). Most call sites default to in-memory mode which resets per serverless function instance. This means rate limits are effectively non-functional across multiple concurrent instances.

**Recommendation:** Use DB-backed mode (already implemented at lines 19-48) for all rate-limited endpoints. The in-memory fallback should only be used as a last resort when the DB is unavailable. Alternatively, use Upstash Ratelimit (if Upstash Redis is deployed per SC-02).

---

## SC-06: Local Filesystem for File Uploads [HIGH]

**Files:** `app/actions/documents.ts:96-108`, `app/api/v1/documents/route.ts:40-50`
**Severity:** High
**Status:** Not addressed

Files are saved to `SCRATCH_DIR/uploads/` on the local filesystem. On Vercel's serverless platform, the local filesystem is ephemeral — uploads will be lost on redeployment. There is no streaming, chunking, or progress tracking for large uploads.

**Recommendation:** Integrate an object storage service (AWS S3, Cloudflare R2, or UploadThing). Store only the object key/URL in the database.

---

## SC-07: No Background Job Queue System [HIGH]

**Files:** `package.json` — no Bull/BullMQ/Agenda; `app/api/cron/zatca/route.ts`, `app/api/cron/billing/route.ts`
**Severity:** High
**Status:** Not addressed

All background processing relies on Vercel Cron jobs with a 60-second timeout. The ZATCA queue uses the database as its queue store (`zatcaQueue` table). The in-memory DLQ in `replayEngine.ts` is lost on server restart. No dedicated job queue system exists.

**Recommendation:** Deploy an Inngest, Trigger.dev, or BullMQ + Redis setup for background job processing. This would handle the ZATCA queue, billing, sentinel monitoring, and AI task processing with proper retries, concurrency, and observability.

---

## SC-08: No CDN Configuration [MEDIUM]

**File:** `next.config.mjs:1-44`
**Severity:** Medium
**Status:** Not addressed

No CDN, image optimization loader, or `next/image` configuration exists. Static assets are served from the origin server. Images are rendered as CSS `backgroundImage` URLs without optimization (`ToursView.tsx:736`).

**Recommendation:** Configure Next.js `next.config.mjs` with a remote image pattern. Enable the built-in image optimization. Consider Cloudflare or Vercel's Edge CDN for static asset delivery.

---

## SC-09: No Bundle Analysis or Code Splitting [MEDIUM]

**File:** `next.config.mjs:1-44`, `package.json:20`
**Severity:** Medium
**Status:** Not addressed

No `@next/bundle-analyzer` configured. Dependencies like `gsap` (~150KB+) and `@google/generative-ai` contribute to bundle size. No explicit code-splitting or dynamic imports for large components.

**Recommendation:** Add `@next/bundle-analyzer` to the build pipeline. Implement dynamic imports for heavy components (GSAP animations, AI chat interfaces, complex data tables).

---

## SC-10: No Real-Time / WebSocket Infrastructure [MEDIUM]

**Files:** `package.json`, all route files
**Severity:** Medium
**Status:** Not addressed

No WebSocket, Socket.io, Pusher, Server-Sent Events, or any real-time communication infrastructure exists. "Real-time" features like dashboard updates, telemetry, and AI analysis rely on standard REST polling via `revalidatePath` and client-side refetching.

**Recommendation:** If real-time features are required for the Product Expansion phase, evaluate Pusher (easiest serverless integration) or Supabase Realtime (if already using Supabase). For now, document the polling approach as intentional with acceptable latency.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SC-01 | DB pool `max: 1` bottleneck | Critical | Not addressed |
| SC-02 | No distributed cache | Critical | Not addressed |
| SC-03 | N+1 in ZATCA cron | Critical | Not addressed |
| SC-04 | No pagination parameters | High | Not addressed |
| SC-05 | In-memory rate limiting | High | Not addressed |
| SC-06 | Local filesystem uploads | High | Not addressed |
| SC-07 | No background job queue | High | Not addressed |
| SC-08 | No CDN configuration | Medium | Not addressed |
| SC-09 | No bundle analysis | Medium | Not addressed |
| SC-10 | No real-time infrastructure | Medium | Not addressed |

**Blocking findings:** 3 Critical, 4 High
**Gate verdict:** **BLOCKED** — The application cannot scale beyond a handful of tenants without addressing the critical connection pooling, caching, and N+1 issues.
