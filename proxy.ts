import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  api: { windowMs: 60_000, maxRequests: 60 },
  webhook: { windowMs: 60_000, maxRequests: 30 },
  auth: { windowMs: 60_000, maxRequests: 30 },
  serverAction: { windowMs: 60_000, maxRequests: 30 },
  default: { windowMs: 60_000, maxRequests: 120 },
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get("x-request-id")?.trim();

  return incoming && REQUEST_ID_PATTERN.test(incoming)
    ? incoming
    : globalThis.crypto.randomUUID();
}

function getConfig(pathname: string, method: string) {
  if (pathname.startsWith("/api/whatsapp/webhook")) return RATE_LIMIT_CONFIG.webhook;
  if (pathname.startsWith("/api/v1/auth")) return RATE_LIMIT_CONFIG.auth;
  if (pathname.startsWith("/api/")) return RATE_LIMIT_CONFIG.api;

  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    if (
      pathname.startsWith("/operations/") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/dashboard/") ||
      pathname.startsWith("/contract/")
    ) {
      return RATE_LIMIT_CONFIG.serverAction;
    }
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const requestId = resolveRequestId(request);
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-request-id", requestId);

  const config = getConfig(pathname, request.method);

  if (!config) {
    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });

    response.headers.set("x-request-id", requestId);
    return response;
  }

  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };

    rateLimitMap.set(key, entry);
  }

  entry.count++;

  const headers = {
    "x-request-id": requestId,
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(
      Math.max(0, config.maxRequests - entry.count),
    ),
    "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
  };

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return NextResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        messageAr: "طلبات كثيرة جداً. حاول لاحقاً.",
        messageEn: "Too many requests. Try again later.",
        requestId,
        error: {
          code: "RATE_LIMITED",
          message: "طلبات كثيرة جداً. حاول لاحقاً.",
          requestId,
        },
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};