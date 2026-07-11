"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ContractWizard from "@/components/features/ContractWizard";
import { useApp } from "@/app/context/AppContext";
import { displayPerson, type DisplayLocale } from "@/lib/display";
import type {
  DashboardCapabilities,
  DashboardReadModel,
} from "../model";
import { dashboardCopy } from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";
import DashboardHeader from "./DashboardHeader";
import DashboardKpiGrid from "./DashboardKpiGrid";
import DealSpineSnapshot from "./DealSpineSnapshot";
import DailyOperationsCenter from "./DailyOperationsCenter";

interface DashboardViewProps {
  user: { name: string | null };
  model: DashboardReadModel;
  capabilities: DashboardCapabilities;
}

export default function DashboardView({
  user,
  model,
  capabilities,
}: DashboardViewProps) {
  const { lang } = useApp();
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isArabic = lang !== "EN";
  const locale: DisplayLocale = isArabic ? "ar" : "en";
  const copy = isArabic ? dashboardCopy.AR : dashboardCopy.EN;

  const welcomeName = useMemo(() => {
    if (!user.name) return copy.fallbackUser;
    return displayPerson(user.name, locale, {
      route: "/operations/dashboard",
      fieldName: "userName",
    });
  }, [copy.fallbackUser, locale, user.name]);

  useEffect(() => {
    const handleSearchChange = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      setSearchQuery(typeof value === "string" ? value : "");
    };

    window.addEventListener("search-change", handleSearchChange);
    return () => window.removeEventListener("search-change", handleSearchChange);
  }, []);

  const refresh = () => router.refresh();

  return (
    <main className={dashboardVisual.page} dir={isArabic ? "rtl" : "ltr"}>
      <div className={dashboardVisual.shell}>
        <DashboardHeader
          copy={copy}
          welcomeName={welcomeName}
          generatedAt={model.generatedAt}
          canIssueContract={capabilities.canIssueContract}
          onIssueContract={() => setIsWizardOpen(true)}
        />

        <DashboardKpiGrid kpis={model.kpis} copy={copy} />

        <DealSpineSnapshot
          pipeline={model.pipeline}
          copy={copy}
          onRetry={refresh}
        />

        <DailyOperationsCenter
          operations={model.operations}
          copy={copy}
          locale={locale}
          isArabic={isArabic}
          searchQuery={searchQuery}
          onRetry={refresh}
        />
      </div>

      {capabilities.canIssueContract && (
        <ContractWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={refresh}
        />
      )}
    </main>
  );
}
