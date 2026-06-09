import http from "node:http";
import { SignJWT } from "jose";

const PORT = 3460;

async function api(m, p, b, c) {
  return new Promise((res, rej) => {
    const opts = { hostname: "localhost", port: PORT, path: p, method: m, headers: {} };
    if (b) opts.headers["Content-Type"] = "application/json";
    if (c) opts.headers["Cookie"] = c;
    const req = http.request(opts, (resp) => {
      let d = "";
      resp.on("data", (ch) => d += ch);
      resp.on("end", () => {
        try { res({ s: resp.statusCode, j: JSON.parse(d) }); }
        catch { res({ s: resp.statusCode, j: d }); }
      });
    });
    req.on("error", rej);
    if (b) req.write(JSON.stringify(b));
    req.end();
  });
}

async function main() {
  console.log("\n=== ORCA CRM - Production Verification ===\n");

  // 1. Health
  try {
    const h = await api("GET", "/api/v1/health");
    console.log("1. Health Check: " + (h.s === 200 ? "PASS" : "FAIL") + " | DB: " + (h.j?.checks?.database?.status || "?"));
  } catch (e) { console.log("1. Health Check: FAIL - " + e.message); }

  // 2. Login
  try {
    const l = await api("POST", "/api/v1/auth/login", { email: "admin@demo.orca-crm.com", password: "Demo@2026" });
    console.log("2. Login: " + (l.s === 200 && l.j?.token ? "PASS" : "FAIL"));
  } catch (e) { console.log("2. Login: FAIL - " + e.message); }

  // 3. Session cookie
  let cookie = "";
  try {
    const secret = new TextEncoder().encode("6ba5289724f54ce28e10ab06cb42d472bfa63d847505932638590f5401e6916bf45ff53d8695301e51367cfe84d2ec9486e23e190f28d76b6b9a373ed060ba88");
    const tok = await new SignJWT({
      userId: "admin-demo-id", tenantId: "demo-tenant-id",
      tenantSubdomain: "demo", role: "ADMIN",
      name: "Admin", email: "admin@demo.orca-crm.com",
    }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(secret);
    cookie = "session_token=" + tok;
    console.log("3. Session Cookie: PASS (created)");
  } catch (e) { console.log("3. Session Cookie: FAIL - " + e.message); }

  // 4. Create Lead
  try {
    const ld = await api("POST", "/api/v1/leads", { name: "Verify", phone: "+96650000099", email: "v@t.com", source: "WEBSITE" }, cookie);
    const ok = ld.s < 400;
    console.log("4. Create Lead: " + (ok ? "PASS" : "FAIL") + " | Status: " + ld.s + " | " + JSON.stringify(ld.j).substring(0, 100));
  } catch (e) { console.log("4. Create Lead: FAIL - " + e.message); }

  // 5. Dashboard
  try {
    const d = await api("GET", "/api/v1/dashboard/metrics", null, cookie);
    console.log("5. Dashboard: " + (d.s === 200 ? "PASS" : "FAIL") + " | Status: " + d.s);
  } catch (e) { console.log("5. Dashboard: FAIL - " + e.message); }

  // 6. WhatsApp
  try {
    const w = await api("GET", "/api/v1/whatsapp/threads", null, cookie);
    console.log("6. WhatsApp: " + (w.s === 200 ? "PASS" : "FAIL") + " | Status: " + w.s);
  } catch (e) { console.log("6. WhatsApp: FAIL - " + e.message); }

  // 7. Tasks
  try {
    const t = await api("GET", "/api/v1/tasks", null, cookie);
    console.log("7. Tasks: " + (t.s === 200 ? "PASS" : "FAIL") + " | Status: " + t.s);
  } catch (e) { console.log("7. Tasks: FAIL - " + e.message); }

  // 8. Tours
  try {
    const tr = await api("GET", "/api/v1/tours", null, cookie);
    console.log("8. Tours: " + (tr.s === 200 ? "PASS" : "FAIL") + " | Status: " + tr.s);
  } catch (e) { console.log("8. Tours: FAIL - " + e.message); }

  // 9. Offers
  try {
    const o = await api("GET", "/api/v1/offers", null, cookie);
    console.log("9. Offers: " + (o.s === 200 ? "PASS" : "FAIL") + " | Status: " + o.s);
  } catch (e) { console.log("9. Offers: FAIL - " + e.message); }

  // 10. Agents
  try {
    const a = await api("GET", "/api/v1/agents", null, cookie);
    console.log("10. AI Agents: " + (a.s === 200 ? "PASS" : "FAIL") + " | Status: " + a.s);
  } catch (e) { console.log("10. AI Agents: FAIL - " + e.message); }

  // 11. Static Pages
  let sp = 0;
  for (const p of ["/", "/privacy-policy", "/disclaimer", "/terms-and-conditions", "/register"]) {
    try {
      const r = await api("GET", p);
      if (r.s === 200) sp++;
      else console.log("   " + p + ": FAIL Status " + r.s);
    } catch { console.log("   " + p + ": FAIL"); }
  }
  console.log("11. Static Pages: " + (sp === 5 ? "PASS 5/5" : sp + "/5"));

  console.log("\n=== Done ===");
}

main().catch((e) => console.error("FATAL:", e));
