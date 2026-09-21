import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import {
  createTikTokAuthorization,
  TIKTOK_OAUTH_NONCE_COOKIE,
} from "@/lib/marketing/tiktok-oauth";

const MARKETING_ROLES = [
  "ADMIN",
  "MARKETING",
  "SALES_MANAGER",
];

export async function GET(_request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  await assertServerActionRole(session, MARKETING_ROLES);
  const tenant = await getActiveTenant();

  const { authorizationUrl, nonce } =
    createTikTokAuthorization({
      tenantId: tenant.id,
      userId: session.userId as string,
    });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(TIKTOK_OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/api/integrations/tiktok/oauth",
  });

  return response;
}
