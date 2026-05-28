// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

// إزالة قسم datasource هنا لأن المصدر الآن في schema.prisma مباشرةً
// هذا يمنع التعارض بين ملفي الإعداد ويعمل بشكل صحيح مع Vercel
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});