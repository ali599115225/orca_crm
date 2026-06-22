import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`CI_PRODUCTION_GATE_FAILED: ${message}`);
  process.exit(1);
}

function requireFile(relativePath) {
  if (!existsSync(resolve(root, relativePath))) {
    fail(`Missing required file: ${relativePath}`);
  }
}

for (const file of [
  "package.json",
  "package-lock.json",
  ".env.example",
  ".github/workflows/orca-ci.yml",
  ".github/workflows/orca-production-smoke.yml",
  "app/api/health/deployment/route.ts",
  "scripts/production-smoke.mjs",
  "docs/production-deployment-runbook.md",
]) {
  requireFile(file);
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
if (!packageJson.scripts?.build) {
  fail("package.json must define scripts.build");
}

const tracked = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenEnvFiles = tracked.filter((file) => {
  const normalized = file.replaceAll("\\", "/");
  if (normalized === ".env.example") return false;
  return /(^|\/)\.env($|\.)/.test(normalized);
});

if (forbiddenEnvFiles.length > 0) {
  fail(`Tracked environment files: ${forbiddenEnvFiles.join(", ")}`);
}

const vercelPath = resolve(root, "vercel.json");
if (existsSync(vercelPath)) {
  try {
    JSON.parse(readFileSync(vercelPath, "utf8"));
  } catch {
    fail("vercel.json is not valid JSON");
  }
}

const workflowText = [
  readFileSync(
    resolve(root, ".github/workflows/orca-ci.yml"),
    "utf8",
  ),
  readFileSync(
    resolve(root, ".github/workflows/orca-production-smoke.yml"),
    "utf8",
  ),
].join("\n");

if (/VERCEL_TOKEN\s*:\s*(?!\$\{\{)/.test(workflowText)) {
  fail("A Vercel token appears to be hardcoded in a workflow");
}

console.log("CI_PRODUCTION_GATE_PASS");