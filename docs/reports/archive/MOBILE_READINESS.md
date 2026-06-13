# Phase 8: Mobile Readiness Review

**Date:** 2026-06-09
**Reviewer:** Architecture Gate
**Scope:** Mobile framework, PWA support, responsive design, API performance for mobile, offline support, push notifications, touch interactions, mobile navigation, image optimization, app store deployment
**Score:** **1.8/10**

---

## MB-01: No Mobile Application Framework [CRITICAL]

**File:** `package.json`
**Severity:** Critical
**Status:** Not addressed

No React Native, Expo, Flutter, Capacitor, or Cordova dependencies. The application is a pure server-rendered and client-side React web app with no native mobile wrapper. There is no path to iOS/App Store or Android/Google Play distribution.

**Recommendation:** For a web-first strategy, this is acceptable if PWA capabilities are added (see MB-02). For native app store distribution, a framework migration would be required.

---

## MB-02: No PWA Support — No manifest.json or Service Worker [CRITICAL]

**Files:** `public/` (no manifest.json); `app/layout.tsx:10-13` (no manifest in metadata); `next.config.mjs` (no PWA plugin); Lighthouse PWA score: 0.42/1.0
**Severity:** Critical
**Status:** Not addressed

The application cannot be installed on a mobile home screen. There is no service worker for offline caching, background sync, or push notifications. Lighthouse audit confirms: no service worker, no installable manifest, no theme-color meta tag, no apple-touch-icon.

**Recommendation:** Add `next-pwa` or `@serwist/next` plugin to `next.config.mjs`. Create `public/manifest.json` with app name, icons, theme color, and display mode. Register a service worker with offline fallback page.

---

## MB-03: No Offline Support [CRITICAL]

**Files:** All client code
**Severity:** Critical
**Status:** Not addressed

Zero offline functionality. No service worker caching, no IndexedDB usage, no Cache API usage. If the network is unavailable, the application simply fails. `localStorage` is used only for theme, language, and auth token persistence.

**Recommendation:** Implement a service worker with cache-first strategy for static assets and network-first for API data. Add an offline indicator component. Consider IndexedDB for critical data caching.

---

## MB-04: No Push Notifications [HIGH]

**Files:** `lib/notifications.ts` (SMS/WhatsApp only — server-side outbound)
**Severity:** High
**Status:** Not addressed

No web push notification support. No `Notification.permission` API usage, no Firebase Cloud Messaging, no service worker push event handlers. SMS and WhatsApp notifications exist but are server-side outbound only and cannot target the app itself.

**Recommendation:** Implement web push notifications using the VAPID protocol and service worker. Request notification permission on login. Use a service like OneSignal or Firebase Cloud Messaging for cross-platform push.

---

## MB-05: No Next/Image Usage — Unoptimized Images [HIGH]

**Files:** `ToursView.tsx:736` (CSS `backgroundImage: url(${p.media[0]})`), all components — zero imports of `next/image`
**Severity:** High
**Status:** Not addressed

No images are optimized for mobile data. No lazy loading, no responsive image sizes, no WebP/AVIF format support. User-uploaded property photos are served as raw CSS `backgroundImage` URLs without optimization.

**Recommendation:** Replace all `<img>` tags and CSS background images with `next/image` component. Configure remote image patterns in `next.config.mjs`. Enable lazy loading by default.

---

## MB-06: No Field Selection or Sparse Fieldsets for Mobile API [MEDIUM]

**Files:** All `app/api/v1/` routes
**Severity:** Medium
**Status:** Not addressed

API responses always return full entity objects. No GraphQL-style field selection, no sparse fieldsets, no `?fields=` query parameter support. Only one instance of Prisma `select` exists (`app/api/v1/tasks/route.ts:24-26`). Mobile users download full payloads on potentially slow connections.

**Recommendation:** Implement `?fields=` query parameter support on all list endpoints. Use Prisma `select` to return only requested fields. Default to minimal payloads for mobile clients.

---

## MB-07: No Touch-Specific Gesture Handling [MEDIUM]

**Files:** No `onTouchStart/Move/End` handlers; no swipe gesture libraries
**Severity:** Medium
**Status:** Not addressed

The only touch interaction is the Kanban board drag-and-drop via `@hello-pangea/dnd` (which has built-in touch support). There are no swipe gestures for navigation, pull-to-refresh, pinch-to-zoom, or other touch-optimized interactions.

**Recommendation:** Implement pull-to-refresh on data list pages using `touch` events. Consider adding swipe gestures for navigation between related views (e.g., lease detail → payment history).

---

## MB-08: No Bottom Navigation or Tab Bar for Mobile [MEDIUM]

**Files:** `components/layout/DashboardLayout.tsx`, `app/components/SovereignSidebar.tsx`
**Severity:** Medium
**Status:** Not addressed

Mobile navigation uses a hamburger menu with slide-in sidebar. While functional, this is not ideal for frequent navigation. No bottom navigation bar or tab bar exists for quick access between major sections.

**Recommendation:** Add a bottom navigation bar on mobile with 4-5 primary destinations (Dashboard, Properties, Rentals, More). Keep the sidebar for secondary navigation.

---

## MB-09: No App Store or Google Play Configuration [MEDIUM]

**Files:** No `ios/`, `android/`, `app.json`, `fastlane`, or mobile config files
**Severity:** Medium
**Status:** Not addressed

The application is web-only on Vercel. No App Store Connect, Google Play Console, or mobile distribution setup exists. If native distribution is required, this is a significant blocker.

**Recommendation:** If mobile app store presence is needed for Product Expansion, evaluate wrapping the PWA with a WebView wrapper (Capacitor or PWA Builder) for app store submission.

---

## MB-10: No Viewport Meta Tag Explicitly Set [LOW]

**File:** `app/layout.tsx`
**Severity:** Low
**Status:** Not addressed

No `<meta name="viewport">` tag or `viewport` export is explicitly set in the root layout. While Next.js may set this automatically, it should be explicit for mobile optimization.

**Recommendation:** Add `viewport` metadata export to `app/layout.tsx` with `width=device-width, initial-scale=1`.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| MB-01 | No mobile app framework | Critical | Not addressed |
| MB-02 | No PWA support | Critical | Not addressed |
| MB-03 | No offline support | Critical | Not addressed |
| MB-04 | No push notifications | High | Not addressed |
| MB-05 | Unoptimized images | High | Not addressed |
| MB-06 | No mobile API field selection | Medium | Not addressed |
| MB-07 | No touch gesture support | Medium | Not addressed |
| MB-08 | No bottom navigation | Medium | Not addressed |
| MB-09 | No app store config | Medium | Not addressed |
| MB-10 | Missing viewport meta tag | Low | Not addressed |

**Blocking findings:** 3 Critical, 2 High
**Gate verdict:** **BLOCKED** — The application has no mobile strategy. No PWA, no native app, no offline support, no push notifications. The responsive web experience is the only mobile capability and it scores poorly.
