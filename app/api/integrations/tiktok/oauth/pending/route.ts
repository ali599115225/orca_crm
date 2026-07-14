import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { decryptText } from "@/lib/crypto";
import {
  TIKTOK_OAUTH_PENDING_COOKIE,
  type TikTokAdvertiser,
} from "@/lib/marketing/tiktok-oauth";
import { saveTikTokConnection } from "@/lib/marketing/tiktok-connection";
import {
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";

const MARKETING_ROLES = [
  "ADMIN",
  "owner",
  "MARKETING",
  "SALES_MANAGER",
];

interface PendingAuthorization {
  tenantId: string;
  userId: string;
  accessToken: string;
  advertisers: TikTokAdvertiser[];
  expiresAt: number;
}

async function readPending(
  request: NextRequest,
): Promise<PendingAuthorization> {
  const session = await getSession();

  if (!session) {
    throw new MarketingProviderError("UNAUTHORIZED", "TIKTOK");
  }

  await assertServerActionRole(session, MARKETING_ROLES);
  const tenant = await getActiveTenant();

  const encrypted = request.cookies.get(
    TIKTOK_OAUTH_PENDING_COOKIE,
  )?.value;

  if (!encrypted) {
    throw new MarketingProviderError(
      "TIKTOK_PENDING_AUTHORIZATION_NOT_FOUND",
      "TIKTOK",
    );
  }

  let pending: PendingAuthorization;

  try {
    const decrypted = decryptText(encrypted);

    if (!decrypted) throw new Error("EMPTY");

    pending = JSON.parse(decrypted) as PendingAuthorization;
  } catch {
    throw new MarketingProviderError(
      "TIKTOK_PENDING_AUTHORIZATION_INVALID",
      "TIKTOK",
    );
  }

  if (
    pending.expiresAt < Date.now() ||
    pending.tenantId !== tenant.id ||
    pending.userId !== session.userId
  ) {
    throw new MarketingProviderError(
      "TIKTOK_PENDING_AUTHORIZATION_EXPIRED",
      "TIKTOK",
    );
  }

  return pending;
}

export async function GET(request: NextRequest) {
  try {
    const pending = await readPending(request);

    return NextResponse.json({
      success: true,
      data: pending.advertisers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof MarketingProviderError
            ? error.code
            : "TIKTOK_PENDING_LOAD_FAILED",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      throw new MarketingProviderError("UNAUTHORIZED", "TIKTOK");
    }

    const tenant = await getActiveTenant();
    const pending = await readPending(request);
    const body = (await request.json()) as {
      advertiserId?: string;
    };

    const advertiser = pending.advertisers.find(
      (item) => item.advertiserId === body.advertiserId,
    );

    if (!advertiser) {
      throw new MarketingProviderError(
        "TIKTOK_ADVERTISER_SELECTION_INVALID",
        "TIKTOK",
      );
    }

    await saveTikTokConnection({
      tenantId: tenant.id,
      userId: session.userId as string,
      advertiserId: advertiser.advertiserId,
      accessToken: pending.accessToken,
    });

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.delete(TIKTOK_OAUTH_PENDING_COOKIE);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof MarketingProviderError
            ? error.code
            : "TIKTOK_CONNECTION_COMPLETE_FAILED",
      },
      { status: 400 },
    );
  }
}
