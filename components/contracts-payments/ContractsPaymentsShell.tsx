"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Landmark,
  PenLine,
  Receipt,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import {
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsTabs,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

export type ContractsPaymentsPane =
  | "leases"
  | "sales"
  | "invoices"
  | "payments"
  | "reconciliation"
  | "settlements";

type MetricTone = "default" | "success" | "warning" | "danger";
type AlertTone = "info" | "warning" | "danger";

export interface ContractsPaymentsMetric {
  label: string;
  value: string;
  hint: string;
  tone?: MetricTone;
}

export interface ContractsPaymentsAlert {
  label: string;
  tone: AlertTone;
}

interface ContractsPaymentsShellProps {
  locale: "ar" | "en";
  activePane: ContractsPaymentsPane;
  onPaneChange: (pane: ContractsPaymentsPane) => void;
  loading: boolean;
  title: string;
  description: string;
  metrics: ContractsPaymentsMetric[];
  alerts?: ContractsPaymentsAlert[];
  actions?: ReactNode;
  showWorkspaceNavigation?: boolean;
  children: ReactNode;
}

const metricToneClass: Record<MetricTone, string> = {
  default: "text-[var(--nc-text-primary)]",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
};

const alertToneClass: Record<AlertTone, string> = {
  info: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default function ContractsPaymentsShell({
  locale,
  activePane,
  onPaneChange,
  loading,
  title,
  description,
  metrics,
  alerts = [],
  actions,
  showWorkspaceNavigation = true,
  children,
}: ContractsPaymentsShellProps) {
  const isArabic = locale === "ar";

  const tabs: Array<{
    id: ContractsPaymentsPane;
    label: string;
    Icon: LucideIcon;
  }> = [
    {
      id: "sales",
      label: isArabic ? "عقود البيع" : "Sales contracts",
      Icon: PenLine,
    },
    {
      id: "leases",
      label: isArabic ? "عقود الإيجار" : "Rental leases",
      Icon: FileText,
    },
    {
      id: "invoices",
      label: isArabic ? "الفواتير" : "Invoices",
      Icon: Receipt,
    },
    {
      id: "payments",
      label: isArabic ? "المدفوعات" : "Payments",
      Icon: Wallet,
    },
    {
      id: "reconciliation",
      label: isArabic ? "المصالحة البنكية" : "Bank reconciliation",
      Icon: Landmark,
    },
    {
      id: "settlements",
      label: isArabic ? "التسويات" : "Settlements",
      Icon: Wallet,
    },
  ];

  return (
    <div
      className={operationsVisual.page}
      dir={isArabic ? "rtl" : "ltr"}
      data-contracts-payments-shell
    >
      <OperationsPageHeader
        eyebrow={isArabic ? "العقود والمدفوعات" : "Contracts & Payments"}
        title={title}
        description={description}
        actions={
          <>
            {actions}
            {alerts.map((alert) => (
              <span
                key={`${alert.tone}:${alert.label}`}
                className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${alertToneClass[alert.tone]}`}
              >
                {alert.label}
              </span>
            ))}
          </>
        }
      />

      <OperationsKpiGrid>
        {metrics.map((metric, index) => {
          const tone = metric.tone || "default";
          const MetricIcon = [FileText, Receipt, Wallet, CircleDollarSign][index % 4];

          return (
            <OperationsMetricCard
              key={metric.label}
              title={metric.label}
              value={loading ? "…" : metric.value}
              description={metric.hint}
              icon={MetricIcon}
              className={metricToneClass[tone]}
            />
          );
        })}
      </OperationsKpiGrid>

      <OperationsPanel className="overflow-hidden">
        {showWorkspaceNavigation ? (
          <div
            className="orca-contracts-payments-tabs border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-2 py-1.5"
            data-contracts-payments-tabs
          >
            <OperationsTabs
              dir={isArabic ? "rtl" : "ltr"}
              className="w-full justify-start"
            >
              {tabs.map(({ id, label, Icon }) => {
                const active = activePane === id;

                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onPaneChange(id)}
                    className={
                      active
                        ? operationsVisual.activeTab
                        : operationsVisual.tab
                    }
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </OperationsTabs>
          </div>
        ) : null}

        <div className="p-2">{children}</div>
      </OperationsPanel>
    </div>
  );
}