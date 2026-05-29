// proxy.ts
// 🛡️ ORCA CRM - الوسيط المعماري الصارم الموحد
// يجمع بين: WAF، عزل المستأجرين، حماية الجلسات، حقن X-Headers
// Next.js 16 يستخدم proxy.ts بدلاً من middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ─── الإعدادات العامة ───────────────────────────────────────────────────────

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

// النطاقات الحاكمة — مقروءة من متغيرات البيئة
const PRODUCTION_DOMAIN =
  process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || "orca.az-ez.pro";
const FALLBACK_URL =
  process.env.NEXT_PUBLIC_FALLBACK_URL || "https://safe-ali.orca.pro";
const SAFE_MODE_ENABLED =
  process.env.SAFE_MODE_ENABLED === "true";
const MAINTENANCE_MODE =
  process.env.MAINTENANCE_MODE === "true";

// النطاقات التي لا تُعتبر نطاقاً فرعياً لمستأجر
const PLATFORM_SUBDOMAINS = new Set([
  "orca", "www", "app", "api", "admin", "safe",
  "orca-crm", "dar-al-amar",
]);

// ─── WAF: أنماط الهجمات الشائعة ────────────────────────────────────────────

const MALICIOUS_PATTERNS = [
  /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bDELETE\b)\s+/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /\.\.\//g,
  /etc\/passwd/gi,
];

// ─── رؤوس الأمان القياسية ───────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Powered-By", "Orca CRM");
  return response;
}

// ─── استخراج النطاق الفرعي ──────────────────────────────────────────────────

function extractSubdomain(host: string): string | null {
  const cleanHost = host.split(":")[0];
  const parts = cleanHost.split(".");

  if (cleanHost.endsWith(".vercel.app")) return null;
  if (parts.length < 3) return null;

  const sub = parts[0];
  if (PLATFORM_SUBDOMAINS.has(sub)) return null;
  return sub;
}

// ─── التحقق من الجلسة ───────────────────────────────────────────────────────

async function verifySession(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

// ─── الوكيل الرئيسي (Proxy) ─────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // 1️⃣ WAF: رفض الطلبات المشبوهة فوراً
  const fullPath = pathname + "?" + searchParams.toString();
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(fullPath)) {
      console.warn(`🛡️ WAF Blocked: ${pathname} from ${host}`);
      const resp = new NextResponse(
        JSON.stringify({ error: "طلب مشبوه تم رفضه بواسطة نظام الحماية" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
      return addSecurityHeaders(resp as NextResponse);
    }
  }

  // 2️⃣ استخراج معلومات النطاق
  const domainParts = host.split(".");
  const isVercelPreview = host.endsWith(".vercel.app");
  const tenantSubdomain = extractSubdomain(host);
  
  let currentSubdomain = "dar-al-amar";
  if (domainParts.length > 2 && !isVercelPreview) {
    currentSubdomain = domainParts[0];
  }

  const isMainDomain =
    currentSubdomain === "orca" ||
    currentSubdomain === "www" ||
    currentSubdomain === "dar-al-amar" ||
    currentSubdomain === "orca-crm";

    // 🔒 إذا كان النظام في وضع الصيانة → توجيه جميع المستخدمين للـ Safe Mode
    if (MAINTENANCE_MODE) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL(`/safe-mode?reason=maintenance`, request.url))
      );
    }

    const isProductionDomain = host.includes(PRODUCTION_DOMAIN);

  // 3️⃣ حماية مسارات لوحة التحكم والإعداد
  if (pathname.startsWith("/operations") || pathname.startsWith("/onboarding")) {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      const response = NextResponse.redirect(new URL("/login?expired=1", request.url));
      response.cookies.delete("session_token");
      return addSecurityHeaders(response);
    }

    const isSuperAdmin =
      session.email === "ali.orca@outlook.sa" ||
      session.email === "elite.orca@outlook.sa";

    // فحص تطابق النطاق الفرعي مع المستأجر (لغير المشرفين فقط)
    if (!isSuperAdmin && isProductionDomain && !isMainDomain) {
      if (session.tenantSubdomain && session.tenantSubdomain !== currentSubdomain) {
        // إعادة التوجيه للنطاق الفرعي الصحيح
        return addSecurityHeaders(
          NextResponse.redirect(
            new URL(`https://${session.tenantSubdomain}.${PRODUCTION_DOMAIN}${pathname}`, request.url)
          )
        );
      }
    }

    // كشف الدخول المتقاطع للمستأجرين
    if (!isSuperAdmin && tenantSubdomain) {
      if (session.tenantSubdomain && session.tenantSubdomain !== tenantSubdomain) {
        return addSecurityHeaders(
          NextResponse.redirect(
            new URL(`/safe-mode?reason=tenant_mismatch`, request.url)
          )
        );
      }
    }

    // ✅ حقن X-Headers لاستخدامها في Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", session.tenantId as string || "");
    requestHeaders.set("x-tenant-subdomain", session.tenantSubdomain as string || "");
    requestHeaders.set("x-user-id", session.userId as string || "");
    requestHeaders.set("x-user-role", session.role as string || "READ_ONLY");
    requestHeaders.set("x-user-email", session.email as string || "");
    requestHeaders.set("x-is-super-admin", isSuperAdmin ? "true" : "false");

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  // 4️⃣ حماية صفحة تسجيل الدخول (منع الدخول المكرر)
  // 🛡️ إذا كان وضع الصيانة مفعلاً → حظر الدخول وتوجيه للـ Fallback
  if (SAFE_MODE_ENABLED && !pathname.startsWith("/safe-mode") && !pathname.startsWith("/api/v1/health")) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL(`/safe-mode?reason=maintenance`, request.url))
    );
  }

    // 4️⃣ حماية صفحة تسجيل الدخول (منع الدخول المكرر)
  if (pathname === "/login") {
    // إضافة فحص: إذا كان المستخدم خرج للتو، لا تقم بإعادة توجيهه
    if (searchParams.get("logged_out") === "true") {
      return addSecurityHeaders(NextResponse.next());
    }

    const sessionToken = request.cookies.get("session_token")?.value;
    if (sessionToken) {
      const session = await verifySession(sessionToken);
      if (session) {
        const isSuperAdmin =
          session.email === "ali.orca@outlook.sa" ||
          session.email === "elite.orca@outlook.sa";

        if (isProductionDomain) {
          if (!isMainDomain && session.tenantSubdomain !== currentSubdomain) {
            if (session.tenantSubdomain) {
              return addSecurityHeaders(
                NextResponse.redirect(
                  new URL(`https://${session.tenantSubdomain}.${PRODUCTION_DOMAIN}/operations`, request.url)
                )
              );
            }
          }
          return addSecurityHeaders(NextResponse.redirect(new URL("/operations", request.url)));
        } else {
          return addSecurityHeaders(NextResponse.redirect(new URL("/operations", request.url)));
        }
      }
    }
  }

  // 5️⃣ حماية مسارات API الداخلية (dashboard)
  if (pathname.startsWith("/api/v1/dashboard")) {
    const authHeader = request.headers.get("Authorization");
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies.get("session_token")?.value || "";
    }

    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: "غير مصرح بالوصول: يرجى توفير Bearer Token أو ملف تعريف الجلسة" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const session = await verifySession(token);
      if (!session) throw new Error("Invalid token");

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", (session.userId || session.user_id) as string);
      requestHeaders.set("x-tenant-id", (session.tenantId || session.company_id) as string);
      requestHeaders.set("x-user-role", session.role as string);
      requestHeaders.set("x-user-email", session.email as string);

      return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
    } catch {
      return new NextResponse(
        JSON.stringify({ error: "الرمز المشفر غير صالح أو منتهي الصلاحية" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 6️⃣ بقية الطلبات العامة: حقن subdomain فقط
  if (tenantSubdomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-subdomain", tenantSubdomain);
    return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  return addSecurityHeaders(NextResponse.next());
}

// ─── تكوين المطابق ──────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/operations/:path*",
    "/onboarding/:path*",
    "/login",
    "/api/v1/dashboard/:path*",
    "/api/v1/health",
  ],
};
