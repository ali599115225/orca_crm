// app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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
    const user = await prisma.user.findUnique({
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

    // تحديث تاريخ آخر تسجيل دخول بصورة غير معطلة للسرعة
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(err => console.error("فشل تحديث تاريخ تسجيل الدخول:", err));

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
