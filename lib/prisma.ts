// lib/prisma.ts
// استخدام @neondatabase/serverless بدلاً من pg.Pool لحل مشكلة cold start في Vercel serverless
// هذا الحل يعمل عبر HTTP بدلاً من TCP مما يلغي مشكلة انتظار اتصال pg إلى الأبد

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  // neon() يستخدم HTTP بدلاً من TCP - لا انتظار، لا cold start timeout
  const sql = neon(connectionString);
  const adapter = new PrismaNeon(sql);
  return new PrismaClient({ adapter });
}

// Singleton للتطوير المحلي لمنع تكرار الاتصال
export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}