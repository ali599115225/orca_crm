import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { rawPrisma } from "@/lib/prisma";
import { appendRevenueEvent } from "./events";
import { REVENUE_PROVIDERS, type ProviderCredentials, type RevenueProvider } from "./contracts";

function encryptionKey(): Buffer {
  const source = process.env.ORCA_REVENUE_MASTER_KEY || process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!source || source.length < 32) throw new Error("ORCA_REVENUE_MASTER_KEY_REQUIRED");
  if (/^[0-9a-f]{64}$/i.test(source)) return Buffer.from(source, "hex");
  try {
    const decoded = Buffer.from(source, "base64");
    if (decoded.length === 32) return decoded;
  } catch {}
  return createHash("sha256").update(source).digest();
}

function encryptCredentials(credentials: ProviderCredentials) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptProviderCredentials(value: string): ProviderCredentials {
  const [version, ivValue, tagValue, bodyValue] = String(value).split(".");
  if (version !== "v1" || !ivValue || !tagValue || !bodyValue) throw new Error("INVALID_ENCRYPTED_CREDENTIALS");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(bodyValue, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(plain) as ProviderCredentials;
}

function providerValue(credentials: ProviderCredentials, key: string): string {
  return String(credentials[key] ?? "").trim();
}

function requireHttpsUrl(value: string, errorCode: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error(errorCode);
    return url.toString();
  } catch {
    throw new Error(errorCode);
  }
}

function validateCustomPaymentCredentials(
  baseUrl: string | null | undefined,
  credentials: ProviderCredentials,
) {
  const providerName = providerValue(credentials, "providerName");
  const integrationMode = providerValue(
    credentials,
    "integrationMode",
  ).toUpperCase();

  if (!providerName) {
    throw new Error("CUSTOM_PAYMENT_PROVIDER_NAME_REQUIRED");
  }

  if (integrationMode === "PAYMENT_LINK") {
    const paymentLinkUrl = requireHttpsUrl(
      providerValue(credentials, "paymentLinkUrl"),
      "CUSTOM_PAYMENT_HTTPS_LINK_REQUIRED",
    );
    return {
      configured: true,
      providerName,
      integrationMode,
      paymentLinkUrl,
    };
  }

  if (integrationMode !== "API") {
    throw new Error("CUSTOM_PAYMENT_INTEGRATION_MODE_REQUIRED");
  }

  const normalizedBaseUrl = requireHttpsUrl(
    String(baseUrl || "").trim(),
    "CUSTOM_PAYMENT_HTTPS_BASE_URL_REQUIRED",
  );
  const authHeaderName = providerValue(
    credentials,
    "authHeaderName",
  );
  const authScheme = providerValue(
    credentials,
    "authScheme",
  ).toUpperCase();
  const credential = providerValue(credentials, "credential");
  const createPaymentPath = providerValue(
    credentials,
    "createPaymentPath",
  );
  const verifyPaymentPath = providerValue(
    credentials,
    "verifyPaymentPath",
  );
  const requestTemplate = providerValue(
    credentials,
    "requestTemplate",
  );

  const mappingKeys = [
    "responseReferencePath",
    "responseRedirectUrlPath",
    "responseStatusPath",
    "responseAmountPath",
    "responseCurrencyPath",
    "paidStatuses",
    "webhookSecret",
    "webhookSignatureHeader",
    "webhookReferencePath",
  ] as const;

  if (
    !authHeaderName ||
    !credential ||
    !createPaymentPath ||
    !verifyPaymentPath ||
    !requestTemplate ||
    mappingKeys.some(
      (key) => !providerValue(credentials, key),
    )
  ) {
    throw new Error("CUSTOM_PAYMENT_API_FIELDS_REQUIRED");
  }

  if (!/^[A-Za-z0-9-]{1,64}$/.test(authHeaderName)) {
    throw new Error("CUSTOM_PAYMENT_AUTH_HEADER_INVALID");
  }
    if (
      !/^[A-Za-z0-9-]{1,64}$/.test(
        providerValue(credentials, "webhookSignatureHeader"),
      )
    ) {
      throw new Error("CUSTOM_PAYMENT_WEBHOOK_HEADER_INVALID");
    }
  if (!["BEARER", "BASIC", "API_KEY"].includes(authScheme)) {
    throw new Error("CUSTOM_PAYMENT_AUTH_SCHEME_INVALID");
  }
  if (
    !createPaymentPath.startsWith("/") ||
    !verifyPaymentPath.startsWith("/") ||
    !verifyPaymentPath.includes("{reference}")
  ) {
    throw new Error("CUSTOM_PAYMENT_API_PATHS_INVALID");
  }

  try {
    const template = JSON.parse(requestTemplate);
    if (
      !template ||
      typeof template !== "object" ||
      Array.isArray(template)
    ) {
      throw new Error();
    }
  } catch {
    throw new Error("CUSTOM_PAYMENT_REQUEST_TEMPLATE_INVALID");
  }

  return {
    configured: true,
    providerName,
    integrationMode,
    normalizedBaseUrl,
  };
}

const DIALOG360_ALLOWED_HOSTS = new Set([
  "waba-v2.360dialog.io",
  "waba-sandbox.360dialog.io",
]);

function validateDialog360Credentials(
  baseUrl: string | null | undefined,
  credentials: ProviderCredentials,
) {
  const apiKey = providerValue(credentials, "apiKey");
  const displayPhoneNumber = providerValue(credentials, "displayPhoneNumber");
  const webhookSecret = providerValue(credentials, "webhookSecret");

  if (!apiKey || !displayPhoneNumber || !webhookSecret) {
    throw new Error("DIALOG360_FIELDS_REQUIRED");
  }

  const normalizedPhone = displayPhoneNumber.replace(/\D/g, "");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
    throw new Error("DIALOG360_PHONE_INVALID");
  }

  if (webhookSecret.length < 24) {
    throw new Error("DIALOG360_WEBHOOK_SECRET_TOO_SHORT");
  }

  const normalizedBaseUrl = requireHttpsUrl(
    String(baseUrl || "https://waba-v2.360dialog.io").trim(),
    "DIALOG360_HTTPS_BASE_URL_REQUIRED",
  );
  const url = new URL(normalizedBaseUrl);

  if (!DIALOG360_ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("DIALOG360_BASE_URL_NOT_ALLOWED");
  }

  return {
    apiKey,
    displayPhoneNumber: normalizedPhone,
    webhookSecret,
    normalizedBaseUrl: `${url.origin}${url.pathname.replace(/\/+$/, "")}`,
  };
}

function providerGroup(provider: RevenueProvider): RevenueProvider[] {
  if (
    provider === "PAYLINK" ||
    provider === "NGENIUS" ||
    provider === "CUSTOM_PAYMENT"
  ) {
    return ["PAYLINK", "NGENIUS", "CUSTOM_PAYMENT"];
  }

  if (provider === "RESEND" || provider === "SMTP") {
    return ["RESEND", "SMTP"];
  }

  if (provider === "DIALOG360") {
    return ["DIALOG360"];
  }

  return [provider];
}

function normalizedProvider(value: string): RevenueProvider {
  const provider = value.trim().toUpperCase() as RevenueProvider;
  if (!REVENUE_PROVIDERS.includes(provider)) throw new Error("UNSUPPORTED_PROVIDER");
  return provider;
}

async function expectOk(response: Response, provider: RevenueProvider) {
  if (!response.ok) {
    const body = (await response.text()).slice(0, 800);
    throw new Error(`${provider}_HTTP_${response.status}:${body}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return { ok: true, body: (await response.text()).slice(0, 500) };
}

async function testProvider(provider: RevenueProvider, baseUrl: string | null, credentials: ProviderCredentials) {
  if (provider === "CUSTOM_PAYMENT") {
    return validateCustomPaymentCredentials(baseUrl, credentials);
  }

  if (provider === "DIALOG360") {
    const validated = validateDialog360Credentials(baseUrl, credentials);
    const response = await fetch(
      `${validated.normalizedBaseUrl}/health_status`,
      {
        headers: {
          "D360-API-KEY": validated.apiKey,
          Accept: "application/json",
          "User-Agent": "ORCA-CRM/1.0",
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
    return expectOk(response, provider);
  }

  if (provider === "RESEND") {
    const apiKey = providerValue(credentials, "apiKey");
    if (!apiKey) throw new Error("RESEND_API_KEY_REQUIRED");
    const response = await fetch(`${baseUrl || "https://api.resend.com"}/domains`, {
      headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "ORCA-CRM/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    return expectOk(response, provider);
  }

  if (provider === "PAYLINK") {
    const apiId = providerValue(credentials, "apiId");
    const secretKey = providerValue(credentials, "secretKey");
    if (!apiId || !secretKey) throw new Error("PAYLINK_API_ID_AND_SECRET_REQUIRED");
    const response = await fetch(`${baseUrl || "https://restpilot.paylink.sa"}/api/auth`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ apiId, secretKey, persistToken: false }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await expectOk(response, provider) as any;
    if (!result?.id_token) throw new Error("PAYLINK_TOKEN_NOT_RETURNED");
    return { authenticated: true };
  }

  if (provider === "NGENIUS") {
    const apiKey = providerValue(credentials, "apiKey");
    const outletId = providerValue(credentials, "outletId");
    if (!apiKey || !outletId) throw new Error("NGENIUS_API_KEY_AND_OUTLET_REQUIRED");
    const response = await fetch(`${baseUrl || "https://api-gateway.ngenius-payments.com"}/identity/auth/access-token`, {
      method: "POST",
      headers: { Authorization: `Basic ${apiKey}`, "content-type": "application/vnd.ni-identity.v1+json" },
      signal: AbortSignal.timeout(15_000),
    });
    const result = await expectOk(response, provider) as any;
    if (!result?.access_token) throw new Error("NGENIUS_ACCESS_TOKEN_NOT_RETURNED");
    return { authenticated: true, outletId };
  }

  if (provider === "MOYASAR") {
    const publishableKey = providerValue(credentials, "publishableKey");
    const secretKey = providerValue(credentials, "secretKey");
    if (!publishableKey || !secretKey) throw new Error("MOYASAR_PUBLISHABLE_AND_SECRET_REQUIRED");
    return { configured: true };
  }

  if (provider === "HYPERPAY") {
    const entityId = providerValue(credentials, "entityId");
    const bearerToken = providerValue(credentials, "bearerToken");
    if (!entityId || !bearerToken) throw new Error("HYPERPAY_ENTITY_AND_TOKEN_REQUIRED");
    return { configured: true };
  }

  if (provider === "PAYTABS") {
    const profileId = providerValue(credentials, "profileId");
    const serverKey = providerValue(credentials, "serverKey");
    if (!profileId || !serverKey) throw new Error("PAYTABS_PROFILE_AND_SERVER_KEY_REQUIRED");
    return { configured: true };
  }

  if (provider === "ZATCA") {
    const healthUrl = baseUrl || providerValue(credentials, "healthUrl");
    const binarySecurityToken = providerValue(credentials, "binarySecurityToken");
    const secret = providerValue(credentials, "secret");
    if (!healthUrl || !binarySecurityToken || !secret) throw new Error("ZATCA_PRODUCTION_CREDENTIALS_REQUIRED");
    const auth = Buffer.from(`${binarySecurityToken}:${secret}`).toString("base64");
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json", "Accept-Version": "V2" },
      signal: AbortSignal.timeout(15_000),
    });
    return expectOk(response, provider);
  }

  if (provider === "EJAR") {
    const healthUrl = baseUrl || providerValue(credentials, "healthUrl");
    const accessToken = providerValue(credentials, "accessToken");
    if (!healthUrl || !accessToken) throw new Error("EJAR_HEALTH_URL_AND_TOKEN_REQUIRED");
    const response = await fetch(healthUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    return expectOk(response, provider);
  }

  const healthUrl = baseUrl || providerValue(credentials, "healthUrl");
  const apiKey = providerValue(credentials, "apiKey");
  if (!healthUrl || !apiKey) throw new Error("SIGNATURE_HEALTH_URL_AND_KEY_REQUIRED");
  const response = await fetch(healthUrl, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  return expectOk(response, provider);
}


export async function getDefaultPaymentProviderRuntime(
  tenantId: string,
) {
  const connection =
    await rawPrisma.revenueProviderConnection.findFirst({
      where: {
        tenantId,
        isDefault: true,
        status: "CONNECTED",
        provider: { in: ["NGENIUS", "CUSTOM_PAYMENT", "PAYLINK"] },
      },
      orderBy: { updatedAt: "desc" },
    });

  if (!connection) {
    throw new Error(
      "DEFAULT_PAYMENT_PROVIDER_NOT_CONFIGURED",
    );
  }

  const provider = normalizedProvider(connection.provider);
  const credentials = decryptProviderCredentials(
    connection.encryptedCredentials,
  );

  if (provider === "CUSTOM_PAYMENT") {
    validateCustomPaymentCredentials(
      connection.baseUrl,
      credentials,
    );
  }

  if (
    provider === "NGENIUS" &&
    (!providerValue(credentials, "apiKey") ||
      !providerValue(credentials, "outletId"))
  ) {
    throw new Error(
      "NGENIUS_API_KEY_AND_OUTLET_REQUIRED",
    );
  }

  if (
    provider === "PAYLINK" &&
    (!providerValue(credentials, "apiId") ||
      !providerValue(credentials, "secretKey"))
  ) {
    throw new Error("PAYLINK_API_ID_AND_SECRET_REQUIRED");
  }

  return {
    connectionId: connection.id,
    tenantId: connection.tenantId,
    provider,
    baseUrl: connection.baseUrl,
    credentials,
  };
}

export async function getPaymentProviderRuntimeByConnectionId(
  connectionId: string,
) {
  const normalizedId = String(connectionId || "").trim();
  if (!normalizedId) {
    throw new Error("PAYMENT_PROVIDER_CONNECTION_ID_REQUIRED");
  }

  const connection =
    await rawPrisma.revenueProviderConnection.findFirst({
      where: {
        id: normalizedId,
        status: "CONNECTED",
      },
    });

  if (!connection) {
    throw new Error("PAYMENT_PROVIDER_CONNECTION_NOT_ACTIVE");
  }

  const provider = normalizedProvider(connection.provider);
  const credentials = decryptProviderCredentials(
    connection.encryptedCredentials,
  );

  if (provider === "CUSTOM_PAYMENT") {
    validateCustomPaymentCredentials(
      connection.baseUrl,
      credentials,
    );
  }

  return {
    connectionId: connection.id,
    tenantId: connection.tenantId,
    provider,
    baseUrl: connection.baseUrl,
    credentials,
  };
}

export async function saveProviderConnection(input: {
  tenantId: string;
  actorId: string;
  provider: string;
  baseUrl?: string | null;
  credentials: ProviderCredentials;
  isDefault?: boolean;
}) {
  const provider = normalizedProvider(input.provider);
  if (!input.credentials || Object.keys(input.credentials).length === 0) throw new Error("PROVIDER_CREDENTIALS_REQUIRED");
  if (provider === "CUSTOM_PAYMENT") {
    validateCustomPaymentCredentials(input.baseUrl, input.credentials);
  }
  if (provider === "DIALOG360") {
    validateDialog360Credentials(input.baseUrl, input.credentials);
  }
  const encryptedCredentials = encryptCredentials(input.credentials);
  const webhookSecret = providerValue(input.credentials, "webhookSecret");
  const webhookSecretHash = webhookSecret ? createHash("sha256").update(webhookSecret).digest("hex") : null;

  const existing = await rawPrisma.revenueProviderConnection.findFirst({
    where: { tenantId: input.tenantId, provider },
  });
  const existingMetadata =
    existing?.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const webhookToken =
    provider === "DIALOG360"
      ? String(existingMetadata.webhookToken || "").trim() ||
        randomBytes(24).toString("base64url")
      : null;
  const connectionMetadata =
    provider === "DIALOG360"
      ? { ...existingMetadata, webhookToken }
      : existingMetadata;

  const saved = existing
    ? await rawPrisma.revenueProviderConnection.update({
        where: { id: existing.id },
        data: {
          encryptedCredentials,
          credentialsVersion: { increment: 1 },
          baseUrl: input.baseUrl || null,
          isDefault: Boolean(input.isDefault),
          status: "PENDING",
          webhookSecretHash,
          metadata: connectionMetadata as any,
          lastError: null,
          updatedBy: input.actorId,
        },
      })
    : await rawPrisma.revenueProviderConnection.create({
        data: {
          tenantId: input.tenantId,
          provider,
          encryptedCredentials,
          baseUrl: input.baseUrl || null,
          isDefault: Boolean(input.isDefault),
          status: "PENDING",
          webhookSecretHash,
          metadata: connectionMetadata as any,
          createdBy: input.actorId,
          updatedBy: input.actorId,
        },
      });

  if (input.isDefault) {
    await rawPrisma.revenueProviderConnection.updateMany({
      where: {
        tenantId: input.tenantId,
        provider: {
          in: providerGroup(provider).filter(
            (candidate) => candidate !== provider,
          ),
        },
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  await appendRevenueEvent({
    tenantId: input.tenantId, actorId: input.actorId, aggregateType: "RevenueProviderConnection",
    aggregateId: saved.id, eventType: existing ? "PROVIDER_CREDENTIALS_ROTATED" : "PROVIDER_CONNECTION_CREATED",
    idempotencyKey: `provider-save:${saved.id}:v${saved.credentialsVersion}`,
    before: existing ? { ...existing, encryptedCredentials: "<redacted>" } : null,
    after: { ...saved, encryptedCredentials: "<redacted>" }, metadata: { provider },
  });

  return sanitizeConnection(saved);
}

export async function testProviderConnection(tenantId: string, actorId: string, providerValueInput: string) {
  const provider = normalizedProvider(providerValueInput);
  const connection = await rawPrisma.revenueProviderConnection.findFirst({ where: { tenantId, provider } });
  if (!connection || connection.status === "DISCONNECTED") throw new Error("PROVIDER_NOT_CONFIGURED");
  const credentials = decryptProviderCredentials(connection.encryptedCredentials);
  const testedAt = new Date();

  try {
    const result = await testProvider(provider, connection.baseUrl, credentials);
    const updated = await rawPrisma.revenueProviderConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", lastTestedAt: testedAt, lastSuccessAt: testedAt, lastError: null },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueProviderConnection", aggregateId: connection.id,
      eventType: "PROVIDER_CONNECTION_VERIFIED", idempotencyKey: `provider-test-success:${connection.id}:${testedAt.toISOString()}`,
      before: sanitizeConnection(connection), after: sanitizeConnection(updated), metadata: { provider, result },
    });
    return { connection: sanitizeConnection(updated), result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROVIDER_TEST_FAILED";
    const updated = await rawPrisma.revenueProviderConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastTestedAt: testedAt, lastError: message.slice(0, 2000) },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueProviderConnection", aggregateId: connection.id,
      eventType: "PROVIDER_CONNECTION_FAILED", idempotencyKey: `provider-test-failed:${connection.id}:${testedAt.toISOString()}`,
      before: sanitizeConnection(connection), after: sanitizeConnection(updated), metadata: { provider, error: message },
    });
    throw new Error(message);
  }
}

export async function disconnectProviderConnection(tenantId: string, actorId: string, providerValueInput: string) {
  const provider = normalizedProvider(providerValueInput);
  const connection = await rawPrisma.revenueProviderConnection.findFirst({ where: { tenantId, provider } });
  if (!connection) throw new Error("PROVIDER_NOT_CONFIGURED");
  const updated = await rawPrisma.revenueProviderConnection.update({
    where: { id: connection.id },
    data: { status: "DISCONNECTED", isDefault: false, lastError: null, updatedBy: actorId },
  });
  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueProviderConnection", aggregateId: connection.id,
    eventType: "PROVIDER_CONNECTION_DISCONNECTED", idempotencyKey: `provider-disconnected:${connection.id}:${updated.updatedAt.toISOString()}`,
    before: sanitizeConnection(connection), after: sanitizeConnection(updated), metadata: { provider },
  });
  return sanitizeConnection(updated);
}

export function sanitizeConnection(connection: any) {
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    provider: connection.provider,
    status: connection.status,
    baseUrl: connection.baseUrl,
    credentialsVersion: connection.credentialsVersion,
    isDefault: connection.isDefault,
    lastTestedAt: connection.lastTestedAt?.toISOString?.() || null,
    lastSuccessAt: connection.lastSuccessAt?.toISOString?.() || null,
    lastError: connection.lastError,
    hasWebhookSecret: Boolean(connection.webhookSecretHash),
    webhookToken:
      connection.provider === "DIALOG360" &&
      connection.metadata &&
      typeof connection.metadata === "object" &&
      !Array.isArray(connection.metadata) &&
      typeof connection.metadata.webhookToken === "string"
        ? connection.metadata.webhookToken
        : null,
    createdAt: connection.createdAt?.toISOString?.() || null,
    updatedAt: connection.updatedAt?.toISOString?.() || null,
  };
}

export async function listProviderConnections(tenantId: string) {
  const rows = await rawPrisma.revenueProviderConnection.findMany({ where: { tenantId }, orderBy: { provider: "asc" } });
  const map = new Map(rows.map((row: any) => [String(row.provider), sanitizeConnection(row)]));
  return REVENUE_PROVIDERS.map((provider) => map.get(provider) || {
    id: null, tenantId, provider, status: "NOT_CONFIGURED", baseUrl: null,
    credentialsVersion: 0, isDefault: false, lastTestedAt: null, lastSuccessAt: null,
    lastError: null, hasWebhookSecret: false, webhookToken: null, createdAt: null, updatedAt: null,
  });
}


export async function submitProviderApplication(input: {
  tenantId: string;
  actorId: string;
  provider: string;
  companyData: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  notes?: string;
}) {
  const provider = normalizedProvider(input.provider);
  if (!input.companyData || Object.keys(input.companyData).length === 0) {
    throw new Error("COMPANY_DATA_REQUIRED");
  }
  const submittedAt = new Date();
  const application = await rawPrisma.revenueProviderApplication.create({
    data: {
      tenantId: input.tenantId,
      provider,
      status: "SUBMITTED",
      companyData: input.companyData as any,
      documents: (input.documents || []) as any,
      notes: String(input.notes || "").trim() || null,
      submittedBy: input.actorId,
      submittedAt,
    },
  });
  await appendRevenueEvent({
    tenantId: input.tenantId,
    actorId: input.actorId,
    aggregateType: "RevenueProviderApplication",
    aggregateId: application.id,
    eventType: "PROVIDER_APPLICATION_SUBMITTED",
    idempotencyKey: `provider-application-submitted:${application.id}`,
    after: application,
    metadata: { provider },
  });
  return sanitizeApplication(application);
}

export async function listProviderApplications(tenantId: string) {
  const rows = await rawPrisma.revenueProviderApplication.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(sanitizeApplication);
}

export function sanitizeApplication(application: any) {
  return {
    id: application.id,
    provider: application.provider,
    status: application.status,
    companyData: application.companyData,
    documents: application.documents,
    notes: application.notes,
    externalReference: application.externalReference,
    submittedAt: application.submittedAt?.toISOString?.() || null,
    reviewedAt: application.reviewedAt?.toISOString?.() || null,
    decisionReason: application.decisionReason,
    createdAt: application.createdAt?.toISOString?.() || null,
    updatedAt: application.updatedAt?.toISOString?.() || null,
  };
}

function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a.replace(/^sha256=/i, ""), "hex");
    const right = Buffer.from(b.replace(/^sha256=/i, ""), "hex");
    return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function verifyAndStoreProviderWebhook(input: {
  connectionId: string;
  provider: string;
  externalEventId: string;
  rawBody: string;
  signature: string;
  payload: unknown;
}) {
  const provider = normalizedProvider(input.provider);
  const connection = await rawPrisma.revenueProviderConnection.findFirst({ where: { id: input.connectionId, provider } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("ACTIVE_PROVIDER_CONNECTION_REQUIRED");
  const credentials = decryptProviderCredentials(connection.encryptedCredentials);
  const secret = providerValue(credentials, "webhookSecret");
  if (!secret) throw new Error("WEBHOOK_SECRET_NOT_CONFIGURED");
  const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex");
  const verified = safeEqualHex(expected, input.signature);
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");

  const existing = await rawPrisma.revenueProviderWebhook.findFirst({ where: { tenantId: connection.tenantId, provider, externalEventId: input.externalEventId } });
  if (existing) return { duplicate: true, verified: existing.verified, id: existing.id, tenantId: existing.tenantId };

  const stored = await rawPrisma.revenueProviderWebhook.create({
    data: {
      tenantId: connection.tenantId,
      provider,
      connectionId: connection.id,
      externalEventId: input.externalEventId,
      payloadHash,
      verified,
      status: verified ? "VERIFIED" : "REJECTED",
      payload: input.payload as any,
      error: verified ? null : "INVALID_SIGNATURE",
      processedAt: verified ? new Date() : null,
    },
  });

  await appendRevenueEvent({
    tenantId: connection.tenantId, actorId: null, aggregateType: "RevenueProviderWebhook", aggregateId: stored.id,
    eventType: verified ? "PROVIDER_WEBHOOK_VERIFIED" : "PROVIDER_WEBHOOK_REJECTED",
    idempotencyKey: `provider-webhook:${provider}:${input.externalEventId}`,
    after: { id: stored.id, provider, externalEventId: input.externalEventId, verified, payloadHash },
    metadata: { provider },
  });

  if (!verified) throw new Error("INVALID_WEBHOOK_SIGNATURE");
  return { duplicate: false, verified: true, id: stored.id, tenantId: connection.tenantId };
}
