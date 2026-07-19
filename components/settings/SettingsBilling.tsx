"use client";

import { SmartCard } from "@/components/ui/SmartCard";

interface SettingsBillingProps {
  isArabic: boolean;
}

/**
 * Compatibility-only panel for stale links. Subscription packages, upgrades,
 * and add-on purchases are intentionally absent from the current product.
 */
export default function SettingsBilling({ isArabic }: SettingsBillingProps) {
  return (
    <div className="orca-settings-section" dir={isArabic ? "rtl" : "ltr"}>
      <SmartCard className="orca-workspace-panel p-6">
        <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
          {isArabic ? "الفوترة التشغيلية" : "Operational billing"}
        </h2>
        <p className="mt-2 text-sm text-[var(--nc-foreground-secondary)]">
          {isArabic
            ? "تُدار فواتير العقود وخطط دفعات العملاء والأقساط من مساحات العمل المالية المخصصة. لا توجد باقات أو ترقيات اشتراك للمنصة ضمن نموذج الشركة الحالي."
            : "Contract invoices, customer payment plans, and installments are managed in their dedicated finance workspaces. Platform subscription plans and upgrades are not part of the current company model."}
        </p>
      </SmartCard>
    </div>
  );
}
