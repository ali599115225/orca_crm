"use client";

import SettingsSelect from "@/components/settings/SettingsSelect";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { OperationsDialog } from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from "@/app/context/AppContext";
import {
  createMarketingCampaignAction,
  executeMarketingCampaignCommandAction,
  listMarketingCampaignsAction,
  type MarketingCampaignRow,
} from "@/app/actions/marketing-campaigns";
import type {
  CampaignObjective,
  MarketingProvider,
} from "@/lib/marketing/campaign-contract";

const PROVIDERS: Array<{
  id: MarketingProvider;
  ar: string;
  en: string;
}> = [
  { id: "META", ar: "Meta", en: "Meta" },
  { id: "GOOGLE", ar: "Google Ads", en: "Google Ads" },
  { id: "TIKTOK", ar: "TikTok", en: "TikTok" },
  { id: "SNAPCHAT", ar: "Snapchat", en: "Snapchat" },
  { id: "TWITTER", ar: "منصة X", en: "X Ads" },
  { id: "LINKEDIN", ar: "LinkedIn", en: "LinkedIn" },
];

type CommandType = "PUBLISH" | "PAUSE" | "RESUME" | "SYNC";

const EMPTY_FORM = {
  name: "",
  objective: "LEAD_GENERATION" as CampaignObjective,
  budgetKind: "DAILY" as "DAILY" | "LIFETIME",
  budgetAmount: "",
  currency: "SAR",
  locations: "",
  headline: "",
  primaryText: "",
  destinationUrl: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
};

type FormState = typeof EMPTY_FORM;
type FormField =
  | keyof FormState
  | "providers"
  | "schedule";

type FormErrors = Partial<Record<FormField, string>>;

function normalizeDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseLocalDateTime(
  dateValue: string,
  timeValue: string,
): { iso?: string; valid: boolean } {
  if (!dateValue.trim() && !timeValue.trim()) {
    return { valid: true };
  }

  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return { valid: false };
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { valid: false };
  }

  const local = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    iso: local.toISOString(),
  };
}

export default function CampaignManagementWorkspace() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const L = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [campaigns, setCampaigns] = useState<MarketingCampaignRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [providers, setProviders] = useState<MarketingProvider[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [commandPending, setCommandPending] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await listMarketingCampaignsAction();

      if (!result.success || !result.data) {
        throw new Error(result.error || "CAMPAIGNS_LOAD_FAILED");
      }

      setCampaigns(result.data);
    } catch {
      setCampaigns([]);
      setLoadError(
        L(
          "تعذر تحميل الحملات المسجلة. حاول مرة أخرى.",
          "Unable to load saved campaigns. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => {
      if (!current[field] && !current.schedule) return current;

      const next = { ...current };
      delete next[field];

      if (
        field === "startDate" ||
        field === "startTime" ||
        field === "endDate" ||
        field === "endTime"
      ) {
        delete next.schedule;
      }

      return next;
    });
  }

  function openCreateDialog() {
    setFormErrors({});
    setNotice(null);
    setFormOpen(true);
  }

  function closeCreateDialog() {
    if (creating) return;
    setFormErrors({});
    setFormOpen(false);
  }

  function toggleProvider(provider: MarketingProvider) {
    setProviders((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider],
    );

    setFormErrors((current) => {
      if (!current.providers) return current;
      const next = { ...current };
      delete next.providers;
      return next;
    });
  }

  function validateForm(): {
    errors: FormErrors;
    startAt?: string;
    endAt?: string;
  } {
    const errors: FormErrors = {};

    if (form.name.trim().length < 3) {
      errors.name = L(
        "اكتب اسمًا واضحًا للحملة من 3 أحرف على الأقل.",
        "Enter a campaign name with at least 3 characters.",
      );
    }

    const budget = Number(form.budgetAmount);
    if (!Number.isFinite(budget) || budget <= 0) {
      errors.budgetAmount = L(
        "أدخل قيمة ميزانية أكبر من صفر.",
        "Enter a budget amount greater than zero.",
      );
    }

    if (!form.locations.trim()) {
      errors.locations = L(
        "أدخل موقعًا مستهدفًا واحدًا على الأقل.",
        "Enter at least one target location.",
      );
    }

    if (!form.headline.trim()) {
      errors.headline = L(
        "أدخل عنوان الإعلان.",
        "Enter the ad headline.",
      );
    }

    if (!form.primaryText.trim()) {
      errors.primaryText = L(
        "أدخل النص الإعلاني.",
        "Enter the primary ad text.",
      );
    }

    let destinationUrlValid = false;
    try {
      const url = new URL(form.destinationUrl.trim());
      destinationUrlValid = url.protocol === "https:";
    } catch {
      destinationUrlValid = false;
    }

    if (!destinationUrlValid) {
      errors.destinationUrl = L(
        "أدخل رابطًا صحيحًا يبدأ بـ https://",
        "Enter a valid URL starting with https://",
      );
    }

    if (providers.length === 0) {
      errors.providers = L(
        "اختر قناة نشر واحدة على الأقل.",
        "Select at least one publishing channel.",
      );
    }

    const start = parseLocalDateTime(form.startDate, form.startTime);
    const end = parseLocalDateTime(form.endDate, form.endTime);

    if (!start.valid) {
      errors.startDate = L(
        "استخدم الصيغة DD/MM/YYYY والوقت HH:MM.",
        "Use DD/MM/YYYY and HH:MM.",
      );
    }

    if (!end.valid) {
      errors.endDate = L(
        "استخدم الصيغة DD/MM/YYYY والوقت HH:MM.",
        "Use DD/MM/YYYY and HH:MM.",
      );
    }

    if (
      start.valid &&
      end.valid &&
      start.iso &&
      end.iso &&
      new Date(end.iso).getTime() <= new Date(start.iso).getTime()
    ) {
      errors.schedule = L(
        "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء.",
        "End date must be after start date.",
      );
    }

    return {
      errors,
      startAt: start.iso,
      endAt: end.iso,
    };
  }

  function errorMessage(code?: string) {
    switch (code) {
      case "MARKETING_CONNECTION_REQUIRED":
        return L(
          "يجب تهيئة حساب المنصة من الإعدادات ← التكاملات أولًا.",
          "Configure the platform account under Settings → Integrations first.",
        );
      case "MARKETING_PROVIDER_NOT_REGISTERED":
        return L(
          "مسار المزود جاهز، لكن موصل API الخاص به لم يُفعّل بعد.",
          "The provider path is ready, but its API connector is not activated yet.",
        );
      case "CAMPAIGN_PROVIDER_REQUIRED":
        return L(
          "اختر منصة واحدة على الأقل.",
          "Select at least one platform.",
        );
      case "CAMPAIGN_DESTINATION_URL_INVALID":
        return L(
          "رابط الوجهة يجب أن يبدأ بـ https://",
          "The destination URL must use https://",
        );
      case "CAMPAIGN_DATE_RANGE_INVALID":
        return L(
          "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء.",
          "End date must be after start date.",
        );
      case "CAMPAIGN_BUDGET_INVALID":
        return L(
          "تحقق من قيمة الميزانية.",
          "Check the budget amount.",
        );
      default:
        return L(
          "تعذر تنفيذ العملية. تحقق من البيانات وحالة التكامل.",
          "The operation could not be completed. Check the data and integration status.",
        );
    }
  }

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);

    const validation = validateForm();
    setFormErrors(validation.errors);

    if (Object.keys(validation.errors).length > 0) {
      return;
    }

    setCreating(true);

    try {
      const amount = Number(form.budgetAmount);

      const result = await createMarketingCampaignAction({
        providers,
        draft: {
          name: form.name.trim(),
          objective: form.objective,
          budget: {
            kind: form.budgetKind,
            amount,
            currency: form.currency,
          },
          audience: {
            locations: form.locations
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          },
          creative: {
            headline: form.headline.trim(),
            primaryText: form.primaryText.trim(),
            destinationUrl: form.destinationUrl.trim(),
          },
          startAt: validation.startAt,
          endAt: validation.endAt,
          tracking: {
            utmSource:
              providers.length === 1
                ? providers[0].toLowerCase()
                : "multi-channel",
            utmMedium: "paid",
            utmCampaign: form.name.trim(),
          },
        },
      });

      if (!result.success) {
        throw new Error(result.error || "CAMPAIGN_CREATE_FAILED");
      }

      setForm(EMPTY_FORM);
      setProviders([]);
      setFormErrors({});
      setFormOpen(false);
      setNotice({
        type: "success",
        text: L(
          "تم إنشاء مسودة الحملة وقنواتها بنجاح.",
          "The campaign draft and its channels were created successfully.",
        ),
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text: errorMessage(
          error instanceof Error ? error.message : undefined,
        ),
      });
    } finally {
      setCreating(false);
    }
  }

  async function executeCommand(
    campaignId: string,
    provider: MarketingProvider,
    type: CommandType,
  ) {
    const pendingKey = `${campaignId}:${provider}:${type}`;
    setCommandPending(pendingKey);
    setNotice(null);

    try {
      const result = await executeMarketingCampaignCommandAction({
        campaignId,
        provider,
        type,
      });

      if (!result.success) {
        throw new Error(result.error || "CAMPAIGN_COMMAND_FAILED");
      }

      setNotice({
        type: "success",
        text: L(
          "تم تنفيذ أمر الحملة وتحديث حالتها.",
          "The campaign command was executed and its status updated.",
        ),
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: errorMessage(
          error instanceof Error ? error.message : undefined,
        ),
      });
    } finally {
      await load();
      setCommandPending("");
    }
  }

  function statusLabel(status: string) {
    const labels: Record<string, [string, string]> = {
      DRAFT: ["مسودة", "Draft"],
      ACTIVE: ["نشطة", "Active"],
      PAUSED: ["متوقفة", "Paused"],
      PENDING_REVIEW: ["قيد المراجعة", "Pending review"],
      COMPLETED: ["مكتملة", "Completed"],
      CONNECTION_REQUIRED: ["تحتاج ربطًا", "Connection required"],
      CONNECTOR_NOT_READY: ["الموصل غير مفعّل", "Connector not active"],
      PARTIAL_FAILURE: ["تعثر جزئي", "Partial failure"],
      FAILED: ["فشلت", "Failed"],
      UNKNOWN: ["غير معروفة", "Unknown"],
    };

    const value = labels[status] || [status, status];
    return L(value[0], value[1]);
  }

  function objectiveLabel(objective: string) {
    const labels: Record<string, [string, string]> = {
      LEAD_GENERATION: ["توليد عملاء", "Lead generation"],
      TRAFFIC: ["زيارات", "Traffic"],
      CONVERSIONS: ["تحويلات", "Conversions"],
      AWARENESS: ["وعي بالعلامة", "Awareness"],
    };

    const value = labels[objective] || [objective, objective];
    return L(value[0], value[1]);
  }

  function budgetKindLabel(kind: string) {
    return kind === "DAILY"
      ? L("يومية", "Daily")
      : kind === "LIFETIME"
        ? L("إجمالية", "Lifetime")
        : kind;
  }

  function statusClass(status: string) {
    if (status === "ACTIVE") {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    if (status === "PAUSED" || status === "PENDING_REVIEW") {
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }

    if (
      status === "FAILED" ||
      status === "PARTIAL_FAILURE" ||
      status === "CONNECTION_REQUIRED" ||
      status === "CONNECTOR_NOT_READY"
    ) {
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }

    return "border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)]";
  }

  function providerLabel(provider: string) {
    const definition = PROVIDERS.find((item) => item.id === provider);
    return definition ? L(definition.ar, definition.en) : provider;
  }

  const metrics = useMemo(() => {
    if (loading || loadError) {
      return {
        campaigns: "—",
        activeChannels: "—",
        drafts: "—",
        totalChannels: "—",
      };
    }

    const totalChannels = campaigns.reduce(
      (sum, campaign) => sum + campaign.channels.length,
      0,
    );
    const activeChannels = campaigns.reduce(
      (sum, campaign) =>
        sum +
        campaign.channels.filter((channel) => channel.status === "ACTIVE")
          .length,
      0,
    );
    const drafts = campaigns.filter(
      (campaign) => campaign.status === "DRAFT",
    ).length;

    return {
      campaigns: String(campaigns.length),
      activeChannels: String(activeChannels),
      drafts: String(drafts),
      totalChannels: String(totalChannels),
    };
  }, [campaigns, loadError, loading]);

  const fieldClass = (hasError?: boolean) =>
    [
      "h-11 w-full rounded-xl border bg-[var(--nc-surface)] px-3 text-sm",
      "text-[var(--nc-foreground)] outline-none transition-colors",
      "placeholder:text-[var(--nc-text-dim)]",
      hasError
        ? "border-rose-500/60 focus:border-rose-500"
        : "border-[var(--nc-border)] focus:border-[var(--nc-accent-border)]",
    ].join(" ");

  const textareaClass = (hasError?: boolean) =>
    [
      "w-full resize-none rounded-xl border bg-[var(--nc-surface)] px-3 py-3 text-sm",
      "text-[var(--nc-foreground)] outline-none transition-colors",
      "placeholder:text-[var(--nc-text-dim)]",
      hasError
        ? "border-rose-500/60 focus:border-rose-500"
        : "border-[var(--nc-border)] focus:border-[var(--nc-accent-border)]",
    ].join(" ");

  const errorText = (field: FormField) =>
    formErrors[field] ? (
      <p className="mt-1 text-[10px] font-bold text-rose-500">
        {formErrors[field]}
      </p>
    ) : null;

  return (
    <div
      className="nc-page nc-stack orca-container orca-campaigns-final pb-10"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <PageHeader
        title={L("إدارة الحملات الإعلانية", "Advertising Campaign Management")}
        description={L(
          "أنشئ الحملات متعددة القنوات وأدر نشرها ومزامنتها من مساحة تشغيل واحدة.",
          "Create multi-channel campaigns and manage publishing and synchronization from one workspace.",
        )}
        eyebrow={L(
          "المسودة → القناة → النشر → المزامنة",
          "Draft → channel → publish → sync",
        )}
        workspace
      >
        <button
          type="button"
          onClick={openCreateDialog}
          className={operationsVisual.primaryButton}
        >
          <i className="ph-bold ph-plus" aria-hidden="true" />
          {L("حملة جديدة", "New campaign")}
        </button>
      </PageHeader>

      <div className="orca-workspace-metrics orca-workspace-metrics-3">
        {[
          [L("إجمالي الحملات", "Total campaigns"), metrics.campaigns, "ph-megaphone"],
          [L("القنوات النشطة", "Active channels"), metrics.activeChannels, "ph-broadcast"],
          [L("المسودات", "Drafts"), metrics.drafts, "ph-note-pencil"],
        ].map(([label, value, icon]) => (
          <SmartCard key={String(label)} className="orca-workspace-metric p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-[var(--nc-foreground)]">
                  {value}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
                <i className={`ph-bold ${icon}`} aria-hidden="true" />
              </span>
            </div>
          </SmartCard>
        ))}
      </div>

      <p className="text-xs text-[var(--nc-foreground-muted)]">
        {L("إجمالي قنوات النشر: ", "Total publishing channels: ")}
        <strong className="text-[var(--nc-foreground)]">
          {metrics.totalChannels}
        </strong>
      </p>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
        >
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className={operationsVisual.secondaryButton}
          >
            {L("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <OperationsDialog
        open={formOpen}
        onClose={closeCreateDialog}
        title={L("إنشاء حملة جديدة", "Create new campaign")}
        description={L(
          "أنشئ المسودة أولًا، ثم فعّل قنوات النشر بعد مراجعة بيانات الحملة.",
          "Create the draft first, then activate publishing channels after reviewing the campaign.",
        )}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={creating}
        className="max-w-3xl"
        dir={isArabic ? "rtl" : "ltr"}
        footer={
          <>
            <button
              type="button"
              onClick={closeCreateDialog}
              disabled={creating}
              className={operationsVisual.ghostButton}
            >
              {L("إلغاء", "Cancel")}
            </button>
            <button
              type="submit"
              form="campaign-create-form"
              disabled={creating}
              className={operationsVisual.primaryButton}
            >
              <i className="ph-bold ph-floppy-disk" aria-hidden="true" />
              {creating
                ? L("جاري إنشاء المسودة...", "Creating draft...")
                : L("إنشاء المسودة", "Create draft")}
            </button>
          </>
        }
      >
        <form
          id="campaign-create-form"
          onSubmit={createCampaign}
          noValidate
          className="grid gap-4"
        >
          <section className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
                <i className="ph-bold ph-megaphone" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                  {L("الأساسيات والميزانية", "Basics and budget")}
                </h3>
                <p className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">
                  {L(
                    "عرّف الحملة وحدد هدفها وميزانيتها.",
                    "Define the campaign, objective, and budget.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("اسم الحملة", "Campaign name")}
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={L("مثال: حملة الرياض - سبتمبر", "Example: Riyadh - September")}
                  className={fieldClass(Boolean(formErrors.name))}
                />
                {errorText("name")}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("الهدف", "Objective")}
                </span>
                <SettingsSelect value={form.objective}
                  onChange={(value) =>
                    updateField(
                      "objective",
                      value as CampaignObjective,
                    )
                  }
                  className={fieldClass(Boolean(formErrors.objective))}
                  options={[{ value: "LEAD_GENERATION", label: L("توليد عملاء", "Lead generation") },
                    { value: "TRAFFIC", label: L("زيارات", "Traffic") },
                    { value: "CONVERSIONS", label: L("تحويلات", "Conversions") },
                    { value: "AWARENESS", label: L("وعي بالعلامة", "Awareness") }]}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("نوع الميزانية", "Budget type")}
                </span>
                <SettingsSelect value={form.budgetKind}
                  onChange={(value) =>
                    updateField(
                      "budgetKind",
                      value as "DAILY" | "LIFETIME",
                    )
                  }
                  className={fieldClass(Boolean(formErrors.budgetKind))}
                  options={[{ value: "DAILY", label: L("يومية", "Daily") },
                    { value: "LIFETIME", label: L("إجمالية", "Lifetime") }]}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("قيمة الميزانية", "Budget amount")}
                </span>
                <div className="relative">
                  <input
                    inputMode="decimal"
                    value={form.budgetAmount}
                    onChange={(event) => {
                      const next = event.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1");
                      updateField("budgetAmount", next);
                    }}
                    placeholder="0.00"
                    className={`${fieldClass(Boolean(formErrors.budgetAmount))} pe-14`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[10px] font-black text-[var(--nc-text-dim)]">
                    SAR
                  </span>
                </div>
                {errorText("budgetAmount")}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
                <i className="ph-bold ph-target" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                  {L("الاستهداف والجدولة", "Targeting and schedule")}
                </h3>
                <p className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">
                  {L(
                    "حدد المدن وفترة تشغيل الحملة بصيغة موحدة.",
                    "Set target locations and campaign schedule in a consistent format.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("المواقع المستهدفة", "Target locations")}
                </span>
                <input
                  value={form.locations}
                  onChange={(event) =>
                    updateField("locations", event.target.value)
                  }
                  placeholder={L(
                    "الرياض، جدة — افصل بين المواقع بفاصلة",
                    "Riyadh, Jeddah — separate locations with commas",
                  )}
                  className={fieldClass(Boolean(formErrors.locations))}
                />
                {errorText("locations")}
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-3">
                  <p className="mb-2 text-xs font-black text-[var(--nc-foreground)]">
                    {L("بداية الحملة", "Campaign start")}
                  </p>
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">
                        {L("التاريخ", "Date")}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        value={form.startDate}
                        onChange={(event) =>
                          updateField(
                            "startDate",
                            normalizeDateInput(event.target.value),
                          )
                        }
                        placeholder="DD/MM/YYYY"
                        dir="ltr"
                        className={fieldClass(Boolean(formErrors.startDate))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">
                        {L("الوقت", "Time")}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        value={form.startTime}
                        onChange={(event) =>
                          updateField(
                            "startTime",
                            normalizeTimeInput(event.target.value),
                          )
                        }
                        placeholder="HH:MM"
                        dir="ltr"
                        className={fieldClass(Boolean(formErrors.startDate))}
                      />
                    </label>
                  </div>
                  {errorText("startDate")}
                </div>

                <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-3">
                  <p className="mb-2 text-xs font-black text-[var(--nc-foreground)]">
                    {L("نهاية الحملة", "Campaign end")}
                  </p>
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">
                        {L("التاريخ", "Date")}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        value={form.endDate}
                        onChange={(event) =>
                          updateField(
                            "endDate",
                            normalizeDateInput(event.target.value),
                          )
                        }
                        placeholder="DD/MM/YYYY"
                        dir="ltr"
                        className={fieldClass(Boolean(formErrors.endDate))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">
                        {L("الوقت", "Time")}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        value={form.endTime}
                        onChange={(event) =>
                          updateField(
                            "endTime",
                            normalizeTimeInput(event.target.value),
                          )
                        }
                        placeholder="HH:MM"
                        dir="ltr"
                        className={fieldClass(Boolean(formErrors.endDate))}
                      />
                    </label>
                  </div>
                  {errorText("endDate")}
                </div>
              </div>

              {errorText("schedule")}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
                <i className="ph-bold ph-pencil-line" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                  {L("المحتوى الإعلاني", "Ad content")}
                </h3>
                <p className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">
                  {L(
                    "أدخل النص الذي سيستخدم في قنوات النشر.",
                    "Enter the content that will be used across publishing channels.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("عنوان الإعلان", "Ad headline")}
                </span>
                <input
                  value={form.headline}
                  onChange={(event) =>
                    updateField("headline", event.target.value)
                  }
                  className={fieldClass(Boolean(formErrors.headline))}
                />
                {errorText("headline")}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("النص الإعلاني", "Primary ad text")}
                </span>
                <textarea
                  rows={4}
                  value={form.primaryText}
                  onChange={(event) =>
                    updateField("primaryText", event.target.value)
                  }
                  className={textareaClass(Boolean(formErrors.primaryText))}
                />
                {errorText("primaryText")}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("رابط الوجهة", "Destination URL")}
                </span>
                <input
                  inputMode="url"
                  value={form.destinationUrl}
                  onChange={(event) =>
                    updateField("destinationUrl", event.target.value)
                  }
                  placeholder="https://"
                  dir="ltr"
                  className={fieldClass(Boolean(formErrors.destinationUrl))}
                />
                {errorText("destinationUrl")}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
                <i className="ph-bold ph-broadcast" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                  {L("قنوات النشر", "Publishing channels")}
                </h3>
                <p className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">
                  {L(
                    "اختر القنوات التي تريد تجهيز المسودة لها.",
                    "Choose the channels for which this draft should be prepared.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROVIDERS.map((provider) => {
                const selected = providers.includes(provider.id);

                return (
                  <button
                    key={provider.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleProvider(provider.id)}
                    className={[
                      "flex min-h-11 items-center justify-between rounded-xl border px-3 text-xs font-black transition-colors",
                      selected
                        ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]"
                        : "border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]",
                    ].join(" ")}
                  >
                    <span>{L(provider.ar, provider.en)}</span>
                    <i
                      className={
                        selected
                          ? "ph-bold ph-check-circle"
                          : "ph-bold ph-circle"
                      }
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            {errorText("providers")}
          </section>
        </form>
      </OperationsDialog>

      {loading ? (
        <SmartCard className="p-8 text-center text-sm text-[var(--nc-foreground-muted)]">
          {L("جاري تحميل الحملات...", "Loading campaigns...")}
        </SmartCard>
      ) : loadError ? null : campaigns.length === 0 ? (
        <SmartCard className="p-10 text-center">
          <i className="ph-bold ph-megaphone text-3xl text-[var(--nc-accent)]" />
          <p className="mt-3 text-sm font-bold text-[var(--nc-foreground)]">
            {L(
              "لا توجد حملات. أنشئ أول مسودة للبدء.",
              "No campaigns yet. Create the first draft to begin.",
            )}
          </p>
        </SmartCard>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <SmartCard
              key={campaign.id}
              className="orca-workspace-panel overflow-hidden"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--nc-border)] p-5">
                <div>
                  <h2 className="text-base font-black text-[var(--nc-foreground)]">
                    {campaign.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                    {objectiveLabel(campaign.objective)} ·{" "}
                    {campaign.budgetAmount.toLocaleString(
                      isArabic ? "ar-SA" : "en-US",
                    )}{" "}
                    {campaign.currency} · {budgetKindLabel(campaign.budgetKind)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(campaign.status)}`}
                >
                  {statusLabel(campaign.status)}
                </span>
              </div>

              <div className="divide-y divide-[var(--nc-border)]">
                {campaign.channels.map((channel) => {
                  const provider = channel.provider as MarketingProvider;

                  return (
                    <div
                      key={channel.id}
                      className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <strong className="text-sm text-[var(--nc-foreground)]">
                          {providerLabel(channel.provider)}
                        </strong>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(channel.status)}`}
                        >
                          {statusLabel(channel.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {channel.status !== "ACTIVE" &&
                          channel.status !== "PAUSED" && (
                            <button
                              type="button"
                              disabled={Boolean(commandPending)}
                              onClick={() =>
                                void executeCommand(
                                  campaign.id,
                                  provider,
                                  "PUBLISH",
                                )
                              }
                              className={operationsVisual.primaryButton}
                            >
                              {commandPending ===
                              `${campaign.id}:${provider}:PUBLISH`
                                ? L("جاري النشر...", "Publishing...")
                                : L("نشر", "Publish")}
                            </button>
                          )}

                        {channel.status === "ACTIVE" && (
                          <button
                            type="button"
                            disabled={Boolean(commandPending)}
                            onClick={() =>
                              void executeCommand(
                                campaign.id,
                                provider,
                                "PAUSE",
                              )
                            }
                            className={operationsVisual.secondaryButton}
                          >
                            {L("إيقاف", "Pause")}
                          </button>
                        )}

                        {channel.status === "PAUSED" && (
                          <button
                            type="button"
                            disabled={Boolean(commandPending)}
                            onClick={() =>
                              void executeCommand(
                                campaign.id,
                                provider,
                                "RESUME",
                              )
                            }
                            className={operationsVisual.secondaryButton}
                          >
                            {L("استئناف", "Resume")}
                          </button>
                        )}

                        {channel.providerCampaignId ? (
                          <button
                            type="button"
                            disabled={Boolean(commandPending)}
                            onClick={() =>
                              void executeCommand(
                                campaign.id,
                                provider,
                                "SYNC",
                              )
                            }
                            className={operationsVisual.ghostButton}
                          >
                            {L("مزامنة", "Sync")}
                          </button>
                        ) : null}

                        {channel.status === "CONNECTION_REQUIRED" ? (
                          <button
                            type="button"
                            onClick={() =>
                              window.location.assign(
                                "/operations/settings?tab=advertising",
                              )
                            }
                            className={operationsVisual.secondaryButton}
                          >
                            {L("تهيئة الربط", "Configure connection")}
                          </button>
                        ) : null}
                      </div>

                      {channel.lastErrorCode ? (
                        <p className="text-[10px] text-rose-600">
                          {channel.lastErrorCode}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </SmartCard>
          ))}
        </div>
      )}
    </div>
  );
}
