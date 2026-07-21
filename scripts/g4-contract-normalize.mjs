import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INVENTORY_PATH = join(ROOT, "artifacts/g4-contract-inventory.json");
const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

if (!existsSync(INVENTORY_PATH)) {
  throw new Error(`Missing G4 inventory: ${INVENTORY_PATH}`);
}

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
const unresolved = [];
let normalized = 0;

for (const contract of inventory.contracts) {
  if (contract.kind !== "API" || contract.apiMethods.length > 0) continue;

  const sourcePath = join(ROOT, contract.source);
  const source = readFileSync(sourcePath, "utf8");
  const methods = API_METHODS.filter((method) => {
    const direct = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`);
    const reExport = new RegExp(`export\\s*\\{[^}]*\\b${method}\\b[^}]*\\}\\s*from\\s*["']`);
    return direct.test(source) || reExport.test(source);
  });

  if (methods.length === 0) {
    unresolved.push({ id: contract.id, route: contract.route, source: contract.source });
    continue;
  }

  contract.apiMethods = methods;
  normalized += 1;
}

inventory.summary.apisWithoutDetectedMethods = unresolved.length;
inventory.summary.normalizedReExportedApiMethods = normalized;
writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ normalized, unresolved }, null, 2));
if (unresolved.length > 0) {
  process.exitCode = 1;
}
