import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

  const result: any = {
    hasAccessToken: !!accessToken,
    hasPhoneNumberId: !!phoneNumberId,
    hasBusinessAccountId: !!businessAccountId,
    phoneNumberId,
  };

  if (accessToken && phoneNumberId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}?fields=id,display_phone_number,quality_rating,verified_name,code_verification_status`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      result.metaReachable = true;
      result.httpStatus = res.status;
      const body = await res.text();
      try { result.body = JSON.parse(body); } catch { result.body = body.substring(0, 300); }
    } catch (err: any) {
      result.metaReachable = false;
      result.error = err.message;
    }
  } else {
    result.metaReachable = false;
    result.error = "Missing credentials";
  }

  return NextResponse.json(result);
}
