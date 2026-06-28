"use client";
import { displayUiAlias } from "@/lib/display/uiAliases";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  disconnectRevenueProviderAction,
  getRevenueTrustStateAction,
  saveRevenueProviderAction,
  submitRevenueProviderApplicationAction,
  testRevenueProviderAction,
} from "@/app/actions/revenue-integrity";
import { SmartCard } from "@/components/ui/SmartCard";
import SettingsButton from "@/components/settings/SettingsButton";
import WhatsAppIntegrationSettings from "@/components/settings/WhatsAppIntegrationSettings";

type ProviderId =
  | "ZATCA"
  | "EJAR"
  | "PAYLINK"
  | "MOYASAR"
  | "HYPERPAY"
  | "PAYTABS"
  | "NGENIUS"
  | "RESEND"
  | "SIGNATURE"
  | "WHATSAPP";

type ProviderState = {
  id: string | null;
  provider: ProviderId;
  status: string;
  baseUrl: string | null;
  credentialsVersion: number;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  hasWebhookSecret: boolean;
};

type ApplicationState = {
  id: string;
  provider: ProviderId;
  status: string;
  companyData: Record<string, unknown>;
  notes: string | null;
  submittedAt: string | null;
  decisionReason: string | null;
};

type FieldDefinition = {
  key: string;
  ar: string;
  en: string;
  secret?: boolean;
  required?: boolean;
};

// Presentational-only grouping for the filter tabs/capability chips below.
// Never persisted, never sent to any action — display grouping only.
type ProviderCategory = "MESSAGING" | "PAYMENTS" | "EMAIL" | "GOVERNMENT";

type ProviderDefinition = {
  id: ProviderId;
  name: string;
  ar: string;
  en: string;
  category: ProviderCategory;
  icon: string;
  defaultBaseUrl?: string;
  fields: FieldDefinition[];
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "WHATSAPP",
    name: "WhatsApp Business API",
    ar: "واتساب للأعمال",
    en: "WhatsApp Business API",
    category: "MESSAGING",
    icon: "ph-whatsapp-logo",
    fields: [],
  },
  {
    id: "PAYLINK",
    name: "Paylink",
    ar: "روابط الدفع والتحصيل",
    en: "Payment links and collection",
    category: "PAYMENTS",
    icon: "ph-credit-card",
    defaultBaseUrl: "https://restpilot.paylink.sa",
    fields: [
      { key: "apiId", ar: "معرف API", en: "API ID", required: true },
      { key: "secretKey", ar: "المفتاح السري", en: "Secret key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "MOYASAR",
    name: "Moyasar",
    ar: "ميسر للدفع الإلكتروني",
    en: "Moyasar payment gateway",
    category: "PAYMENTS",
    icon: "ph-credit-card",
    defaultBaseUrl: "https://api.moyasar.com",
    fields: [
      { key: "publishableKey", ar: "المفتاح العام", en: "Publishable key", required: true },
      { key: "secretKey", ar: "المفتاح السري", en: "Secret key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "HYPERPAY",
    name: "HyperPay",
    ar: "هايبر باي للدفع الإلكتروني",
    en: "HyperPay payment gateway",
    category: "PAYMENTS",
    icon: "ph-credit-card",
    defaultBaseUrl: "https://eu-test.oppwa.com",
    fields: [
      { key: "entityId", ar: "معرف المنشأة", en: "Entity ID", required: true },
      { key: "bearerToken", ar: "رمز الوصول", en: "Bearer Token", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "PAYTABS",
    name: "PayTabs",
    ar: "بيتابس للدفع الإلكتروني",
    en: "PayTabs payment gateway",
    category: "PAYMENTS",
    icon: "ph-credit-card",
    defaultBaseUrl: "https://secure.paytabs.sa",
    fields: [
      { key: "profileId", ar: "معرف الملف", en: "Profile ID", required: true },
      { key: "serverKey", ar: "مفتاح الخادم", en: "Server Key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "NGENIUS",
    name: "N-Genius",
    ar: "بوابة الدفع من Network International",
    en: "Network International payment gateway",
    category: "PAYMENTS",
    icon: "ph-credit-card",
    defaultBaseUrl: "https://api-gateway.ngenius-payments.com",
    fields: [
      { key: "outletId", ar: "معرف المنفذ", en: "Outlet ID", required: true },
      { key: "apiKey", ar: "مفتاح الخدمة", en: "Service API key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "RESEND",
    name: "Resend",
    ar: "الإرسال البريدي الخارجي",
    en: "External email delivery",
    category: "EMAIL",
    icon: "ph-envelope-simple",
    defaultBaseUrl: "https://api.resend.com",
    fields: [
      { key: "apiKey", ar: "مفتاح API", en: "API key", secret: true, required: true },
      { key: "fromEmail", ar: "عنوان المرسل", en: "From address", required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "ZATCA",
    name: "ZATCA",
    ar: "الفوترة الإلكترونية السعودية",
    en: "Saudi e-invoicing",
    category: "GOVERNMENT",
    icon: "ph-buildings",
    fields: [
      { key: "binarySecurityToken", ar: "رمز الأمان", en: "Binary security token", secret: true, required: true },
      { key: "secret", ar: "السر", en: "Secret", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "EJAR",
    name: "Ejar",
    ar: "توثيق عقود الإيجار",
    en: "Rental contract documentation",
    category: "GOVERNMENT",
    icon: "ph-house-line",
    fields: [
      { key: "accessToken", ar: "رمز الوصول", en: "Access token", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
  {
    id: "SIGNATURE",
    name: "Digital Signature",
    ar: "التوقيع الإلكتروني الخارجي",
    en: "External digital signature",
    category: "GOVERNMENT",
    icon: "ph-pen-nib",
    fields: [
      { key: "apiKey", ar: "مفتاح API", en: "API key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
];

const CATEGORY_FILTERS: { id: "ALL" | ProviderCategory; ar: string; en: string }[] = [
  { id: "ALL", ar: "الكل", en: "All" },
  { id: "MESSAGING", ar: "المراسلات", en: "Messaging" },
  { id: "PAYMENTS", ar: "الدفع", en: "Payments" },
  { id: "EMAIL", ar: "البريد", en: "Email" },
  { id: "GOVERNMENT", ar: "الحكومي", en: "Government" },
];

function badgeClass(status: string) {
  if (status === "CONNECTED" || status === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "ERROR" || status === "REJECTED") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(status)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)]";
}

// Visual-order tier only: connected, then needs-action, then available,
// then anything unrecognized. Never mutates or reorders backend data.
function statusTier(status: string | undefined): number {
  if (status === "CONNECTED") return 0;
  if (status === "PENDING" || status === "ERROR") return 1;
  if (status === "NOT_CONFIGURED" || status === "DISCONNECTED" || !status) return 2;
  return 3;
}

export default function SettingsIntegrationsHub({ lang }: { lang: "AR" | "EN" }) {
  const isArabic = lang === "AR";
  const L = (ar: string, en: string) => (isArabic ? ar : en);
  const [activeProvider, setActiveProvider] = useState<ProviderId>("PAYLINK");
  const [mode, setMode] = useState<"CONNECT" | "REQUEST">("CONNECT");
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [applications, setApplications] = useState<ApplicationState[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [company, setCompany] = useState({
    companyName: "",
    commercialRegistry: "",
    vatNumber: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [documents, setDocuments] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | ProviderCategory>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const definition = PROVIDERS.find((item) => item.id === activeProvider)!;
  const connection = providers.find((item) => item.provider === activeProvider);
  const providerApplications = applications.filter((item) => item.provider === activeProvider);

  function load() {
    startTransition(async () => {
      const result = await getRevenueTrustStateAction();
      if (!result.success) {
        setNotice({ type: "error", text: result.error });
        return;
      }
      const data = result.data as {
        providers: ProviderState[];
        applications: ApplicationState[];
      };
      setProviders(data.providers);
      setApplications(data.applications);
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!CATEGORY_FILTERS.some((filter) => filter.id === categoryFilter)) {
      setCategoryFilter("ALL");
    }
  }, [categoryFilter]);

  useEffect(() => {
    setForm({});
    setBaseUrl(connection?.baseUrl || definition.defaultBaseUrl || "");
    setIsDefault(Boolean(connection?.isDefault));
    setNotice(null);
  }, [activeProvider, connection?.id]);

  function run(
    task: () => Promise<{ success: boolean; error?: string }>,
    successText: string,
  ) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setNotice({ type: "error", text: result.error || L("تعذر التنفيذ.", "Operation failed.") });
        return;
      }
      setNotice({ type: "success", text: successText });
      const refreshed = await getRevenueTrustStateAction();
      if (refreshed.success) {
        const data = refreshed.data as {
          providers: ProviderState[];
          applications: ApplicationState[];
        };
        setProviders(data.providers);
        setApplications(data.applications);
      }
    });
  }

  const missingRequired = useMemo(
    () => definition.fields.some((field) => field.required && !String(form[field.key] || "").trim()),
    [definition, form],
  );

  function submitConnection(event: FormEvent) {
    event.preventDefault();
    if (missingRequired) return;

    const credentials = Object.fromEntries(
      definition.fields
        .map((field) => [field.key, String(form[field.key] || "").trim()])
        .filter(([, value]) => value),
    );

    run(
      () =>
        saveRevenueProviderAction({
          provider: activeProvider,
          baseUrl: baseUrl.trim() || null,
          credentials,
          isDefault,
        }),
      L("تم حفظ بيانات الاعتماد مشفرة. اختبر الاتصال قبل الاعتماد.", "Encrypted credentials saved. Test the connection before approval."),
    );
  }

  function submitApplication(event: FormEvent) {
    event.preventDefault();
    const documentReferences = documents
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((reference) => ({ reference }));

    run(
      () =>
        submitRevenueProviderApplicationAction({
          provider: activeProvider,
          companyData: company,
          documents: documentReferences,
          notes,
        }),
      L("تم إرسال طلب المزود وحفظه للتتبع.", "Provider application submitted and stored for tracking."),
    );
  }

  function openProvider(providerId: ProviderId) {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setActiveProvider(providerId);
    setMode("CONNECT");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    lastFocusedRef.current?.focus();
  }

  const isDirty = useMemo(() => {
    if (activeProvider === "WHATSAPP") return false;
    if (mode === "CONNECT") {
      const baseUrlChanged = baseUrl.trim() !== (connection?.baseUrl || definition.defaultBaseUrl || "").trim();
      const fieldsFilled = Object.values(form).some((value) => String(value || "").trim());
      const defaultChanged = isDefault !== Boolean(connection?.isDefault);
      return baseUrlChanged || fieldsFilled || defaultChanged;
    }
    return (
      Object.values(company).some((value) => String(value || "").trim()) ||
      documents.trim() !== "" ||
      notes.trim() !== ""
    );
  }, [activeProvider, mode, baseUrl, connection, definition, form, isDefault, company, documents, notes]);

  function handleOverlayClick() {
    if (isDirty) return;
    closeDrawer();
  }

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) titleRef.current?.focus();
  }, [drawerOpen, activeProvider]);

  useEffect(() => {
    if (!drawerOpen) return;
    const scrollContainer = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement | null;
    const previousContainerOverflow = scrollContainer?.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = previousContainerOverflow || "";
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [drawerOpen]);

  // Header KPI summary — current in-memory data only, no new fetch.
  const trackedProviders = providers.filter((item) => item.provider !== "WHATSAPP");
  const trackedTotal = PROVIDERS.filter((item) => item.id !== "WHATSAPP").length;
  const summary = {
    connected: trackedProviders.filter((item) => item.status === "CONNECTED").length,
    needsAction: trackedProviders.filter((item) => item.status === "PENDING" || item.status === "ERROR").length,
  };
  const notConfigured = Math.max(
    trackedTotal - trackedProviders.filter((item) => item.status === "CONNECTED" || item.status === "PENDING" || item.status === "ERROR").length,
    0,
  );

  const visibleProviders = useMemo(() => {
    const filtered = PROVIDERS.filter(
      (provider) => categoryFilter === "ALL" || provider.category === categoryFilter,
    );

    const whatsapp = filtered.filter((provider) => provider.id === "WHATSAPP");
    const rest = filtered
      .filter((provider) => provider.id !== "WHATSAPP")
      .slice()
      .sort((a, b) => {
        const stateA = providers.find((item) => item.provider === a.id);
        const stateB = providers.find((item) => item.provider === b.id);
        return statusTier(stateA?.status) - statusTier(stateB?.status);
      });

    return [...whatsapp, ...rest];
  }, [categoryFilter, providers]);

  const statusBlock = (
    <>
      <div className="flex flex-col gap-4 border-b border-[var(--nc-border)] pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-black text-[var(--nc-foreground)]">{definition.name}</h3>
          <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
            {isArabic ? definition.ar : definition.en}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${badgeClass(connection?.status || "NOT_CONFIGURED")}`}>
            {L(displayUiAlias("integrationStatus", connection?.status || "NOT_CONFIGURED", "ar"), displayUiAlias("integrationStatus", connection?.status || "NOT_CONFIGURED", "en"))}
          </span>
          {connection?.credentialsVersion ? (
            <span className="text-xs text-[var(--nc-foreground-muted)]">v{connection.credentialsVersion}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-1">
        <button
          type="button"
          onClick={() => setMode("CONNECT")}
          className={`rounded-lg px-4 h-9 text-xs font-black ${mode === "CONNECT" ? "bg-[var(--nc-accent)] text-slate-950" : "text-[var(--nc-foreground-muted)]"}`}
        >
          {L("لدي حساب", "I have an account")}
        </button>
        <button
          type="button"
          onClick={() => setMode("REQUEST")}
          className={`rounded-lg px-4 h-9 text-xs font-black ${mode === "REQUEST" ? "bg-[var(--nc-accent)] text-slate-950" : "text-[var(--nc-foreground-muted)]"}`}
        >
          {L("لا أملك حسابًا", "I need an account")}
        </button>
      </div>

      {notice ? (
        <div
          role="status"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[var(--nc-foreground)]">
          {L("التكاملات والامتثال", "Integrations & Compliance")}
        </h2>
        <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
          {L(
            "إدارة مزودي الخدمة المعتمدين وحالة ربطهم من مكان واحد.",
            "Manage approved service providers and their connection status in one place.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <i className="ph-bold ph-check-circle text-xl text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{L("المتصلة", "Connected")}</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{summary.connected}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
          <i className="ph-bold ph-circle-dashed text-xl text-[var(--nc-foreground-muted)]" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-[var(--nc-foreground-muted)]">{L("غير المهيأة", "Not configured")}</div>
            <div className="text-lg font-black text-[var(--nc-foreground)]">{notConfigured}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <i className="ph-bold ph-warning-circle text-xl text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{L("تحتاج إجراء", "Needs action")}</div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300">{summary.needsAction}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setCategoryFilter(filter.id)}
            className={`shrink-0 rounded-full border px-4 h-9 text-xs font-black transition-colors ${
              categoryFilter === filter.id
                ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]"
                : "border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]"
            }`}
          >
            {L(filter.ar, filter.en)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1200px]:grid-cols-4 min-[1440px]:grid-cols-5">
        {visibleProviders.map((provider) => {
          const state = providers.find((item) => item.provider === provider.id);
          const isWhatsApp = provider.id === "WHATSAPP";
          const hasWebhook = provider.fields.some((field) => field.key === "webhookSecret");
          const categoryLabel = CATEGORY_FILTERS.find((c) => c.id === provider.category);

          return (
            <div
              key={provider.id}
              className="flex min-h-[190px] flex-col rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-colors hover:border-[var(--nc-accent-border)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate text-base font-black text-[var(--nc-foreground)]">{provider.name}</h3>
                {!isWhatsApp && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${badgeClass(
                      state?.status || "NOT_CONFIGURED",
                    )}`}
                  >
                    {L(
                      displayUiAlias("integrationStatus", state?.status || "NOT_CONFIGURED", "ar"),
                      displayUiAlias("integrationStatus", state?.status || "NOT_CONFIGURED", "en"),
                    )}
                  </span>
                )}
              </div>

              <p className="mt-1.5 line-clamp-2 text-xs text-[var(--nc-foreground-muted)]">
                {isArabic ? provider.ar : provider.en}
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1">
                {categoryLabel && (
                  <span className="rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-xs font-bold text-[var(--nc-foreground-muted)]">
                    {L(categoryLabel.ar, categoryLabel.en)}
                  </span>
                )}
                {hasWebhook && (
                  <span className="rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-xs font-bold text-[var(--nc-foreground-muted)]">
                    Webhook
                  </span>
                )}
              </div>

              {!isWhatsApp && (
                <p className="mt-1.5 text-xs text-[var(--nc-foreground-muted)]">
                  {L("آخر اختبار: ", "Last tested: ")}
                  {state?.lastTestedAt
                    ? new Date(state.lastTestedAt).toLocaleDateString(isArabic ? "ar-SA" : "en-US")
                    : L("لم يتم الاختبار", "Never tested")}
                </p>
              )}

              <div className="mt-auto pt-2">
                <SettingsButton variant="primary" onClick={() => openProvider(provider.id)}>
                  {isWhatsApp
                    ? L("إدارة واتساب", "Manage WhatsApp")
                    : state?.status === "CONNECTED"
                      ? L("إدارة", "Manage")
                      : L("ربط", "Connect")}
                </SettingsButton>
              </div>
            </div>
          );
        })}
      </div>

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex">
            <div
              onClick={handleOverlayClick}
              className="absolute inset-0 bg-black/60"
            />

            <div
              className={`absolute inset-y-0 left-0 z-[110] flex w-screen flex-col bg-[var(--nc-surface-solid)] shadow-2xl ${
                activeProvider === "WHATSAPP" ? "sm:w-[640px]" : "sm:w-[min(720px,100vw)]"
              }`}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--nc-border)] p-5">
                <h2 ref={titleRef} tabIndex={-1} className="text-lg font-black text-[var(--nc-foreground)] outline-none">
                  {definition.name}
                </h2>
                <SettingsButton variant="icon" onClick={closeDrawer} aria-label={L("إغلاق", "Close")}>
                  ×
                </SettingsButton>
              </div>

              {activeProvider === "WHATSAPP" ? (
                <div className="min-w-0 flex-1 overflow-y-auto p-6">
                  <WhatsAppIntegrationSettings lang={lang} />
                </div>
              ) : mode === "CONNECT" ? (
                <form onSubmit={submitConnection} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
                    <SmartCard className="p-5">
                      {statusBlock}

                      <div className="mt-6 space-y-4">
                        <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("عنوان بيئة المزود", "Provider base URL")}
                          <input
                            value={baseUrl}
                            onChange={(event) => setBaseUrl(event.target.value)}
                            className="mt-2 h-10 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            placeholder={definition.defaultBaseUrl || "https://"}
                            dir="ltr"
                          />
                        </label>

                        <div className="grid gap-4">
                          {definition.fields.map((field) => (
                            <label key={field.key} className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {isArabic ? field.ar : field.en}
                              {field.required ? " *" : ""}
                              <input
                                type={field.secret ? "password" : "text"}
                                value={form[field.key] || ""}
                                onChange={(event) =>
                                  setForm((current) => ({ ...current, [field.key]: event.target.value }))
                                }
                                autoComplete="off"
                                className="mt-2 h-10 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                                dir="ltr"
                              />
                              {field.required && !String(form[field.key] || "").trim() && (
                                <span className="mt-1 block text-[11px] font-bold text-rose-500">
                                  {L("هذا الحقل مطلوب.", "This field is required.")}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-xs font-bold text-[var(--nc-foreground)]">
                          <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={(event) => setIsDefault(event.target.checked)}
                          />
                          {L("تعيين كمزود افتراضي ضمن فئته", "Set as the default provider in its category")}
                        </label>

                        {connection?.lastError ? (
                          <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                            {connection.lastError}
                          </div>
                        ) : null}
                      </div>
                    </SmartCard>

                    {providerApplications.length > 0 ? (
                      <SmartCard className="p-5">
                        <h3 className="text-base font-black text-[var(--nc-foreground)]">
                          {L("سجل طلبات المزود", "Provider application history")}
                        </h3>
                        <div className="mt-4 space-y-2">
                          {providerApplications.map((application) => (
                            <div
                              key={application.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3"
                            >
                              <div>
                                <div className="text-xs font-bold text-[var(--nc-foreground)]">
                                  {String(application.companyData?.companyName || definition.name)}
                                </div>
                                <div className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                                  {application.submittedAt || "—"}
                                </div>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs font-black ${badgeClass(application.status)}`}>
                                {application.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </SmartCard>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton variant="primary" type="submit" disabled={pending || missingRequired}>
                      {connection?.id ? L("تدوير بيانات الاعتماد", "Rotate credentials") : L("حفظ مشفر", "Save encrypted")}
                    </SettingsButton>
                    <SettingsButton
                      variant="secondary"
                      disabled={pending || !connection?.id || connection.status === "DISCONNECTED"}
                      onClick={() =>
                        run(
                          () => testRevenueProviderAction(activeProvider),
                          L("نجح اختبار الاتصال وتم اعتماد الحالة متصل.", "Connection test passed and status is now connected."),
                        )
                      }
                    >
                      {L("اختبار الاتصال", "Test connection")}
                    </SettingsButton>
                    <SettingsButton
                      variant="danger"
                      disabled={pending || !connection?.id}
                      onClick={() =>
                        run(
                          () => disconnectRevenueProviderAction(activeProvider),
                          L("تم فصل المزود.", "Provider disconnected."),
                        )
                      }
                    >
                      {L("فصل", "Disconnect")}
                    </SettingsButton>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitApplication} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
                    <SmartCard className="p-5">
                      {statusBlock}

                      <div className="mt-6 space-y-4">
                        <div className="grid gap-4">
                          {[
                            ["companyName", L("اسم الشركة", "Company name")],
                            ["commercialRegistry", L("السجل التجاري", "Commercial registry")],
                            ["vatNumber", L("الرقم الضريبي", "VAT number")],
                            ["contactName", L("اسم المسؤول", "Contact name")],
                            ["contactEmail", L("البريد", "Email")],
                            ["contactPhone", L("الهاتف", "Phone")],
                          ].map(([key, label]) => (
                            <label key={key} className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {label}
                              <input
                                required
                                value={company[key as keyof typeof company]}
                                onChange={(event) =>
                                  setCompany((current) => ({ ...current, [key]: event.target.value }))
                                }
                                className="mt-2 h-10 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                              />
                            </label>
                          ))}
                        </div>
                        <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("مراجع المستندات — مرجع أو رابط في كل سطر", "Document references — one reference or URL per line")}
                          <textarea
                            value={documents}
                            onChange={(event) => setDocuments(event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-[var(--nc-foreground)]"
                            dir="ltr"
                          />
                        </label>
                        <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("ملاحظات الطلب", "Application notes")}
                          <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-[var(--nc-foreground)]"
                          />
                        </label>
                      </div>
                    </SmartCard>

                    {providerApplications.length > 0 ? (
                      <SmartCard className="p-5">
                        <h3 className="text-base font-black text-[var(--nc-foreground)]">
                          {L("سجل طلبات المزود", "Provider application history")}
                        </h3>
                        <div className="mt-4 space-y-2">
                          {providerApplications.map((application) => (
                            <div
                              key={application.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3"
                            >
                              <div>
                                <div className="text-xs font-bold text-[var(--nc-foreground)]">
                                  {String(application.companyData?.companyName || definition.name)}
                                </div>
                                <div className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                                  {application.submittedAt || "—"}
                                </div>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs font-black ${badgeClass(application.status)}`}>
                                {application.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </SmartCard>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton
                      variant="primary"
                      type="submit"
                      disabled={pending || Object.values(company).some((value) => !String(value).trim())}
                    >
                      {L("إرسال الطلب", "Submit application")}
                    </SettingsButton>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
