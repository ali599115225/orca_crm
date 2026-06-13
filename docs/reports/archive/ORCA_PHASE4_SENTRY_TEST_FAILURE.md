# PHASE 4.2B — SENTRY TEST ENDPOINT FAILURE REPORT
> **Date:** 2026-06-10
> **Issue:** `/api/debug/sentry-test` returns 404 in production
> **Result:** **FAIL** — 2 root causes found. Both fixed. Needs redeploy.

---

## ROOT CAUSE 1 — FILE NOT IN GIT (CAUSES 404)

### Evidence

```bash
git status --short app/api/debug/
# ?? app/api/debug/    ← UNTRACKED
```

The file `app/api/debug/sentry-test/route.ts` was created but **never committed to git**. Vercel deploys from the git repository. Files that aren't in git don't get deployed.

### File Details

| Item | Value |
|------|-------|
| File path | `app\api\debug\sentry-test\route.ts` |
| Exists on disk? | ✅ Yes (1195 bytes) |
| Exists in git? | ❌ No — was `??` (untracked) |
| Commit hash | **NONE** — never committed |
| Deployed to Vercel? | ❌ No — not in repository |

### Fix

```bash
git add app/api/debug/sentry-test/route.ts
# Status: A  app/api/debug/sentry-test/route.ts  ← Staged for commit
```

---

## ROOT CAUSE 2 — ERROR WAS CAUGHT (SENTRY WOULDN'T CAPTURE)

### Before (broken):
```typescript
// app/api/debug/sentry-test/route.ts:26-31
try {
  throw new Error("ORCA_SENTRY_TEST_" + Date.now());
} catch (err) {
  // Caught the error → Sentry never sees it
  return NextResponse.json({...}, { status: 200 });
}
```

**Problem:** Sentry only captures UNHANDLED errors by default. This code catches the error and returns 200, so Sentry sees nothing. The endpoint would return 200 with JSON, not 500 with an error.

### After (fixed):
```typescript
// app/api/debug/sentry-test/route.ts:11
throw new Error("ORCA_SENTRY_TEST_" + Date.now() + "_DSN=" + (dsnSet ? "SET" : "NOT_SET") + "_" + dsnPreview);
```

**Now:** Unhandled error propagates → Next.js catches it → returns 500 → Sentry SDK captures it → Sentry dashboard shows event.

---

## ROOT CAUSE 3 — ADDITIONAL UNTRACKED SENTRY FILES

These files are also critical for Sentry but are untracked:

| File | Git Status | Impact |
|------|-----------|--------|
| `instrumentation-client.ts` | `??` (untracked) | Browser-side Sentry may not init in all pages |
| `proxy.ts` | `M` (modified, unstaged) | Rate limiting + middleware conflict fix |

---

## REQUIRED ACTIONS

### Step 1: Commit all new/modified files
```bash
git add app/api/debug/sentry-test/route.ts
git add instrumentation-client.ts
git add proxy.ts
git commit -m "fix: Sentry deployment — debug endpoint, client instrumentation, middleware fix"
```

### Step 2: Push to main
```bash
git push origin main
```

### Step 3: Redeploy on Vercel
Vercel auto-deploys on push to main.

### Step 4: Verify deployment
Wait for Vercel build to complete. Check Vercel dashboard for successful deployment.

### Step 5: Test the endpoint
```bash
curl -i https://orca.az-ez.pro/api/debug/sentry-test
```

Expected response:
```
HTTP/1.1 500 Internal Server Error
{"error":"ORCA_SENTRY_TEST_<timestamp>_DSN=<SET/NOT_SET>_<preview>"}
```

### Step 6: Verify Sentry received the event

Open Sentry dashboard → Issues:
- Search: `ORCA_SENTRY_TEST`
- Should show 1+ events with the error message
- If DSN is SET: error includes `DSN=SET`
- If DSN is NOT_SET: error includes `DSN=NOT_SET` → DSN not configured in Vercel

---

## VERIFICATION TABLE

| # | Check | Before | After | Evidence |
|---|-------|--------|-------|----------|
| 1 | File in git? | ❌ Untracked | ✅ Staged (`A`) | `git status --short app/api/debug/` |
| 2 | Commit hash | ❌ NONE | — Needs commit | — |
| 3 | Error propagated? | ❌ Caught (try/catch) | ✅ Unhandled throw | `route.ts:11` |
| 4 | Returns 500? | ❌ 200 with JSON | ✅ Unhandled → 500 | Next.js default error handling |
| 5 | Sentry captures? | ❌ No error propagated | ✅ Unhandled error | @sentry/nextjs auto-capture |
| 6 | Production URL | ❌ 404 | — Correct: `/api/debug/sentry-test` | `app/api/debug/sentry-test/route.ts` |

---

## FINAL RESULT

```
╔══════════════════════════════════════════════╗
║   SENTRY TEST ENDPOINT: FAIL (before fix)     ║
║                                                ║
║   Root Cause 1: File not in git → 404          ║
║   Root Cause 2: Error caught → no Sentry event ║
║                                                ║
║   Both fixed. File staged for commit.          ║
║   Error now unhandled throw.                   ║
║                                                ║
║   BLOCKED BY: Git push + Vercel deploy         ║
║   (requires write access to remote repo)       ║
╚══════════════════════════════════════════════╝
```

### Current State

| File | Path | Status |
|------|------|--------|
| Debug endpoint | `app/api/debug/sentry-test/route.ts` | ✅ Fixed, staged |
| Client instrumentation | `instrumentation-client.ts` | ✅ Created, untracked |
| Proxy (rate limit) | `proxy.ts` | ✅ Modified, unstaged |
| Middleware (conflict) | `middleware.ts` | ✅ Deleted, staged |
