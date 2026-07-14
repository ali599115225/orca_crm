"use client";

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
    <nav
      aria-label={isArabic ? "أقسام الإعدادات" : "Settings sections"}
      className="orca-settings-tabs"
    >
      <div className="orca-settings-tabs-track">
        {ITEMS.filter((item) => !(hideBilling && item.id === "billing")).map(
          (item) => {
            const active = item.id === activeSection;

            const buttonClassName = [
              "orca-settings-tab flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)]",
              active
                ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)] shadow-sm"
                : "border-transparent text-[var(--nc-foreground-secondary)] hover:border-[var(--nc-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-foreground)]",
            ].join(" ");

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? "page" : undefined}
                className={buttonClassName}
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
      </div>
    </nav>
  );
}
