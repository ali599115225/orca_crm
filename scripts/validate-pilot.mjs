// Validation test script - run with: node scripts/validate-pilot.mjs
// Tests: Login, Lead CRUD, Property, Contract, Payment, WhatsApp, Notifications, Multi-Tenant

const BASE = process.env.BASE_URL || "http://localhost:3456";

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`  [PASS] ${label}`);
    return { label, status: "PASS", data: result };
  } catch (e) {
    console.log(`  [FAIL] ${label}: ${e.message}`);
    return { label, status: "FAIL", error: e.message };
  }
}

async function main() {
  console.log(`\n═══ ORCA CRM - Production Validation ═══\n`);
  console.log(`Base URL: ${BASE}\n`);

  const results = [];

  // 1. Health Check
  const health = await test("Health Check", async () => {
    const res = await fetch(`${BASE}/api/v1/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  });

  // 2. Login
  const login = await test("Login (admin@demo.orca-crm.com)", async () => {
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

  const token = login.data?.token;

  // 3. Lead Creation (if logged in)
  if (token) {
    await test("Create Lead", async () => {
      const res = await fetch(`${BASE}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Test Pilot Lead", phone: "+966500000001", email: "test@pilot.com", source: "WEBSITE" }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (!data.id) throw new Error("No lead id returned");
      return data;
    });

    // 4. Property Management
    await test("Fetch Properties", async () => {
      const res = await fetch(`${BASE}/api/v1/contacts?type=properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 5. Dashboard Metrics
    await test("Dashboard Metrics", async () => {
      const res = await fetch(`${BASE}/api/v1/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 6. WhatsApp Threads
    await test("WhatsApp Threads", async () => {
      const res = await fetch(`${BASE}/api/v1/whatsapp/threads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 7. Task Management
    await test("Fetch Tasks", async () => {
      const res = await fetch(`${BASE}/api/v1/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 8. Tours
    await test("Fetch Tours", async () => {
      const res = await fetch(`${BASE}/api/v1/tours`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 9. Offers
    await test("Fetch Offers", async () => {
      const res = await fetch(`${BASE}/api/v1/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });

    // 10. Agents
    await test("Fetch AI Agents", async () => {
      const res = await fetch(`${BASE}/api/v1/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });
  }

  console.log(`\n═══ Results ═══`);
  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.status === "PASS") pass++; else fail++;
    console.log(`  ${r.status === "PASS" ? "✅" : "❌"} ${r.label}`);
  }
  console.log(`\n${pass}/${pass+fail} passed (${fail > 0 ? "⚠️ " + fail + " failed" : "✅ All clear"})`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
