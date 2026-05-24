// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

/**
 * دالة الوكيل (Proxy) المعتمدة حديثاً في Next.js 16 لإدارة وحماية الـ Subdomains
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. استخراج النطاق الفرعي (Subdomain) الحالي من الرابط
  const host = request.headers.get("host") || "";
  const domainParts = host.split(".");
  let currentSubdomain = "dar-al-amar"; // القيمة الافتراضية للتطوير المحلي

  if (domainParts.length > 2) {
    currentSubdomain = domainParts[0];
  }

  // 2. جلب وتفكيك الـ Token المشفر للتحقق
  const sessionToken = request.cookies.get("session_token")?.value;

  // 3. حماية مسار العمليات لوحة التحكم (/operations)
  if (pathname.startsWith("/operations")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);

      // فحص أمان الـ SaaS لضمان تطابق النطاق الموجه مع الموظف الفعلي
      if (payload.tenantSubdomain !== currentSubdomain) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("session_token");
        return response;
      }
    } catch (e) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_token");
      return response;
    }
  }

  // 4. حماية صفحة تسجيل الدخول ومنع الدوران التكراري
  if (pathname === "/login" && sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);
      if (payload.tenantSubdomain === currentSubdomain) {
        return NextResponse.redirect(new URL("/operations/analytics", request.url));
      }
    } catch (e) {
      // تجاهل الخطأ
    }
  }

  return NextResponse.next();
}

// تعيين مخرجات مسارات الفحص للوكيل المساعد
export const config = {
  matcher: ["/operations/:path*", "/login"],
};