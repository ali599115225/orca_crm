"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import SettingsNavigation, {
type SettingsSection,
} from "@/components/settings/SettingsNavigation";
import SettingsBilling from "@/components/settings/SettingsBilling";
import SettingsStaff from "@/components/settings/SettingsStaff";
import SettingsCompliance from "@/components/settings/SettingsCompliance";
import WhatsAppIntegrationSettings from "@/components/settings/WhatsAppIntegrationSettings";
import { SmartCard } from "@/components/ui/SmartCard";

interface User {
id: string;
name: string;
email: string;
role: string;
isActive: boolean;
createdAt: Date;
}

interface SettingsViewProps {
tenant: {
companyName: string;
subdomain: string;
subscriptionPlan: string;
extraAgents: number;
licenseMode?: "SAAS" | "DEDICATED_COPY";
};
users?: User[];
}

const VALID_SECTIONS: SettingsSection[] = [
"organization",
"staff",
"billing",
"agents",
"integrations",
"compliance",
];

function resolveSection(value: string | null): SettingsSection {
return VALID_SECTIONS.includes(value as SettingsSection)
? (value as SettingsSection)
: "organization";
}

export default function SettingsView({
tenant,
users = [],
}: SettingsViewProps) {
const router = useRouter();
const searchParams = useSearchParams();
const { lang } = useApp();
const isArabic = lang === "AR";
const isDedicatedCopy = tenant.licenseMode === "DEDICATED_COPY";

const [activeSection, setActiveSection] = useState(() =>
resolveSection(searchParams.get("tab")),
);

const changeSection = (section: SettingsSection) => {
setActiveSection(section);
router.replace(`/operations/settings?tab=${section}`, { scroll: false });
};

return (
<main className="nc-page nc-stack" dir={isArabic ? "rtl" : "ltr"}>


{isArabic ? "الإعدادات" : "Settings"}


{isArabic
? "إدارة بيانات المؤسسة والفريق والاشتراك والتكاملات والامتثال."
: "Manage organization data, staff, subscription, integrations, and compliance."}




  <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
    <SettingsNavigation
      activeSection={activeSection}
      lang={lang}
      onChange={changeSection}
    />

    <section className="min-w-0">
      {activeSection === "organization" && (
        <SmartCard className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
              {isArabic ? "بيانات المؤسسة" : "Organization Details"}
            </h2>
            <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
              {isArabic
                ? "البيانات الأساسية المرتبطة بحساب الشركة."
                : "Core information associated with the company account."}
            </p>
          </div>

          <dl className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
              <dt className="text-xs text-[var(--nc-foreground-muted)]">
                {isArabic ? "اسم المنشأة" : "Company Name"}
              </dt>
              <dd className="mt-2 text-sm font-bold text-[var(--nc-foreground)]">
                {tenant.companyName}
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
              <dt className="text-xs text-[var(--nc-foreground-muted)]">
                {isArabic ? "النطاق الفرعي" : "Subdomain"}
              </dt>
              <dd className="mt-2 text-sm font-bold text-[var(--nc-foreground)] font-en">
                {tenant.subdomain}
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
              <dt className="text-xs text-[var(--nc-foreground-muted)]">
                {isArabic ? "الباقة الحالية" : "Current Plan"}
              </dt>
              <dd className="mt-2 text-sm font-bold uppercase text-[var(--nc-foreground)] font-en">
                {isDedicatedCopy ? (isArabic ? "نسخة كاملة" : "Full Dedicated Copy") : tenant.subscriptionPlan}
              </dd>
            </div>
          </dl>
        </SmartCard>
      )}

      {activeSection === "staff" && (
        <SettingsStaff
          tenant={tenant}
          users={users}
          lang={lang}
          isArabic={isArabic}
        />
      )}

      {activeSection === "billing" && (
        <SettingsBilling
          tenant={tenant}
          lang={lang}
          isArabic={isArabic}
        />
      )}

      {activeSection === "agents" && (
        <SmartCard className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
                {isArabic ? "اشتراكات الوكلاء" : "Agent Subscriptions"}
              </h2>
              <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                {isArabic
                  ? "إدارة الاشتراكات والتفعيل والتشغيل تتم من مساحة الوكلاء."
                  : "Subscriptions, activation, and runtime are managed from the Agents workspace."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/operations/agents")}
              className="rounded-xl bg-[var(--nc-accent)] px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-[var(--nc-accent-hover)]"
            >
              {isArabic ? "فتح مساحة الوكلاء" : "Open Agents Workspace"}
            </button>
          </div>
        </SmartCard>
      )}

      {activeSection === "integrations" && (
        <WhatsAppIntegrationSettings lang={lang} />
      )}

      {activeSection === "compliance" && (
        <SettingsCompliance lang={lang} isArabic={isArabic} />
      )}
    </section>
  </div>
</main>

);
}
