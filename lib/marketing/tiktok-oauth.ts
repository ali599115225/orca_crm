import "server-only";

import crypto from "node:crypto";
import {
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";

const TIKTOK_AUTH_URL =
  "https://business-api.tiktok.com/portal/auth";
const TIKTOK_API_ROOT =
  "https://business-api.tiktok.com/open_api/v1.3";

export const TIKTOK_OAUTH_NONCE_COOKIE =
  "orca_tiktok_oauth_nonce";
export const TIKTOK_OAUTH_PENDING_COOKIE =
  "orca_tiktok_oauth_pending";

export interface TikTokAdvertiser {
  advertiserId: string;
  advertiserName: string;
}

interface TikTokStatePayload {
  tenantId: string;
  userId: string;
  nonce: string;
  expiresAt: number;
}

interface TikTokTokenResponse {
  accessToken: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new MarketingProviderError(
      `TIKTOK_CONFIGURATION_REQUIRED:${name}`,
      "TIKTOK",
    );
  }

  return value;
}

export function getTikTokOAuthConfig() {
  const appId = requiredEnv("TIKTOK_APP_ID");
  const appSecret = requiredEnv("TIKTOK_APP_SECRET");
  const stateSecret = requiredEnv("TIKTOK_OAUTH_STATE_SECRET");
  const redirectUri = requiredEnv("TIKTOK_REDIRECT_URI");

  if (stateSecret.length < 32) {
    throw new MarketingProviderError(
      "TIKTOK_STATE_SECRET_TOO_SHORT",
      "TIKTOK",
    );
  }

  const parsedRedirect = new URL(redirectUri);

  if (parsedRedirect.protocol !== "https:") {
    throw new MarketingProviderError(
      "TIKTOK_REDIRECT_URI_MUST_USE_HTTPS",
      "TIKTOK",
    );
  }

  return {
    appId,
    appSecret,
    stateSecret,
    redirectUri: parsedRedirect.toString(),
  };
}

function signState(encodedPayload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

export function createTikTokAuthorization(input: {
  tenantId: string;
  userId: string;
}): {
  authorizationUrl: URL;
  nonce: string;
} {
  const config = getTikTokOAuthConfig();
  const nonce = crypto.randomBytes(24).toString("base64url");

  const payload: TikTokStatePayload = {
    tenantId: input.tenantId,
    userId: input.userId,
    nonce,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");

  const signature = signState(
    encodedPayload,
    config.stateSecret,
  );

  const state = `${encodedPayload}.${signature}`;
  const authorizationUrl = new URL(TIKTOK_AUTH_URL);

  authorizationUrl.searchParams.set("app_id", config.appId);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set(
    "redirect_uri",
    config.redirectUri,
  );

  return {
    authorizationUrl,
    nonce,
  };
}

export function verifyTikTokState(
  state: string,
): TikTokStatePayload {
  const config = getTikTokOAuthConfig();
  const [encodedPayload, suppliedSignature, ...extra] =
    state.split(".");

  if (
    !encodedPayload ||
    !suppliedSignature ||
    extra.length > 0
  ) {
    throw new MarketingProviderError(
      "TIKTOK_OAUTH_STATE_INVALID",
      "TIKTOK",
    );
  }

  const expectedSignature = signState(
    encodedPayload,
    config.stateSecret,
  );

  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);

  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    throw new MarketingProviderError(
      "TIKTOK_OAUTH_STATE_INVALID",
      "TIKTOK",
    );
  }

  let payload: TikTokStatePayload;

  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as TikTokStatePayload;
  } catch {
    throw new MarketingProviderError(
      "TIKTOK_OAUTH_STATE_INVALID",
      "TIKTOK",
    );
  }

  if (
    !payload.tenantId ||
    !payload.userId ||
    !payload.nonce ||
    !payload.expiresAt ||
    payload.expiresAt < Date.now()
  ) {
    throw new MarketingProviderError(
      "TIKTOK_OAUTH_STATE_EXPIRED",
      "TIKTOK",
    );
  }

  return payload;
}

async function readTikTokResponse<T>(
  response: Response,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | {
        code?: number;
        message?: string;
        data?: T;
        access_token?: string;
      }
    | null;

  if (
    !response.ok ||
    !payload ||
    (typeof payload.code === "number" && payload.code !== 0)
  ) {
    throw new MarketingProviderError(
      `TIKTOK_HTTP_${response.status}`,
      "TIKTOK",
      response.status >= 500,
    );
  }

  return (payload.data ?? payload) as T;
}

export async function exchangeTikTokAuthCode(
  authCode: string,
): Promise<TikTokTokenResponse> {
  const config = getTikTokOAuthConfig();

  const response = await fetch(
    `${TIKTOK_API_ROOT}/oauth2/access_token/`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        app_id: config.appId,
        secret: config.appSecret,
        auth_code: authCode,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  const data = await readTikTokResponse<{
    access_token?: string;
  }>(response);

  const accessToken = data.access_token?.trim();

  if (!accessToken) {
    throw new MarketingProviderError(
      "TIKTOK_ACCESS_TOKEN_MISSING",
      "TIKTOK",
    );
  }

  return { accessToken };
}

export async function fetchTikTokAdvertisers(
  accessToken: string,
): Promise<TikTokAdvertiser[]> {
  const config = getTikTokOAuthConfig();

  const url = new URL(
    `${TIKTOK_API_ROOT}/oauth2/advertiser/get/`,
  );

  url.searchParams.set("app_id", config.appId);
  url.searchParams.set("secret", config.appSecret);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Access-Token": accessToken,
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const data = await readTikTokResponse<{
    list?: Array<{
      advertiser_id?: string;
      advertiser_name?: string;
    }>;
    advertiser_list?: Array<{
      advertiser_id?: string;
      advertiser_name?: string;
    }>;
    advertiser_ids?: string[];
  }>(response);

  const rawList = data.list ?? data.advertiser_list ?? [];

  const advertisers = rawList
    .map((item) => ({
      advertiserId: String(item.advertiser_id ?? "").trim(),
      advertiserName:
        String(item.advertiser_name ?? "").trim() ||
        String(item.advertiser_id ?? "").trim(),
    }))
    .filter((item) => item.advertiserId);

  for (const advertiserId of data.advertiser_ids ?? []) {
    if (
      advertiserId &&
      !advertisers.some(
        (item) => item.advertiserId === advertiserId,
      )
    ) {
      advertisers.push({
        advertiserId,
        advertiserName: advertiserId,
      });
    }
  }

  return advertisers;
}
