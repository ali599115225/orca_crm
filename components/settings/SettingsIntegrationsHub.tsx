"use client";

import SettingsSelect from "@/components/settings/SettingsSelect";
import { displayUiAlias } from "@/lib/display/uiAliases";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import {
  disconnectRevenueProviderAction,
  getRevenueTrustStateAction,
  saveRevenueProviderAction,
  submitRevenueProviderApplicationAction,
  testRevenueProviderAction,
} from "@/app/actions/revenue-integrity";
import {
  OperationsDialog,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTabs,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import WhatsAppIntegrationSettings from "@/components/settings/WhatsAppIntegrationSettings";

type ProviderId =
  | "ZATCA"
  | "EJAR"
  | "PAYLINK"
  | "MOYASAR"
  | "HYPERPAY"
  | "PAYTABS"
  | "NGENIUS"
  | "CUSTOM_PAYMENT"
  | "RESEND"
  | "SMTP"
  | "DIALOG360"
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
  webhookToken: string | null;
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
  placeholder?: string;
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
    name: "Meta WhatsApp Cloud",
    ar: "ربط مباشر مع Meta عبر التسجيل المضمن",
    en: "Direct Meta connection through Embedded Signup",
    category: "MESSAGING",
    icon: "ph-whatsapp-logo",
    fields: [],
  },
  {
    id: "DIALOG360",
    name: "360dialog",
    ar: "مزود واتساب متخصص بمفتاح مستقل لكل رقم",
    en: "Specialized WhatsApp provider with a per-number API key",
    category: "MESSAGING",
    icon: "ph-chats-circle",
    defaultBaseUrl: "https://waba-v2.360dialog.io",
    fields: [
      {
        key: "apiKey",
        ar: "مفتاح D360 API",
        en: "D360 API key",
        secret: true,
        required: true,
      },
      {
        key: "displayPhoneNumber",
        ar: "رقم واتساب الدولي",
        en: "International WhatsApp number",
        required: true,
        placeholder: "9665XXXXXXXX",
      },
      {
        key: "webhookSecret",
        ar: "سر Webhook",
        en: "Webhook secret",
        secret: true,
        required: true,
        placeholder: "24+ characters",
      },
    ],
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
    id: "CUSTOM_PAYMENT",
    name: "Other payment provider",
    ar: "مزود دفع آخر — تكامل API أو رابط دفع خارجي",
    en: "Custom API integration or external payment link",
    category: "PAYMENTS",
    icon: "ph-plugs-connected",
    fields: [],
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
    id: "SMTP",
    name: "Generic SMTP",
    ar: "إرسال البريد عبر خادم المنشأة الحالي",
    en: "Send mail through the organization’s current server",
    category: "EMAIL",
    icon: "ph-envelope-open",
    fields: [
      {
        key: "host",
        ar: "خادم SMTP",
        en: "SMTP host",
        required: true,
        placeholder: "smtp.example.com",
      },
      {
        key: "port",
        ar: "المنفذ",
        en: "Port",
        required: true,
        placeholder: "587",
      },
      {
        key: "security",
        ar: "نوع التشفير",
        en: "Transport security",
        required: true,
      },
      {
        key: "username",
        ar: "اسم المستخدم",
        en: "Username",
        required: true,
        placeholder: "user@example.com",
      },
      {
        key: "password",
        ar: "كلمة المرور أو App Password",
        en: "Password or app password",
        secret: true,
        required: true,
      },
      {
        key: "fromEmail",
        ar: "عنوان المرسل",
        en: "From address",
        required: true,
        placeholder: "user@example.com",
      },
      {
        key: "fromName",
        ar: "اسم المرسل",
        en: "From name",
      },
      {
        key: "replyTo",
        ar: "عنوان الرد",
        en: "Reply-to address",
        placeholder: "support@example.com",
      },
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
  const providerDisplayName = (provider: (typeof PROVIDERS)[number]) =>
    provider.id === "CUSTOM_PAYMENT"
      ? L("مزود دفع آخر", "Other payment provider")
      : provider.id === "SMTP"
        ? L("SMTP عام", "Generic SMTP")
        : provider.id === "WHATSAPP"
          ? L("Meta WhatsApp Cloud", "Meta WhatsApp Cloud")
          : provider.name;
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
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const autoOpenHandledRef = useRef(false);

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
    if (autoOpenHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "1") return;

    const requested = params.get("provider");
    const provider = PROVIDERS.find((item) => item.id === requested);
    if (!provider) return;

    autoOpenHandledRef.current = true;
    setCategoryFilter(provider.category);
    setActiveProvider(provider.id);
    setMode("CONNECT");
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!CATEGORY_FILTERS.some((filter) => filter.id === categoryFilter)) {
      setCategoryFilter("ALL");
    }
  }, [categoryFilter]);

  useEffect(() => {
    setForm(
      activeProvider === "SMTP"
        ? {
            port: "587",
            security: "STARTTLS",
          }
        : activeProvider === "CUSTOM_PAYMENT"
          ? {
            integrationMode: "API",
            authHeaderName: "Authorization",
            authScheme: "BEARER",
            requestTemplate:
              '{"amount":{"value":"{{amountMinor}}","currency":"{{currency}}"},"callbackUrl":"{{callbackUrl}}","description":"{{description}}","metadata":"{{metadata}}"}',
            responseReferencePath: "id",
            responseRedirectUrlPath: "paymentUrl",
            responseStatusPath: "status",
            responseAmountPath: "amount.value",
            responseCurrencyPath: "amount.currency",
            paidStatuses: "PAID,COMPLETED,CAPTURED",
            webhookSignatureHeader: "x-webhook-signature",
            webhookReferencePath: "id",
          }
          : {},
    );
    setBaseUrl(connection?.baseUrl || definition.defaultBaseUrl || "");
    setIsDefault(Boolean(connection?.isDefault));
    setNotice(null);
    setShowRequiredErrors(false);
  }, [activeProvider, connection?.id]);

  function run(
    task: () => Promise<{ success: boolean; error?: string }>,
    successText: string,
  ) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        const fallback = L("تعذر التنفيذ.", "Operation failed.");
        const errorText =
          result.error === "PROVIDER_CONNECTION_FAILED" &&
          activeProvider === "SMTP"
            ? L(
                "تعذر الاتصال بخادم SMTP. راجع الخادم والمنفذ والتشفير وبيانات الدخول ثم أعد الاختبار.",
                "Could not connect to the SMTP server. Review the host, port, encryption, and credentials, then test again.",
              )
            : result.error || fallback;
        setNotice({ type: "error", text: errorText });
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

  const customPaymentMode = String(form.integrationMode || "API").toUpperCase();

  const missingRequired = useMemo(() => {
    if (activeProvider === "CUSTOM_PAYMENT") {
      const requiredKeys =
        customPaymentMode === "PAYMENT_LINK"
          ? ["providerName", "integrationMode", "paymentLinkUrl"]
          : [
              "providerName",
              "integrationMode",
              "authHeaderName",
              "authScheme",
              "credential",
              "createPaymentPath",
              "verifyPaymentPath",
              "requestTemplate",
              "responseReferencePath",
              "responseRedirectUrlPath",
              "responseStatusPath",
              "responseAmountPath",
              "responseCurrencyPath",
              "paidStatuses",
              "webhookSecret",
              "webhookSignatureHeader",
              "webhookReferencePath",
            ];

      return (
        requiredKeys.some((key) => !String(form[key] || "").trim()) ||
        (customPaymentMode === "API" && !baseUrl.trim())
      );
    }

    if (activeProvider === "SMTP") {
      const port = Number.parseInt(String(form.port || ""), 10);
      return (
        definition.fields.some(
          (field) =>
            field.required && !String(form[field.key] || "").trim(),
        ) ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65_535 ||
        !["TLS", "STARTTLS"].includes(
          String(form.security || "").toUpperCase(),
        )
      );
    }

    return definition.fields.some(
      (field) => field.required && !String(form[field.key] || "").trim(),
    );
  }, [activeProvider, customPaymentMode, definition, form, baseUrl]);

  function submitConnection(event: FormEvent) {
    event.preventDefault();
    if (missingRequired) {
      setShowRequiredErrors(true);
      return;
    }
    setShowRequiredErrors(false);

    const credentials =
      activeProvider === "CUSTOM_PAYMENT"
        ? Object.fromEntries(
            (
              customPaymentMode === "PAYMENT_LINK"
                ? ["providerName", "integrationMode", "paymentLinkUrl"]
                : [
                    "providerName",
                    "integrationMode",
                    "authHeaderName",
                    "authScheme",
                    "credential",
                    "createPaymentPath",
                    "verifyPaymentPath",
                    "requestTemplate",
                    "responseReferencePath",
                    "responseRedirectUrlPath",
                    "responseStatusPath",
                    "responseAmountPath",
                    "responseCurrencyPath",
                    "paidStatuses",
                    "webhookSecret",
                    "webhookSignatureHeader",
                    "webhookReferencePath",
                  ]
            )
              .map((key) => [key, String(form[key] || "").trim()])
              .filter(([, value]) => value),
          )
        : Object.fromEntries(
            definition.fields
              .map((field) => [field.key, String(form[field.key] || "").trim()])
              .filter(([, value]) => value),
          );

    run(
      () =>
        saveRevenueProviderAction({
          provider: activeProvider,
          baseUrl:
            activeProvider === "SMTP" ||
            (activeProvider === "CUSTOM_PAYMENT" &&
              customPaymentMode === "PAYMENT_LINK")
              ? null
              : baseUrl.trim() || null,
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
    setActiveProvider(providerId);
    setMode("CONNECT");
    setShowRequiredErrors(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
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

  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

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
          <h3 className="text-base font-black text-[var(--nc-foreground)]">
            {providerDisplayName(definition)}
          </h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
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

      {activeProvider !== "CUSTOM_PAYMENT" &&
      activeProvider !== "SMTP" &&
      activeProvider !== "DIALOG360" ? (
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
      ) : null}

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
    <div className="orca-settings-section orca-settings-integrations-section">
      <OperationsPanel>
        <OperationsPanelHeader
          title={L("التكاملات والامتثال", "Integrations & Compliance")}
          description={L(
            "إدارة مزودي الخدمة المعتمدين وحالة ربطهم من مكان واحد.",
            "Manage approved service providers and their connection status in one place.",
          )}
        />
      </OperationsPanel>

      <OperationsKpiGrid className="orca-workspace-metrics-3">
        <OperationsMetricCard title={L("المتصلة", "Connected")} value={summary.connected} />
        <OperationsMetricCard title={L("غير المهيأة", "Not configured")} value={notConfigured} />
        <OperationsMetricCard title={L("تحتاج إجراء", "Needs action")} value={summary.needsAction} />
      </OperationsKpiGrid>

      <OperationsTabs className="flex-wrap">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setCategoryFilter(filter.id)}
            role="tab"
            aria-selected={categoryFilter === filter.id}
            className={categoryFilter === filter.id ? operationsVisual.activeTab : operationsVisual.tab}
          >
            {L(filter.ar, filter.en)}
          </button>
        ))}
      </OperationsTabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProviders.map((provider, providerIndex) => {
          const state = providers.find((item) => item.provider === provider.id);
          const isWhatsApp = provider.id === "WHATSAPP";
          const hasWebhook = provider.fields.some((field) => field.key === "webhookSecret");
          const categoryLabel = CATEGORY_FILTERS.find((c) => c.id === provider.category);

          return (
            <OperationsPanel
              key={provider.id}
              padded
              className={`flex min-h-[230px] flex-col ${visibleProviders.length % 3 === 1 && providerIndex === visibleProviders.length - 1 ? "md:col-span-2 xl:col-span-3" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate text-base font-black text-[var(--nc-foreground)]">
                  {providerDisplayName(provider)}
                </h3>
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
                {provider.id === "CUSTOM_PAYMENT" && (
                  <span className="rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-xs font-bold text-[var(--nc-foreground-muted)]">
                    API / Link
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
                <button type="button" className={operationsVisual.primaryButton} onClick={() => openProvider(provider.id)}>
                  {isWhatsApp
                    ? L("إدارة واتساب", "Manage WhatsApp")
                    : state?.status === "CONNECTED"
                      ? L("إدارة", "Manage")
                      : L("ربط", "Connect")}
                </button>
              </div>
            </OperationsPanel>
          );
        })}
      </div>

      <OperationsDialog
        open={drawerOpen}
        onClose={closeDrawer}
        title={providerDisplayName(definition)}
        description={isArabic ? definition.ar : definition.en}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={pending}
        closeOnBackdrop={!isDirty}
        dir={isArabic ? "rtl" : "ltr"}
        className={activeProvider === "WHATSAPP" ? "max-w-2xl" : "max-w-3xl"}
        footer={
          activeProvider === "WHATSAPP" ? null : mode === "CONNECT" ? (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer} disabled={pending}>
                {L("إلغاء", "Cancel")}
              </button>
              <button type="submit" form="settings-integration-connect-form" className={operationsVisual.primaryButton} disabled={pending}>
                {connection?.id ? L("تدوير بيانات الاعتماد", "Rotate credentials") : L("حفظ مشفر", "Save encrypted")}
              </button>
              <button
                type="button"
                className={operationsVisual.secondaryButton}
                disabled={pending || !connection?.id || connection.status === "DISCONNECTED"}
                onClick={() =>
                  run(
                    () => testRevenueProviderAction(activeProvider),
                    activeProvider === "CUSTOM_PAYMENT"
                      ? L("تم التحقق من اكتمال وصحة إعداد المزود.", "Provider configuration validated.")
                      : L("نجح اختبار الاتصال وتم اعتماد الحالة متصل.", "Connection test passed and status is now connected."),
                  )
                }
              >
                {activeProvider === "CUSTOM_PAYMENT" ? L("التحقق من الإعداد", "Validate configuration") : L("اختبار الاتصال", "Test connection")}
              </button>
              <button
                type="button"
                className="orca-operations-secondary-button border-rose-500/40 text-rose-400"
                disabled={pending || !connection?.id}
                onClick={() => run(() => disconnectRevenueProviderAction(activeProvider), L("تم فصل المزود.", "Provider disconnected."))}
              >
                {L("فصل", "Disconnect")}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer} disabled={pending}>
                {L("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                form="settings-integration-request-form"
                className={operationsVisual.primaryButton}
                disabled={pending || Object.values(company).some((value) => !String(value).trim())}
              >
                {L("إرسال الطلب", "Submit application")}
              </button>
            </>
          )
        }
      >
              {activeProvider === "WHATSAPP" ? (
                <WhatsAppIntegrationSettings lang={lang} />
              ) : mode === "CONNECT" ? (
                <form id="settings-integration-connect-form" onSubmit={submitConnection} noValidate className="grid gap-4">
                  <div className="grid gap-4">
                    <OperationsPanel padded>
                      {statusBlock}

                      <div className="mt-6 space-y-4">
                        {activeProvider === "CUSTOM_PAYMENT" ? (
                          <>
                            <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("اسم مزود الدفع", "Payment provider name")} *
                              <input
                                required
                                value={form.providerName || ""}
                                onChange={(event) =>
                                  setForm((current) => ({ ...current, providerName: event.target.value }))
                                }
                                className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                              />
                            </label>

                            <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("طريقة الربط", "Integration method")} *
                              <SettingsSelect required
                                value={form.integrationMode || "API"}
                                onChange={(value) =>
                                  setForm((current) => ({ ...current, integrationMode: value }))
                                }
                                className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                options={[{ value: "API", label: L("تكامل API", "API integration") },
                                  { value: "PAYMENT_LINK", label: L("رابط دفع خارجي", "External payment link") }]}
                              />
                            </label>

                            {customPaymentMode === "PAYMENT_LINK" ? (
                              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                {L("رابط الدفع الآمن", "Secure payment link")} *
                                <input
                                  required
                                  type="url"
                                  value={form.paymentLinkUrl || ""}
                                  onChange={(event) =>
                                    setForm((current) => ({ ...current, paymentLinkUrl: event.target.value }))
                                  }
                                  placeholder="https://"
                                  dir="ltr"
                                  className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                />
                              </label>
                            ) : (
                              <>
                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("عنوان API الأساسي", "API base URL")} *
                                  <input
                                    required
                                    type="url"
                                    value={baseUrl}
                                    onChange={(event) => setBaseUrl(event.target.value)}
                                    placeholder="https://"
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("اسم ترويسة المصادقة", "Authentication header")} *
                                  <input
                                    required
                                    value={form.authHeaderName || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({ ...current, authHeaderName: event.target.value }))
                                    }
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("نوع المصادقة", "Authentication scheme")} *
                                  <SettingsSelect required
                                    value={form.authScheme || "BEARER"}
                                    onChange={(value) =>
                                      setForm((current) => ({ ...current, authScheme: value }))
                                    }
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                    options={[{ value: "BEARER", label: "Bearer" },
                                      { value: "BASIC", label: "Basic" },
                                      { value: "API_KEY", label: "API Key" }]}
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("مفتاح أو رمز المصادقة", "Authentication credential")} *
                                  <input
                                    required
                                    type="password"
                                    value={form.credential || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({ ...current, credential: event.target.value }))
                                    }
                                    autoComplete="off"
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("مسار إنشاء رابط الدفع", "Create-payment path")} *
                                  <input
                                    required
                                    value={form.createPaymentPath || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({ ...current, createPaymentPath: event.target.value }))
                                    }
                                    placeholder="/payments"
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("مسار التحقق من حالة الدفع", "Payment-status path")} *
                                  <input
                                    required
                                    value={form.verifyPaymentPath || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({ ...current, verifyPaymentPath: event.target.value }))
                                    }
                                    placeholder="/payments/{reference}"
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("قالب طلب JSON", "JSON request template")} *
                                  <textarea
                                    required
                                    rows={6}
                                    value={form.requestTemplate || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        requestTemplate: event.target.value,
                                      }))
                                    }
                                    dir="ltr"
                                    className="mt-2 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 font-mono text-xs text-[var(--nc-foreground)]"
                                  />
                                </label>

                                {[
                                  ["responseReferencePath", L("مسار مرجع العملية في الاستجابة", "Response reference path")],
                                  ["responseRedirectUrlPath", L("مسار رابط الدفع في الاستجابة", "Response payment URL path")],
                                  ["responseStatusPath", L("مسار حالة الدفع في الاستجابة", "Response status path")],
                                  ["responseAmountPath", L("مسار المبلغ بوحداته الصغرى", "Response minor-amount path")],
                                  ["responseCurrencyPath", L("مسار العملة في الاستجابة", "Response currency path")],
                                  ["paidStatuses", L("حالات النجاح مفصولة بفاصلة", "Paid statuses, comma-separated")],
                                  ["webhookSignatureHeader", L("اسم ترويسة توقيع Webhook", "Webhook signature header")],
                                  ["webhookReferencePath", L("مسار مرجع العملية داخل Webhook", "Webhook reference path")],
                                ].map(([key, label]) => (
                                  <label
                                    key={key}
                                    className="block text-xs font-bold text-[var(--nc-foreground-muted)]"
                                  >
                                    {label} *
                                    <input
                                      required
                                      value={form[key] || ""}
                                      onChange={(event) =>
                                        setForm((current) => ({
                                          ...current,
                                          [key]: event.target.value,
                                        }))
                                      }
                                      dir="ltr"
                                      className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                    />
                                  </label>
                                ))}

                                <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {L("سر توقيع Webhook", "Webhook signing secret")} *
                                  <input
                                    required
                                    type="password"
                                    value={form.webhookSecret || ""}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        webhookSecret: event.target.value,
                                      }))
                                    }
                                    autoComplete="off"
                                    dir="ltr"
                                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                                  />
                                </label>

                                {connection?.webhookToken ? (
                                  <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-xs text-[var(--nc-foreground-muted)]">
                                    <div className="font-bold">
                                      {L("مسار Webhook", "Webhook path")}
                                    </div>
                                    <code className="mt-1 block break-all" dir="ltr">
                                      /api/payments/custom/webhook/{connection.id}
                                    </code>
                                  </div>
                                ) : null}


                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {activeProvider !== "SMTP" ? (
                              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                {L("عنوان بيئة المزود", "Provider base URL")}
                                <input
                                  value={baseUrl}
                                  onChange={(event) => setBaseUrl(event.target.value)}
                                  className="orca-operations-input"
                                  placeholder={definition.defaultBaseUrl || "https://"}
                                  dir="ltr"
                                />
                              </label>
                            ) : (
                              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-xs leading-6 text-[var(--nc-foreground-muted)]">
                                {L(
                                  "استخدم بيانات صندوق بريد المنشأة من مزودها الحالي. يوصى بالمنفذ 587 مع STARTTLS أو 465 مع TLS. تبقى البيانات مشفرة داخل نطاق المنشأة، ولا يسمح بعناوين الخوادم المحلية أو الخاصة.",
                                  "Use the organization mailbox credentials from its current provider. Port 587 with STARTTLS or 465 with TLS is recommended. Credentials remain encrypted within the organization scope, and local or private server addresses are not allowed.",
                                )}
                              </div>
                            )}

                            <div className="grid gap-4">
                              {definition.fields.map((field) => (
                                <label key={field.key} className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                                  {isArabic ? field.ar : field.en}
                                  {field.required ? " *" : ""}
                                  {field.key === "security" ? (
                                    <SettingsSelect value={form[field.key] || "STARTTLS"}
                                      onChange={(value) =>
                                        setForm((current) => ({
                                          ...current,
                                          [field.key]: value,
                                          ...(field.key === "security"
                                            ? {
                                                port:
                                                  value === "TLS"
                                                    ? "465"
                                                    : "587",
                                              }
                                            : {}),
                                        }))
                                      }
                                      className="orca-operations-input"
                                      dir="ltr"
                                      options={[{ value: "STARTTLS", label: "STARTTLS — 587" },
                                        { value: "TLS", label: "TLS — 465" }]}
                                    />
                                  ) : (
                                    <input
                                      type={
                                        field.secret
                                          ? "password"
                                          : field.key === "fromEmail" || field.key === "replyTo"
                                            ? "email"
                                            : "text"
                                      }
                                      inputMode={field.key === "port" ? "numeric" : undefined}
                                      value={form[field.key] || ""}
                                      onChange={(event) =>
                                        setForm((current) => ({
                                          ...current,
                                          [field.key]: event.target.value,
                                        }))
                                      }
                                      autoComplete="off"
                                      placeholder={
                                         activeProvider === "DIALOG360" &&
                                         field.key === "webhookSecret"
                                           ? L("24 حرفًا على الأقل", "24+ characters")
                                           : field.placeholder
                                       }
                                      className="orca-operations-input"
                                      dir="ltr"
                                    />
                                  )}
                                  {showRequiredErrors &&
                                    field.required &&
                                    !String(form[field.key] || "").trim() && (
                                    <span className="mt-1 block text-[11px] font-bold text-rose-500">
                                      {L("هذا الحقل مطلوب.", "This field is required.")}
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>

                            {activeProvider === "DIALOG360" ? (
                              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-[var(--nc-foreground-muted)]">
                                <p className="font-black text-[var(--nc-foreground)]">
                                  {L("إعداد Webhook", "Webhook setup")}
                                </p>
                                <p className="mt-1 leading-6">
                                  {L(
                                    "بعد حفظ الاتصال، استخدم الرابط الظاهر أدناه في 360dialog وأرسل السر المحفوظ داخل الترويسة X-ORCA-Webhook-Secret.",
                                    "After saving, use the URL below in 360dialog and send the stored secret in the X-ORCA-Webhook-Secret header.",
                                  )}
                                </p>
                                {connection?.id ? (
                                  <code
                                    dir="ltr"
                                    className="mt-2 block break-all rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 text-[11px]"
                                  >
                                    {`${browserOrigin}/api/whatsapp/webhook/360dialog/${connection.webhookToken}`}
                                  </code>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        )}

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
                    </OperationsPanel>

                    {providerApplications.length > 0 ? (
                      <OperationsPanel padded>
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
                                  {String(application.companyData?.companyName || providerDisplayName(definition))}
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
                      </OperationsPanel>
                    ) : null}
                  </div>

                </form>
              ) : (
                <form id="settings-integration-request-form" onSubmit={submitApplication} noValidate className="grid gap-4">
                  <div className="grid gap-4">
                    <OperationsPanel padded>
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
                                className="orca-operations-input"
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
                            className="orca-operations-textarea"
                            dir="ltr"
                          />
                        </label>
                        <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("ملاحظات الطلب", "Application notes")}
                          <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                            className="orca-operations-textarea"
                          />
                        </label>
                      </div>
                    </OperationsPanel>

                    {providerApplications.length > 0 ? (
                      <OperationsPanel padded>
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
                      </OperationsPanel>
                    ) : null}
                  </div>

                </form>
              )}
      </OperationsDialog>
    </div>
  );
}
