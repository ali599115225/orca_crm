"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import SettingsNavigation, {
  type SettingsSection,
} from "@/components/settings/SettingsNavigation";
import SettingsStaff from "@/components/settings/SettingsStaff";
import SettingsCompliance from "@/components/settings/SettingsCompliance";
import SettingsIntegrationsHub from "@/components/settings/SettingsIntegrationsHub";
import AdvertisingPlatformIntegrations from "@/components/settings/AdvertisingPlatformIntegrations";
import SettingsAIProviders from "@/components/settings/SettingsAIProviders";
import {
  createOrganizationBranchAction,
  listOrganizationBranchesAction,
} from "@/app/actions/organization";
import {
  OperationsFormField,
  OperationsPageHeader,
  OperationsPanel,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

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

export default function SettingsView({
  tenant,
  users = [],
}: SettingsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const headerRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    const requested = resolveSection(searchParams.get("tab"));
    return requested === "billing" ? "organization" : requested;
  });
  const [branches, setBranches] = useState<
    Array<{ id: string; code: string; name: string; active: boolean }>
  >([]);
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchError, setBranchError] = useState("");

  async function loadBranches() {
    const result = await listOrganizationBranchesAction();
    if (result.success) setBranches(result.branches);
  }

  async function submitBranch() {
    setBranchError("");
    if (!branchCode.trim() || !branchName.trim()) {
      setBranchError(
        isArabic
          ? "أدخل رمز الفرع واسم الفرع."
          : "Enter both branch code and branch name.",
      );
      return;
    }
    const result = await createOrganizationBranchAction({
      code: branchCode.trim(),
      name: branchName.trim(),
    });
    if (!result.success) {
      setBranchError(result.error);
      return;
    }
    setBranchCode("");
    setBranchName("");
    await loadBranches();
  }

  useEffect(() => {
    const resolved = resolveSection(searchParams.get("tab"));
    setActiveSection(
      resolved === "billing" ? "organization" : resolved,
    );
    headerRef.current?.scrollIntoView({ block: "start" });
  }, [searchParams]);

  useEffect(() => {
    void loadBranches();
  }, []);

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
    const target = section === "billing" ? "organization" : section;
    setActiveSection(target);
    router.replace("/operations/settings?tab=" + target, { scroll: false });
    requestAnimationFrame(() => {
      headerRef.current?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <main
      className={operationsVisual.page}
      dir={isArabic ? "rtl" : "ltr"}
      data-settings-dashboard-contract
    >
      <div className={operationsVisual.pageStack}>
        <div ref={headerRef}>
          <OperationsPageHeader
            eyebrow={
              isArabic
                ? "المؤسسة → الفريق → التكاملات → الامتثال"
                : "Organization → staff → integrations → compliance"
            }
            title={isArabic ? "الإعدادات" : "Settings"}
            description={
              isArabic
                ? "إدارة بيانات المؤسسة والفريق والتكاملات والحملات الإعلانية والامتثال من مكان واحد."
                : "Manage organization data, staff, integrations, advertising, and compliance from one place."
            }
          />
        </div>

        <OperationsPanel className="overflow-hidden p-2">
          <SettingsNavigation
            activeSection={activeSection}
            lang={lang}
            onChange={changeSection}
            hideBilling
          />
        </OperationsPanel>

        <section className="w-full min-w-0">
          {activeSection === "organization" && (
            <OperationsPanel padded>
              <div className="grid gap-4">
                <div>
                  <h2 className={operationsVisual.sectionTitle}>
                    {isArabic ? "بيانات المؤسسة" : "Organization Details"}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                    {isArabic
                      ? "البيانات الأساسية المرتبطة بحساب الشركة وإدارة الفروع."
                      : "Core company account information and branch management."}
                  </p>
                </div>

                <dl className="grid gap-2 md:grid-cols-2">
                  <div className={operationsVisual.contentCard + " p-3"}>
                    <dt className={operationsVisual.meta}>
                      {isArabic ? "اسم المنشأة" : "Company Name"}
                    </dt>
                    <dd className="mt-1 text-sm font-black text-[var(--nc-text-primary)]">
                      {tenant.companyName}
                    </dd>
                  </div>

                  <div className={operationsVisual.contentCard + " p-3"}>
                    <dt className={operationsVisual.meta}>
                      {isArabic ? "النطاق الفرعي" : "Subdomain"}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-black text-[var(--nc-text-primary)]">
                      {tenant.subdomain}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-[var(--nc-border)] pt-4">
                  <h3 className={operationsVisual.sectionTitle}>
                    {isArabic ? "الفروع" : "Branches"}
                  </h3>

                  <div className="mt-3 grid gap-2">
                    {branches.length > 0 ? (
                      branches.map((branch) => (
                        <div
                          key={branch.id}
                          className={operationsVisual.contentCard + " flex items-center justify-between gap-3 p-3"}
                        >
                          <div className="min-w-0">
                            <strong className="block truncate text-xs text-[var(--nc-text-primary)]">
                              {branch.name}
                            </strong>
                            <span className={operationsVisual.meta}>
                              {branch.code}
                            </span>
                          </div>
                          <span className={operationsVisual.statusBadge}>
                            {branch.active
                              ? isArabic
                                ? "نشط"
                                : "Active"
                              : isArabic
                                ? "غير نشط"
                                : "Inactive"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--nc-text-dim)]">
                        {isArabic ? "لا توجد فروع مسجلة بعد." : "No branches have been registered yet."}
                      </p>
                    )}
                  </div>

                  <form
                    className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitBranch();
                    }}
                  >
                    <OperationsFormField label={isArabic ? "رمز الفرع" : "Branch code"}>
                      <OperationsTextField
                        value={branchCode}
                        onChange={(event) => {
                          setBranchCode(event.target.value);
                          if (branchError) setBranchError("");
                        }}
                        placeholder={isArabic ? "مثال: RUH-01" : "Example: RUH-01"}
                      />
                    </OperationsFormField>

                    <OperationsFormField label={isArabic ? "اسم الفرع" : "Branch name"}>
                      <OperationsTextField
                        value={branchName}
                        onChange={(event) => {
                          setBranchName(event.target.value);
                          if (branchError) setBranchError("");
                        }}
                        placeholder={isArabic ? "فرع الرياض" : "Riyadh branch"}
                      />
                    </OperationsFormField>

                    <button
                      type="submit"
                      className={operationsVisual.primaryButton + " self-end"}
                    >
                      {isArabic ? "إنشاء فرع" : "Create branch"}
                    </button>
                  </form>

                  {branchError ? (
                    <p role="alert" className="mt-2 text-xs font-bold text-rose-400">
                      {branchError}
                    </p>
                  ) : null}
                </div>
              </div>
            </OperationsPanel>
          )}

          {activeSection === "staff" && (
            <SettingsStaff
              users={staffUsers}
              lang={lang}
              isArabic={isArabic}
            />
          )}

          {activeSection === "ai" && <SettingsAIProviders />}

          {activeSection === "integrations" && (
            <SettingsIntegrationsHub lang={lang} />
          )}

          {activeSection === "advertising" && (
            <AdvertisingPlatformIntegrations lang={lang} />
          )}

          {activeSection === "compliance" && (
            <SettingsCompliance lang={lang} isArabic={isArabic} />
          )}
        </section>
      </div>
    </main>
  );
}
