import { NextRequest, NextResponse } from "next/server";
import { prisma, rawPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const jwtSecret = process.env.JWT_SECRET;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    if (!jwtSecret) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }
    const SECRET_KEY = new TextEncoder().encode(jwtSecret);
    const body = await request.json();
    const { email, password } = body;

    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rl = await rateLimit(`login:${clientIp}`, 5, 60000, true);
    if (!rl.allowed) {
      return NextResponse.json({
        error: "طلبات تسجيل دخول كثيرة. حاول بعد دقيقة.",
        retryAfter: Math.ceil(rl.resetIn / 1000),
      }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور حقول إلزامية." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    const maliciousPattern = /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bDELETE\b|<script[\s\S]*?>|javascript:)/i;
    if (maliciousPattern.test(cleanEmail) || maliciousPattern.test(cleanPassword)) {
      return NextResponse.json(
        { error: "المدخلات المرسلة تحتوي على رموز أو أنماط غير مسموح بها." },
        { status: 400 }
      );
    }

    const user = await rawPrisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    const recentFailedAttempts = await rawPrisma.failedLoginAttempt.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - LOCKOUT_DURATION_MS) },
      },
    });

    if (recentFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
      return NextResponse.json({
        error: "تم تعطيل الحساب مؤقتاً بسبب محاولات دخول فاشلة كثيرة. حاول بعد 15 دقيقة.",
        locked: true,
      }, { status: 423 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب معطل." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isPasswordValid) {
      await rawPrisma.failedLoginAttempt.create({
        data: {
          userId: user.id,
          ipAddress: clientIp,
        },
      });

      await writeAuditLog({
        tenantId: user.tenantId,
        userId: user.id,
        action: "LOGIN",
        tableName: "users",
        recordId: user.id,
        details: `Failed login attempt from IP: ${clientIp}`,
      });

      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    await rawPrisma.failedLoginAttempt.deleteMany({
      where: { userId: user.id },
    });

    let jwtRole = "Broker";
    if (user.role === "ADMIN") {
      jwtRole = "Admin";
    } else if (user.role === "SALES_MANAGER") {
      jwtRole = "Supervisor";
    } else if (user.role === "SALES_EMPLOYEE" || user.role === "MARKETING") {
      jwtRole = "Broker";
    }

    const token = await new SignJWT({
      user_id: user.id,
      company_id: user.tenantId,
      role: jwtRole,
      tenantId: user.tenantId,
      userId: user.id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(SECRET_KEY);

    await writeAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN",
      tableName: "users",
      recordId: user.id,
      details: "Successful login",
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      expires_in: "12 hours",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });

  } catch (error: any) {
    console.error("Login error:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء معالجة عملية تسجيل الدخول." },
      { status: 500 }
    );
  }
}
