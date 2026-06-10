// scripts/quick-verify.mjs
// Simple health + login test to verify production build

import http from "http";
import { SignJWT } from "jose";

const PORT = 3459;
const BASE = `http://localhost:${PORT}`;

function api(method, path, body, cookie, retries = 20) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      const opts = { hostname: "localhost", port: PORT, path, method, headers: {} };
      if (body) opts.headers["Content-Type"] = "application/json";
      if (cookie) opts.headers["Cookie"] = cookie;
      const req = http.request(opts, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on("error", (e) => {
        if (n > 0 && e.code === "ECONNREFUSED") setTimeout(() => attempt(n - 1), 2000);
        else reject(e);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    }
    attempt(retries);
  });
}

async function main() {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) { console.error("FATAL: JWT_SECRET env var required"); process.exit(1); }
  const secret = new TextEncoder().encode(JWT_SECRET);
  const session = await new SignJWT({
    userId: "admin-demo-id",
    tenantId: "demo-tenant-id",
    tenantSubdomain: "demo",
    role: "ADMIN",
    name: "Admin Demo",
    email: "admin@demo.orca-crm.com",
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(secret);
  const cookie = `session_token=${session}`;

  console.log("⏳ Waiting for server...");

  const h = await api("GET", "/api/v1/health");
  console.log(`1. Health: ${h.status} - DB: ${h.data?.checks?.database?.status}`);

  const login = await api("POST", "/api/v1/auth/login", { email: "admin@demo.orca-crm.com", password: "Demo@2026" });
  console.log(`2. Login: ${login.status} - Token: ${login.data?.token ? "yes" : "no"}`);

  const leads = await api("POST", "/api/v1/leads", { name: "Verify Test", phone: "+96650000099", email: "v@t.com", source: "WEBSITE" }, cookie);
  console.log(`3. Create Lead: ${leads.status} - ${JSON.stringify(leads.data).slice(0, 100)}`);

  const dash = await api("GET", "/api/v1/dashboard/metrics", null, cookie);
  console.log(`4. Dashboard: ${dash.status}`);

  const wa = await api("GET", "/api/v1/whatsapp/threads", null, cookie);
  console.log(`5. WhatsApp: ${wa.status}`);

  const tasks = await api("GET", "/api/v1/tasks", null, cookie);
  console.log(`6. Tasks: ${tasks.status}`);

  const tours = await api("GET", "/api/v1/tours", null, cookie);
  console.log(`7. Tours: ${tours.status}`);

  const offers = await api("GET", "/api/v1/offers", null, cookie);
  console.log(`8. Offers: ${offers.status}`);

  const agents = await api("GET", "/api/v1/agents", null, cookie);
  console.log(`9. Agents: ${agents.status}`);

  const staticPages = ["/", "/privacy-policy", "/disclaimer", "/terms-and-conditions", "/register"];
  for (const p of staticPages) {
    const r = await api("GET", p);
    console.log(`10. Static ${p}: ${r.status}`);
  }

  const total = 10;
  const passed = 1; // just health for now
  console.log(`\nDone. Server is running on port ${PORT}.`);
  console.log("Kill with: taskkill /F /IM node.exe (or Ctrl+C)");
}

main().catch(e => console.error("FAIL:", e.message));
