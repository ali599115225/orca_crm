// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. استخراج النطاق الفرعي (Subdomain) الحالي من الرابط
  const host = request.headers.get("host") || "";
  const domainParts = host.split(".");
  let currentSubdomain = "dar-al-amar"; // القيمة الافتراضية للتطوير المحلي

  if (domainParts.length > 2) {
    currentSubdomain = domainParts[0];
  }

  // 2. جلب وتفكيك الـ Token المشفر
  const sessionToken = request.cookies.get("session_token")?.value;

  // 3. حماية مسار العمليات لوحة التحكم (/operations)
  if (pathname.startsWith("/operations")) {
    if (!sessionToken) {
      // إذا لم يكن مسجلاً للدخول، يتم طرده إلى صفحة تسجيل الدخول فوراً
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      // التحقق من صحة وصلاحية الـ Token فوراٍ
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);

      // فحص أمان الـ SaaS الحاسم:
      // هل الـ Subdomain المخزن في جلسة المستخدم يطابق تماماً الـ Subdomain الحالي في المتصفح؟
      if (payload.tenantSubdomain !== currentSubdomain) {
        // إذا كان هناك عدم تطابق، يتم تسجيل خروجه وطرده لحماية الخصوصية وعزل البيانات!
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("session_token");
        return response;
      }
    } catch (e) {
      // الـ Token تالف أو منتهي الصلاحية
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_token");
      return response;
    }
  }

  // 4. حماية صفحة تسجيل الدخول (/login) لمنع إعادة الدخول إذا كانت الجلسة نشطة ومطابقة
  if (pathname === "/login" && sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);
      if (payload.tenantSubdomain === currentSubdomain) {
        return NextResponse.redirect(new URL("/operations/analytics", request.url));
      }
    } catch (e) {
      // تجاهل الخطأ واعرض صفحة الدخول
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/operations/:path*", "/login"],
};