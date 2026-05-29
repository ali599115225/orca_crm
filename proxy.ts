// proxy.ts
// 🛡️ ORCA CRM - Unified Proxy (Auth + WAF + Security Headers)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ===================================================
// WAF: أنماط هجمات شائعة يجب رفضها
// ===================================================
const MALICIOUS_PATTERNS = [
  /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bDELETE\b)\s+/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /\.\.\//g,
  /etc\/passwd/gi,
];

// ===================================================
// إضافة رؤوس الأمان القياسية لكل استجابة
// ===================================================
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}


const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

/**
 * دالة الوكيل (Proxy) المعتمدة في Next.js 16 لإدارة وحماية الـ Subdomains
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 🛡️ WAF: رفض الطلبات التي تحتوي على أنماط هجومية
  const fullPath = pathname + "?" + searchParams.toString();
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(fullPath)) {
      console.warn(`🛡️ WAF Blocked: ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: "طلب مشبوه تم رفضه بواسطة نظام الحماية" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 1. استخراج النطاق الفرعي (Subdomain) الحالي من الرابط
  const host = request.headers.get("host") || "";
  const domainParts = host.split(".");
  let currentSubdomain = "dar-al-amar"; // القيمة الافتراضية للتطوير المحلي

  const isVercelPreview = host.endsWith(".vercel.app");

  if (domainParts.length > 2 && !isVercelPreview) {
    currentSubdomain = domainParts[0];
  }

  // تحديد ما إذا كان النطاق الحالي هو البوابة العامة للمنصة
  const isMainDomain = currentSubdomain === "orca" || currentSubdomain === "www" || currentSubdomain === "dar-al-amar" || currentSubdomain === "orca-crm";

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
        const isProductionDomain = host.includes("orca-az-ez.pro");

        // إذا كان على نطاق فرعي مخصص لشركة أخرى (وليس النطاق الرئيسي)، نوجهه لنطاقه الفرعي الصحيح
        if (isProductionDomain && !isMainDomain && payload.tenantSubdomain !== currentSubdomain) {
          if (payload.tenantSubdomain) {
            return NextResponse.redirect(new URL(`https://${payload.tenantSubdomain}.orca-az-ez.pro${pathname}`, request.url));
          }
        }

        // إذا كان محلياً وليس على النطاق الفرعي الصحيح
        if (!isProductionDomain && !isVercelPreview && !isMainDomain && payload.tenantSubdomain !== currentSubdomain) {
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
        // للمشرف العام: نقله للتحليلات مباشرة على النطاق الحالي
        return NextResponse.redirect(new URL("/operations/analytics", request.url));
      } else {
        const isProductionDomain = host.includes("orca-az-ez.pro");
        
        if (isProductionDomain) {
          // إذا كان على النطاق الرئيسي، نبقيه عليه، وإذا كان على نطاق فرعي خاطئ، نحوله لنطاقه الصحيح
          if (!isMainDomain && payload.tenantSubdomain !== currentSubdomain) {
            if (payload.tenantSubdomain) {
              return NextResponse.redirect(new URL(`https://${payload.tenantSubdomain}.orca-az-ez.pro/operations/analytics`, request.url));
            }
          } else {
            return NextResponse.redirect(new URL("/operations/analytics", request.url));
          }
        } else {
          return NextResponse.redirect(new URL("/operations/analytics", request.url));
        }
      }
    } catch (e) {
      // تجاهل الخطأ
    }
  }

  // 🛡️ حماية مسارات الـ API للوحة التحكم وضمان العزل التام للمستأجرين (Multi-tenant API Guard)
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
        JSON.stringify({ error: "غير مصرح بالوصول: يرجى توفير الرمز المشفر المعتمد Bearer Token أو ملف تعريف الجلسة" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      
      // تمرير الهويات والخصائص عبر الهيدرز الداخلية للطلب بشكل مؤمن
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", (payload.user_id || payload.userId) as string);
      requestHeaders.set("x-company-id", (payload.company_id || payload.tenantId) as string);
      requestHeaders.set("x-user-role", payload.role as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (e) {
      return new NextResponse(
        JSON.stringify({ error: "الرمز المشفر غير صالح أو منتهي الصلاحية" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
}

// تعيين مسارات الفحص للوكيل المساعد
export const config = {
  matcher: ["/operations/:path*", "/login", "/api/v1/dashboard/:path*"],
};
