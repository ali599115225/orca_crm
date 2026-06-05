// lib/feature-flags.ts
/**
 * Feature Flags — ORCA CRM
 *
 * تفعيل feature flag:
 *   - محلياً: أضف  NEXT_PUBLIC_FF_SIDEBAR_MARKETING_REORG=true  في ملف .env.local
 *   - Vercel:  أضف نفس المتغير في Environment Variables لـ (Preview أو Production)
 *
 * للتحقق في الكود:
 *   import { flags } from '@/lib/feature-flags';
 *   if (flags.sidebarMarketingReorg) { ... }
 */
export const flags = {
  /**
   * sidebar_marketing_reorg
   * - إخفاء "النمو والتسويق" و"الحملات التسويقية" كعناصر مستقلة من القائمة الجانبية
   * - دمجها تحت عنصر واحد "التسويق والإعلان" بتبويبات فرعية
   * - تفعيل قواعد إعادة التوجيه للمسارات القديمة
   */
  sidebarMarketingReorg:
    process.env.NEXT_PUBLIC_FF_SIDEBAR_MARKETING_REORG === 'true',
} as const;

export type FeatureFlags = typeof flags;
