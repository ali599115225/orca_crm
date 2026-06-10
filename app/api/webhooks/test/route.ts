import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, route: "webhooks-test", time: Date.now() });
}

export async function POST() {
  return NextResponse.json({ ok: true, route: "webhooks-test-post" });
}
