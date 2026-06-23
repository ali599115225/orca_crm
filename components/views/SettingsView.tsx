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
import SettingsIntegrationsHub from "@/components/settings/SettingsIntegrationsHub";
import SettingsAIProviders from "@/components/settings/SettingsAIProviders";
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
  "ai",
  "integrations",
  "compliance",
];

function resolveSection(value: string | null): SettingsSection {
  if (value === "agents") return "ai"; // Handle old redirect/alias
  return VALID_SECTIONS.includes(value as SettingsSection)
    ? (value as SettingsSection)
    : "organization";
}

function displayPlan(value: string, isArabic: boolean): string {
  const plan = value.trim().toLowerCase();

  if (["gold", "diamond", "platinum", "super"].includes(plan)) {
    return isArabic ? "الباقة الذهبية" : "Gold Plan";
  }

  if (["silver", "pro", "professional"].includes(plan)) {
    return isArabic ? "الباقة الفضية" : "Silver Plan";
  }

  return isArabic ? "الباقة الأساسية" : "Basic Plan";
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
    <main
      className="orca-settings-final nc-page nc-stack"
      dir={isArabic ? "rtl" : "ltr"}
    >
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

      <div className="grid items-start gap-5 lg:grid-cols-[228px_minmax(0,1fr)]">
        <SettingsNavigation
          activeSection={activeSection}
          lang={lang}
          onChange={changeSection}
        />

        <section className="orca-settings-content min-w-0">
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
                <div className="orca-info-tile">
                  <dt>{isArabic ? "اسم المنشأة" : "Company Name"}</dt>
                  <dd>{tenant.companyName}</dd>
                </div>

                <div className="orca-info-tile">
                  <dt>{isArabic ? "النطاق الفرعي" : "Subdomain"}</dt>
                  <dd className="font-en">{tenant.subdomain}</dd>
                </div>

                <div className="orca-info-tile">
                  <dt>
                    {isDedicatedCopy
                      ? isArabic
                        ? "نوع الترخيص"
                        : "License Type"
                      : isArabic
                        ? "الباقة الحالية"
                        : "Current Plan"}
                  </dt>
                  <dd>
                    {isDedicatedCopy
                      ? isArabic
                        ? "نسخة كاملة مستقلة"
                        : "Full Dedicated Copy"
                      : displayPlan(tenant.subscriptionPlan, isArabic)}
                  </dd>
                </div>
              </dl>
            </SmartCard>
          )}

          {activeSection === "staff" && (
            <div className="orca-settings-staff">
              <SettingsStaff
                tenant={tenant}
                users={staffUsers}
                lang={lang}
                isArabic={isArabic}
              />
            </div>
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
                  <span className="orca-status-badge orca-status-success">
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

          {activeSection === "ai" && (
            <div className="orca-settings-ai">
              <SettingsAIProviders />
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-6">
              <SettingsIntegrationsHub lang={lang} />
            </div>
          )}

          {activeSection === "compliance" && (
            <div className="orca-settings-compliance">
              <SettingsCompliance lang={lang} isArabic={isArabic} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}