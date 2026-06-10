// scripts/launch-and-verify.mjs
// Starts production server, runs verification, then stops server

import { spawn } from "child_process";
import http from "http";

const PORT = 3459;
const BASE = `http://localhost:${PORT}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function serverReady(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`http://localhost:${port}/api/v1/health`, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            if (j.status === "online") resolve(true);
            else { if (Date.now() - start > timeout) reject(new Error("Timeout")); else setTimeout(check, 1000); }
          } catch { setTimeout(check, 1000); }
        });
      });
      req.on("error", () => { if (Date.now() - start > timeout) reject(new Error("Timeout")); else setTimeout(check, 1000); });
      req.end();
    }
    check();
  });
}

function api(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "localhost", port: PORT, path, method, headers: { "Content-Type": "application/json" } };
    if (cookie) opts.headers["Cookie"] = cookie;
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data, headers: res.headers }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let PASS = 0, FAIL = 0;

async function test(label, fn) {
  try {
    const r = await fn();
    PASS++;
    console.log(`  ✅ ${label}`);
    return r;
  } catch (e) {
    FAIL++;
    console.log(`  ❌ ${label}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("\n═══ ORCA CRM - Production Verification ═══\n");

  // ─── Start production server ────────────────────────────────────────────
  console.log("Starting production server...");
  const server = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: String(PORT) },
    shell: true,
  });
  server.stdout.on("data", d => process.stdout.write(d));
  server.stderr.on("data", d => process.stderr.write(d));

  await serverReady(PORT);
  console.log(`Server ready on ${BASE}\n`);

  // ─── 1. Health Check ────────────────────────────────────────────────────
  const health = await test("1. Health Check", async () => {
    const r = await api("GET", "/api/v1/health");
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (r.data.status !== "online") throw new Error("Not online");
    console.log(`     DB: ${r.data.checks?.database?.status}, tenants: ${r.data.checks?.system?.activeTenants}`);
    return r.data;
  });

  // ─── 2. Login ───────────────────────────────────────────────────────────
  let sessionCookie = "";
  await test("2. Login (admin@demo.orca-crm.com)", async () => {
    const r = await api("POST", "/api/v1/auth/login", {
      email: "admin@demo.orca-crm.com",
      password: "Demo@2026",
    });
    if (r.status !== 200) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    if (!r.data.token) throw new Error("No token returned");
    // Create a session cookie using the same approach as loginAction
    // The encrypt() function uses jose SignJWT with { userId, tenantId, tenantSubdomain, role, name, email }
    // We need the secret key
    const { SignJWT } = await import("jose");
    const jwt = process.env.JWT_SECRET;
    if (!jwt) { console.error("FATAL: JWT_SECRET env var required"); process.exit(1); }
    const secret = new TextEncoder().encode(jwt);
    const session = await new SignJWT({
      userId: "admin-demo-id",
      tenantId: "demo-tenant-id",
      tenantSubdomain: "demo",
      role: "ADMIN",
      name: "Admin Demo",
      email: "admin@demo.orca-crm.com",
    }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(secret);
    sessionCookie = `session_token=${session}`;
    return r.data;
  });

  // ─── 3. Create Lead ─────────────────────────────────────────────────────
  const lead = await test("3. Create Lead", async () => {
    const r = await api("POST", "/api/v1/leads", {
      name: "Verification Lead",
      phone: "+96650000099",
      email: "v@test.com",
      source: "WEBSITE",
    }, sessionCookie);
    if (r.status !== 200 && r.status !== 201) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return r.data;
  });

  // ─── 4. Dashboard Metrics ───────────────────────────────────────────────
  await test("4. Dashboard Metrics", async () => {
    const r = await api("GET", "/api/v1/dashboard/metrics", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return r.data;
  });

  // ─── 5. WhatsApp Threads ────────────────────────────────────────────────
  await test("5. WhatsApp Threads", async () => {
    const r = await api("GET", "/api/v1/whatsapp/threads", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    return r.data;
  });

  // ─── 6. Tasks ───────────────────────────────────────────────────────────
  await test("6. Tasks", async () => {
    const r = await api("GET", "/api/v1/tasks", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    return r.data;
  });

  // ─── 7. Tours ──────────────────────────────────────────────────────────
  await test("7. Tours", async () => {
    const r = await api("GET", "/api/v1/tours", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    return r.data;
  });

  // ─── 8. Offers ──────────────────────────────────────────────────────────
  await test("8. Offers", async () => {
    const r = await api("GET", "/api/v1/offers", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    return r.data;
  });

  // ─── 9. AI Agents ───────────────────────────────────────────────────────
  await test("9. AI Agents", async () => {
    const r = await api("GET", "/api/v1/agents", null, sessionCookie);
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    return r.data;
  });

  // ─── 10. Static Pages ──────────────────────────────────────────────────
  for (const page of ["/", "/privacy-policy", "/disclaimer", "/terms-and-conditions", "/register"]) {
    await test(`10. Static Page: ${page}`, async () => {
      const r = await api("GET", page);
      if (r.status !== 200) throw new Error(`Status ${r.status}`);
      return page;
    });
  }

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log(`\n═══ RESULTS: ${PASS}/${PASS+FAIL} PASS, ${FAIL} FAIL ═══\n`);

  // ─── Cleanup ────────────────────────────────────────────────────────────
  server.kill("SIGTERM");
  setTimeout(() => process.exit(FAIL > 0 ? 1 : 0), 1000);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
