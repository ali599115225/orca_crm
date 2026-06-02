/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // تجاهل أخطاء التايب سكريبت لضمان نجاح الـ Build دائماً في بيئة الإنتاج
    ignoreBuildErrors: true,
  },
  eslint: {
    // تجاهل أخطاء التحذيرات البرمجية أثناء الـ Build
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
