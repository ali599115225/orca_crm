"use client";

export type SettingsSection =
| "organization"
| "staff"
| "billing"
| "agents"
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
id: "agents",
icon: "ph-robot",
ar: "اشتراكات الوكلاء",
en: "Agent Subscriptions",
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
className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-3"
> <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
{ITEMS.map((item) => {
const active = item.id === activeSection;

      const buttonClassName = [
        "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
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
