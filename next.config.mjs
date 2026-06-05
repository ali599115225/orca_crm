/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Backward-compatible redirects — صالحة لمدة 30 يوماً بعد تفعيل sidebar_marketing_reorg
   *
   * المسارات المُعادة توجيهها:
   *   /operations/growth          → /operations/marketing          (301 دائم)
   *   /operations/growth?*        → /operations/marketing?*        (مع الحفاظ على query params)
   *   /operations/shopping        → /operations/marketing?tab=shopping
   *   /sidebar/marketing          → /operations/marketing
   *   /sidebar/marketing/growth   → /operations/marketing?tab=growth
   *   /sidebar/marketing/shopping → /operations/marketing?tab=shopping
   */
  async redirects() {
    return [
      // ── المسارات القديمة للنمو → صفحة التسويق والإعلان ─────────────────
      {
        source: '/operations/growth',
        destination: '/operations/marketing',
        permanent: true,          // 301 — يُخزّن في cache المتصفح
      },
      // ── التسوق القديم ────────────────────────────────────────────────────
      {
        source: '/operations/shopping',
        destination: '/operations/marketing?tab=shopping',
        permanent: true,
      },
      // ── مسارات /sidebar/* (المذكورة في المتطلبات) ───────────────────────
      {
        source: '/sidebar/marketing',
        destination: '/operations/marketing',
        permanent: false,         // 307 مؤقت — قابل للتغيير لاحقاً
      },
      {
        source: '/sidebar/marketing/growth',
        destination: '/operations/marketing?tab=growth',
        permanent: false,
      },
      {
        source: '/sidebar/marketing/shopping',
        destination: '/operations/marketing?tab=shopping',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
