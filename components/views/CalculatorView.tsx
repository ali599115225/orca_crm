"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Calculator,
  CalendarCheck2,
  ChartLine,
  CircleDollarSign,
  Info,
  Percent,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import {
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsNumberField,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

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

  const [propertyPrice, setPropertyPrice] = useState("1000000");
  const [downPayment, setDownPayment] = useState("100000");
  const [annualRate, setAnnualRate] = useState("4.5");
  const [years, setYears] = useState("20");
  const [salary, setSalary] = useState("15000");
  const [commitments, setCommitments] = useState("0");
  const [dsrLimit, setDsrLimit] = useState("55");

  const numeric = (value: string) => Number(value || 0);

  const result = useMemo(() => {
    const propertyPriceValue = numeric(propertyPrice);
    const downPaymentValue = numeric(downPayment);
    const annualRateValue = numeric(annualRate);
    const yearsValue = numeric(years);
    const salaryValue = numeric(salary);
    const commitmentsValue = numeric(commitments);
    const dsrLimitValue = numeric(dsrLimit);

    const principal = clamp(propertyPriceValue - downPaymentValue);
    const months = Math.max(1, Math.round(clamp(yearsValue, 1) * 12));
    const monthlyRate = clamp(annualRateValue) / 100 / 12;
    const monthlyPayment =
      monthlyRate === 0
        ? principal / months
        : principal *
          ((monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1));
    const totalInstallments = monthlyPayment * months;
    const totalFinanceCost = Math.max(0, totalInstallments - principal);
    const totalPaid = downPaymentValue + totalInstallments;
    const dsr =
      salaryValue > 0
        ? ((monthlyPayment + commitmentsValue) / salaryValue) * 100
        : 0;
    const availablePayment = Math.max(
      0,
      salaryValue * (clamp(dsrLimitValue) / 100) - commitmentsValue,
    );

    return {
      principal,
      monthlyPayment,
      totalFinanceCost,
      totalPaid,
      dsr,
      availablePayment,
      compliant: salaryValue > 0 && dsr <= dsrLimitValue,
    };
  }, [propertyPrice, downPayment, annualRate, years, salary, commitments, dsrLimit]);

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
  const money = (value: number) => `${number(value)} ${t.sar}`;

  return (
    <main className={operationsVisual.page} dir={isArabic ? "rtl" : "ltr"} data-calculator-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={isArabic ? "القيمة → التمويل → القسط → الاستقطاع" : "Value → finance → payment → deduction"}
          title={t.title}
          description={t.description}
          icon={Calculator}
          meta={<span className={operationsVisual.statusBadge}>{t.badge}</span>}
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title={t.financedAmount} value={money(result.principal)} description={t.propertyPrice} icon={Banknote} />
          <OperationsMetricCard title={t.monthlyPayment} value={money(result.monthlyPayment)} description={t.years} icon={CalendarCheck2} />
          <OperationsMetricCard title={t.totalFinanceCost} value={money(result.totalFinanceCost)} description={t.totalPaid} icon={ChartLine} />
          <OperationsMetricCard title={t.dsr} value={`${number(result.dsr, 1)}${t.percent}`} description={t.dsrLimit} icon={Percent} />
        </OperationsKpiGrid>

        <OperationsExecutiveGrid>
          <OperationsPanel className="overflow-hidden" dir={isArabic ? "rtl" : "ltr"}>
            <OperationsPanelHeader title={t.inputs} description={t.description} icon={CircleDollarSign} />
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <NumberField label={t.propertyPrice} value={propertyPrice} setValue={setPropertyPrice} />
              <NumberField label={t.downPayment} value={downPayment} setValue={setDownPayment} />
              <NumberField label={t.annualRate} value={annualRate} setValue={setAnnualRate} decimal />
              <NumberField label={t.years} value={years} setValue={setYears} />
              <NumberField label={t.salary} value={salary} setValue={setSalary} />
              <NumberField label={t.commitments} value={commitments} setValue={setCommitments} />
              <NumberField label={t.dsrLimit} value={dsrLimit} setValue={setDsrLimit} />
            </div>
          </OperationsPanel>

          <div className="grid min-w-0 gap-2">
            <OperationsPanel className="overflow-hidden" dir={isArabic ? "rtl" : "ltr"}>
              <OperationsPanelHeader title={isArabic ? "ملخص النتيجة" : "Result summary"} icon={Calculator} />
              <div className="grid gap-2 p-3">
                <Summary label={t.totalPaid} value={money(result.totalPaid)} />
                <Summary label={t.availablePayment} value={money(result.availablePayment)} />
                <Summary label={t.dsr} value={`${number(result.dsr, 1)}${t.percent}`} />
                <div className={`rounded-xl border px-3 py-2.5 text-xs font-black ${result.compliant ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                  {result.compliant ? t.compliant : t.nonCompliant}
                </div>
              </div>
            </OperationsPanel>

            <OperationsPanel className="overflow-hidden" dir={isArabic ? "rtl" : "ltr"}>
              <OperationsPanelHeader title={t.noteTitle} icon={Info} />
              <p className="p-3 text-xs leading-6 text-[var(--nc-text-secondary)]">{t.note}</p>
            </OperationsPanel>
          </div>
        </OperationsExecutiveGrid>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  setValue,
  decimal = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  decimal?: boolean;
}) {
  return (
    <OperationsFormField label={label}>
      <OperationsNumberField
        value={value}
        onValueChange={setValue}
        mode={decimal ? "decimal" : "integer"}
        className="orca-operations-input"
      />
    </OperationsFormField>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${operationsVisual.contentCard} flex items-center justify-between gap-4 px-3 py-2.5`}>
      <span className="text-[10px] font-bold text-[var(--nc-text-secondary)]">{label}</span>
      <strong className="text-xs font-black text-[var(--nc-text-primary)]">{value}</strong>
    </div>
  );
}
