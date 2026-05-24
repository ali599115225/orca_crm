// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // الاتصال العادي عبر الـ Pooler
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/orca_crm?schema=public",
    // الاتصال المباشر لعمليات الـ Migrate والـ Seed في السحابية
    directUrl: process.env.DIRECT_URL,
  },
});