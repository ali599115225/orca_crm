// app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma, rawPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { rateLimit } from "@/lib/rate-limit";

const jwtSecret = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!jwtSecret) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }
    const SECRET_KEY = new TextEncoder().encode(jwtSecret);
    const body = await request.json();
    const { email, password } = body;

    const rl = rateLimit(`login:${request.headers.get("x-forwarded-for") || "unknown"}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "طلبات تسجيل دخول كثيرة. حاول بعد 30 ثانية.", retryAfter: Math.ceil(rl.resetIn / 1000) }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور حقول إلزامية." },
        { status: 400 }
      );
    }

    // 🛡️ تعقيم المدخلات لمنع هجمات حقن قواعد البيانات (SQL Injection) والنصوص العابرة للمواقع (XSS)
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    const maliciousPattern = /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bDELETE\b|<script[\s\S]*?>|javascript:)/i;
    if (maliciousPattern.test(cleanEmail) || maliciousPattern.test(cleanPassword)) {
      return NextResponse.json(
        { error: "المدخلات المرسلة تحتوي على رموز أو أنماط غير مسموح بها." },
        { status: 400 }
      );
    }

    // البحث عن المستخدم في قاعدة البيانات
    const user = await rawPrisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب معطل." },
        { status: 401 }
      );
    }

    // التحقق من صحة كلمة المرور باستخدام تشفير Bcrypt الآمن
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    // ربط مسميات الصلاحيات المطلوبة في الـ JWT (Admin, Supervisor, Broker)
    let jwtRole = "Broker";
    if (user.role === "ADMIN") {
      jwtRole = "Admin";
    } else if (user.role === "SALES_MANAGER") {
      jwtRole = "Supervisor";
    } else if (user.role === "SALES_EMPLOYEE" || user.role === "MARKETING") {
      jwtRole = "Broker";
    }

    // توليد الرمز المشفر الموثوق (JWT) بصلاحية ١٢ ساعة
    const token = await new SignJWT({
      user_id: user.id,
      company_id: user.tenantId,
      role: jwtRole,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(SECRET_KEY);

    // تحديث تاريخ آخر تسجيل دخول بصورة غير معطلة للسرعة (تم تخطيه لعدم وجود الحقل في الموديل)

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح وصياغة الرمز المشفر.",
      token: token,
      expires_in: "12 hours"
    });

  } catch (error: any) {
    console.error("فشل تسجيل الدخول:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء معالجة عملية تسجيل الدخول." },
      { status: 500 }
    );
  }
}
