"use client";

export type SettingsSection =
  | "organization"
  | "staff"
  | "billing"
  | "ai"
  | "integrations"
  | "compliance";

interface SettingsNavigationProps {
  activeSection: SettingsSection;
  lang: "AR" | "EN";
  onChange: (section: SettingsSection) => void;
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
}: SettingsNavigationProps) {
  const isArabic = lang === "AR";

  return (
    <nav
      aria-label={isArabic ? "أقسام الإعدادات" : "Settings sections"}
      className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-2"
    >
      <div className="flex gap-1.5 overflow-x-auto">
        {ITEMS.map((item) => {
          const active = item.id === activeSection;

          const buttonClassName = [
            "flex min-w-max shrink-0 items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)]",
            active
              ? "border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]"
              : "border border-transparent text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]",
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
        })}
      </div>
    </nav>
  );
}
