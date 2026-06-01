// prisma.config.js
// ✅ Vercel reads DATABASE_URL directly from Environment Variables — no dotenv needed here.
// This file is intentionally minimal to prevent conflicts with Vercel's env injection.

module.exports = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
