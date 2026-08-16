"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { DateField } from "@/components/ui/DateField";
import {
  buildDirectMonthlyEjarPlan,
  RentFlex12Error,
  type RentFlex12Mode,
} from "@/lib/domain/rental/rent-flex-12";

type PropertyUnit = {
  id: string;
  unitNumber: string;
  projectName: string;
  city: string | null;
  district: string | null;
  status: string;
};

type Lease = {
  id: string;
  unit: string;
  tenant: string;
  status: string;
};

type SelectionSummary = {
  id: string;
  unitId: string;
  rentalLeaseId: string | null;
  financeCaseId: string | null;
  selectedProviderOfferId: string | null;
  mode: RentFlex12Mode;
  annualRentAmount: string;
  currency: string;
  firstDueDate: string;
  status: "DRAFT" | "SELECTED" | "LOCKED" | "CANCELLED";
  selectedAt: string | null;
  lockedAt: string | null;
};

type ProviderOffer = {
  id: string;
  provider: string;
  productName: string | null;
  recordStatus: string;
  authorityStatus: string | null;
  providerReference: string | null;
  amount: string | null;
  downPayment: string | null;
  monthlyPayment: string | null;
  fees: string | null;
  termMonths: number | null;
  expiresAt: string | null;
  selectedAt: string | null;
  rentFlexTerms: {
    ownerSettlementAmount: string;
    totalTenantPayable: string;
    tenantCostDelta: string;
    firstDueDate: string;
    repaymentSchedule: unknown;
    quoteDigest: string;
  } | null;
};

type SelectionDetail = SelectionSummary & {
  companySchedule: unknown;
  scheduleDigest: string | null;
  offers: ProviderOffer[];
  settlement: {
    expectedAmount: string;
    receivedAmount: string | null;
    currency: string;
    status: string;
    providerReference: string | null;
    receivedAt: string | null;
  } | null;
};

type UnitConfig = {
  unitId: string;
  externalRnplEnabled: boolean;
  status: string;
} | null;

function money(value: string | number | null | undefined, locale: string) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function dateLabel(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
}

function isPositiveMoneyInput(value: string): boolean {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 && numeric <= 1_000_000_000;
}

export default function RentFlexLeaseWorkspacePanel() {
  const { lang } = useApp();
  const ar = lang !== "EN";
  const locale = ar ? "ar-SA" : "en-SA";
  const t = (arabic: string, english: string) => (ar ? arabic : english);

  const [featureAvailable, setFeatureAvailable] = useState<boolean | null>(null);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selections, setSelections] = useState<SelectionSummary[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedSelectionId, setSelectedSelectionId] = useState("");
  const [selectionDetail, setSelectionDetail] = useState<SelectionDetail | null>(null);
  const [unitConfig, setUnitConfig] = useState<UnitConfig>(null);
  const [mode, setMode] = useState<RentFlex12Mode>("DIRECT_MONTHLY_EJAR");
  const [annualRent, setAnnualRent] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const unitConfigRequestRef = useRef(0);
  const selectionDetailRequestRef = useRef(0);

  const unitLabel = useCallback(
    (unitId: string) => {
      const unit = units.find((item) => item.id === unitId);
      return unit
        ? `${unit.unitNumber} · ${unit.projectName}`
        : t("وحدة عقارية", "Property unit");
    },
    [ar, units],
  );

  const leaseLabel = useCallback(
    (leaseId: string | null) => {
      if (!leaseId) return t("قبل إنشاء العقد", "Before lease creation");
      const lease = leases.find((item) => item.id === leaseId);
      return lease
        ? t(
            `مرتبط بعقد ${lease.unit} · ${lease.tenant}`,
            `Linked to ${lease.unit} · ${lease.tenant}`,
          )
        : t("مرتبط بعقد إيجار", "Linked to a rental lease");
    },
    [ar, leases],
  );

  const loadSelectionDetail = useCallback(async (selectionId: string) => {
    if (!selectionId) {
      selectionDetailRequestRef.current += 1;
      setSelectionDetail(null);
      return;
    }
    const requestId = ++selectionDetailRequestRef.current;
    setSelectionDetail(null);
    try {
      const response = await fetch(`/api/v1/rent-flex/selections/${selectionId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (requestId !== selectionDetailRequestRef.current) return;
      if (!response.ok) {
        setSelectionDetail(null);
        return;
      }
      const payload = await response.json();
      if (requestId !== selectionDetailRequestRef.current) return;
      setSelectionDetail(payload?.data?.id === selectionId ? payload.data : null);
    } catch {
      if (requestId === selectionDetailRequestRef.current) setSelectionDetail(null);
    }
  }, []);

  const loadUnitConfig = useCallback(async (unitId: string) => {
    if (!unitId) {
      unitConfigRequestRef.current += 1;
      setUnitConfig(null);
      return;
    }
    const requestId = ++unitConfigRequestRef.current;
    setUnitConfig(null);
    try {
      const response = await fetch(`/api/v1/rent-flex/units/${unitId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (requestId !== unitConfigRequestRef.current) return;
      if (!response.ok) {
        setUnitConfig(null);
        return;
      }
      const payload = await response.json();
      if (requestId !== unitConfigRequestRef.current) return;
      setUnitConfig(payload?.data?.unitId === unitId ? payload.data : null);
    } catch {
      if (requestId === unitConfigRequestRef.current) setUnitConfig(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const selectionResponse = await fetch("/api/v1/rent-flex/selections?limit=100", {
        credentials: "include",
        cache: "no-store",
      });
      if (
        selectionResponse.status === 404 ||
        selectionResponse.status === 401 ||
        selectionResponse.status === 403
      ) {
        setFeatureAvailable(false);
        setSelections([]);
        return;
      }
      const selectionPayload = await selectionResponse.json();
      if (!selectionResponse.ok) throw new Error("SELECTION_LOAD_FAILED");
      setFeatureAvailable(true);

      const [propertiesResponse, leasesResponse] = await Promise.all([
        fetch("/api/properties", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/leases/", { credentials: "include", cache: "no-store" }),
      ]);
      const [propertiesPayload, leasesPayload] = await Promise.all([
        propertiesResponse.json(),
        leasesResponse.json(),
      ]);
      if (!propertiesResponse.ok || !propertiesPayload?.success) {
        throw new Error("PROPERTY_LOAD_FAILED");
      }
      if (!leasesResponse.ok || !leasesPayload?.success) {
        throw new Error("LEASE_LOAD_FAILED");
      }

      const nextUnits = (Array.isArray(propertiesPayload.data)
        ? propertiesPayload.data
        : []) as PropertyUnit[];
      const nextLeases = (Array.isArray(leasesPayload.leases)
        ? leasesPayload.leases
        : []) as Lease[];
      const nextSelections = (Array.isArray(selectionPayload?.data)
        ? selectionPayload.data
        : []) as SelectionSummary[];
      setUnits(nextUnits);
      setLeases(nextLeases);
      setSelections(nextSelections);

      setSelectedUnitId((current) =>
        current && nextUnits.some((unit) => unit.id === current)
          ? current
          : nextUnits[0]?.id || "",
      );
      setSelectedSelectionId((current) =>
        current && nextSelections.some((item) => item.id === current)
          ? current
          : nextSelections[0]?.id || "",
      );
    } catch {
      setFeatureAvailable(true);
      setError(t("تعذر تحميل مساحة الدفع المرن.", "Unable to load the Rent Flex workspace."));
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setMode("DIRECT_MONTHLY_EJAR");
    void loadUnitConfig(selectedUnitId);
  }, [loadUnitConfig, selectedUnitId]);

  useEffect(() => {
    void loadSelectionDetail(selectedSelectionId);
  }, [loadSelectionDetail, selectedSelectionId]);

  const directPlan = useMemo(() => {
    if (
      mode !== "DIRECT_MONTHLY_EJAR" ||
      !isPositiveMoneyInput(annualRent) ||
      !firstDueDate
    ) {
      return null;
    }
    try {
      return buildDirectMonthlyEjarPlan({
        annualRentSar: Number(annualRent),
        firstDueDate,
      });
    } catch (cause) {
      if (cause instanceof RentFlex12Error) return null;
      return null;
    }
  }, [annualRent, firstDueDate, mode]);

  const selectedUnitConfig =
    unitConfig?.unitId === selectedUnitId ? unitConfig : null;
  const rnplEnabled = Boolean(
    selectedUnitConfig?.externalRnplEnabled && selectedUnitConfig.status === "ACTIVE",
  );
  const activeSelectionDetail =
    selectionDetail?.id === selectedSelectionId ? selectionDetail : null;

  const sortedOffers = useMemo(() => {
    const offers = activeSelectionDetail?.offers ?? [];
    return [...offers].sort((left, right) => {
      const leftCost = Number(
        left.rentFlexTerms?.totalTenantPayable ?? Number.POSITIVE_INFINITY,
      );
      const rightCost = Number(
        right.rentFlexTerms?.totalTenantPayable ?? Number.POSITIVE_INFINITY,
      );
      return leftCost - rightCost;
    });
  }, [activeSelectionDetail]);

  async function createSelection() {
    if (!selectedUnitId || !isPositiveMoneyInput(annualRent) || !firstDueDate) {
      setError(
        t(
          "اختر الوحدة وأدخل إيجارًا سنويًا صالحًا وتاريخ أول استحقاق.",
          "Choose a unit and enter a valid annual rent and first due date.",
        ),
      );
      return;
    }
    if (mode === "EXTERNAL_RNPL_12" && !rnplEnabled) {
      setError(
        t(
          "خيار 12 دفعة الخارجي غير مفعّل على هذه الوحدة.",
          "External 12-payment Rent Flex is not enabled on this unit.",
        ),
      );
      return;
    }
    if (mode === "DIRECT_MONTHLY_EJAR" && !directPlan) {
      setError(
        t("بيانات الخطة الشهرية غير صالحة.", "The direct monthly plan inputs are invalid."),
      );
      return;
    }

    setBusy("create");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/rent-flex/selections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          unitId: selectedUnitId,
          annualRentAmount: annualRent.trim(),
          firstDueDate,
        }),
      });
      if (response.status === 404) throw new Error("WRITE_NOT_READY");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "CREATE_FAILED");
      const createdId = typeof payload?.data?.id === "string" ? payload.data.id : "";
      setNotice(
        t(
          "تم حفظ خيار الدفع قبل إنشاء العقد.",
          "The payment choice was saved before lease creation.",
        ),
      );
      await load();
      if (createdId) setSelectedSelectionId(createdId);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "WRITE_NOT_READY"
          ? t(
              "حفظ خيارات Rent Flex غير مفعّل تشغيليًا بعد.",
              "Rent Flex writes are not operationally enabled yet.",
            )
          : t("تعذر حفظ خيار الدفع المرن.", "Unable to save the Rent Flex payment choice."),
      );
    } finally {
      setBusy("");
    }
  }

  async function chooseOffer(offerId: string) {
    if (!selectedSelectionId) return;
    setBusy(`offer:${offerId}`);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/rent-flex/selections/${selectedSelectionId}/select-offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ financeProviderOfferId: offerId }),
        },
      );
      if (response.status === 404) throw new Error("WRITE_NOT_READY");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "SELECT_FAILED");
      setNotice(
        t(
          "تم اختيار عرض المزود. هذا لا يعني موافقة جديدة من المزود.",
          "Provider offer selected. This does not create a new provider approval.",
        ),
      );
      await load();
      await loadSelectionDetail(selectedSelectionId);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "WRITE_NOT_READY"
          ? t(
              "اختيار العرض غير مفعّل تشغيليًا بعد.",
              "Offer selection is not operationally enabled yet.",
            )
          : t("تعذر اختيار عرض المزود.", "Unable to select the provider offer."),
      );
    } finally {
      setBusy("");
    }
  }

  async function lockSelection() {
    if (!selectedSelectionId) return;
    setBusy("lock");
    setError("");
    try {
      const response = await fetch(
        `/api/v1/rent-flex/selections/${selectedSelectionId}/lock`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (response.status === 404) throw new Error("WRITE_NOT_READY");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "LOCK_FAILED");
      setNotice(
        t(
          "تم اعتماد خيار الدفع وتجميد بياناته.",
          "The payment choice was locked and its commercial facts are now immutable.",
        ),
      );
      await load();
      await loadSelectionDetail(selectedSelectionId);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "WRITE_NOT_READY"
          ? t(
              "اعتماد الخطة غير مفعّل تشغيليًا بعد.",
              "Plan locking is not operationally enabled yet.",
            )
          : t("تعذر اعتماد خيار الدفع.", "Unable to lock the payment choice."),
      );
    } finally {
      setBusy("");
    }
  }

  if (featureAvailable === false) return null;
  if (loading && featureAvailable === null) return null;

  const selectedSummary =
    selections.find((item) => item.id === selectedSelectionId) || null;
  const canLock = Boolean(
    activeSelectionDetail &&
      activeSelectionDetail.status !== "LOCKED" &&
      activeSelectionDetail.status !== "CANCELLED" &&
      (activeSelectionDetail.mode === "DIRECT_MONTHLY_EJAR" ||
        activeSelectionDetail.selectedProviderOfferId),
  );

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="orca-container mt-4 rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-5"
      aria-label={t("مخطط الدفع المرن للعقد", "Rent Flex lease payment planner")}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
            <CircleDollarSign size={21} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">
                {t("مخطط الدفع للعقد الجديد", "New lease payment planner")}
              </h2>
              <span className="rounded-full border border-[var(--nc-accent)]/30 bg-[var(--nc-accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--nc-accent)]">
                Rent Flex 12
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--nc-text-secondary)]">
              {t(
                "ثبّت طريقة الدفع قبل إنشاء عقد الإيجار. هذه المساحة لا تنشئ فاتورة ولا تسجل أقساط المزود الخارجي كذمم على ORCA.",
                "Freeze the payment choice before lease creation. This workspace does not create invoices or turn external-provider repayments into ORCA receivables.",
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="nc-btn nc-btn-ghost min-h-11 justify-center"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {(error || notice) && (
        <div
          className={`mt-4 rounded-xl border px-3 py-2 text-xs font-bold ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={17} className="text-[var(--nc-accent)]" />
            <strong>{t("طريقة الدفع قبل العقد", "Pre-lease payment choice")}</strong>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[var(--nc-text-secondary)]">
                {t("الوحدة العقارية", "Property unit")}
              </span>
              <SettingsSelect
                value={selectedUnitId}
                onChange={setSelectedUnitId}
                options={units.map((unit) => ({
                  value: unit.id,
                  label: `${unit.unitNumber} · ${unit.projectName}`,
                }))}
                placeholder={t("اختر الوحدة", "Choose unit")}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--nc-border)] p-3 text-xs text-[var(--nc-text-secondary)]">
                <strong className="mb-1 block text-[var(--nc-text-primary)]">
                  {t("الدفع الدوري الحالي", "Current periodic payment")}
                </strong>
                {t(
                  "يبقى مسار العقد الحالي بدون تغيير.",
                  "The existing lease flow remains unchanged.",
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode("DIRECT_MONTHLY_EJAR")}
                className={`min-h-20 rounded-xl border p-3 text-start text-xs ${
                  mode === "DIRECT_MONTHLY_EJAR"
                    ? "border-[var(--nc-op-blue)] bg-[var(--nc-op-blue)]/10"
                    : "border-[var(--nc-border)]"
                }`}
              >
                <strong className="mb-1 block">
                  {t("دفع شهري مباشر", "Direct monthly")}
                </strong>
                <span className="text-[var(--nc-text-secondary)]">
                  12 {t("استحقاقًا لصالح المؤجر/الشركة", "company/owner receivable periods")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => rnplEnabled && setMode("EXTERNAL_RNPL_12")}
                disabled={!rnplEnabled}
                className={`min-h-20 rounded-xl border p-3 text-start text-xs disabled:cursor-not-allowed disabled:opacity-45 ${
                  mode === "EXTERNAL_RNPL_12"
                    ? "border-[var(--nc-op-blue)] bg-[var(--nc-op-blue)]/10"
                    : "border-[var(--nc-border)]"
                }`}
              >
                <strong className="mb-1 block">
                  {t("استأجر الآن وادفع 12 دفعة", "Rent now, pay in 12")}
                </strong>
                <span className="text-[var(--nc-text-secondary)]">
                  {rnplEnabled
                    ? t("سداد خارجي لمزود", "External provider repayment")
                    : t("غير متاح على الوحدة", "Not available on this unit")}
                </span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
                  {t("الإيجار السنوي الأساسي", "Underlying annual rent")}
                </span>
                <input
                  type="number"
                  min="0.01"
                  max="1000000000"
                  step="0.01"
                  value={annualRent}
                  onChange={(event) => setAnnualRent(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 text-sm outline-none focus:border-[var(--nc-op-blue)]"
                  placeholder="120000"
                />
              </label>
              <DateField
                value={firstDueDate}
                onChange={setFirstDueDate}
                label={t("أول تاريخ استحقاق", "First due date")}
              />
            </div>

            {mode === "DIRECT_MONTHLY_EJAR" && directPlan && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <strong className="text-emerald-300">
                    {t("معاينة 12 استحقاقًا", "12-period preview")}
                  </strong>
                  <span>
                    {t("الإجمالي", "Total")}: {money(directPlan.annualRentSar, locale)}
                  </span>
                </div>
                <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-[var(--nc-border)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--nc-surface-strong)] text-[var(--nc-text-secondary)]">
                      <tr>
                        <th className="px-3 py-2 text-start">#</th>
                        <th className="px-3 py-2 text-start">{t("الاستحقاق", "Due")}</th>
                        <th className="px-3 py-2 text-start">{t("المبلغ", "Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {directPlan.schedule.map((item) => (
                        <tr
                          key={item.installmentNumber}
                          className="border-t border-[var(--nc-border)]"
                        >
                          <td className="px-3 py-2">{item.installmentNumber}</td>
                          <td className="px-3 py-2">{dateLabel(item.dueDate, locale)}</td>
                          <td className="px-3 py-2 font-bold">
                            {money(item.amountSar, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {mode === "EXTERNAL_RNPL_12" && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-5 text-[var(--nc-text-secondary)]">
                {t(
                  "سيُحفظ اختيار RNPL أولًا، ثم تظهر عروض المزودين المثبتة على Finance Case. أقساط المستأجر للمزود تظل خارج ذمم ORCA.",
                  "The RNPL choice is saved first, then provider offers recorded on the Finance Case can be compared. Tenant repayments to the provider remain outside ORCA receivables.",
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void createSelection()}
              disabled={
                busy !== "" ||
                !selectedUnitId ||
                !isPositiveMoneyInput(annualRent) ||
                !firstDueDate
              }
              className="nc-btn-primary min-h-11 w-full rounded-xl px-4 py-2.5 font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "create" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BadgeCheck size={16} />
              )}
              {t("حفظ خيار الدفع قبل العقد", "Save payment choice before lease")}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Landmark size={17} className="text-[var(--nc-accent)]" />
              <strong>{t("خيارات Rent Flex المحفوظة", "Saved Rent Flex choices")}</strong>
            </div>
            {selections.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--nc-text-secondary)]">
                {t("لا توجد خيارات دفع محفوظة بعد.", "No saved payment choices yet.")}
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {selections.map((selection) => (
                  <button
                    key={selection.id}
                    type="button"
                    onClick={() => setSelectedSelectionId(selection.id)}
                    className={`w-full rounded-xl border p-3 text-start ${
                      selectedSelectionId === selection.id
                        ? "border-[var(--nc-op-blue)] bg-[var(--nc-op-blue)]/10"
                        : "border-[var(--nc-border)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-xs">{unitLabel(selection.unitId)}</strong>
                      <span className="rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[10px] font-bold">
                        {selection.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--nc-text-secondary)]">
                      <span>
                        {selection.mode === "DIRECT_MONTHLY_EJAR"
                          ? t("شهري مباشر", "Direct monthly")
                          : t("12 دفعة عبر مزود", "Provider 12-pay")}
                      </span>
                      <span>{money(selection.annualRentAmount, locale)}</span>
                      <span>{leaseLabel(selection.rentalLeaseId)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeSelectionDetail && selectedSummary && (
            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <strong>{unitLabel(activeSelectionDetail.unitId)}</strong>
                  <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                    {leaseLabel(activeSelectionDetail.rentalLeaseId)}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--nc-border)] px-2.5 py-1 text-xs font-bold">
                  {activeSelectionDetail.status}
                </span>
              </div>

              {activeSelectionDetail.mode === "EXTERNAL_RNPL_12" && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-[var(--nc-text-secondary)]">
                    {t("مقارنة عروض المزودين", "Provider offer comparison")}
                  </p>
                  {sortedOffers.length === 0 ? (
                    <p className="rounded-xl border border-[var(--nc-border)] p-3 text-xs text-[var(--nc-text-secondary)]">
                      {t(
                        "لا توجد عروض مزود مثبتة على الحالة التمويلية بعد.",
                        "No provider offers are recorded on the finance case yet.",
                      )}
                    </p>
                  ) : (
                    sortedOffers.map((offer) => {
                      const selected =
                        activeSelectionDetail.selectedProviderOfferId === offer.id;
                      const providerApproved =
                        String(offer.authorityStatus).toUpperCase() === "APPROVED";
                      return (
                        <div
                          key={offer.id}
                          className={`rounded-xl border p-3 ${
                            selected
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-[var(--nc-border)]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <strong className="text-xs">
                                {offer.provider || t("مزود", "Provider")}
                              </strong>
                              <span className="mx-2 text-[10px] text-[var(--nc-text-dim)]">
                                {t("عرض مزود", "Provider offer")}
                              </span>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                providerApproved
                                  ? "border-emerald-500/30 text-emerald-300"
                                  : "border-amber-500/30 text-amber-300"
                              }`}
                            >
                              {providerApproved
                                ? t("موافقة مزود مثبتة", "Provider approval recorded")
                                : t("ليست موافقة مثبتة", "No recorded provider approval")}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--nc-text-secondary)] sm:grid-cols-4">
                            <span>
                              {t("مقدم", "Down")}: {" "}
                              <b className="text-[var(--nc-text-primary)]">
                                {money(offer.downPayment, locale)}
                              </b>
                            </span>
                            <span>
                              {t("شهري", "Monthly")}: {" "}
                              <b className="text-[var(--nc-text-primary)]">
                                {money(offer.monthlyPayment, locale)}
                              </b>
                            </span>
                            <span>
                              {t("إجمالي المستأجر", "Tenant total")}: {" "}
                              <b className="text-[var(--nc-text-primary)]">
                                {money(offer.rentFlexTerms?.totalTenantPayable, locale)}
                              </b>
                            </span>
                            <span>
                              {t("فرق التكلفة", "Cost delta")}: {" "}
                              <b className="text-[var(--nc-text-primary)]">
                                {money(offer.rentFlexTerms?.tenantCostDelta, locale)}
                              </b>
                            </span>
                          </div>
                          {offer.expiresAt && (
                            <p className="mt-2 text-[10px] text-[var(--nc-text-dim)]">
                              {t("ينتهي العرض", "Offer expires")}: {" "}
                              {dateLabel(offer.expiresAt, locale)}
                            </p>
                          )}
                          {!selected &&
                            offer.rentFlexTerms &&
                            activeSelectionDetail.status !== "LOCKED" &&
                            activeSelectionDetail.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => void chooseOffer(offer.id)}
                                disabled={busy !== ""}
                                className="mt-3 min-h-11 w-full rounded-xl border border-[var(--nc-border)] px-3 py-2 text-xs font-bold"
                              >
                                {busy === `offer:${offer.id}` ? (
                                  <Loader2 size={14} className="mx-auto animate-spin" />
                                ) : (
                                  t("اختيار هذا العرض", "Select this offer")
                                )}
                              </button>
                            )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeSelectionDetail.settlement && (
                <div className="mt-4 rounded-xl border border-[var(--nc-border)] p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-[var(--nc-accent)]" />
                    <strong>
                      {t("تسوية المالك/الشركة", "Owner/company settlement")}
                    </strong>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[var(--nc-text-secondary)]">
                    <span>
                      {t("المتوقع", "Expected")}: {" "}
                      <b className="text-[var(--nc-text-primary)]">
                        {money(activeSelectionDetail.settlement.expectedAmount, locale)}
                      </b>
                    </span>
                    <span>
                      {t("المستلم", "Received")}: {" "}
                      <b className="text-[var(--nc-text-primary)]">
                        {money(activeSelectionDetail.settlement.receivedAmount, locale)}
                      </b>
                    </span>
                    <span>
                      {t("الحالة", "Status")}: {" "}
                      <b className="text-[var(--nc-text-primary)]">
                        {activeSelectionDetail.settlement.status}
                      </b>
                    </span>
                    <span>
                      {t("الاكتمال", "Completed")}: {" "}
                      <b className="text-[var(--nc-text-primary)]">
                        {dateLabel(activeSelectionDetail.settlement.receivedAt, locale)}
                      </b>
                    </span>
                  </div>
                </div>
              )}

              {canLock && (
                <button
                  type="button"
                  onClick={() => void lockSelection()}
                  disabled={busy !== ""}
                  className="mt-4 nc-btn-primary min-h-11 w-full rounded-xl px-4 py-2.5 font-black disabled:opacity-50"
                >
                  {busy === "lock" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LockKeyhole size={15} />
                  )}
                  {t("اعتماد وتجميد خيار الدفع", "Lock payment choice")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--nc-text-dim)]">
        {t(
          "ربط خيار الدفع بعقد الإيجار الفعلي يبقى خارج هذه الدفعة حتى تكتمل حماية مسار التسوية المحاسبية. زر «عقد إيجار جديد» الحالي أدناه يبقى دون تغيير.",
          "Binding the payment choice to an actual lease remains outside this slice until the accounting settlement guard is complete. The existing “New lease” action below remains unchanged.",
        )}
      </p>
    </section>
  );
}
