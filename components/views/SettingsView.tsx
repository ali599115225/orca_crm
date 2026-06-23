"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  createdAt: string | Date;
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

  const [activeSection, setActiveSection] = useState<SettingsSection>(() =>
    resolveSection(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveSection(resolveSection(searchParams.get("tab")));
  }, [searchParams]);

  const staffUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        createdAt:
          user.createdAt instanceof Date
            ? user.createdAt
            : new Date(user.createdAt),
      })),
    [users],
  );

  const changeSection = (section: SettingsSection) => {
    setActiveSection(section);
    router.replace("/operations/settings?tab=" + section, { scroll: false });
  };

  return (
    <main className="nc-page nc-stack" dir={isArabic ? "rtl" : "ltr"}>
      <header className="space-y-2">
        <h1 className="text-2xl font-black text-[var(--nc-foreground)]">
          {isArabic ? "الإعدادات" : "Settings"}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--nc-foreground-muted)]">
          {isArabic
            ? "إدارة بيانات المؤسسة والفريق والباقة والتكاملات والامتثال من مكان واحد."
            : "Manage organization data, staff, billing, integrations, and compliance from one place."}
        </p>
      </header>

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
                    {isDedicatedCopy
                      ? isArabic
                        ? "نوع الترخيص"
                        : "License Type"
                      : isArabic
                        ? "الباقة الحالية"
                        : "Current Plan"}
                  </dt>
                  <dd className="mt-2 text-sm font-bold text-[var(--nc-foreground)]">
                    {isDedicatedCopy
                      ? isArabic
                        ? "نسخة كاملة مستقلة"
                        : "Full Dedicated Copy"
                      : tenant.subscriptionPlan}
                  </dd>
                </div>
              </dl>
            </SmartCard>
          )}

          {activeSection === "staff" && (
            <SettingsStaff
              tenant={tenant}
              users={staffUsers}
              lang={lang}
              isArabic={isArabic}
            />
          )}

          {activeSection === "billing" &&
            (isDedicatedCopy ? (
              <SmartCard className="p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
                      {isArabic
                        ? "ترخيص نسخة كاملة"
                        : "Full Dedicated License"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-[var(--nc-foreground-muted)]">
                      {isArabic
                        ? "هذه النسخة تشمل جميع الوكلاء والوظائف المرخصة، ولا تتطلب شراء وكلاء أو ترقية باقة."
                        : "This deployment includes all licensed agents and features. No agent purchase or plan upgrade is required."}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {isArabic ? "ترخيص نشط" : "License Active"}
                  </span>
                </div>
              </SmartCard>
            ) : (
              <SettingsBilling
                tenant={tenant}
                lang={lang}
                isArabic={isArabic}
              />
            ))}

          {activeSection === "agents" && (
            <SmartCard className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
                    {isArabic
                      ? "اشتراكات الوكلاء"
                      : "Agent Subscriptions"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--nc-foreground-muted)]">
                    {isDedicatedCopy
                      ? isArabic
                        ? "جميع الوكلاء الخمسة مشمولون في الترخيص. تتم إدارة التفعيل والاستخدام والسجلات من مساحة الوكلاء."
                        : "All five agents are included in the license. Activation, usage, and activity are managed in the Agents workspace."
                      : isArabic
                        ? "إدارة الوكلاء المشمولين والاشتراكات الإضافية والتفعيل والاستخدام تتم من مساحة الوكلاء."
                        : "Included agents, additional subscriptions, activation, and usage are managed in the Agents workspace."}
                  </p>
                </div>

                <Link
                  href="/operations/agents"
                  className="rounded-xl bg-[var(--nc-accent)] px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-[var(--nc-accent-hover)]"
                >
                  {isArabic ? "فتح مساحة الوكلاء" : "Open Agents Workspace"}
                </Link>
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