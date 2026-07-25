import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const paths = {
  packageJson: resolve(ROOT, "package.json"),
  workflow: resolve(ROOT, ".github/workflows/orca-ci.yml"),
  gitignore: resolve(ROOT, ".gitignore"),
  overrideRegister: resolve(ROOT, "docs/governance/ORCA_DEPENDENCY_OVERRIDE_REGISTER.json"),
  retentionRegister: resolve(ROOT, "docs/governance/ORCA_REPOSITORY_ARTIFACT_RETENTION_REGISTER.json"),
};

const errors = [];
const fail = (message) => errors.push(message);
const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readText(path));

for (const [name, path] of Object.entries(paths)) {
  if (!existsSync(path)) fail(`Missing required ${name}: ${path}`);
}

if (errors.length === 0) {
  const packageJson = readJson(paths.packageJson);
  const workflow = readText(paths.workflow);
  const gitignore = readText(paths.gitignore);
  const overrideRegister = readJson(paths.overrideRegister);
  const retentionRegister = readJson(paths.retentionRegister);

  if (packageJson.scripts?.lint !== "node scripts/repository-governance-lint.mjs") {
    fail("package.json must define the deterministic repository governance lint command.");
  }
  if (!workflow.includes("npm run lint")) {
    fail("ORCA CI must execute npm run lint as a blocking step.");
  }

  const unsafeScriptText = JSON.stringify(packageJson.scripts ?? {});
  if (/npm\s+audit\s+fix|--force/.test(unsafeScriptText)) {
    fail("Package scripts must not contain broad or forceful automatic remediation commands.");
  }

  for (const [sectionName, section] of Object.entries({
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
  })) {
    for (const [name, spec] of Object.entries(section)) {
      if (["latest", "*", "x", "X"].includes(spec)) {
        fail(`${sectionName}.${name} uses an unbounded dependency specification: ${spec}`);
      }
    }
  }

  const packageOverrides = packageJson.overrides ?? {};
  const registeredOverrides = overrideRegister.overrides ?? [];
  const byPackage = new Map();
  for (const entry of registeredOverrides) {
    for (const field of ["package", "value", "owner", "reason", "introducedBy", "reviewTrigger", "expiryPolicy"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        fail(`Override entry is missing ${field}: ${JSON.stringify(entry)}`);
      }
    }
    if (byPackage.has(entry.package)) fail(`Duplicate override register entry: ${entry.package}`);
    byPackage.set(entry.package, entry);
  }

  const packageOverrideNames = Object.keys(packageOverrides).sort();
  const registeredOverrideNames = [...byPackage.keys()].sort();
  if (JSON.stringify(packageOverrideNames) !== JSON.stringify(registeredOverrideNames)) {
    fail(`Override register mismatch. package.json=${packageOverrideNames.join(",")} register=${registeredOverrideNames.join(",")}`);
  }
  for (const [name, value] of Object.entries(packageOverrides)) {
    if (byPackage.get(name)?.value !== value) {
      fail(`Override value mismatch for ${name}: package.json=${value} register=${byPackage.get(name)?.value ?? "missing"}`);
    }
  }

  const requiredFamilies = [
    ".unlighthouse/",
    "unlighthouse-report/",
    "playwright-report/",
    "test-results/",
    "artifacts/",
    "lighthouse-report*.html|json",
    "scratch/",
    "ORCA_PAGE_CLOSURE_WORK/",
    "root investigation reports and backup configuration copies",
    "anomalous quoted-path entries",
  ];
  const families = retentionRegister.families ?? [];
  const familyMap = new Map();
  for (const entry of families) {
    for (const field of ["pathPattern", "classification", "disposition", "owner", "reviewTrigger", "runtimeImpact"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        fail(`Retention entry is missing ${field}: ${JSON.stringify(entry)}`);
      }
    }
    if (entry.runtimeImpact !== "NONE") fail(`Retention entry must remain non-Runtime: ${entry.pathPattern}`);
    if (familyMap.has(entry.pathPattern)) fail(`Duplicate retention entry: ${entry.pathPattern}`);
    familyMap.set(entry.pathPattern, entry);
  }
  for (const pattern of requiredFamilies) {
    if (!familyMap.has(pattern)) fail(`Missing artifact retention classification: ${pattern}`);
  }

  const requiredIgnorePatterns = [
    ".unlighthouse/",
    "unlighthouse-report/",
    "playwright-report/",
    "test-results/",
    "artifacts/",
    "lighthouse-report*.html",
    "lighthouse-report*.json",
  ];
  for (const pattern of requiredIgnorePatterns) {
    if (!gitignore.split(/\r?\n/).includes(pattern)) fail(`.gitignore is missing generated-output pattern: ${pattern}`);
  }
}

if (errors.length > 0) {
  console.error("Repository governance lint failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Repository governance lint passed.");
