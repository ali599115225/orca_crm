// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // إجبار Next.js و Turbopack على معاملة Prisma كحزمة خارجية مستقلة لمنع أخطاء الـ SSR
  serverExternalPackages: ['@prisma/client'],
};

module.exports = nextConfig;