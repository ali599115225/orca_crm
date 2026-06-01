// lib/session.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// مفتاح التشفير السري (يُفضل وضعه في ملف .env في الإنتاج)
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "orca_crm_super_secret_key_2026_saudi_real_estate"
);

/**
 * تشفير البيانات وتحويلها إلى Token مشفر ينتهي بعد 24 ساعة
 */
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

/**
 * فك التشفير والتحقق من صحة الـ Token
 */
export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (e) {
    return null; // الـ Token تالف أو منتهي الصلاحية
  }
}

/**
 * جلب بيانات جلسة المستخدم الحالي في السيرفر
 */
export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session_token")?.value;
  if (!session) return null;
  return await decrypt(session);
}