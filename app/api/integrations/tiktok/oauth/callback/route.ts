import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { encryptText } from "@/lib/crypto";
import {
  exchangeTikTokAuthCode,
  fetchTikTokAdvertisers,
  TIKTOK_OAUTH_NONCE_COOKIE,
  TIKTOK_OAUTH_PENDING_COOKIE,
  verifyTikTokState,
} from "@/lib/marketing/tiktok-oauth";
import { saveTikTokConnection } from "@/lib/marketing/tiktok-connection";
import {
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";

const MARKETING_ROLES = [
  "ADMIN",
  "MARKETING",
  "SALES_MANAGER",
];

function settingsUrl(
  request: NextRequest,
  params: Record<string, string>,
): URL {
  const url = new URL("/operations/settings", request.url);
  url.searchParams.set("tab", "advertising");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function publicErrorCode(error: unknown): string {
  const code =
    error instanceof MarketingProviderError
      ? error.code
      : "TIKTOK_OAUTH_FAILED";

  return code
    .replace(/[^A-Z0-9_:.-]/gi, "")
    .slice(0, 120);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      throw new MarketingProviderError("UNAUTHORIZED", "TIKTOK");
    }

    await assertServerActionRole(session, MARKETING_ROLES);
    const tenant = await getActiveTenant();

    const state = request.nextUrl.searchParams.get("state") ?? "";
    const authCode =
      request.nextUrl.searchParams.get("auth_code") ??
      request.nextUrl.searchParams.get("code") ??
      "";

    if (!state || !authCode) {
      throw new MarketingProviderError(
        "TIKTOK_CALLBACK_PARAMETERS_MISSING",
        "TIKTOK",
      );
    }

    const statePayload = verifyTikTokState(state);
    const cookieNonce = request.cookies.get(
      TIKTOK_OAUTH_NONCE_COOKIE,
    )?.value;

    if (
      !cookieNonce ||
      cookieNonce !== statePayload.nonce ||
      statePayload.tenantId !== tenant.id ||
      statePayload.userId !== session.userId
    ) {
      throw new MarketingProviderError(
        "TIKTOK_OAUTH_CONTEXT_MISMATCH",
        "TIKTOK",
      );
    }

    const { accessToken } =
      await exchangeTikTokAuthCode(authCode);

    const advertisers =
      await fetchTikTokAdvertisers(accessToken);

    if (advertisers.length === 0) {
      throw new MarketingProviderError(
        "TIKTOK_ADVERTISER_NOT_FOUND",
        "TIKTOK",
      );
    }

    if (advertisers.length === 1) {
      await saveTikTokConnection({
        tenantId: tenant.id,
        userId: session.userId as string,
        advertiserId: advertisers[0].advertiserId,
        accessToken,
      });

      const response = NextResponse.redirect(
        settingsUrl(request, {
          tiktok: "connected",
        }),
      );

      response.cookies.delete(TIKTOK_OAUTH_NONCE_COOKIE);
      return response;
    }

    const encryptedPendingAuthorization = encryptText(
      JSON.stringify({
        tenantId: tenant.id,
        userId: session.userId,
        accessToken,
        advertisers,
        expiresAt: Date.now() + 10 * 60 * 1000,
      }),
    );

    const response = NextResponse.redirect(
      settingsUrl(request, {
        tiktok: "select",
      }),
    );

    response.cookies.set(
      TIKTOK_OAUTH_PENDING_COOKIE,
      encryptedPendingAuthorization,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/api/integrations/tiktok/oauth",
      },
    );

    response.cookies.delete(TIKTOK_OAUTH_NONCE_COOKIE);
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      settingsUrl(request, {
        tiktok: "error",
        code: publicErrorCode(error),
      }),
    );

    response.cookies.delete(TIKTOK_OAUTH_NONCE_COOKIE);
    return response;
  }
}
