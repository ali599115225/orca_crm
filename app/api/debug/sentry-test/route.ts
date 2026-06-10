import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dsnSet = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  const dsnPreview = dsnSet
    ? ((process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "").substring(0, 30) + "...")
    : "NOT SET";

  throw new Error("ORCA_SENTRY_TEST_" + Date.now() + "_DSN=" + (dsnSet ? "SET" : "NOT_SET") + "_" + dsnPreview);
}
