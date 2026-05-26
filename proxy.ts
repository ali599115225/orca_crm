// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

/**
 * دالة الوكيل (Proxy) المعتمدة في Next.js 16 لإدارة وحماية الـ Subdomains
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

  // التحقق مما إذا كان الرابط هو رابط تجريبي مجاني من Vercel
  const isVercelPreview = host.endsWith(".vercel.app");

  // 2. جلب وتفكيك الـ Token المشفر للتحقق
  const sessionToken = request.cookies.get("session_token")?.value;

  // 3. حماية مسار العمليات لوحة التحكم (/operations)
  if (pathname.startsWith("/operations")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);
      const isSuperAdmin = payload.email === "ali.orca@outlook.sa" || payload.email === "elite.orca@outlook.sa";

      // فحص أمان الـ SaaS الصارم وتوجيه المستخدم لنطاقه الفرعي الصحيح (لغير المشرفين فقط)
      if (!isSuperAdmin) {
        const isProductionDomain = host.includes("orca.az-ez.pro");

        if (isProductionDomain && payload.tenantSubdomain !== currentSubdomain) {
          if (payload.tenantSubdomain) {
            return NextResponse.redirect(new URL(`https://${payload.tenantSubdomain}.orca.az-ez.pro${pathname}`, request.url));
          }
        }

        if (!isProductionDomain && !isVercelPreview && payload.tenantSubdomain !== currentSubdomain) {
          const response = NextResponse.redirect(new URL("/login", request.url));
          response.cookies.delete("session_token");
          return response;
        }
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
      const isSuperAdmin = payload.email === "ali.orca@outlook.sa" || payload.email === "elite.orca@outlook.sa";
      
      if (isSuperAdmin) {
        // للمشرف العام: نقله للتحليلات بنفس النطاق الفرعي الحالي مباشرة
        return NextResponse.redirect(new URL("/operations/analytics", request.url));
      } else {
        const isProductionDomain = host.includes("orca.az-ez.pro");
        if (isProductionDomain && payload.tenantSubdomain !== currentSubdomain) {
          if (payload.tenantSubdomain) {
            return NextResponse.redirect(new URL(`https://${payload.tenantSubdomain}.orca.az-ez.pro/operations/analytics`, request.url));
          }
        } else if (payload.tenantSubdomain === currentSubdomain) {
          return NextResponse.redirect(new URL("/operations/analytics", request.url));
        }
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