// scripts/production-verify.mjs
// Full Production Verification - tests all 10 critical flows with session cookie auth

const BASE = process.env.BASE_URL || "http://localhost:3458";
const JWT_SECRET = "6ba5289724f54ce28e10ab06cb42d472bfa63d847505932638590f5401e6916bf45ff53d8695301e51367cfe84d2ec9486e23e190f28d76b6b9a373ed060ba88";

import { SignJWT } from "jose";

let PASS = 0, FAIL = 0, TOTAL = 0;
const results = [];
const errors = [];

async function test(label, fn) {
  TOTAL++;
  const start = Date.now();
  try {
    const data = await fn();
    const ms = Date.now() - start;
    PASS++;
    const msg = `  ✅ ${label} (${ms}ms)`;
    console.log(msg);
    results.push({ label, status: "PASS", time: ms });
    return data;
  } catch (e) {
    FAIL++;
    const msg = `  ❌ ${label}: ${e.message}`;
    console.log(msg);
    results.push({ label, status: "FAIL", error: e.message });
    errors.push({ label, error: e.message });
    return null;
  }
}

async function createSessionCookie(userId = "demo-user-id", tenantId = "demo-tenant-id") {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const session = {
    userId,
    tenantId,
    tenantSubdomain: "demo",
    role: "ADMIN",
    name: "Admin Demo",
    email: "admin@demo.orca-crm.com",
  };
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
  return `session_token=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

async function main() {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ORCA CRM - Production Verification`);
  console.log(`  Target: ${BASE}`);
  console.log(`═══════════════════════════════════════════\n`);

  const cookie = await createSessionCookie();
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const authHeaders = { ...headers, Authorization: `Bearer ${await cookie.split("=")[1].split(";")[0]}` };

  // ─── 1. Health Check (no auth) ─────────────────────────────────────────
  await test("1. Health Check", async () => {
    const res = await fetch(`${BASE}/api/v1/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== "online") throw new Error(`Status is ${data.status}`);
    if (!data.checks?.database?.status === "connected") throw new Error("DB not connected");
    return data;
  });

  // ─── 2. Login (no auth) ────────────────────────────────────────────────
  await test("2. Login (API)", async () => {
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@demo.orca-crm.com", password: "Demo@2026" }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.token) throw new Error("No token returned");
    return data;
  });

  // ─── 3. Create Lead ────────────────────────────────────────────────────
  await test("3. Create Lead", async () => {
    const res = await fetch(`${BASE}/api/v1/leads`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Pilot Verification Lead",
        phone: "+966500000099",
        email: "verify@test.com",
        source: "WEBSITE",
        notes: "Created by production verification script",
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    const data = JSON.parse(text);
    if (!data.id && !data.lead?.id && !data.data?.id) throw new Error("No lead id in response");
    return data;
  });

  // ─── 4. Fetch Properties (Contacts) ────────────────────────────────────
  await test("4. Fetch Properties", async () => {
    const res = await fetch(`${BASE}/api/v1/contacts?type=properties`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 5. Dashboard Metrics ──────────────────────────────────────────────
  await test("5. Dashboard Metrics", async () => {
    const res = await fetch(`${BASE}/api/v1/dashboard/metrics`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 6. WhatsApp Threads ───────────────────────────────────────────────
  await test("6. WhatsApp Threads", async () => {
    const res = await fetch(`${BASE}/api/v1/whatsapp/threads`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 7. Fetch Tasks ────────────────────────────────────────────────────
  await test("7. Fetch Tasks", async () => {
    const res = await fetch(`${BASE}/api/v1/tasks`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 8. Fetch Tours ────────────────────────────────────────────────────
  await test("8. Fetch Tours", async () => {
    const res = await fetch(`${BASE}/api/v1/tours`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 9. Fetch Offers ───────────────────────────────────────────────────
  await test("9. Fetch Offers", async () => {
    const res = await fetch(`${BASE}/api/v1/offers`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── 10. AI Agents ────────────────────────────────────────────────────
  await test("10. AI Agents", async () => {
    const res = await fetch(`${BASE}/api/v1/agents`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
    return JSON.parse(text);
  });

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  RESULTS: ${PASS}/${TOTAL} PASS, ${FAIL} FAIL`);
  console.log(`═══════════════════════════════════════════\n`);

  if (errors.length > 0) {
    console.log("❌ FAILURES:");
    errors.forEach(e => console.log(`  - ${e.label}: ${e.error}`));
  }

  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
