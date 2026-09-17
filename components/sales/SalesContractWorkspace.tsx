"use client";

import SettingsSelect from "@/components/settings/SettingsSelect";
import { displayUiAlias } from "@/lib/display/uiAliases";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  Landmark,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  WalletCards,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import {
  REALTIME_SYNC_EVENT,
  shouldInvalidateFromSync,
} from "@/lib/realtime/client-runtime";
import FinancialLifecycleProgress, {
  type FinancialLifecycleStage,
} from "@/components/contracts-payments/FinancialLifecycleProgress";
import {
  OperationsBackAction,
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsNumberField,
  OperationsPageHeader,
  OperationsPanel,
  OperationsTabs,
  OperationsTextareaField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

type Locale = "ar" | "en";
type Tab = "overview" | "payment-plan" | "installments" | "payments" | "amendments" | "documents" | "timeline";
type RestructureMode = "REDUCE_INSTALLMENT" | "REDUCE_TERM";

type AmendmentValues = {
  prepaymentAmount: number | null;
  installmentAmount: number | null;
  installmentCount: number | null;
  remainingBalance: number | null;
  endDate: string | null;
};

type Amendment = {
  id: string;
  version: number | null;
  type: string;
  reason: string;
  executedBy: string;
  executedAt: string;
  before: AmendmentValues;
  after: AmendmentValues;
};

type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
};

type Installment = {
  id: string;
  installmentNumber: number;
  amountSar: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paymentStatus: string;
};

type Payment = {
  id: string;
  installmentId: string | null;
  amount: number;
  netAmount: number;
  method: string;
  provider: string;
  status: string;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
  receipt: null | {
    id: string;
    amount: number;
    receivedDate: string;
    status: string;
  };
};

type TimelineEvent = {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  details: string | null;
  createdAt: string;
};

type ContractDetail = {
  id: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  totalVolumeSar: number;
  acceptedAt: string;
  reservationExpiresAt: string | null;
  signedAt: string | null;
  version: number;
  spineVersion: number;
  legacyFinancial: boolean;
  legacyReason: string | null;
  unit: {
    id: string;
    unitNumber: string;
    status: string;
    project: { id: string; name: string };
  };
  lead: null | {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
  };
  paymentPlan: null | {
    id: string;
    template: string;
    status: string;
    totalAmount: number;
    installmentCount: number;
    schedule: unknown;
    version: number;
    lastAmendedAt: string | null;
    activatedAt: string | null;
    completedAt: string | null;
  };
  invoice: null | {
    id: string;
    invoiceNumber: number;
    invoicePrefix: string;
    totalAmount: number;
    subtotal: number;
    vatAmount: number;
    status: string;
    dueDate: string;
  };
  financials: {
    totalPaid: number;
    remainingBalance: number;
    collectionPercent: number;
  };
  summary: {
    remainingInstallmentCount: number;
    overdueInstallmentCount: number;
    planEndDate: string | null;
    nextInstallment: null | {
      installmentNumber: number;
      amount: number;
      dueDate: string;
      status: string;
    };
    lastPayment: null | {
      amount: number;
      paidAt: string;
      method: string;
      provider: string;
    };
    lastAmendmentAt: string | null;
  };
  installments: Installment[];
  payments: Payment[];
  timeline: TimelineEvent[];
  amendments: Amendment[];
  documents: Document[];
};

const INSTALLMENTS_PAGE_SIZE = 10;
const PAYMENTS_PAGE_SIZE = 10;
const AMENDMENTS_PAGE_SIZE = 2;
const TIMELINE_PAGE_SIZE = 5;
const COLLECTIBLE = new Set(["Pending", "Partial", "Overdue"]);

function text(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function remainingBalanceLabel(
  hasInvoice: boolean,
  value: number,
  locale: Locale,
) {
  if (!hasInvoice) return "—";
  return money(value, locale);
}

function awaitingInvoiceLabel(locale: Locale) {
  return text(
    locale,
    "بانتظار إصدار الفاتورة",
    "Awaiting invoice issuance",
  );
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function shortDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yy} • ${hh}:${min}`;
}

function statusLabel(status: string, locale: Locale) {
  const map: Record<string, [string, string]> = {
    SIGNED: ["موقّع", "Signed"],
    PENDING_SIGNATURE: ["بانتظار التوقيع", "Pending signature"],
    Pending: ["مستحق", "Pending"],
    Partial: ["مدفوع جزئيًا", "Partially paid"],
    Paid: ["مدفوع", "Paid"],
    Overdue: ["متأخر", "Overdue"],
    Processing: ["قيد المعالجة", "Processing"],
    Cancelled: ["ملغي", "Cancelled"],
    COMPLETED: ["مكتمل", "Completed"],
    FAILED: ["فشل", "Failed"],
    PENDING: ["معلق", "Pending"],
    PROCESSING: ["قيد المعالجة", "Processing"],
    DRAFT: ["مسودة", "Draft"],
    ACTIVE: ["نشطة", "Active"],
    CANCELLED: ["ملغاة", "Cancelled"],
  };
  const item = map[status] || [status, status];
  return locale === "ar" ? item[0] : item[1];
}

function timelineActionLabel(action: string, locale: Locale): string {
  const normalizedAction = action
    .trim()
    .replace(/[\s.-]+/g, "_")
    .toUpperCase();

  const map: Record<string, [string, string]> = {
    SIGN_CONTRACT: ["توقيع العقد", "Contract signed"],
    CREATE: ["إنشاء", "Created"],
    CREATE_CONTRACT: ["إنشاء العقد", "Contract created"],
    CREATE_DRAFT_CONTRACT: ["إنشاء مسودة العقد", "Draft contract created"],
    CREATE_CONTRACT_DRAFT: ["إنشاء مسودة العقد", "Draft contract created"],
    ISSUE_CONTRACT: ["إصدار العقد", "Contract issued"],
    CONTRACT_ISSUED: ["إصدار العقد", "Contract issued"],
    CREATE_INVOICE: ["إنشاء الفاتورة", "Invoice created"],
    CREATE_RENTAL_INVOICE: ["إنشاء فاتورة إيجار", "Rental invoice created"],
    CREATE_INSTALLMENTS: ["إنشاء الأقساط", "Installments created"],
    CONFIGURE_PAYMENT_PLAN: ["إعداد خطة الدفع", "Payment plan configured"],
    ACTIVATE_PAYMENT_PLAN: ["تفعيل خطة الدفع", "Payment plan activated"],
    RECORD_PAYMENT: ["تسجيل دفعة", "Payment recorded"],
    CREATE_NGENIUS_INSTALLMENT_PAYMENT: ["بدء دفع القسط", "Installment payment initiated"],
    NGENIUS_PAYMENT_RECEIVED: ["استلام دفعة N-Genius", "N-Genius payment received"],
    NGENIUS_PAYMENT_FAILED: ["فشل دفعة N-Genius", "N-Genius payment failed"],
    RESTRUCTURE_PAYMENT_PLAN: ["إعادة هيكلة خطة الدفع", "Payment plan restructured"],
    EARLY_SETTLEMENT_COMPLETED: ["إتمام السداد المبكر", "Early settlement completed"],
    UPDATE_CONTRACT: ["تحديث العقد", "Contract updated"],
    UPDATE_INVOICE: ["تحديث الفاتورة", "Invoice updated"],
    CANCEL_CONTRACT: ["إلغاء العقد", "Contract cancelled"],
  };
  const item = map[normalizedAction];
  if (item) return locale === "ar" ? item[0] : item[1];

  return normalizedAction.replace(/_/g, " ").toLowerCase();
}

function formatAmendmentType(type: string, locale: Locale): string {
  const map: Record<string, [string, string]> = {
    RESTRUCTURE: ["إعادة هيكلة", "Restructure"],
    AMENDMENT: ["تعديل", "Amendment"],
    EXTENSION: ["تمديد", "Extension"],
    REDUCTION: ["تخفيض", "Reduction"],
  };
  const item = map[type];
  if (item) return locale === "ar" ? item[0] : item[1];
  return type;
}

function formatFileSize(bytes: number, locale: Locale): string {
  if (bytes < 1024) return `${bytes} ${locale === "ar" ? "بايت" : "bytes"}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function paginate<T>(items: T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const normalized = Math.min(page, totalPages - 1);
  return {
    rows: items.slice(normalized * size, normalized * size + size),
    page: normalized,
    totalPages,
  };
}

function makeKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SalesContractWorkspace({
  contractId,
}: {
  contractId: string;
}) {
  const { lang } = useApp();
  const locale: Locale = lang === "AR" ? "ar" : "en";
  const L = useCallback(
    (ar: string, en: string) => text(locale, ar, en),
    [locale],
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [installmentPage, setInstallmentPage] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const [timelinePage, setTimelinePage] = useState(0);
  const [amendmentPage, setAmendmentPage] = useState(0);

  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [restructureMode, setRestructureMode] =
    useState<RestructureMode>("REDUCE_INSTALLMENT");
  const [restructureReason, setRestructureReason] = useState("");
  const [earlySettlementReason, setEarlySettlementReason] = useState("");
  const [earlySettlementConfirmed, setEarlySettlementConfirmed] =
    useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/contracts/${contractId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ||
            L("تعذر جلب تفاصيل عقد البيع.", "Failed to load sales contract."),
        );
      }
      setContract(payload.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L("حدث خطأ غير متوقع.", "Unexpected error."),
      );
    } finally {
      setLoading(false);
    }
  }, [L, contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRealtimeSync = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (shouldInvalidateFromSync(detail, "deals", contractId)) {
        void load();
      }
    };

    window.addEventListener(REALTIME_SYNC_EVENT, onRealtimeSync);
    return () =>
      window.removeEventListener(REALTIME_SYNC_EVENT, onRealtimeSync);
  }, [contractId, load]);

  useEffect(() => {
    if (searchParams.get("payment") === "return") {
      setNotice(
        L(
          "تم الرجوع من بوابة الدفع. حدّث الحالة بعد اكتمال التحقق.",
          "Returned from payment gateway. Refresh after verification completes.",
        ),
      );
      void load();
    }
  }, [L, load, searchParams]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const nextInstallment = useMemo(() => {
    if (!contract) return null;
    return [...contract.installments]
      .filter(
        (item) =>
          COLLECTIBLE.has(item.paymentStatus) && item.remainingAmount > 0,
      )
      .sort(
        (left, right) =>
          left.dueDate.localeCompare(right.dueDate) ||
          left.installmentNumber - right.installmentNumber,
      )[0] || null;
  }, [contract]);

  const mutableInstallments = useMemo(
    () =>
      contract?.installments.filter(
        (item) =>
          item.paidAmount === 0 &&
          COLLECTIBLE.has(item.paymentStatus) &&
          item.remainingAmount > 0,
      ) || [],
    [contract],
  );

  const preview = useMemo(() => {
    if (!contract) return null;
    const amount = Number(prepaymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const remaining = Math.max(
      0,
      contract.financials.remainingBalance - amount,
    );
    const availableCount = mutableInstallments.length;

    if (remaining <= 0.01) {
      return {
        remaining: 0,
        count: 0,
        estimated: 0,
        endDate: null as string | null,
      };
    }

    const currentInstallmentAmount = Math.max(
      mutableInstallments[0]?.amountSar || 0,
      0.01,
    );
    const count =
      restructureMode === "REDUCE_INSTALLMENT"
        ? Math.max(1, availableCount)
        : Math.max(
            1,
            Math.min(
              availableCount || 1,
              Math.ceil(remaining / currentInstallmentAmount),
            ),
          );

    return {
      remaining,
      count,
      estimated:
        restructureMode === "REDUCE_INSTALLMENT"
          ? remaining / count
          : Math.min(currentInstallmentAmount, remaining),
      endDate: mutableInstallments[count - 1]?.dueDate || null,
    };
  }, [
    contract,
    mutableInstallments,
    prepaymentAmount,
    restructureMode,
  ]);

  async function signPendingContract() {
    if (!contract || contract.status !== "PENDING_SIGNATURE") return;
    setBusy("sign");
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/contracts/${contract.id}/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ||
            L("تعذر تأكيد توقيع العقد.", "Failed to confirm contract signature."),
        );
      }
      setNotice(L("تم تأكيد توقيع العقد.", "Contract signature confirmed."));
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L("حدث خطأ غير متوقع.", "Unexpected error."),
      );
    } finally {
      setBusy("");
    }
  }

  async function payInstallment(item: Installment) {
    setBusy(`pay:${item.id}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/installments/${item.id}/pay`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.redirectUrl) {
        throw new Error(
          payload.error ||
            L("تعذر إنشاء رابط الدفع.", "Failed to create payment link."),
        );
      }
      window.location.assign(payload.redirectUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L("تعذر إنشاء رابط الدفع.", "Failed to create payment link."),
      );
      setBusy("");
    }
  }

  async function submitRestructure(event: React.FormEvent) {
    event.preventDefault();
    if (!contract) return;

    setBusy("restructure");
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/v1/contracts/${contract.id}/restructure`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prepaymentAmount: Number(prepaymentAmount),
            mode: restructureMode,
            reason: restructureReason,
            method: "BANK_TRANSFER_ADVANCE",
            idempotencyKey: makeKey(),
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ||
            L(
              "تعذر إعادة هيكلة خطة الدفع.",
              "Failed to restructure payment plan.",
            ),
        );
      }

      setNotice(
        L(
          "تم تسجيل الدفعة المقدمة وإعادة جدولة الرصيد.",
          "Advance payment recorded and remaining balance rescheduled.",
        ),
      );
      setPrepaymentAmount("");
      setRestructureReason("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L(
              "تعذر إعادة هيكلة خطة الدفع.",
              "Failed to restructure payment plan.",
            ),
      );
    } finally {
      setBusy("");
    }
  }

  async function submitEarlySettlement(event: React.FormEvent) {
    event.preventDefault();
    if (!contract || !canEarlySettle) return;

    setBusy("early-settlement");
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/v1/contracts/${contract.id}/early-settlement`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: earlySettlementReason,
            idempotencyKey: makeKey(),
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ||
            L(
              "تعذر تنفيذ السداد المبكر.",
              "Failed to complete early settlement.",
            ),
        );
      }

      setNotice(
        L(
          "تم تنفيذ السداد المبكر وإغلاق خطة الدفع.",
          "Early settlement completed and payment plan closed.",
        ),
      );
      setEarlySettlementReason("");
      setEarlySettlementConfirmed(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L(
              "تعذر تنفيذ السداد المبكر.",
              "Failed to complete early settlement.",
            ),
      );
    } finally {
      setBusy("");
    }
  }

  const installmentsPaging = paginate(
    contract?.installments || [],
    installmentPage,
    INSTALLMENTS_PAGE_SIZE,
  );
  const paymentsPaging = paginate(
    contract?.payments || [],
    paymentPage,
    PAYMENTS_PAGE_SIZE,
  );
  const amendmentsPaging = paginate(
    contract?.amendments || [],
    amendmentPage,
    AMENDMENTS_PAGE_SIZE,
  );
  const timelinePaging = paginate(
    contract?.timeline || [],
    timelinePage,
    TIMELINE_PAGE_SIZE,
  );

  if (loading && !contract) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-[var(--nc-text-dim)]">
        <Loader2 className="me-2 animate-spin" size={18} />
        {L("جارٍ تحميل العقد…", "Loading contract…")}
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">
        {error || L("عقد البيع غير موجود.", "Sales contract not found.")}
      </div>
    );
  }

  const canRestructure =
    contract.status === "SIGNED" &&
    !contract.legacyFinancial &&
    Boolean(contract.invoice) &&
    contract.financials.remainingBalance > 0;

  const canEarlySettle =
    contract.status === "SIGNED" &&
    !contract.legacyFinancial &&
    Boolean(contract.invoice) &&
    contract.paymentPlan?.status === "ACTIVE" &&
    contract.financials.remainingBalance > 0;

  const contractSigned = contract.status === "SIGNED";
  const hasPaymentPlan = Boolean(contract.paymentPlan);
  const hasInstallments = contract.installments.length > 0;
  const hasInvoice = Boolean(contract.invoice);
  const isFinanciallyPaid =
    contract.financials.remainingBalance <= 0 &&
    contract.financials.totalPaid > 0;
  const isFinanciallyClosed =
    isFinanciallyPaid &&
    (String(contract.invoice?.status || "").toLowerCase() === "paid" ||
      contract.paymentPlan?.status === "COMPLETED");

  const contractLifecycleStages: FinancialLifecycleStage[] = [
    {
      id: "contract",
      label: L("العقد", "Contract"),
      state: contractSigned ? "complete" : "current",
      hint: statusLabel(contract.status, locale),
    },
    {
      id: "payment-plan",
      label: L("خطة الدفع", "Payment plan"),
      state: hasPaymentPlan
        ? contract.paymentPlan?.status === "COMPLETED"
          ? "complete"
          : "current"
        : contractSigned
          ? "current"
          : "pending",
      hint: contract.paymentPlan
        ? statusLabel(contract.paymentPlan.status, locale)
        : L("غير مهيأة", "Not configured"),
    },
    {
      id: "installments",
      label: L("الأقساط", "Installments"),
      state: hasInstallments
        ? contract.summary.remainingInstallmentCount > 0
          ? "current"
          : "complete"
        : hasPaymentPlan
          ? "current"
          : "pending",
      hint: hasInstallments
        ? L(
            `${contract.summary.remainingInstallmentCount} متبقية`,
            `${contract.summary.remainingInstallmentCount} remaining`,
          )
        : L("لم تُنشأ", "Not created"),
    },
    {
      id: "invoice",
      label: L("الفاتورة", "Invoice"),
      state: hasInvoice
        ? String(contract.invoice?.status || "").toLowerCase() === "paid"
          ? "complete"
          : "current"
        : hasInstallments
          ? "current"
          : "pending",
      hint: contract.invoice
        ? `${contract.invoice.invoicePrefix}-${contract.invoice.invoiceNumber}`
        : L("لم تصدر", "Not issued"),
    },
    {
      id: "payments",
      label: L("المدفوعات", "Payments"),
      state: isFinanciallyPaid
        ? "complete"
        : hasInvoice
          ? contract.summary.overdueInstallmentCount > 0
            ? "blocked"
            : "current"
          : "pending",
      hint: L(
        `${contract.financials.collectionPercent}% محصل`,
        `${contract.financials.collectionPercent}% collected`,
      ),
    },
    {
      id: "close",
      label: L("الإغلاق", "Close"),
      state: isFinanciallyClosed
        ? "complete"
        : isFinanciallyPaid
          ? "current"
          : "pending",
      hint: isFinanciallyClosed
        ? L("مغلق ماليًا", "Financially closed")
        : L("بانتظار اكتمال التحصيل", "Awaiting collection"),
    },
  ];

  const contractLifecycleNextAction = contract.legacyFinancial
    ? L("العقد تاريخي للعرض فقط", "Legacy contract is read-only")
    : !contractSigned
      ? L("إكمال توقيع العقد", "Complete contract signing")
      : !hasPaymentPlan
        ? L("تهيئة خطة الدفع", "Configure payment plan")
        : !hasInstallments
          ? L("إنشاء جدول الأقساط", "Create installment schedule")
          : !hasInvoice
            ? L("إصدار الفاتورة", "Issue invoice")
            : contract.financials.remainingBalance > 0
              ? nextInstallment
                ? L(
                    `تحصيل القسط ${nextInstallment.installmentNumber}`,
                    `Collect installment ${nextInstallment.installmentNumber}`,
                  )
                : L("مراجعة الرصيد المتبقي", "Review remaining balance")
              : isFinanciallyClosed
                ? L("اكتمل الإغلاق المالي", "Financial close completed")
                : isFinanciallyPaid
                  ? L("مراجعة إقفال الفاتورة والخطة", "Review invoice and plan close")
                  : L("مراجعة الإغلاق المالي", "Review financial close");

  return (
    <main
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={operationsVisual.page}
      data-sales-contract-dashboard-contract
    >
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={contract.unit.project.name}
          title={`${contract.unit.unitNumber} · ${contract.buyerName}`}
          description={[
            statusLabel(contract.status, locale),
            contract.invoice
              ? `${contract.invoice.invoicePrefix}-${contract.invoice.invoiceNumber}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <>
              <OperationsBackAction
                href="/operations/rental/sales"
                label={L("العودة إلى عقود البيع", "Back to sales contracts")}
                locale={locale}
              />

              {contract.status === "PENDING_SIGNATURE" && !contract.legacyFinancial ? (
                <button
                  type="button"
                  onClick={() => void signPendingContract()}
                  disabled={busy !== ""}
                  className={operationsVisual.primaryButton}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {L("تأكيد التوقيع", "Confirm signature")}
                </button>
              ) : null}

              {nextInstallment && !contract.legacyFinancial ? (
                <button
                  type="button"
                  onClick={() => void payInstallment(nextInstallment)}
                  disabled={busy !== ""}
                  className={operationsVisual.secondaryButton}
                >
                  <CreditCard size={15} aria-hidden="true" />
                  {L("دفع القسط التالي", "Pay next installment")}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || busy !== ""}
                className={operationsVisual.iconButton}
                aria-label={L("تحديث العقد", "Refresh contract")}
                title={L("تحديث", "Refresh")}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
              </button>
            </>
          }
        />

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300"
          >
            {error}
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className={operationsVisual.ghostButton}
              aria-label={L("إغلاق الإشعار", "Dismiss notification")}
            >
              ×
            </button>
          </div>
        ) : null}

        {contract.legacyFinancial ? (
          <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-3 text-xs text-[var(--nc-text-secondary)]">
            {L(
              "هذا عقد تاريخي للعرض فقط ولا يقبل دفعات أو تعديلات جديدة.",
              "This legacy contract is read-only and cannot accept new payments or amendments.",
            )}
          </div>
        ) : null}

        <OperationsKpiGrid>
          <OperationsMetricCard
            title={L("صافي العقد", "Contract subtotal")}
            value={money(
              contract.invoice?.subtotal || contract.totalVolumeSar,
              locale,
            )}
            description={L("قبل ضريبة القيمة المضافة", "Before VAT")}
            icon={Landmark}
          />
          <OperationsMetricCard
            title={L("إجمالي الفاتورة", "Invoice total")}
            value={
              contract.invoice
                ? money(contract.invoice.totalAmount, locale)
                : "—"
            }
            description={
              contract.invoice
                ? `${L("ضريبة القيمة المضافة", "VAT")}: ${money(contract.invoice.vatAmount, locale)}`
                : awaitingInvoiceLabel(locale)
            }
            trailing={
              contract.invoice
                ? `${contract.invoice.invoicePrefix}-${contract.invoice.invoiceNumber}`
                : undefined
            }
            icon={FileText}
          />
          <OperationsMetricCard
            title={L("المدفوع", "Paid")}
            value={money(contract.financials.totalPaid, locale)}
            description={`${contract.financials.collectionPercent}%`}
            icon={WalletCards}
          />
          <OperationsMetricCard
            title={L("المتبقي", "Remaining")}
            value={remainingBalanceLabel(
              Boolean(contract.invoice),
              contract.financials.remainingBalance,
              locale,
            )}
            description={
              contract.invoice
                ? nextInstallment
                  ? `${L("القسط القادم", "Next")}: ${shortDate(nextInstallment.dueDate)}`
                  : L("لا يوجد قسط مستحق", "No installment due")
                : awaitingInvoiceLabel(locale)
            }
            icon={CreditCard}
          />
        </OperationsKpiGrid>

      <FinancialLifecycleProgress
        locale={locale}
        title={L("مسار العقد المالي", "Contract financial progress")}
        nextAction={contractLifecycleNextAction}
        stages={contractLifecycleStages}
      />

        <OperationsPanel className="overflow-hidden p-2">
          <OperationsTabs dir={locale === "ar" ? "rtl" : "ltr"} className="w-full justify-start" data-sales-contract-detail-tabs>
            {([
              ["overview", L("نظرة عامة", "Overview"), Landmark],
              ["payment-plan", L("خطة الدفع", "Payment plan"), CreditCard],
              ["installments", L("الأقساط", "Installments"), ListChecks],
              ["payments", L("المدفوعات", "Payments"), WalletCards],
              ["amendments", L("التعديلات", "Amendments"), RotateCcw],
              ["documents", L("المستندات", "Documents"), FileText],
              ["timeline", L("السجل الزمني", "Timeline"), History],
            ] as const).map(([value, label, Icon]) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(value);
                    setNotice("");
                  }}
                  className={active ? operationsVisual.activeTab : operationsVisual.tab}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </OperationsTabs>
        </OperationsPanel>

        {tab === "overview" && (
          <OperationsPanel padded className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
              {L("ملخص الصفقة التشغيلي", "Operational deal summary")}
            </h2>
            <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
              {L(
                "بيانات العقد والتحصيل والاستحقاقات في مكان واحد.",
                "Contract, collection, and due-date details in one place.",
              )}
            </p>
          </div>

          <div className="orca-contract-summary-grid">
            {[
              [L("المشروع", "Project"), contract.unit.project.name],
              [L("الوحدة", "Unit"), contract.unit.unitNumber],
              [L("المشتري", "Buyer"), contract.buyerName],
              [L("الهاتف", "Phone"), contract.buyerPhone],
              [
                L("رقم الفاتورة", "Invoice number"),
                contract.invoice
                  ? `${contract.invoice.invoicePrefix}-${contract.invoice.invoiceNumber}`
                  : "—",
              ],
              [
                L("حالة العقد", "Contract status"),
                statusLabel(contract.status, locale),
              ],
              [
                L("حالة خطة الدفع", "Payment plan status"),
                contract.paymentPlan
                  ? statusLabel(contract.paymentPlan.status, locale)
                  : "—",
              ],
              [
                L("الأقساط المتبقية", "Remaining installments"),
                String(contract.summary.remainingInstallmentCount),
              ],
              [
                L("الأقساط المتأخرة", "Overdue installments"),
                String(contract.summary.overdueInstallmentCount),
              ],
              [
                L("نهاية الخطة", "Plan end"),
                shortDate(contract.summary.planEndDate),
              ],
              [
                L("آخر دفعة", "Last payment"),
                contract.summary.lastPayment
                  ? `${money(contract.summary.lastPayment.amount, locale)} · ${shortDateTime(contract.summary.lastPayment.paidAt)}`
                  : "—",
              ],
              [
                L("آخر تعديل", "Last amendment"),
                shortDateTime(contract.summary.lastAmendmentAt),
              ],
              [
                L("القسط القادم", "Next installment"),
                contract.summary.nextInstallment
                  ? `${money(contract.summary.nextInstallment.amount, locale)} · ${shortDate(contract.summary.nextInstallment.dueDate)}`
                  : "—",
              ],
              [
                L("نسبة التحصيل", "Collection"),
                `${contract.financials.collectionPercent}%`,
              ],
              [
                L("نسخة خطة الدفع", "Payment plan version"),
                String(contract.paymentPlan?.version || 1),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="orca-summary-card rounded-xl border border-[var(--nc-glass-border)] p-3 text-center"
              >
                <span className="text-[10px] text-[var(--nc-text-dim)]">
                  {label}
                </span>
                <strong className="mt-1 block text-xs text-[var(--nc-text-primary)]">
                  {value}
                </strong>
              </div>
            ))}
          </div>
          </OperationsPanel>
        )}

        {tab === "payment-plan" && (
        <OperationsExecutiveGrid>
          <OperationsPanel padded>
            <div className="flex items-center gap-2">
              <RotateCcw size={16} className="text-[var(--nc-accent)]" />
              <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
                {L("إعادة هيكلة خطة الدفع", "Restructure payment plan")}
              </h2>
            </div>

            {!canRestructure ? (
              <p className="mt-4 text-xs text-[var(--nc-text-dim)]">
                {L(
                  "إعادة الهيكلة متاحة للعقود الموقعة الحديثة ذات الرصيد المتبقي فقط.",
                  "Restructuring is available only for signed cutover contracts with a remaining balance.",
                )}
              </p>
            ) : (
              <form onSubmit={submitRestructure} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[var(--nc-text-secondary)]">
                    {L("الدفعة المقدمة المؤكدة", "Confirmed advance payment")}
                  </label>
                  <OperationsNumberField
                    mode="decimal"
                    value={prepaymentAmount}
                    onValueChange={setPrepaymentAmount}
                    className="orca-operations-input"
                    aria-label={L(
                      "الدفعة المقدمة المؤكدة",
                      "Confirmed advance payment",
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[var(--nc-text-secondary)]">
                    {L("النتيجة المطلوبة", "Desired outcome")}
                  </label>
                  <SettingsSelect value={restructureMode}
                    onChange={(value) =>
                      setRestructureMode(value as RestructureMode)
                    }
                    className="orca-operations-input"
                    options={[{ value: "REDUCE_INSTALLMENT", label: L("خفض قيمة الأقساط", "Reduce installment amount") },
                      { value: "REDUCE_TERM", label: L(
                        "تقليل مدة السداد تلقائيًا",
                        "Automatically reduce payment term",
                      ) }]}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[var(--nc-text-secondary)]">
                    {L("سبب التعديل", "Reason")}
                  </label>
                  <OperationsTextareaField
                    value={restructureReason}
                    onChange={(event) => setRestructureReason(event.target.value)}
                    required
                    rows={3}
                  />
                </div>

                {preview && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-[var(--nc-text-secondary)]">
                    <div className="flex justify-between gap-3">
                      <span>{L("الرصيد بعد الدفعة", "Balance after payment")}</span>
                      <strong>{money(preview.remaining, locale)}</strong>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span>
                        {L(
                          "عدد الأقساط المتبقية تلقائيًا",
                          "Automatic remaining installments",
                        )}
                      </span>
                      <strong>{preview.count}</strong>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span>{L("القسط المتوقع", "Expected installment")}</span>
                      <strong>{money(preview.estimated, locale)}</strong>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span>{L("نهاية الخطة المتوقعة", "Expected plan end")}</span>
                      <strong dir="ltr">
                        {preview.endDate ? shortDate(preview.endDate) : "—"}
                      </strong>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy !== ""}
                  className={`${operationsVisual.primaryButton} w-full`}
                >
                  {busy === "restructure" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {L(
                    "تسجيل الدفعة وإعادة الجدولة",
                    "Record payment and reschedule",
                  )}
                </button>
              </form>
            )}
          </OperationsPanel>

          <OperationsPanel padded className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <WalletCards size={16} className="text-amber-300" />
              <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
                {L("السداد المبكر الكامل", "Full early settlement")}
              </h2>
            </div>

            {!canEarlySettle ? (
              <p className="mt-4 text-xs text-[var(--nc-text-dim)]">
                {L(
                  "السداد المبكر متاح فقط لخطة دفع نشطة بعقد موقع ورصيد متبقٍ.",
                  "Early settlement is available only for an active payment plan on a signed contract with a remaining balance.",
                )}
              </p>
            ) : (
              <form onSubmit={submitEarlySettlement} className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <span className="text-[10px] text-[var(--nc-text-dim)]">
                    {L("مبلغ السداد النهائي", "Final settlement amount")}
                  </span>
                  <strong className="mt-1 block text-lg text-[var(--nc-text-primary)]">
                    {money(contract.financials.remainingBalance, locale)}
                  </strong>
                  <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
                    {L(
                      "يحسب المبلغ من الخادم عند التنفيذ ولا يقبل التعديل اليدوي.",
                      "The amount is calculated by the server at execution time and cannot be edited.",
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[var(--nc-text-secondary)]">
                    {L("سبب السداد المبكر", "Early settlement reason")}
                  </label>
                  <OperationsTextareaField
                    value={earlySettlementReason}
                    onChange={(event) =>
                      setEarlySettlementReason(event.target.value)
                    }
                    required
                    rows={3}
                  />
                </div>

                <label className="flex items-start gap-2 rounded-xl border border-amber-500/20 p-3 text-[11px] text-[var(--nc-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={earlySettlementConfirmed}
                    onChange={(event) =>
                      setEarlySettlementConfirmed(event.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span>
                    {L(
                      "أؤكد تسجيل كامل الرصيد المتبقي كدفعة مؤكدة وإغلاق خطة الدفع وإلغاء الأقساط غير المسددة.",
                      "I confirm recording the full remaining balance as a completed payment, closing the payment plan, and cancelling unpaid installments.",
                    )}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    busy !== "" ||
                    !earlySettlementConfirmed ||
                    earlySettlementReason.trim().length === 0
                  }
                  className={`${operationsVisual.primaryButton} w-full`}
                >
                  {busy === "early-settlement" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {L("تنفيذ السداد المبكر", "Complete early settlement")}
                </button>
              </form>
            )}
          </OperationsPanel>
        </OperationsExecutiveGrid>
      )}

      {tab === "installments" && (
        <OperationsPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="nc-table nc-table-striped min-w-[820px]">
              <thead>
                <tr>
                  <th>{L("القسط", "Installment")}</th>
                  <th>{L("الاستحقاق", "Due date")}</th>
                  <th>{L("المبلغ", "Amount")}</th>
                  <th>{L("المدفوع", "Paid")}</th>
                  <th>{L("المتبقي", "Remaining")}</th>
                  <th>{L("الحالة", "Status")}</th>
                  <th>{L("الإجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {installmentsPaging.rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.installmentNumber}</td>
                    <td dir="ltr">{shortDate(item.dueDate)}</td>
                    <td>{money(item.amountSar, locale)}</td>
                    <td>{money(item.paidAmount, locale)}</td>
                    <td>{money(item.remainingAmount, locale)}</td>
                    <td>{statusLabel(item.paymentStatus, locale)}</td>
                    <td>
                      {contract.legacyFinancial ? (
                        <span
                          title={L(
                            "العقد التاريخي للعرض فقط ولا يقبل دفعات جديدة.",
                            "Legacy contract is read-only and cannot accept new payments.",
                          )}
                          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-[var(--nc-text-dim)]"
                        >
                          {L("للعرض فقط", "Read-only")}
                        </span>
                      ) : contract.status !== "SIGNED" ? (
                        <span
                          title={L(
                            "يجب توقيع العقد قبل تحصيل أي قسط.",
                            "The contract must be signed before collecting an installment.",
                          )}
                          className="inline-flex rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-300"
                        >
                          {L("بانتظار التوقيع", "Awaiting signature")}
                        </span>
                      ) : !contract.invoice ? (
                        <span
                          title={L(
                            "يجب إصدار وربط فاتورة البيع قبل تحصيل القسط.",
                            "A sales invoice must be issued and linked before collecting the installment.",
                          )}
                          className="inline-flex rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-300"
                        >
                          {L("بانتظار الفاتورة", "Awaiting invoice")}
                        </span>
                      ) : item.paymentStatus === "Cancelled" ? (
                        <span
                          title={L(
                            contract.paymentPlan?.status === "COMPLETED"
                              ? "أُلغي هذا القسط بعد اكتمال السداد أو التسوية المالية."
                              : "أُلغي هذا القسط ضمن تحديث أو إعادة هيكلة خطة الدفع.",
                            contract.paymentPlan?.status === "COMPLETED"
                              ? "This installment was cancelled after financial settlement or full collection."
                              : "This installment was cancelled by a payment-plan update or restructure.",
                          )}
                          className="inline-flex rounded-lg border border-slate-500/25 bg-slate-500/10 px-2.5 py-1.5 text-[10px] font-bold text-slate-300"
                        >
                          {contract.paymentPlan?.status === "COMPLETED"
                            ? L("ملغي بعد التسوية", "Cancelled after settlement")
                            : L("ملغي بالخطة", "Cancelled by plan")}
                        </span>
                      ) : item.remainingAmount <= 0 ||
                        item.paymentStatus === "Paid" ? (
                        <span className="inline-flex rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300">
                          {L("مدفوع", "Paid")}
                        </span>
                      ) : COLLECTIBLE.has(item.paymentStatus) ? (
                        <button
                          type="button"
                          onClick={() => void payInstallment(item)}
                          disabled={busy !== ""}
                          title={L(
                            "إنشاء رابط دفع آمن لهذا القسط عبر N-Genius.",
                            "Create a secure N-Genius payment link for this installment.",
                          )}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-[11px] font-black text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy === `pay:${item.id}` ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              {L("جارٍ التحويل", "Redirecting")}
                            </>
                          ) : item.paymentStatus === "Partial" ? (
                            L("استكمال الدفع", "Complete payment")
                          ) : (
                            L("دفع القسط", "Pay installment")
                          )}
                        </button>
                      ) : (
                        <span
                          title={L(
                            `حالة القسط الحالية: ${statusLabel(item.paymentStatus, locale)}`,
                            `Current installment status: ${statusLabel(item.paymentStatus, locale)}`,
                          )}
                          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-[var(--nc-text-dim)]"
                        >
                          {L("غير متاح", "Unavailable")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            locale={locale}
            page={installmentsPaging.page}
            totalPages={installmentsPaging.totalPages}
            onPage={setInstallmentPage}
          />
        </OperationsPanel>
      )}

      {tab === "payments" && (
        <OperationsPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="nc-table nc-table-striped min-w-[760px]">
              <thead>
                <tr>
                  <th>{L("التاريخ", "Date")}</th>
                  <th>{L("المبلغ", "Amount")}</th>
                  <th>{L("الطريقة", "Method")}</th>
                  <th>{L("المزود", "Provider")}</th>
                  <th>{L("الحالة", "Status")}</th>
                  <th>{L("الإيصال", "Receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {paymentsPaging.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      {L("لا توجد مدفوعات.", "No payments.")}
                    </td>
                  </tr>
                ) : (
                  paymentsPaging.rows.map((payment) => (
                    <tr key={payment.id}>
                      <td dir="ltr">
                        {shortDate(payment.paidAt || payment.createdAt)}
                      </td>
                      <td>{money(payment.netAmount, locale)}</td>
                      <td>{payment.method}</td>
                      <td>{payment.provider}</td>
                      <td>{statusLabel(payment.status, locale)}</td>
                      <td>{payment.receipt?.id ? payment.receipt.id.slice(0, 8) : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager
            locale={locale}
            page={paymentsPaging.page}
            totalPages={paymentsPaging.totalPages}
            onPage={setPaymentPage}
          />
        </OperationsPanel>
      )}

      {tab === "amendments" && (
        <OperationsPanel>
          <div className="border-b border-[var(--nc-glass-border)] px-4 py-3">
            <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
              {L("سجل التعديلات", "Amendment history")}
            </h2>
          </div>

          <div className="p-4">
            {contract.amendments.length === 0 ? (
              <OperationsEmptyState>
                {L(
                  "لا توجد تعديلات على خطة الدفع.",
                  "No payment plan amendments recorded.",
                )}
              </OperationsEmptyState>
            ) : (
              <div className="grid gap-3">
                {amendmentsPaging.rows.map((amendment) => (
                  <article
                    key={amendment.id}
                    className="rounded-xl border border-[var(--nc-glass-border)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                          {amendment.version !== null
                            ? `${L("نسخة", "Version")} ${amendment.version}`
                            : L("إعادة هيكلة", "Restructure")}
                        </span>
                        <strong className="ms-2 text-xs text-[var(--nc-text-primary)]">
                          {formatAmendmentType(amendment.type, locale)}
                        </strong>
                      </div>
                      <span
                        className="text-[10px] text-[var(--nc-text-dim)]"
                        dir="ltr"
                      >
                        {shortDateTime(amendment.executedAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--nc-text-secondary)]">
                      {amendment.reason || L("بدون سبب", "No reason provided")}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
                      {L("المنفذ:", "Executed by:")} {amendment.executedBy}
                    </p>

                    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--nc-glass-border)]">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-[var(--nc-background)]">
                            <th className="px-2 py-1.5 text-start font-bold text-[var(--nc-text-dim)]">
                              {L("الحقل", "Field")}
                            </th>
                            <th className="px-2 py-1.5 text-start font-bold text-[var(--nc-text-dim)]">
                              {L("قبل", "Before")}
                            </th>
                            <th className="px-2 py-1.5 text-start font-bold text-[var(--nc-text-dim)]">
                              {L("بعد", "After")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            [
                              L("الدفعة المقدمة", "Prepayment"),
                              amendment.before.prepaymentAmount !== null
                                ? money(amendment.before.prepaymentAmount, locale)
                                : "—",
                              amendment.after.prepaymentAmount !== null
                                ? money(amendment.after.prepaymentAmount, locale)
                                : "—",
                            ],
                            [
                              L("قيمة القسط", "Installment amount"),
                              amendment.before.installmentAmount !== null
                                ? money(amendment.before.installmentAmount, locale)
                                : "—",
                              amendment.after.installmentAmount !== null
                                ? money(amendment.after.installmentAmount, locale)
                                : "—",
                            ],
                            [
                              L("عدد الأقساط", "Installment count"),
                              amendment.before.installmentCount ?? "—",
                              amendment.after.installmentCount ?? "—",
                            ],
                            [
                              L("الرصيد المتبقي", "Remaining balance"),
                              amendment.before.remainingBalance !== null
                                ? money(amendment.before.remainingBalance, locale)
                                : "—",
                              amendment.after.remainingBalance !== null
                                ? money(amendment.after.remainingBalance, locale)
                                : "—",
                            ],
                          ].map(([label, beforeValue, afterValue]) => (
                            <tr
                              key={String(label)}
                              className="border-t border-[var(--nc-glass-border)]"
                            >
                              <td className="px-2 py-1.5 text-[var(--nc-text-secondary)]">
                                {label}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-[var(--nc-text-dim)]">
                                {beforeValue}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-[var(--nc-text-primary)]">
                                {afterValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <Pager
            locale={locale}
            page={amendmentsPaging.page}
            totalPages={amendmentsPaging.totalPages}
            onPage={setAmendmentPage}
          />
        </OperationsPanel>
      )}

      {tab === "documents" && (
        <OperationsPanel padded>
          <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
            {L("المستندات المرتبطة", "Related documents")}
          </h2>
          <div className="mt-4">
            <OperationsEmptyState>
              <span className="inline-flex flex-col items-center gap-2">
                <FileText size={24} aria-hidden="true" />
                {L(
                  "لا توجد مستندات مرتبطة بهذا العقد حاليًا.",
                  "No documents are currently attached to this contract.",
                )}
              </span>
            </OperationsEmptyState>
          </div>
        </OperationsPanel>
      )}

      {tab === "timeline" && (
        <OperationsPanel>
          <div className="space-y-3 p-4">
            {timelinePaging.rows.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--nc-text-dim)]">
                {L("لا توجد أحداث مسجلة.", "No recorded events.")}
              </div>
            ) : (
              timelinePaging.rows.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-[var(--nc-glass-border)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs text-[var(--nc-text-primary)]">
                      {timelineActionLabel(event.action, locale)}
                    </strong>
                    <span className="text-[10px] text-[var(--nc-text-dim)]" dir="ltr">
                      {shortDateTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
                    {event.tableName === "payment_transactions"
                      ? L("معاملة دفع", "Payment transaction")
                      : event.tableName === "contracts"
                        ? L("عقد", "Contract")
                        : event.tableName === "invoices"
                          ? L("فاتورة", "Invoice")
                          : event.tableName === "installments"
                            ? L("قسط", "Installment")
                            : event.tableName === "payment_plans"
                              ? L("خطة دفع", "Payment plan")
                              : L(
                                  displayUiAlias(
                                    "salesEntity",
                                    event.tableName,
                                    "ar"
                                  ),
                                  displayUiAlias(
                                    "salesEntity",
                                    event.tableName,
                                    "en"
                                  )
                                )}
                  </p>
                </div>
              ))
            )}
          </div>
          <Pager
            locale={locale}
            page={timelinePaging.page}
            totalPages={timelinePaging.totalPages}
            onPage={setTimelinePage}
          />
        </OperationsPanel>
        )}
      </div>
    </main>
  );
}

function Pager({
  locale,
  page,
  totalPages,
  onPage,
}: {
  locale: Locale;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)]">
      <button
        type="button"
        onClick={() => onPage(Math.max(0, page - 1))}
        disabled={page === 0}
        className={operationsVisual.secondaryButton}
      >
        <ChevronLeft size={14} />
        {text(locale, "السابق", "Previous")}
      </button>
      <span>
        {text(locale, "صفحة", "Page")} {page + 1}{" "}
        {text(locale, "من", "of")} {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className={operationsVisual.secondaryButton}
      >
        {text(locale, "التالي", "Next")}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
