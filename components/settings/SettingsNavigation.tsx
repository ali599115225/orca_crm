"use client";

import { OperationsTabs } from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

export type SettingsSection =
  "organization" | "staff" | "billing" | "ai" | "integrations" | "advertising" | "compliance";

interface SettingsNavigationProps {
  activeSection: SettingsSection;
  lang: "AR" | "EN";
  onChange: (section: SettingsSection) => void;
  hideBilling?: boolean;
}

const ITEMS: Array<{
  id: SettingsSection;
  icon: string;
  ar: string;
  en: string;
}> = [
  {
    id: "organization",
    icon: "ph-buildings",
    ar: "بيانات المؤسسة",
    en: "Organization",
  },
  {
    id: "staff",
    icon: "ph-users-three",
    ar: "فريق العمل",
    en: "Staff",
  },
  {
    id: "billing",
    icon: "ph-credit-card",
    ar: "الباقة والفوترة",
    en: "Plan & Billing",
  },
  {
    id: "ai",
    icon: "ph-robot",
    ar: "إعدادات الذكاء الاصطناعي",
    en: "AI Settings",
  },
  {
    id: "integrations",
    icon: "ph-plugs-connected",
    ar: "التكاملات",
    en: "Integrations",
  },
  {
    id: "advertising",
    icon: "ph-megaphone",
    ar: "الحملات الإعلانية",
    en: "Advertising",
  },
  {
    id: "compliance",
    icon: "ph-shield-check",
    ar: "الامتثال الحكومي",
    en: "Compliance",
  },
];

export default function SettingsNavigation({
  activeSection,
  lang,
  onChange,
  hideBilling = false,
}: SettingsNavigationProps) {
  const isArabic = lang === "AR";

  return (
    <nav aria-label={isArabic ? "أقسام الإعدادات" : "Settings sections"}>
      <OperationsTabs className="flex-wrap justify-center">
        {ITEMS.filter((item) => !(hideBilling && item.id === "billing")).map(
          (item) => {
            const active = item.id === activeSection;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? "page" : undefined}
                aria-selected={active}
                className={active ? operationsVisual.activeTab : operationsVisual.tab}
              >
                <i
                  className={"ph-bold " + item.icon + " text-base"}
                  aria-hidden="true"
                />
                <span>{isArabic ? item.ar : item.en}</span>
              </button>
            );
          },
        )}
      </OperationsTabs>
    </nav>
  );
}
