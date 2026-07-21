import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content, "utf8");
}

function replaceExact(path, oldValue, newValue, expected = 1) {
  const content = read(path);
  const count = content.split(oldValue).length - 1;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} matches, found ${count}`);
  }
  write(path, content.replaceAll(oldValue, newValue));
}

replaceExact(
  "lib/payments/providers/paylink.ts",
  'import "server-only";\n',
  'import "server-only";\nimport { randomUUID } from "node:crypto";\n',
);
replaceExact(
  "lib/payments/providers/paylink.ts",
  'function generateIdempotencyKey(): string {\n  return `orca-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;\n}',
  'function generateIdempotencyKey(): string {\n  return `orca-${randomUUID()}`;\n}',
);

replaceExact(
  "components/contracts-payments/ContractsPaymentsCenter.tsx",
  "const DETAIL_TAB_PAGE_SIZE = 4;\n\n",
  "const DETAIL_TAB_PAGE_SIZE = 4;\n\nfunction createPaymentIdempotencyKey(): string {\n  return `idemp-${globalThis.crypto.randomUUID()}`;\n}\n\n",
);
replaceExact(
  "components/contracts-payments/ContractsPaymentsCenter.tsx",
  "'idemp-' + Math.floor(100000 + Math.random() * 900000)",
  "createPaymentIdempotencyKey()",
  2,
);

replaceExact(
  "scripts/g5-security-quality-inventory.mjs",
  '  "verifyCronSecret", "isAuthorizedCronRequest", "verifyWebhook", "validateWebhook", "verifySignature", "verifyHmac",\n  "withTrustedJob", "requireTrustedJob", "requireAuth", "getServerSession", "jwtVerify(",\n];',
  '  "verifyCronSecret", "isAuthorizedCronRequest", "verifyWebhook", "validateWebhook", "verifySignature", "verifyHmac",\n  "verifyAndStoreProviderWebhook", "verifyCustomPaymentCallbackSignature", "processPaymentCallback", "verifyPayment(",\n  "timingSafeEqual", "PAYLINK_WEBHOOK_SECRET", "CRON_SECRET",\n  "withTrustedJob", "requireTrustedJob", "requireAuth", "getServerSession", "jwtVerify(",\n];',
);
replaceExact(
  "scripts/g5-security-quality-inventory.mjs",
  'const PUBLIC_ROUTE_MARKERS = [\n  "/api/health", "/api/auth", "/api/public", "/api/webhooks", "/api/cron", "/api/realtime",\n  "/api/whatsapp/webhook", "/api/revenue-integrity/webhook", "/api/v1/leads/webhook",\n];',
  'const PUBLIC_ROUTE_MARKERS = [\n  "/api/health", "/api/v1/health", "/api/auth", "/api/public", "/api/webhooks", "/api/cron", "/api/realtime",\n  "/api/deploy-marker", "/api/payment/callback", "/api/payments/custom/return", "/api/payments/custom/webhook",\n  "/api/payments/ngenius/webhook", "/api/payments/paylink/webhook",\n  "/api/whatsapp/webhook", "/api/whatsapp/embedded-signup/callback", "/api/revenue-integrity/webhook",\n  "/api/v1/leads/webhook", "/login/google",\n];',
);

const packagePath = "package.json";
const packageJson = JSON.parse(read(packagePath));
packageJson.scripts.typecheck = "tsc --noEmit";
packageJson.scripts["security:audit"] = "npm audit --omit=dev --audit-level=moderate";
Object.assign(packageJson.dependencies, {
  next: "16.2.10",
  react: "18.3.1",
  "react-dom": "18.3.1",
  "@sentry/nextjs": "10.67.0",
});
Object.assign(packageJson.devDependencies, {
  "@types/node": "25.9.1",
  "@types/react": "19.2.16",
  "@types/react-dom": "19.2.3",
  typescript: "6.0.3",
});
packageJson.overrides = {
  ...(packageJson.overrides ?? {}),
  "brace-expansion": "5.0.7",
  postcss: "8.5.20",
};
write(packagePath, `${JSON.stringify(packageJson, null, 4)}\n`);
