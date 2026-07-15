"use client";

import {
  CalendarCheck2,
  FileCheck2,
  SendHorizontal,
  UsersRound,
} from "lucide-react";
import type { DashboardReadModel } from "../model";
import type { DashboardCopy } from "../copy/dashboardCopy";
import DashboardMetricCard from "./DashboardMetricCard";

interface DashboardKpiGridProps {
  kpis: DashboardReadModel["kpis"];
  copy: DashboardCopy;
}

export default function DashboardKpiGrid({
  kpis,
  copy,
}: DashboardKpiGridProps) {
  return (
    <section
      className="orca-workspace-metrics !grid !grid-cols-1 gap-3 sm:!grid-cols-2 xl:!grid-cols-4"
      aria-label={copy.activeLeads}
    >
      <DashboardMetricCard
        title={copy.activeLeads}
        description={copy.activeLeadsDescription}
        value={kpis.activeLeads}
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
        href="/operations/leads"
        errorLabel={copy.dataUnavailable}
      />
      <DashboardMetricCard
        title={copy.todayTours}
        description={copy.todayToursDescription}
        value={kpis.todayTours}
        icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
        href="/operations/tours"
        errorLabel={copy.dataUnavailable}
      />
      <DashboardMetricCard
        title={copy.activeOffers}
        description={copy.activeOffersDescription}
        value={kpis.activeOffers}
        icon={<SendHorizontal className="h-5 w-5" aria-hidden="true" />}
        href="/operations/offers"
        errorLabel={copy.dataUnavailable}
      />
      <DashboardMetricCard
        title={copy.signedContracts}
        description={copy.signedContractsDescription}
        value={kpis.signedContractsThisMonth}
        icon={<FileCheck2 className="h-5 w-5" aria-hidden="true" />}
        href="/operations/sales"
        errorLabel={copy.dataUnavailable}
      />
    </section>
  );
}
