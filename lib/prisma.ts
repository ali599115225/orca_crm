// lib/prisma.ts
// Prisma 7 يتطلب adapter إلزامياً - نستخدم @prisma/adapter-pg مع timeout مناسب لـ Neon serverless
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // ⏱️ timeouts لمنع التجميد في Vercel serverless + Neon cold start
    connectionTimeoutMillis: 8000,   // أقصى 8 ثانية لإنشاء الاتصال
    idleTimeoutMillis: 10000,        // إغلاق الاتصال غير المستخدم بعد 10 ثواني
    max: 1,                          // حد أقصى اتصال واحد في serverless
    ssl: { rejectUnauthorized: false }, // SSL مرن لـ Neon
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Singleton في التطوير المحلي لمنع تكرار الاتصالات
export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}