"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import {
  getAgentLeasesAction as getAgentSubscriptionsAction,
  leaseAgentAction as subscribeAgentAction,
} from "@/app/actions/growth";
import {
  AGENT_CODES,
  AGENT_MONTHLY_PRICE_SAR,
  getIncludedAgents,
  normalizeAgentPlan,
  type AgentCode,
  type LicenseMode,
} from "@/lib/agents/entitlements";

interface AgentManagementViewProps {
  tenantPlan?: string;
  totalLeads?: number;
  totalUsers?: number;
  licenseMode?: LicenseMode;
}

interface AgentSubscription {
  id: string;
  agentId: string;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
}

interface AgentDefinition {
  name?: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

interface UsageMeter {
  metricType: string;
  limitValue: number;
  usageValue: number;
  resetAt: string;
}

interface AgentSlot {
  id: string;
  agentType: string;
  slotNumber: number;
  isActive: boolean;
  usageMeter?: UsageMeter | null;
  definition?: AgentDefinition | null;
}

interface AgentLog {
  id: string;
  actionType: string;
  logMessageAr: string;
  severity: string;
  createdAt: string;
}

type AgentTab = "catalog" | "my-agents" | "usage" | "activity";

const AGENT_META: Record<
  AgentCode,
  {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    icon: string;
  }
> = {
  SAHER: {
    nameAr: "ساهر",
    nameEn: "Saher",
    descriptionAr: "بوابة الحوكمة والتحقق من الامتثال والتكاملات الحكومية.",
    descriptionEn: "Compliance, governance, and government-integration validation.",
    icon: "ph-shield-check",
  },
  SANAD: {
    nameAr: "سند",
    nameEn: "Sanad",
    descriptionAr: "تشغيل الفوترة والمهام الخلفية والتنبيهات المالية.",
    descriptionEn: "Billing operations, background tasks, and financial alerts.",
    icon: "ph-currency-circle-dollar",
  },
  BASEER: {
    nameAr: "بصير",
    nameEn: "Baseer",
    descriptionAr: "تحليل النمو والعائد التسويقي وتكلفة الاستحواذ.",
    descriptionEn: "Growth, marketing ROI, and acquisition-cost analytics.",
    icon: "ph-chart-pie",
  },
  KHABEER: {
    nameAr: "خبير",
    nameEn: "Khabeer",
    descriptionAr: "مراجعة العقود والدعم القانوني والأتمتة التعاقدية.",
    descriptionEn: "Contract review, legal support, and document automation.",
    icon: "ph-file-text",
  },
  MANSOUR: {
    nameAr: "منصور",
    nameEn: "Mansour",
    descriptionAr: "تأهيل العملاء ومتابعة المحادثات وحجز المعاينات.",
    descriptionEn: "Lead qualification, conversations, and tour booking.",
    icon: "ph-whatsapp-logo",
  },
};

function normalizeCode(value: unknown): AgentCode | null {
  const code = String(value || "").trim().toUpperCase();
  return AGENT_CODES.includes(code as AgentCode) ? (code as AgentCode) : null;
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AgentManagementView({
  tenantPlan = "basic",
  totalLeads = 0,
  totalUsers = 0,
  licenseMode = "SAAS",
}: AgentManagementViewProps) {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";
  const plan = normalizeAgentPlan(tenantPlan);
  const isDedicatedCopy = licenseMode === "DEDICATED_COPY";
  const planLabel =
    plan === "gold"
      ? isArabic
        ? "الباقة الذهبية"
        : "Gold Plan"
      : plan === "silver"
        ? isArabic
          ? "الباقة الفضية"
          : "Silver Plan"
        : isArabic
          ? "الباقة الأساسية"
          : "Basic Plan";

  const [activeTab, setActiveTab] = useState<AgentTab>("my-agents");
  const [slots, setSlots] = useState<AgentSlot[]>([]);
  const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedLogSlotId, setSelectedLogSlotId] = useState("");
  const [selectedSubscription, setSelectedSubscription] =
    useState<AgentCode | null>(null);
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const includedAgents = useMemo(
    () => new Set(getIncludedAgents({ licenseMode, plan })),
    [licenseMode, plan],
  );

  const activeSubscriptions = useMemo(() => {
    const result = new Map<AgentCode, AgentSubscription>();
    const now = Date.now();

    for (const subscription of subscriptions) {
      const code = normalizeCode(subscription.agentId);
      if (
        code &&
        new Date(subscription.endDate).getTime() > now
      ) {
        result.set(code, subscription);
      }
    }

    return result;
  }, [subscriptions]);

  const slotByCode = useMemo(() => {
    const result = new Map<AgentCode, AgentSlot>();

    for (const slot of slots) {
      const code = normalizeCode(slot.agentType);
      if (code) result.set(code, slot);
    }

    return result;
  }, [slots]);

  const loadSlots = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/v1/agents", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load agents.");
      }

      setSlots(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تحميل الوكلاء."
              : "Unable to load agents.",
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  const loadSubscriptions = useCallback(async () => {
    if (isDedicatedCopy) {
      setSubscriptions([]);
      return;
    }

    const result = await getAgentSubscriptionsAction();

    if (result.success && Array.isArray(result.data)) {
      setSubscriptions(result.data as unknown as AgentSubscription[]);
    }
  }, [isDedicatedCopy]);

  useEffect(() => {
    void Promise.all([loadSlots(), loadSubscriptions()]);
  }, [loadSlots, loadSubscriptions]);

  useEffect(() => {
    if (notice?.type === "success") {
      const timer = window.setTimeout(() => setNotice(null), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);

  const toggleAgent = async (slot: AgentSlot) => {
    setBusyKey(slot.id);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/v1/agents/" + slot.id + "/toggle",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !slot.isActive }),
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update agent.");
      }

      setNotice({
        type: "success",
        text: isArabic
          ? slot.isActive
            ? "تم تعطيل الوكيل."
            : "تم تفعيل الوكيل."
          : slot.isActive
            ? "Agent disabled."
            : "Agent activated.",
      });

      await loadSlots();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تحديث الوكيل."
              : "Unable to update agent.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const runAgent = async (slot: AgentSlot) => {
    setBusyKey(slot.id);
    setNotice(null);

    try {
      const key = slot.id + ":" + String(Math.floor(Date.now() / 60000));
      const response = await fetch("/api/v1/agents/" + slot.id + "/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({ idempotencyKey: key }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to run agent.");
      }

      setNotice({
        type: "success",
        text: payload.executed
          ? isArabic
            ? "اكتمل تشغيل الوكيل."
            : "Agent run completed."
          : isArabic
            ? "هذا الوكيل يعمل تلقائيًا."
            : "This agent runs automatically.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تشغيل الوكيل."
              : "Unable to run agent.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const loadLogs = async (slotId: string) => {
    setSelectedLogSlotId(slotId);
    setLoadingLogs(true);
    setLogs([]);

    try {
      const response = await fetch(
        "/api/v1/agents/" + slotId + "/logs",
        { cache: "no-store" },
      );
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load activity.");
      }

      setLogs(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تحميل سجل النشاط."
              : "Unable to load activity.",
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const confirmSubscription = async () => {
    if (!selectedSubscription || isDedicatedCopy) return;

    setBusyKey(selectedSubscription);
    setNotice(null);

    try {
      const result = await subscribeAgentAction({
        agentId: selectedSubscription,
        autoRenewal,
      });

      if (!result.success) {
        throw new Error(result.error || "Subscription failed.");
      }

      setSelectedSubscription(null);
      setAutoRenewal(false);
      setNotice({
        type: "success",
        text: isArabic
          ? "تم تفعيل اشتراك الوكيل."
          : "Agent subscription activated.",
      });

      await Promise.all([loadSubscriptions(), loadSlots()]);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تفعيل الاشتراك."
              : "Unable to activate subscription.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const visibleCodes = useMemo(() => {
    if (activeTab === "my-agents") {
      return AGENT_CODES.filter((code) => {
        if (isDedicatedCopy) return true;
        return includedAgents.has(code) || activeSubscriptions.has(code);
      });
    }
    if (activeTab === "catalog" && !isDedicatedCopy) {
      return AGENT_CODES.filter((code) => {
        return !includedAgents.has(code) && !activeSubscriptions.has(code);
      });
    }
    return [];
  }, [activeTab, includedAgents, activeSubscriptions, isDedicatedCopy]);

  const activeCount = slots.filter((slot) => slot.isActive).length;
  const entitledCount = isDedicatedCopy
    ? AGENT_CODES.length
    : AGENT_CODES.filter(
        (code) => includedAgents.has(code) || activeSubscriptions.has(code),
      ).length;

  const tabs: Array<{ id: AgentTab; ar: string; en: string }> = [
    { id: "my-agents", ar: "وكلائي", en: "My Agents" },
    ...(!isDedicatedCopy ? [{ id: "catalog" as AgentTab, ar: "المتجر", en: "Store" }] : []),
    { id: "usage", ar: "الاستخدام", en: "Usage" },
    { id: "activity", ar: "سجل النشاط", en: "Activity Log" },
  ];

  return (
    <main className="orca-agents-final nc-page nc-stack" dir={isArabic ? "rtl" : "ltr"}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--nc-foreground)]">
            {isArabic ? "الوكلاء التشغيليون" : "Operational Agents"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--nc-foreground-muted)]">
            {isArabic
              ? "إدارة الاستحقاقات والتفعيل والاستخدام وسجل النشاط من مساحة واحدة."
              : "Manage entitlements, activation, usage, and activity from one workspace."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 text-xs font-bold text-[var(--nc-foreground)]">
            {isDedicatedCopy
              ? isArabic
                ? "ترخيص نسخة كاملة"
                : "Full Dedicated License"
                            : planLabel}
          </span>
          {!isDedicatedCopy && (
            <Link
              href="/operations/settings?tab=agents"
              className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] transition hover:border-[var(--nc-accent-border)]"
            >
              {isArabic ? "إعدادات الاشتراك" : "Subscription Settings"}
            </Link>
          )}
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={
            notice.type === "success"
              ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
              : "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
          }
        >
          {notice.text}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: isArabic ? "الوكلاء النشطون" : "Active Agents",
            value: activeCount,
          },
          {
            label: isArabic ? "الوكلاء المستحقون" : "Entitled Agents",
            value: entitledCount,
          },
          {
            label: isArabic ? "العملاء المحتملون" : "Leads",
            value: totalLeads,
          },
          {
            label: isArabic ? "أعضاء الفريق" : "Team Members",
            value: totalUsers,
          },
        ].map((item) => (
          <SmartCard key={item.label} className="min-h-[96px] p-5">
            <p className="text-xs font-semibold text-[var(--nc-foreground-muted)]">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-black text-[var(--nc-foreground)]">
              {new Intl.NumberFormat(locale).format(item.value)}
            </p>
          </SmartCard>
        ))}
      </section>

      <nav
        aria-label={isArabic ? "أقسام الوكلاء" : "Agent sections"}
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={
              activeTab === tab.id
                ? "min-w-max rounded-xl bg-[var(--nc-accent-soft)] px-4 py-2.5 text-xs font-bold text-[var(--nc-foreground)]"
                : "min-w-max rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--nc-foreground-muted)] transition hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]"
            }
          >
            {isArabic ? tab.ar : tab.en}
          </button>
        ))}
      </nav>

      {(activeTab === "catalog" || activeTab === "my-agents") && (
        <section className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {visibleCodes.map((code) => {
            const meta = AGENT_META[code];
            const slot = slotByCode.get(code);
            const definition = slot?.definition;
            const included = includedAgents.has(code);
            const subscription = activeSubscriptions.get(code);
            const entitled = included || Boolean(subscription);
            const supportsManualRun = code === "SAHER";
            const busy = busyKey === (slot?.id || code);

            const name = isArabic
              ? definition?.nameAr || meta.nameAr
              : definition?.nameEn || definition?.name || meta.nameEn;
            const description = isArabic
              ? definition?.descriptionAr || meta.descriptionAr
              : definition?.descriptionEn ||
                definition?.description ||
                meta.descriptionEn;

            const statusLabel = isDedicatedCopy
              ? isArabic
                ? "مشمول في الترخيص"
                : "Included in License"
              : included
                ? isArabic
                  ? "مشمول في الباقة"
                  : "Included in Plan"
                : subscription
                  ? isArabic
                    ? "اشتراك نشط"
                    : "Active Subscription"
                  : isArabic
                    ? "غير مشمول"
                    : "Not Included";

            return (
              <SmartCard
                key={code}
                className="flex min-h-[320px] flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-lg text-[var(--nc-foreground)]">
                      <i
                        className={"ph-bold " + meta.icon}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-2.5 py-1 text-[10px] font-black text-[var(--nc-foreground)]">
                      {statusLabel}
                    </span>
                  </div>

                  <h2 className="mt-5 text-base font-black text-[var(--nc-foreground)]">
                    {name}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-[var(--nc-foreground-muted)]">
                    {description}
                  </p>

                  <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[var(--nc-surface-strong)] p-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "التشغيل" : "Runtime"}
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--nc-foreground)]">
                        {slot
                          ? slot.isActive
                            ? isArabic
                              ? "نشط"
                              : "Active"
                            : isArabic
                              ? "متوقف"
                              : "Disabled"
                          : isArabic
                            ? "غير مهيأ"
                            : "Not Provisioned"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--nc-surface-strong)] p-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "النمط" : "Mode"}
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--nc-foreground)]">
                        {supportsManualRun
                          ? isArabic
                            ? "يدوي وتلقائي"
                            : "Manual + Auto"
                          : isArabic
                            ? "تلقائي"
                            : "Automatic"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--nc-border)] pt-4">
                  {entitled && slot && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleAgent(slot)}
                      className={
                        slot.isActive
                          ? "flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50 dark:text-rose-300"
                          : "flex-1 rounded-xl bg-[var(--nc-accent)] px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50"
                      }
                    >
                      {busy
                        ? isArabic
                          ? "جارٍ التنفيذ..."
                          : "Working..."
                        : slot.isActive
                          ? isArabic
                            ? "تعطيل"
                            : "Disable"
                          : isArabic
                            ? "تفعيل"
                            : "Activate"}
                    </button>
                  )}

                  {entitled && slot?.isActive && supportsManualRun && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAgent(slot)}
                      className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 py-2.5 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-50"
                    >
                      {isArabic ? "تشغيل الآن" : "Run Now"}
                    </button>
                  )}

                  {!entitled && !isDedicatedCopy && (
                    <button
                      type="button"
                      onClick={() => setSelectedSubscription(code)}
                      className="flex-1 rounded-xl bg-[var(--nc-accent)] px-4 py-2.5 text-xs font-bold text-slate-950"
                    >
                      {isArabic ? "اشترك الآن" : "Subscribe Now"}
                    </button>
                  )}

                  {entitled && !slot && (
                    <p className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {isArabic
                        ? "الوكيل مشمول ويحتاج تهيئة فتحة تشغيل."
                        : "Included, but its runtime slot must be provisioned."}
                    </p>
                  )}
                  {entitled && (
                    <Link
                      href="/operations/settings?tab=ai"
                      className="w-full text-center mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                    >
                      {isArabic ? "إدارة إعدادات الذكاء الاصطناعي" : "Manage AI Settings"}
                    </Link>
                  )}
                </div>
              </SmartCard>
            );
          })}
          {visibleCodes.length === 0 && activeTab === "catalog" && (
            <div className="col-span-full py-10 flex items-center justify-center border-2 border-dashed border-[var(--nc-border)] rounded-2xl">
              <p className="text-center font-bold text-[var(--nc-foreground-muted)] text-sm max-w-sm">
                {isArabic
                  ? "جميع الوكلاء المتاحين مشمولون في باقتك أو لديك اشتراك نشط بهم"
                  : "All available agents are included in your plan or already active through subscription"}
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === "usage" && (
        <SmartCard className="overflow-hidden">
          <div className="border-b border-[var(--nc-border)] p-5">
            <h2 className="text-base font-black text-[var(--nc-foreground)]">
              {isArabic ? "استخدام الوكلاء" : "Agent Usage"}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[var(--nc-surface-strong)] text-[11px] text-[var(--nc-foreground-muted)]">
                <tr>
                  <th className="px-5 py-3 text-start">
                    {isArabic ? "الوكيل" : "Agent"}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {isArabic ? "الحالة" : "Status"}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {isArabic ? "الاستهلاك" : "Usage"}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {isArabic ? "إعادة الضبط" : "Reset"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const code = normalizeCode(slot.agentType);
                  const meter = slot.usageMeter;

                  return (
                    <tr
                      key={slot.id}
                      className="border-t border-[var(--nc-border)]"
                    >
                      <td className="px-5 py-4 font-bold text-[var(--nc-foreground)]">
                        {code
                          ? isArabic
                            ? AGENT_META[code].nameAr
                            : AGENT_META[code].nameEn
                          : isArabic
                            ? "وكيل تشغيلي"
                            : "Operational Agent"}
                      </td>
                      <td className="px-5 py-4 text-[var(--nc-foreground-muted)]">
                        {slot.isActive
                          ? isArabic
                            ? "نشط"
                            : "Active"
                          : isArabic
                            ? "متوقف"
                            : "Disabled"}
                      </td>
                      <td className="px-5 py-4 font-bold text-[var(--nc-foreground)]">
                        <span dir="ltr">
                          {meter && meter.limitValue > 0
                            ? `${meter.usageValue} ${isArabic ? "من" : "of"} ${meter.limitValue} — ${Math.round((meter.usageValue / meter.limitValue) * 100)}%`
                            : meter?.usageValue || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[var(--nc-foreground-muted)]">
                        <span dir="ltr">
                          {formatDate(meter?.resetAt, locale)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {!loading && slots.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-[var(--nc-foreground-muted)]"
                    >
                      {isArabic
                        ? "لا توجد فتحات وكلاء مهيأة."
                        : "No agent slots are provisioned."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SmartCard>
      )}

      {activeTab === "activity" && (
        <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SmartCard className="p-3">
            <div className="space-y-2">
              {slots.map((slot) => {
                const code = normalizeCode(slot.agentType);

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => void loadLogs(slot.id)}
                    className={
                      selectedLogSlotId === slot.id
                        ? "w-full rounded-xl bg-[var(--nc-accent-soft)] px-4 py-3 text-start text-xs font-bold text-[var(--nc-foreground)]"
                        : "w-full rounded-xl px-4 py-3 text-start text-xs font-bold text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)]"
                    }
                  >
                    {code
                      ? isArabic
                        ? AGENT_META[code].nameAr
                        : AGENT_META[code].nameEn
                      : isArabic
                        ? "وكيل تشغيلي"
                        : "Operational Agent"}
                  </button>
                );
              })}
            </div>
          </SmartCard>

          <SmartCard className="overflow-hidden">
            <div className="border-b border-[var(--nc-border)] p-5">
              <h2 className="text-base font-black text-[var(--nc-foreground)]">
                {isArabic ? "سجل النشاط" : "Activity Log"}
              </h2>
            </div>

            <div className="divide-y divide-[var(--nc-border)]">
              {loadingLogs && (
                <p className="p-6 text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic ? "جارٍ تحميل السجل..." : "Loading activity..."}
                </p>
              )}

              {!loadingLogs &&
                logs.map((log) => (
                  <article key={log.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--nc-foreground)]">
                        {isArabic ? "حدث تشغيلي" : "Operational Event"}
                      </h3>
                      <time
                        className="text-xs text-[var(--nc-foreground-muted)]"
                        dir="ltr"
                      >
                        {formatDate(log.createdAt, locale)}
                      </time>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[var(--nc-foreground-muted)]">
                      {isArabic
                        ? log.logMessageAr || "تم تسجيل حدث للوكيل."
                        : "An agent activity event was recorded."}
                    </p>
                  </article>
                ))}

              {!loadingLogs && selectedLogSlotId && logs.length === 0 && (
                <p className="p-8 text-center text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic ? "لا توجد أحداث مسجلة." : "No activity recorded."}
                </p>
              )}

              {!selectedLogSlotId && (
                <p className="p-8 text-center text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic
                    ? "اختر وكيلاً لعرض سجله."
                    : "Select an agent to view its activity."}
                </p>
              )}
            </div>
          </SmartCard>
        </div>
      )}

      {selectedSubscription && !isDedicatedCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-subscription-title"
        >
          <SmartCard className="w-full max-w-lg p-6">
            <h2
              id="agent-subscription-title"
              className="text-lg font-black text-[var(--nc-foreground)]"
            >
              {isArabic
                ? "اشتراك الوكيل " + AGENT_META[selectedSubscription].nameAr
                : "Subscribe to " + AGENT_META[selectedSubscription].nameEn}
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--nc-foreground-muted)]">
              {isArabic
                ? "اشتراك تشغيلي لمدة 30 يومًا مع إمكانية التجديد التلقائي."
                : "A 30-day operational subscription with optional auto-renewal."}
            </p>

            <div className="mt-5 rounded-2xl bg-[var(--nc-surface-strong)] p-4">
              <p className="text-xs text-[var(--nc-foreground-muted)]">
                {isArabic ? "السعر الشهري" : "Monthly Price"}
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--nc-foreground)]">
                {new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: "SAR",
                  maximumFractionDigits: 0,
                }).format(AGENT_MONTHLY_PRICE_SAR)}
              </p>
            </div>

            <label className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--nc-border)] p-4">
              <span className="text-sm font-bold text-[var(--nc-foreground)]">
                {isArabic ? "التجديد التلقائي" : "Auto Renewal"}
              </span>
              <input
                type="checkbox"
                checked={autoRenewal}
                onChange={(event) => setAutoRenewal(event.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubscription(null)}
                className="flex-1 rounded-xl border border-[var(--nc-border)] px-4 py-3 text-sm font-bold text-[var(--nc-foreground)]"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={busyKey === selectedSubscription}
                onClick={() => void confirmSubscription()}
                className="flex-1 rounded-xl bg-[var(--nc-accent)] px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {busyKey === selectedSubscription
                  ? isArabic
                    ? "جارٍ التنفيذ..."
                    : "Working..."
                  : isArabic
                    ? "تأكيد الاشتراك"
                    : "Confirm Subscription"}
              </button>
            </div>
          </SmartCard>
        </div>
      )}
    </main>
  );
}