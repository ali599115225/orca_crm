import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import {
  decryptToken,
  encryptToken,
  getTokenFingerprint,
} from "@/lib/whatsapp/credential-service";

const GRAPH_VERSION = "v25.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const SIGNUP_TTL_MS = 10 * 60 * 1000;

type GraphErrorPayload = {
  error?: {
    message?: string;
    code?: number | string;
    error_subcode?: number | string;
  };
};

export class EmbeddedSignupError extends Error {
  constructor(
    public readonly code: string,
    message = code,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "EmbeddedSignupError";
  }
}

export interface EmbeddedSignupAdmin {
  tenantId: string;
  userId: string;
}

export interface EmbeddedSignupAssets {
  wabaId: string;
  phoneNumberId: string;
  businessId?: string | null;
}

export interface EmbeddedSignupPhone {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new EmbeddedSignupError(
      `WHATSAPP_ENV_MISSING_${name}`,
      `Missing ${name}`,
      503,
    );
  }

  return value;
}

function safeGraphMessage(payload: unknown) {
  const graph = payload as GraphErrorPayload;
  const message = String(graph?.error?.message || "").trim();

  return message
    ? message.slice(0, 240)
    : "Meta Graph API request failed";
}

async function parseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new EmbeddedSignupError(
      "WHATSAPP_META_INVALID_RESPONSE",
      "Meta returned an invalid response",
      502,
    );
  }
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new EmbeddedSignupError(
      "WHATSAPP_META_REQUEST_FAILED",
      safeGraphMessage(payload),
      502,
    );
  }

  return payload as T;
}

export function hashSignupState(state: string) {
  return createHash("sha256")
    .update(state, "utf8")
    .digest("hex");
}

export async function requireEmbeddedSignupAdmin(): Promise<EmbeddedSignupAdmin> {
  const session = await getSession();
  const sessionTenantId = String(session?.tenantId || "");
  const userId = String(session?.userId || "");

  if (!sessionTenantId || !userId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_UNAUTHORIZED",
      "Unauthorized",
      401,
    );
  }

  const tenant = await getActiveTenant();

  if (tenant.id !== sessionTenantId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_TENANT_MISMATCH",
      "Tenant mismatch",
      403,
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    throw new EmbeddedSignupError(
      "WHATSAPP_ADMIN_REQUIRED",
      "Administrator access is required",
      403,
    );
  }

  return {
    tenantId: tenant.id,
    userId,
  };
}

export async function requireEmbeddedSignupViewer() {
  const session = await getSession();
  const sessionTenantId = String(session?.tenantId || "");
  const userId = String(session?.userId || "");

  if (!sessionTenantId || !userId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_UNAUTHORIZED",
      "Unauthorized",
      401,
    );
  }

  const tenant = await getActiveTenant();

  if (tenant.id !== sessionTenantId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_TENANT_MISMATCH",
      "Tenant mismatch",
      403,
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new EmbeddedSignupError(
      "WHATSAPP_UNAUTHORIZED",
      "Unauthorized",
      401,
    );
  }

  return {
    tenantId: tenant.id,
    userId,
  };
}

export async function createEmbeddedSignupSession() {
  const actor = await requireEmbeddedSignupAdmin();
  const appId = requiredEnv("META_APP_ID");
  const configId = requiredEnv(
    "WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  );
  const redirectUri = requiredEnv(
    "WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI",
  );

  const state = randomBytes(32).toString("base64url");
  const stateHash = hashSignupState(state);
  const expiresAt = new Date(Date.now() + SIGNUP_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.whatsAppSignupSession.updateMany({
      where: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
      },
    });

    await tx.whatsAppSignupSession.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        stateHash,
        redirectUri,
        status: "PENDING",
        expiresAt,
      },
    });

    await tx.whatsAppIntegrationAudit.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: "SIGNUP_INITIATED",
        details: "Embedded Signup session created",
      },
    });
  });

  return {
    state,
    appId,
    configId,
    expiresAt: expiresAt.toISOString(),
  };
}

async function exchangeCode(code: string) {
  const appId = requiredEnv("META_APP_ID");
  const appSecret = requiredEnv("WHATSAPP_APP_SECRET");

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new EmbeddedSignupError(
      "WHATSAPP_CODE_EXCHANGE_FAILED",
      safeGraphMessage(payload),
      502,
    );
  }

  const accessToken = String(
    (payload as { access_token?: string }).access_token || "",
  ).trim();

  if (!accessToken) {
    throw new EmbeddedSignupError(
      "WHATSAPP_TOKEN_MISSING",
      "Meta did not return an access token",
      502,
    );
  }

  return accessToken;
}

async function validateToken(accessToken: string) {
  const appId = requiredEnv("META_APP_ID");
  const appSecret = requiredEnv("WHATSAPP_APP_SECRET");

  const url = new URL(`${GRAPH_BASE}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set(
    "access_token",
    `${appId}|${appSecret}`,
  );

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new EmbeddedSignupError(
      "WHATSAPP_TOKEN_VALIDATION_FAILED",
      safeGraphMessage(payload),
      502,
    );
  }

  const data = (
    payload as {
      data?: {
        app_id?: string;
        is_valid?: boolean;
      };
    }
  ).data;

  if (!data?.is_valid || String(data.app_id) !== appId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_TOKEN_INVALID",
      "The Meta token is invalid for this app",
      403,
    );
  }
}

async function validateAssets(
  accessToken: string,
  assets: EmbeddedSignupAssets,
) {
  const waba = await graphRequest<{ id?: string; name?: string }>(
    `/${encodeURIComponent(assets.wabaId)}?fields=id,name`,
    accessToken,
  );

  if (String(waba.id || "") !== assets.wabaId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_WABA_MISMATCH",
      "WABA validation failed",
      403,
    );
  }

  const phone = await graphRequest<EmbeddedSignupPhone>(
    `/${encodeURIComponent(
      assets.phoneNumberId,
    )}?fields=id,display_phone_number,verified_name,quality_rating`,
    accessToken,
  );

  if (String(phone.id || "") !== assets.phoneNumberId) {
    throw new EmbeddedSignupError(
      "WHATSAPP_PHONE_MISMATCH",
      "Phone number validation failed",
      403,
    );
  }

  return phone;
}

async function subscribeAppToWaba(
  accessToken: string,
  wabaId: string,
) {
  await graphRequest<{ success?: boolean }>(
    `/${encodeURIComponent(wabaId)}/subscribed_apps`,
    accessToken,
    {
      method: "POST",
    },
  );
}

async function markSignupFailed(
  stateHash: string,
  tenantId: string,
  userId: string,
  errorCode: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.whatsAppSignupSession.updateMany({
      where: {
        stateHash,
        tenantId,
        userId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
      },
    });

    await tx.whatsAppIntegrationAudit.create({
      data: {
        tenantId,
        userId,
        action: "SIGNUP_FAILED",
        details: errorCode.slice(0, 240),
      },
    });
  }).catch(() => {});
}

export async function completeEmbeddedSignup(input: {
  state: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string | null;
}) {
  const actor = await requireEmbeddedSignupAdmin();
  const state = input.state.trim();
  const stateHash = hashSignupState(state);

  if (
    !state ||
    !input.code.trim() ||
    !/^\d+$/.test(input.wabaId) ||
    !/^\d+$/.test(input.phoneNumberId) ||
    (input.businessId &&
      !/^\d+$/.test(input.businessId))
  ) {
    throw new EmbeddedSignupError(
      "WHATSAPP_SIGNUP_INVALID_PAYLOAD",
      "Invalid Embedded Signup payload",
      400,
    );
  }

  const signupSession =
    await prisma.whatsAppSignupSession.findUnique({
      where: {
        stateHash,
      },
    });

  if (
    !signupSession ||
    signupSession.tenantId !== actor.tenantId ||
    signupSession.userId !== actor.userId ||
    signupSession.status !== "PENDING" ||
    signupSession.expiresAt.getTime() <= Date.now()
  ) {
    throw new EmbeddedSignupError(
      "WHATSAPP_SIGNUP_SESSION_INVALID",
      "Embedded Signup session is invalid or expired",
      403,
    );
  }

  const assets: EmbeddedSignupAssets = {
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    businessId: input.businessId || null,
  };

  try {
    const accessToken = await exchangeCode(input.code.trim());
    await validateToken(accessToken);
    const phone = await validateAssets(accessToken, assets);

    const [wabaOwner, phoneOwner] = await Promise.all([
      prisma.whatsAppConnection.findUnique({
        where: {
          wabaId: assets.wabaId,
        },
        select: {
          tenantId: true,
        },
      }),
      prisma.whatsAppPhoneNumber.findUnique({
        where: {
          phoneNumberId: assets.phoneNumberId,
        },
        select: {
          tenantId: true,
        },
      }),
    ]);

    if (
      (wabaOwner &&
        wabaOwner.tenantId !== actor.tenantId) ||
      (phoneOwner &&
        phoneOwner.tenantId !== actor.tenantId)
    ) {
      throw new EmbeddedSignupError(
        "WHATSAPP_ASSET_ALREADY_ASSIGNED",
        "This WhatsApp asset is assigned to another tenant",
        409,
      );
    }

    await subscribeAppToWaba(
      accessToken,
      assets.wabaId,
    );

    const encrypted = encryptToken(accessToken);
    const tokenFingerprint =
      getTokenFingerprint(accessToken);
    const now = new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        const connection =
          await tx.whatsAppConnection.upsert({
            where: {
              tenantId: actor.tenantId,
            },
            create: {
              tenantId: actor.tenantId,
              status: "ACTIVE",
              wabaId: assets.wabaId,
              activeSince: now,
              lastHealthCheck: now,
            },
            update: {
              status: "ACTIVE",
              wabaId: assets.wabaId,
              activeSince: now,
              disconnectedAt: null,
              lastHealthCheck: now,
            },
          });

        await tx.whatsAppCredential.updateMany({
          where: {
            connectionId: connection.id,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: now,
          },
        });

        const credential =
          await tx.whatsAppCredential.create({
            data: {
              connectionId: connection.id,
              encryptedValue:
                encrypted.encryptedValue,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              algorithm: encrypted.algorithm,
              keyVersion: encrypted.keyVersion,
              tokenFingerprint,
              issuedAt: now,
              lastValidatedAt: now,
              isActive: true,
            },
          });

        await tx.whatsAppPhoneNumber.updateMany({
          where: {
            tenantId: actor.tenantId,
            connectionId: connection.id,
          },
          data: {
            isPrimary: false,
            isActive: false,
          },
        });

        const phoneNumber =
          await tx.whatsAppPhoneNumber.upsert({
            where: {
              phoneNumberId:
                assets.phoneNumberId,
            },
            create: {
              tenantId: actor.tenantId,
              connectionId: connection.id,
              phoneNumberId:
                assets.phoneNumberId,
              displayPhoneNumber:
                phone.display_phone_number || null,
              verifiedName:
                phone.verified_name || null,
              qualityRating:
                phone.quality_rating || null,
              wabaId: assets.wabaId,
              businessAccountId:
                assets.businessId || null,
              isActive: true,
              isPrimary: true,
            },
            update: {
              tenantId: actor.tenantId,
              connectionId: connection.id,
              displayPhoneNumber:
                phone.display_phone_number || null,
              verifiedName:
                phone.verified_name || null,
              qualityRating:
                phone.quality_rating || null,
              wabaId: assets.wabaId,
              businessAccountId:
                assets.businessId || null,
              isActive: true,
              isPrimary: true,
            },
          });

        await tx.whatsAppSignupSession.update({
          where: {
            id: signupSession.id,
          },
          data: {
            connectionId: connection.id,
            status: "COMPLETED",
            completedAt: now,
          },
        });

        await tx.tenant.update({
          where: {
            id: actor.tenantId,
          },
          data: {
            whatsappConnected: true,
          },
        });

        await tx.whatsAppIntegrationAudit.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.userId,
            connectionId: connection.id,
            credentialId: credential.id,
            phoneNumberId:
              phoneNumber.phoneNumberId,
            action: "SIGNUP_COMPLETED",
            details:
              "Embedded Signup completed and WABA subscribed",
          },
        });

        return {
          connection,
          phoneNumber,
        };
      },
    );

    return {
      connected: true,
      displayPhoneNumber:
        result.phoneNumber.displayPhoneNumber,
      verifiedName: result.phoneNumber.verifiedName,
      qualityRating:
        result.phoneNumber.qualityRating,
    };
  } catch (error) {
    const code =
      error instanceof EmbeddedSignupError
        ? error.code
        : "WHATSAPP_SIGNUP_FAILED";

    await markSignupFailed(
      stateHash,
      actor.tenantId,
      actor.userId,
      code,
    );

    throw error;
  }
}

export async function getEmbeddedSignupStatus() {
  const actor = await requireEmbeddedSignupViewer();

  const connection =
    await prisma.whatsAppConnection.findUnique({
      where: {
        tenantId: actor.tenantId,
      },
      select: {
        status: true,
        activeSince: true,
        lastHealthCheck: true,
        phoneNumbers: {
          where: {
            isActive: true,
            isPrimary: true,
          },
          take: 1,
          select: {
            displayPhoneNumber: true,
            verifiedName: true,
            qualityRating: true,
          },
        },
        credentials: {
          where: {
            isActive: true,
            revokedAt: null,
          },
          take: 1,
          select: {
            lastValidatedAt: true,
          },
        },
      },
    });

  const phone = connection?.phoneNumbers[0];
  const hasCredential =
    Boolean(connection?.credentials[0]);
  const connected =
    connection?.status === "ACTIVE" &&
    Boolean(phone) &&
    hasCredential;

  return {
    connected,
    status:
      connection?.status || "DISCONNECTED",
    displayPhoneNumber:
      phone?.displayPhoneNumber || null,
    verifiedName: phone?.verifiedName || null,
    qualityRating: phone?.qualityRating || null,
    activeSince:
      connection?.activeSince?.toISOString() || null,
    lastHealthCheck:
      connection?.lastHealthCheck?.toISOString() ||
      null,
  };
}

export async function disconnectEmbeddedSignup() {
  const actor = await requireEmbeddedSignupAdmin();

  const connection =
    await prisma.whatsAppConnection.findUnique({
      where: {
        tenantId: actor.tenantId,
      },
      include: {
        credentials: {
          where: {
            isActive: true,
            revokedAt: null,
          },
          orderBy: {
            issuedAt: "desc",
          },
          take: 1,
        },
      },
    });

  if (!connection) {
    return {
      disconnected: true,
    };
  }

  const credential = connection.credentials[0];

  if (
    credential &&
    connection.wabaId &&
    connection.status === "ACTIVE"
  ) {
    const accessToken = decryptToken(credential);

    await graphRequest<{ success?: boolean }>(
      `/${encodeURIComponent(
        connection.wabaId,
      )}/subscribed_apps`,
      accessToken,
      {
        method: "DELETE",
      },
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.whatsAppCredential.updateMany({
      where: {
        connectionId: connection.id,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: now,
      },
    });

    await tx.whatsAppPhoneNumber.updateMany({
      where: {
        tenantId: actor.tenantId,
        connectionId: connection.id,
      },
      data: {
        isActive: false,
        isPrimary: false,
      },
    });

    await tx.whatsAppConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: now,
      },
    });

    await tx.tenant.update({
      where: {
        id: actor.tenantId,
      },
      data: {
        whatsappConnected: false,
      },
    });

    await tx.whatsAppIntegrationAudit.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        connectionId: connection.id,
        action: "DISCONNECTED",
        details:
          "Embedded Signup connection disconnected",
      },
    });
  });

  return {
    disconnected: true,
  };
}

export function toEmbeddedSignupError(error: unknown) {
  if (error instanceof EmbeddedSignupError) {
    return error;
  }

  return new EmbeddedSignupError(
    "WHATSAPP_SIGNUP_INTERNAL_ERROR",
    "WhatsApp integration failed",
    500,
  );
}