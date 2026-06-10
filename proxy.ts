import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  api: { windowMs: 60_000, maxRequests: 60 },
  webhook: { windowMs: 60_000, maxRequests: 30 },
  auth: { windowMs: 60_000, maxRequests: 10 },
  default: { windowMs: 60_000, maxRequests: 120 },
};

function getConfig(pathname: string) {
  if (pathname.startsWith("/api/whatsapp/webhook")) return RATE_LIMIT_CONFIG.webhook;
  if (pathname.startsWith("/api/v1/auth")) return RATE_LIMIT_CONFIG.auth;
  if (pathname.startsWith("/api/")) return RATE_LIMIT_CONFIG.api;
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const config = getConfig(pathname);
  if (!config) return NextResponse.next();

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, config.maxRequests - entry.count)));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

  if (entry.count > config.maxRequests) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: Object.fromEntries(response.headers) }
    );
  }

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
