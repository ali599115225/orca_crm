"use client";

import React, { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LayoutContainer from "@/components/ui/LayoutContainer";
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from "@/app/context/AppContext";

const COPY = {
  AR: {
    title: "حاسبة التمويل العقاري",
    description: "محاكاة مالية محايدة تعتمد بالكامل على القيم التي يدخلها المستخدم دون نسب أو عروض منسوبة إلى مزود خارجي.",
    badge: "أداة تقديرية",
    inputs: "مدخلات التمويل",
    propertyPrice: "سعر العقار",
    downPayment: "الدفعة الأولى",
    annualRate: "نسبة الربح السنوية المدخلة",
    years: "مدة التمويل بالسنوات",
    salary: "الدخل الشهري",
    commitments: "الالتزامات الشهرية الحالية",
    dsrLimit: "حد الاستقطاع الاسترشادي",
    financedAmount: "مبلغ التمويل",
    monthlyPayment: "القسط الشهري المقدر",
    totalFinanceCost: "تكلفة التمويل المقدرة",
    totalPaid: "إجمالي المبلغ المدفوع",
    dsr: "نسبة الاستقطاع المقدرة",
    availablePayment: "القسط المتاح وفق الحد المدخل",
    compliant: "الحسبة ضمن الحد الذي أدخله المستخدم",
    nonCompliant: "الحسبة تتجاوز الحد الذي أدخله المستخدم",
    noteTitle: "تنبيه مهني",
    note: "هذه نتيجة تقديرية وليست عرضًا ائتمانيًا أو موافقة تمويل. النسبة والرسوم وحدود الاستقطاع يحددها العميل أو الجهة الممولة ويجب التحقق منها مباشرة.",
    sar: "ر.س",
    percent: "٪",
  },
  EN: {
    title: "Mortgage Finance Calculator",
    description: "A provider-neutral simulation based entirely on user-entered values, with no attributed lender rates or promotions.",
    badge: "Estimate only",
    inputs: "Finance inputs",
    propertyPrice: "Property price",
    downPayment: "Down payment",
    annualRate: "User-entered annual profit rate",
    years: "Finance term in years",
    salary: "Monthly income",
    commitments: "Existing monthly commitments",
    dsrLimit: "Advisory deduction limit",
    financedAmount: "Finance amount",
    monthlyPayment: "Estimated monthly payment",
    totalFinanceCost: "Estimated finance cost",
    totalPaid: "Estimated total paid",
    dsr: "Estimated deduction ratio",
    availablePayment: "Available payment under entered limit",
    compliant: "The estimate is within the user-entered limit",
    nonCompliant: "The estimate exceeds the user-entered limit",
    noteTitle: "Professional notice",
    note: "This is an estimate, not a credit offer or approval. Rates, fees, and deduction limits must be entered and verified with the relevant financing provider.",
    sar: "SAR",
    percent: "%",
  },
};

const clamp = (value: number, min = 0) =>
  Number.isFinite(value) ? Math.max(min, value) : min;

export default function CalculatorView() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const t = COPY[lang] || COPY.AR;

  const [propertyPrice, setPropertyPrice] = useState(1_000_000);
  const [downPayment, setDownPayment] = useState(100_000);
  const [annualRate, setAnnualRate] = useState(4.5);
  const [years, setYears] = useState(20);
  const [salary, setSalary] = useState(15_000);
  const [commitments, setCommitments] = useState(0);
  const [dsrLimit, setDsrLimit] = useState(55);

  const result = useMemo(() => {
    const principal = clamp(propertyPrice - downPayment);
    const months = Math.max(1, Math.round(clamp(years, 1) * 12));
    const monthlyRate = clamp(annualRate) / 100 / 12;

    const monthlyPayment =
      monthlyRate === 0
        ? principal / months
        : principal *
          ((monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1));

    const totalInstallments = monthlyPayment * months;
    const totalFinanceCost = Math.max(0, totalInstallments - principal);
    const totalPaid = downPayment + totalInstallments;
    const dsr =
      salary > 0 ? ((monthlyPayment + commitments) / salary) * 100 : 0;
    const availablePayment = Math.max(
      0,
      salary * (clamp(dsrLimit) / 100) - commitments,
    );

    return {
      principal,
      monthlyPayment,
      totalFinanceCost,
      totalPaid,
      dsr,
      availablePayment,
      compliant: salary > 0 && dsr <= dsrLimit,
    };
  }, [
    propertyPrice,
    downPayment,
    annualRate,
    years,
    salary,
    commitments,
    dsrLimit,
  ]);

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);

  const money = (value: number) => `${number(value)} ${t.sar}`;

  const field = (
    label: string,
    value: number,
    setter: (value: number) => void,
    step = 1,
    min = 0,
  ) => (
    <label className="space-y-2">
      <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
        {label}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => setter(Number(event.target.value))}
        className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-bold text-[var(--nc-text-primary)] outline-none transition focus:border-[var(--nc-accent)]"
      />
    </label>
  );

  return (
    <div className="nc-page nc-stack orca-container orca-calculator-final pb-10" dir={isArabic ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description}
        eyebrow={
          isArabic
            ? "القيمة → التمويل → القسط → الاستقطاع"
            : "Value → finance → payment → deduction"
        }
        workspace
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--nc-accent)]">
          <i className="ph-bold ph-calculator" aria-hidden="true" />
          {t.badge}
        </span>
      </PageHeader>

      <LayoutContainer
        workspace
        kpis={
          <>
            {[
              [t.financedAmount, money(result.principal), "ph-bank"],
              [t.monthlyPayment, money(result.monthlyPayment), "ph-calendar-check"],
              [t.totalFinanceCost, money(result.totalFinanceCost), "ph-chart-line-up"],
              [t.dsr, `${number(result.dsr, 1)}${t.percent}`, "ph-percent"],
            ].map(([label, value, icon]) => (
              <SmartCard key={label} elevation="elevated" className="orca-workspace-metric p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)]">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--nc-text-primary)]">
                      {value}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
                    <i className={`ph-bold ${icon}`} aria-hidden="true" />
                  </span>
                </div>
              </SmartCard>
            ))}
          </>
        }
        actions={
          <SmartCard className="orca-workspace-panel p-5">
            <h2 className="mb-5 text-sm font-black text-[var(--nc-text-primary)]">
              {t.inputs}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field(t.propertyPrice, propertyPrice, setPropertyPrice, 1000)}
              {field(t.downPayment, downPayment, setDownPayment, 1000)}
              {field(t.annualRate, annualRate, setAnnualRate, 0.01)}
              {field(t.years, years, setYears, 1, 1)}
              {field(t.salary, salary, setSalary, 100)}
              {field(t.commitments, commitments, setCommitments, 100)}
              {field(t.dsrLimit, dsrLimit, setDsrLimit, 1)}
            </div>
          </SmartCard>
        }
        insights={
          <div className="space-y-4">
            <SmartCard className="orca-workspace-panel p-5">
              <div className="space-y-4">
                {[
                  [t.totalPaid, money(result.totalPaid)],
                  [t.availablePayment, money(result.availablePayment)],
                  [t.dsr, `${number(result.dsr, 1)}${t.percent}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-[var(--nc-border)] pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-xs font-bold text-[var(--nc-text-secondary)]">
                      {label}
                    </span>
                    <span className="text-sm font-black text-[var(--nc-text-primary)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
                  result.compliant
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                }`}
              >
                {result.compliant ? t.compliant : t.nonCompliant}
              </div>
            </SmartCard>

            <SmartCard className="orca-workspace-panel p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-[var(--nc-text-primary)]">
                <i className="ph-bold ph-info" aria-hidden="true" />
                {t.noteTitle}
              </h3>
              <p className="mt-3 text-xs leading-6 text-[var(--nc-text-secondary)]">
                {t.note}
              </p>
            </SmartCard>
          </div>
        }
      />
    </div>
  );
}
