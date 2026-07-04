"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const headerRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    const requested = resolveSection(searchParams.get("tab"));
    return isDedicatedCopy && requested === "billing" ? "organization" : requested;
  });

  useEffect(() => {
    const resolved = resolveSection(searchParams.get("tab"));
    setActiveSection(
      isDedicatedCopy && resolved === "billing" ? "organization" : resolved,
    );
    headerRef.current?.scrollIntoView({ block: "start" });
  }, [isDedicatedCopy, searchParams]);

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
    const target = isDedicatedCopy && section === "billing" ? "organization" : section;
    setActiveSection(target);
    router.replace("/operations/settings?tab=" + target, { scroll: false });
    requestAnimationFrame(() => {
      headerRef.current?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <main
      className="orca-settings-final mx-auto w-full max-w-[1440px] space-y-6 px-4 py-4 md:px-8 md:py-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header ref={headerRef} className="space-y-2">
        <h1 className="text-2xl font-black text-[var(--nc-foreground)]">
          {isArabic ? "الإعدادات" : "Settings"}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--nc-foreground-muted)]">
          {isDedicatedCopy
            ? isArabic
              ? "إدارة بيانات المؤسسة والفريق والتكاملات والامتثال من مكان واحد."
              : "Manage organization data, staff, integrations, and compliance from one place."
            : isArabic
              ? "إدارة بيانات المؤسسة والفريق والباقة والتكاملات والامتثال من مكان واحد."
              : "Manage organization data, staff, billing, integrations, and compliance from one place."}
        </p>
      </header>

      <div className="sticky top-0 z-20 bg-[var(--nc-surface-solid)] py-1">
        <SettingsNavigation
          activeSection={activeSection}
          lang={lang}
          onChange={changeSection}
          hideBilling={isDedicatedCopy}
        />
      </div>

      <section className="orca-settings-content w-full min-w-0">
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

        {!isDedicatedCopy && activeSection === "billing" && (
          <SettingsBilling tenant={tenant} lang={lang} isArabic={isArabic} />
        )}

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
    </main>
  );
}
