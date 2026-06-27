"use client";
import { displayUiAlias } from "@/lib/display/uiAliases";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  disconnectRevenueProviderAction,
  getRevenueTrustStateAction,
  saveRevenueProviderAction,
  submitRevenueProviderApplicationAction,
  testRevenueProviderAction,
} from "@/app/actions/revenue-integrity";
import { SmartCard } from "@/components/ui/SmartCard";
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

type ProviderDefinition = {
  id: ProviderId;
  name: string;
  ar: string;
  en: string;
  defaultBaseUrl?: string;
  fields: FieldDefinition[];
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "WHATSAPP",
    name: "WhatsApp Business API",
    ar: "واتساب للأعمال",
    en: "WhatsApp Business API",
    fields: [],
  },
  {
    id: "PAYLINK",
    name: "Paylink",
    ar: "روابط الدفع والتحصيل",
    en: "Payment links and collection",
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
    fields: [
      { key: "apiKey", ar: "مفتاح API", en: "API key", secret: true, required: true },
      { key: "webhookSecret", ar: "سر Webhook", en: "Webhook secret", secret: true },
    ],
  },
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

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr]">
      <SmartCard className="h-fit p-3">
        <h2 className="px-2 pb-3 text-xs font-black text-[var(--nc-foreground-muted)]">
          {L("مزودو التكامل المعتمدون", "Approved integration providers")}
        </h2>
        <div className="space-y-1">
          {PROVIDERS.map((provider) => {
            const state = providers.find((item) => item.provider === provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setActiveProvider(provider.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-start transition ${
                  activeProvider === provider.id
                    ? "bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]"
                    : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]"
                }`}
              >
                <span>
                  <strong className="block text-sm">{provider.name}</strong>
                  <small className="mt-1 block text-[10px]">{isArabic ? provider.ar : provider.en}</small>
                </span>
                {provider.id !== "WHATSAPP" && (
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badgeClass(state?.status || "NOT_CONFIGURED")}`}>
                    {L(displayUiAlias("integrationStatus", state?.status || "NOT_CONFIGURED", "ar"), displayUiAlias("integrationStatus", state?.status || "NOT_CONFIGURED", "en"))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SmartCard>

      <div className="min-w-0 space-y-5">
        {activeProvider === "WHATSAPP" ? (
          <WhatsAppIntegrationSettings lang={lang} />
        ) : (
          <>
        <SmartCard className="p-5 md:p-7">
          <div className="flex flex-col gap-4 border-b border-[var(--nc-border)] pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-black text-[var(--nc-foreground)]">{definition.name}</h2>
              <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
                {isArabic ? definition.ar : definition.en}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${badgeClass(connection?.status || "NOT_CONFIGURED")}`}>
                {L(displayUiAlias("integrationStatus", connection?.status || "NOT_CONFIGURED", "ar"), displayUiAlias("integrationStatus", connection?.status || "NOT_CONFIGURED", "en"))}
              </span>
              {connection?.credentialsVersion ? (
                <span className="text-[10px] text-[var(--nc-foreground-muted)]">
                  v{connection.credentialsVersion}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 inline-flex rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-1">
            <button
              type="button"
              onClick={() => setMode("CONNECT")}
              className={`rounded-lg px-4 py-2 text-xs font-black ${mode === "CONNECT" ? "bg-[var(--nc-accent)] text-slate-950" : "text-[var(--nc-foreground-muted)]"}`}
            >
              {L("لدي حساب", "I have an account")}
            </button>
            <button
              type="button"
              onClick={() => setMode("REQUEST")}
              className={`rounded-lg px-4 py-2 text-xs font-black ${mode === "REQUEST" ? "bg-[var(--nc-accent)] text-slate-950" : "text-[var(--nc-foreground-muted)]"}`}
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

          {mode === "CONNECT" ? (
            <form onSubmit={submitConnection} className="mt-6 max-w-3xl space-y-4">
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                {L("عنوان بيئة المزود", "Provider base URL")}
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
                  placeholder={definition.defaultBaseUrl || "https://"}
                  dir="ltr"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
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
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
                      dir="ltr"
                    />
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

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pending || missingRequired}
                  className="h-11 rounded-xl bg-[var(--nc-accent)] px-5 text-sm font-black text-slate-950 disabled:opacity-40"
                >
                  {connection?.id ? L("تدوير بيانات الاعتماد", "Rotate credentials") : L("حفظ مشفر", "Save encrypted")}
                </button>
                <button
                  type="button"
                  disabled={pending || !connection?.id || connection.status === "DISCONNECTED"}
                  onClick={() =>
                    run(
                      () => testRevenueProviderAction(activeProvider),
                      L("نجح اختبار الاتصال وتم اعتماد الحالة متصل.", "Connection test passed and status is now connected."),
                    )
                  }
                  className="h-11 rounded-xl border border-emerald-500/30 px-5 text-sm font-black text-emerald-700 disabled:opacity-40 dark:text-emerald-300"
                >
                  {L("اختبار الاتصال", "Test connection")}
                </button>
                <button
                  type="button"
                  disabled={pending || !connection?.id}
                  onClick={() =>
                    run(
                      () => disconnectRevenueProviderAction(activeProvider),
                      L("تم فصل المزود.", "Provider disconnected."),
                    )
                  }
                  className="h-11 rounded-xl border border-rose-500/30 px-5 text-sm font-black text-rose-700 disabled:opacity-40 dark:text-rose-300"
                >
                  {L("فصل", "Disconnect")}
                </button>
              </div>

              {connection?.lastError ? (
                <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {connection.lastError}
                </div>
              ) : null}
            </form>
          ) : (
            <form onSubmit={submitApplication} className="mt-6 max-w-3xl space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
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
              <button
                type="submit"
                disabled={pending || Object.values(company).some((value) => !String(value).trim())}
                className="h-11 rounded-xl bg-[var(--nc-accent)] px-5 text-sm font-black text-slate-950 disabled:opacity-40"
              >
                {L("إرسال الطلب", "Submit application")}
              </button>
            </form>
          )}
        </SmartCard>

        {providerApplications.length > 0 ? (
          <SmartCard className="p-5">
            <h3 className="text-sm font-black text-[var(--nc-foreground)]">
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
                    <div className="mt-1 text-[10px] text-[var(--nc-foreground-muted)]">
                      {application.submittedAt || "—"}
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${badgeClass(application.status)}`}>
                    {application.status}
                  </span>
                </div>
              ))}
            </div>
          </SmartCard>
        ) : null}
        </>
        )}
      </div>
    </div>
  );
}
