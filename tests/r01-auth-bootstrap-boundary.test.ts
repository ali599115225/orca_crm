import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SYSTEM_CLIENT_ALLOWLIST,
  SYSTEM_CLIENT_ALLOWLIST_MODULES,
  isAllowlistedSystemClient,
} from "@/lib/system-prisma-boundary";

describe("R01 auth bootstrap boundary", () => {
  describe("system-prisma-boundary encapsulation", () => {
    it("does not export a generic Prisma client", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).not.toMatch(/export\s+(const|let|var)\s+rawPrisma\b/);
      expect(content).not.toMatch(/export\s+(const|let|var)\s+systemPrisma\b/);
      expect(content).not.toMatch(/export\s+(const|let|var)\s+prisma\b/);
    });

    it("does not export an unrestricted query callback", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).not.toMatch(/export\s+(async\s+)?function\s+\w*[Qq]uery\b/);
      expect(content).not.toMatch(/export\s+(async\s+)?function\s+\w*[Ee]xecute\b/);
      expect(content).not.toMatch(/export\s+(async\s+)?function\s+\w*[Rr]un\b/);
    });

    it("encapsulates rawPrisma access inside the boundary", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).toContain('import { rawPrisma } from "@/lib/prisma";');
      expect(content).not.toContain('require("@/lib/prisma").rawPrisma');
      expect(content).not.toContain("rawPrisma unavailable");
    });

    it("is in the system client allowlist", () => {
      expect(isAllowlistedSystemClient("lib/system-prisma-boundary.ts")).toBe(true);
    });
  });

  describe("narrow AUTH_BOOTSTRAP capabilities", () => {
    it("exports authBootstrapFindUserEmail", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).toMatch(/export\s+async\s+function\s+authBootstrapFindUserEmail\b/);
    });

    it("exports authBootstrapFindUserRole", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).toMatch(/export\s+async\s+function\s+authBootstrapFindUserRole\b/);
    });

    it("exports authBootstrapFindTenantActive", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).toMatch(/export\s+async\s+function\s+authBootstrapFindTenantActive\b/);
    });

    it("exports authBootstrapFindUserByEmail for login bootstrap", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      expect(content).toMatch(/export\s+async\s+function\s+authBootstrapFindUserByEmail\b/);
    });

    it("authBootstrapFindUserEmail uses minimal select and explicit userId predicate", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      const fnMatch = content.match(/export\s+async\s+function\s+authBootstrapFindUserEmail[\s\S]*?^}/m);
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toMatch(/select:\s*\{\s*email:\s*true\s*\}/);
      expect(fnBody).toMatch(/where:\s*\{\s*id:\s*userId\s*\}/);
    });

    it("authBootstrapFindUserRole uses minimal select and explicit userId/tenantId predicates", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      const fnMatch = content.match(/export\s+async\s+function\s+authBootstrapFindUserRole[\s\S]*?^}/m);
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toMatch(/select:\s*\{\s*role:\s*true\s*\}/);
      expect(fnBody).toMatch(/id:\s*userId/);
      expect(fnBody).toMatch(/tenantId/);
    });

    it("authBootstrapFindTenantActive uses minimal select and explicit tenantId predicate", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      const fnMatch = content.match(/export\s+async\s+function\s+authBootstrapFindTenantActive[\s\S]*?^}/m);
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toMatch(/select:\s*\{\s*id:\s*true\s*\}/);
      expect(fnBody).toMatch(/id:\s*tenantId/);
      expect(fnBody).toMatch(/isActive:\s*true/);
    });

    it("authBootstrapFindUserByEmail selects only login fields and tenant activity", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const content = fs.readFileSync(boundaryPath, "utf8");
      const fnMatch = content.match(/export\s+async\s+function\s+authBootstrapFindUserByEmail[\s\S]*?^}/m);
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toMatch(/where:\s*\{\s*email\s*\}/);
      expect(fnBody).toContain("passwordHash: true");
      expect(fnBody).toContain("isActive: true");
      expect(fnBody).toContain("tenant:");
      expect(fnBody).toContain("subdomain: true");
      expect(fnBody).not.toContain("findMany");
      expect(fnBody).not.toContain("$queryRaw");
      expect(fnBody).not.toContain("$executeRaw");
    });
  });

  describe("login action uses the auth bootstrap boundary", () => {
    it("does not import rawPrisma directly", () => {
      const authPath = path.join(process.cwd(), "app", "actions", "auth.ts");
      const content = fs.readFileSync(authPath, "utf8");
      expect(content).not.toMatch(/import\s+.*\brawPrisma\b/);
      expect(content).toContain("authBootstrapFindUserByEmail");
    });

    it("does not contain rawPrisma unavailable or tenant context failures", () => {
      const authPath = path.join(process.cwd(), "app", "actions", "auth.ts");
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const authContent = fs.readFileSync(authPath, "utf8");
      const content = `${authContent}\n${fs.readFileSync(boundaryPath, "utf8")}`;
      expect(content).not.toContain("rawPrisma unavailable");
      expect(authContent).not.toContain("TENANT_CONTEXT_REQUIRED");
    });
  });

  describe("api-auth-guard is an approved AUTH_BOOTSTRAP consumer", () => {
    it("does not import rawPrisma directly", () => {
      const guardPath = path.join(process.cwd(), "lib", "api-auth-guard.ts");
      const content = fs.readFileSync(guardPath, "utf8");
      expect(content).not.toMatch(/import\s+.*\brawPrisma\b/);
    });

    it("does not import the extended prisma client", () => {
      const guardPath = path.join(process.cwd(), "lib", "api-auth-guard.ts");
      const content = fs.readFileSync(guardPath, "utf8");
      expect(content).not.toMatch(/import\s+\{[^}]*\bprisma\b[^}]*\}\s+from\s+["']@\/lib\/prisma["']/);
    });

    it("imports auth bootstrap capabilities from system-prisma-boundary", () => {
      const guardPath = path.join(process.cwd(), "lib", "api-auth-guard.ts");
      const content = fs.readFileSync(guardPath, "utf8");
      expect(content).toMatch(/import\s+[\s\S]*authBootstrapFindUserEmail[\s\S]*from\s+["']@\/lib\/system-prisma-boundary["']/);
      expect(content).toMatch(/import\s+[\s\S]*authBootstrapFindUserRole[\s\S]*from\s+["']@\/lib\/system-prisma-boundary["']/);
      expect(content).toMatch(/import\s+[\s\S]*authBootstrapFindTenantActive[\s\S]*from\s+["']@\/lib\/system-prisma-boundary["']/);
    });

    it("isSuperAdmin uses authBootstrapFindUserEmail", () => {
      const guardPath = path.join(process.cwd(), "lib", "api-auth-guard.ts");
      const content = fs.readFileSync(guardPath, "utf8");
      expect(content).toMatch(/authBootstrapFindUserEmail\s*\(\s*userId\s*\)/);
    });

    it("hasDatabaseRole uses authBootstrapFindUserRole and authBootstrapFindTenantActive", () => {
      const guardPath = path.join(process.cwd(), "lib", "api-auth-guard.ts");
      const content = fs.readFileSync(guardPath, "utf8");
      expect(content).toMatch(/authBootstrapFindUserRole\s*\(/);
      expect(content).toMatch(/authBootstrapFindTenantActive\s*\(/);
    });
  });

  describe("arbitrary modules cannot bypass the boundary", () => {
    it("no non-allowlisted file imports rawPrisma", () => {
      const root = process.cwd();
      const dirs = ["app", "lib"];
      const violations: string[] = [];

      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (
            entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".test.ts") &&
            !entry.name.endsWith(".d.ts")
          ) {
            const relPath = path.relative(root, full).replace(/\\/g, "/");
            const content = fs.readFileSync(full, "utf8");
            if (/import\s+.*\brawPrisma\b.*from\s+["'].*prisma["']/.test(content)) {
              if (!isAllowlistedSystemClient(relPath)) {
                violations.push(relPath);
              }
            }
          }
        }
      }

      for (const d of dirs) {
        const full = path.join(root, d);
        if (fs.existsSync(full)) walk(full);
      }

      expect(violations).toEqual([]);
    });

    it("allowlist has AUTH_BOOTSTRAP category entries", () => {
      const authBootstrapEntries = SYSTEM_CLIENT_ALLOWLIST.filter(
        (e) => e.category === "authentication bootstrap before tenant binding",
      );
      expect(authBootstrapEntries.length).toBeGreaterThanOrEqual(1);
    });

    it("encapsulates 360dialog pre-context lookup as a narrow ingress capability", () => {
      const boundaryPath = path.join(process.cwd(), "lib", "system-prisma-boundary.ts");
      const routePath = path.join(
        process.cwd(),
        "app", "api", "whatsapp", "webhook", "360dialog", "[webhookToken]", "route.ts",
      );
      const boundary = fs.readFileSync(boundaryPath, "utf8");
      const route = fs.readFileSync(routePath, "utf8");
      const capabilityStart = boundary.indexOf(
        "export async function webhookFindDialog360ConnectionByToken",
      );
      const capabilityEnd = boundary.indexOf(
        "\nexport async function",
        capabilityStart + 1,
      );
      const capability = boundary.slice(capabilityStart, capabilityEnd);

      expect(capabilityStart).toBeGreaterThanOrEqual(0);
      expect(capability).toContain('provider: "DIALOG360"');
      expect(capability).toContain('status: "CONNECTED"');
      expect(capability).toContain('path: ["webhookToken"]');
      expect(capability).toContain("equals: webhookToken");
      expect(route).toContain("webhookFindDialog360ConnectionByToken");
      expect(route).not.toMatch(/import\s+.*\brawPrisma\b/);
      expect(route).toContain("runWithTenantContext");
    });
  });
});
