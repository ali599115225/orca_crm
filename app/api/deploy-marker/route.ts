import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const expectedSecret = process.env.CRON_SECRET?.trim() ?? '';

  if (
    !expectedSecret ||
    !providedSecret ||
    !secureEqual(providedSecret, expectedSecret)
  ) {
    return NextResponse.json(
      { error: 'Not Found' },
      {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
