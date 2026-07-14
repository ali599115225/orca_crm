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
import AdvertisingPlatformIntegrations from "@/components/settings/AdvertisingPlatformIntegrations";
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
  "advertising",
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
      className="orca-settings-final nc-page nc-stack orca-container pb-10"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header ref={headerRef} className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {isArabic
              ? "المؤسسة → الفريق → التكاملات → الامتثال"
              : "Organization → staff → integrations → compliance"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--nc-foreground)]">
          {isArabic ? "الإعدادات" : "Settings"}
        </h1>
        <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
          {isDedicatedCopy
            ? isArabic
              ? "إدارة بيانات المؤسسة والفريق والتكاملات والحملات الإعلانية والامتثال من مكان واحد."
              : "Manage organization data, staff, integrations, advertising, and compliance from one place."
            : isArabic
              ? "إدارة بيانات المؤسسة والفريق والباقة والتكاملات والحملات الإعلانية والامتثال من مكان واحد."
              : "Manage organization data, staff, billing, integrations, advertising, and compliance from one place."}
        </p>
        </div>
      </header>

      <div className="orca-settings-nav-shell">
        <SettingsNavigation
          activeSection={activeSection}
          lang={lang}
          onChange={changeSection}
          hideBilling={isDedicatedCopy}
        />
      </div>

      <section className="orca-settings-content orca-settings-section-shell w-full min-w-0 space-y-5">
        {activeSection === "organization" && (
          <SmartCard className="orca-workspace-panel p-6">
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

            <dl className="orca-settings-info-grid">
              <div className="orca-info-tile">
                <dt>{isArabic ? "اسم المنشأة" : "Company Name"}</dt>
                <dd>{tenant.companyName}</dd>
              </div>

              <div className="orca-info-tile">
                <dt>{isArabic ? "النطاق الفرعي" : "Subdomain"}</dt>
                <dd className="font-en">{tenant.subdomain}</dd>
              </div>

              {!isDedicatedCopy && (
                <div className="orca-info-tile">
                  <dt>{isArabic ? "الباقة الحالية" : "Current Plan"}</dt>
                  <dd>{displayPlan(tenant.subscriptionPlan, isArabic)}</dd>
                </div>
              )}
            </dl>
          </SmartCard>
        )}

        {activeSection === "staff" && (
          <div className="orca-settings-section orca-settings-staff">
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
          <div className="orca-settings-section orca-settings-ai">
            <SettingsAIProviders />
          </div>
        )}

        {activeSection === "integrations" && (
          <div className="space-y-6">
            <SettingsIntegrationsHub lang={lang} />
          </div>
        )}

        {activeSection === "advertising" && (
          <div className="orca-settings-section orca-settings-advertising">
            <AdvertisingPlatformIntegrations lang={lang} />
          </div>
        )}

        {activeSection === "compliance" && (
          <div className="orca-settings-section orca-settings-compliance">
            <SettingsCompliance lang={lang} isArabic={isArabic} />
          </div>
        )}
      </section>
    </main>
  );
}
