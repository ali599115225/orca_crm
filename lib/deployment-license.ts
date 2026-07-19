import { createVerify } from "node:crypto";
import {
normalizeLicenseMode,
type LicenseMode,
} from "@/lib/agents/entitlements";
import { isLegacySaasEnabled } from "@/lib/platform-operating-model";

export interface DeploymentLicensePayload {
version: 1;
deploymentId: string;
customerId: string;
licenseMode: LicenseMode;
edition: "SAAS" | "FULL";
issuedAt: string;
expiresAt: string | null;
}

export interface ResolvedDeploymentLicense {
mode: LicenseMode;
valid: boolean;
source: "SIGNED" | "DEVELOPMENT" | "DEFAULT";
payload: DeploymentLicensePayload | null;
reason: string | null;
}

let cachedLicense: ResolvedDeploymentLicense | null = null;

function defaultSingleCompanyBoundary(reason: string): ResolvedDeploymentLicense {
return {
mode: "DEDICATED_COPY",
valid: false,
source: "DEFAULT",
payload: null,
reason,
};
}

function parsePayload(token: string): DeploymentLicensePayload {
const decoded = Buffer.from(token, "base64url").toString("utf8");
const parsed = JSON.parse(decoded) as Partial<DeploymentLicensePayload>;

if (
parsed.version !== 1 ||
typeof parsed.deploymentId !== "string" ||
typeof parsed.customerId !== "string" ||
typeof parsed.issuedAt !== "string" ||
!("expiresAt" in parsed)
) {
throw new Error("INVALID_LICENSE_PAYLOAD");
}

const licenseMode = normalizeLicenseMode(parsed.licenseMode);

return {
version: 1,
deploymentId: parsed.deploymentId,
customerId: parsed.customerId,
licenseMode,
edition: licenseMode === "DEDICATED_COPY" ? "FULL" : "SAAS",
issuedAt: parsed.issuedAt,
expiresAt:
typeof parsed.expiresAt === "string" ? parsed.expiresAt : null,
};
}

function isExpired(expiresAt: string | null): boolean {
if (!expiresAt) {
return false;
}

const timestamp = Date.parse(expiresAt);
return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

export function resolveDeploymentLicense(): ResolvedDeploymentLicense {
if (cachedLicense) {
return cachedLicense;
}

const payloadToken = process.env.ORCA_LICENSE_PAYLOAD?.trim();
const signatureToken = process.env.ORCA_LICENSE_SIGNATURE?.trim();
const publicKeyRaw = process.env.ORCA_LICENSE_PUBLIC_KEY?.trim();

if (payloadToken || signatureToken || publicKeyRaw) {
if (!payloadToken || !signatureToken || !publicKeyRaw) {
cachedLicense = defaultSingleCompanyBoundary(
"INCOMPLETE_SIGNED_LICENSE_CONFIGURATION",
);
return cachedLicense;
}

try {
  const publicKey = publicKeyRaw.replace(/\\n/g, "\n");
  const verifier = createVerify("RSA-SHA256");

  verifier.update(payloadToken);
  verifier.end();

  const signatureValid = verifier.verify(
    publicKey,
    Buffer.from(signatureToken, "base64url"),
  );

  if (!signatureValid) {
    cachedLicense = defaultSingleCompanyBoundary("INVALID_LICENSE_SIGNATURE");
    return cachedLicense;
  }

  const payload = parsePayload(payloadToken);

  if (payload.licenseMode === "SAAS" && !isLegacySaasEnabled()) {
    cachedLicense = defaultSingleCompanyBoundary("SAAS_LICENSE_MODE_OUT_OF_SCOPE");
    return cachedLicense;
  }

  if (isExpired(payload.expiresAt)) {
    cachedLicense = defaultSingleCompanyBoundary("LICENSE_EXPIRED");
    return cachedLicense;
  }

  cachedLicense = {
    mode: payload.licenseMode,
    valid: true,
    source: "SIGNED",
    payload,
    reason: null,
  };

  return cachedLicense;
} catch {
  cachedLicense = defaultSingleCompanyBoundary("INVALID_SIGNED_LICENSE");
  return cachedLicense;
}

}

const developmentMode = normalizeLicenseMode(
process.env.ORCA_LICENSE_MODE,
);

if (developmentMode === "DEDICATED_COPY") {
cachedLicense = {
mode: "DEDICATED_COPY",
valid: true,
source: "DEVELOPMENT",
payload: null,
reason: null,
};

return cachedLicense;

}

cachedLicense = defaultSingleCompanyBoundary("NO_LICENSE_ASSUMED");
return cachedLicense;
}

export function getDeploymentLicenseMode(): LicenseMode {
return resolveDeploymentLicense().mode;
}

export function isDedicatedCopyDeployment(): boolean {
return getDeploymentLicenseMode() === "DEDICATED_COPY";
}


