"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
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
  startAt: "",
  endAt: "",
};

export default function CampaignManagementWorkspace() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const L = (ar: string, en: string) => (isArabic ? ar : en);

  const [campaigns, setCampaigns] = useState<MarketingCampaignRow[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [providers, setProviders] = useState<MarketingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [commandPending, setCommandPending] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await listMarketingCampaignsAction();

      if (!result.success || !result.data) {
        throw new Error(result.error || "CAMPAIGNS_LOAD_FAILED");
      }

      setCampaigns(result.data);
    } catch {
      setNotice({
        type: "error",
        text: L(
          "تعذر تحميل الحملات المسجلة.",
          "Unable to load saved campaigns.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleProvider(provider: MarketingProvider) {
    setProviders((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider],
    );
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
          "رابط الوجهة يجب أن يبدأ بـ https.",
          "The destination URL must use https.",
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
    setCreating(true);
    setNotice(null);

    try {
      const amount = Number(form.budgetAmount);

      const result = await createMarketingCampaignAction({
        providers,
        draft: {
          name: form.name,
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
            headline: form.headline,
            primaryText: form.primaryText,
            destinationUrl: form.destinationUrl,
          },
          startAt: form.startAt
            ? new Date(form.startAt).toISOString()
            : undefined,
          endAt: form.endAt
            ? new Date(form.endAt).toISOString()
            : undefined,
          tracking: {
            utmSource: providers.length === 1
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
    return definition
      ? L(definition.ar, definition.en)
      : provider;
  }

  const totalChannels = campaigns.reduce(
    (sum, campaign) => sum + campaign.channels.length,
    0,
  );
  const activeChannels = campaigns.reduce(
    (sum, campaign) =>
      sum +
      campaign.channels.filter((channel) => channel.status === "ACTIVE").length,
    0,
  );
  const draftCampaigns = campaigns.filter(
    (campaign) => campaign.status === "DRAFT",
  ).length;

  return (
    <div className="nc-page nc-stack orca-container orca-campaigns-final pb-10" dir={isArabic ? "rtl" : "ltr"}>
      <PageHeader
        title={L("إدارة الحملات الإعلانية", "Advertising Campaign Management")}
        description={L(
          "إنشاء الحملات متعددة القنوات ونشرها وإيقافها واستئنافها ومزامنتها عبر حسابات العميل المرتبطة.",
          "Create multi-channel campaigns and publish, pause, resume, and synchronize them through connected client accounts.",
        )}
        eyebrow={L(
          "المسودة → القناة → النشر → المزامنة",
          "Draft → channel → publish → sync",
        )}
        workspace
      >
        <button
          type="button"
          onClick={() => setFormOpen((current) => !current)}
          className="nc-btn-primary inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-black text-white"
        >
          <i className="ph-bold ph-plus" aria-hidden="true" />
          {L("حملة جديدة", "New campaign")}
        </button>
      </PageHeader>

      <div className="orca-workspace-metrics">
        {[
          [L("إجمالي الحملات", "Total campaigns"), campaigns.length, "ph-megaphone"],
          [L("القنوات النشطة", "Active channels"), activeChannels, "ph-broadcast"],
          [L("المسودات", "Drafts"), draftCampaigns, "ph-note-pencil"],
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
        <strong className="text-[var(--nc-foreground)]">{totalChannels}</strong>
      </p>

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

      {formOpen ? (
        <SmartCard className="orca-workspace-panel p-5">
          <form onSubmit={createCampaign} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[var(--nc-foreground)]">
                {L("بيانات الحملة", "Campaign details")}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-xs font-bold text-[var(--nc-foreground-muted)]"
              >
                {L("إغلاق", "Close")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("اسم الحملة", "Campaign name")} *
                </span>
                <input
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("الهدف", "Objective")} *
                </span>
                <select
                  value={form.objective}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      objective: event.target.value as CampaignObjective,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                >
                  <option value="LEAD_GENERATION">
                    {L("توليد عملاء", "Lead generation")}
                  </option>
                  <option value="TRAFFIC">{L("زيارات", "Traffic")}</option>
                  <option value="CONVERSIONS">
                    {L("تحويلات", "Conversions")}
                  </option>
                  <option value="AWARENESS">
                    {L("وعي بالعلامة", "Awareness")}
                  </option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("نوع الميزانية", "Budget type")}
                </span>
                <select
                  value={form.budgetKind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      budgetKind: event.target.value as "DAILY" | "LIFETIME",
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                >
                  <option value="DAILY">{L("يومية", "Daily")}</option>
                  <option value="LIFETIME">{L("إجمالية", "Lifetime")}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("قيمة الميزانية", "Budget amount")} *
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.budgetAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      budgetAmount: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("المواقع المستهدفة — مفصولة بفواصل", "Target locations — comma separated")} *
                </span>
                <input
                  required
                  value={form.locations}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      locations: event.target.value,
                    }))
                  }
                  placeholder={L("الرياض، جدة", "Riyadh, Jeddah")}
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("رابط الوجهة الآمن", "Secure destination URL")} *
                </span>
                <input
                  required
                  type="url"
                  placeholder="https://"
                  value={form.destinationUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      destinationUrl: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("تاريخ البدء", "Start date")}
                </span>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("تاريخ الانتهاء", "End date")}
                </span>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endAt: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("عنوان الإعلان", "Ad headline")} *
                </span>
                <input
                  required
                  value={form.headline}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      headline: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("النص الإعلاني", "Primary ad text")} *
                </span>
                <textarea
                  required
                  rows={4}
                  value={form.primaryText}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      primaryText: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-3 text-sm text-[var(--nc-foreground)]"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold text-[var(--nc-foreground-muted)]">
                {L("قنوات النشر", "Publishing channels")} *
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((provider) => {
                  const selected = providers.includes(provider.id);

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => toggleProvider(provider.id)}
                      className={`h-9 rounded-full border px-4 text-xs font-black ${
                        selected
                          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]"
                          : "border-[var(--nc-border)] text-[var(--nc-foreground-muted)]"
                      }`}
                    >
                      {L(provider.ar, provider.en)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="h-11 rounded-xl bg-[var(--nc-accent)] px-6 text-sm font-black text-white disabled:opacity-50"
            >
              {creating
                ? L("جاري إنشاء المسودة...", "Creating draft...")
                : L("إنشاء مسودة الحملة", "Create campaign draft")}
            </button>
          </form>
        </SmartCard>
      ) : null}

      {loading ? (
        <SmartCard className="p-8 text-center text-sm text-[var(--nc-foreground-muted)]">
          {L("جاري تحميل الحملات...", "Loading campaigns...")}
        </SmartCard>
      ) : campaigns.length === 0 ? (
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
            <SmartCard key={campaign.id} className="orca-workspace-panel overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--nc-border)] p-5">
                <div>
                  <h2 className="text-base font-black text-[var(--nc-foreground)]">
                    {campaign.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                    {campaign.objective} ·{" "}
                    {campaign.budgetAmount.toLocaleString(
                      isArabic ? "ar-SA" : "en-US",
                    )}{" "}
                    {campaign.currency} · {campaign.budgetKind}
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
                              className="h-9 rounded-lg bg-[var(--nc-accent)] px-3 text-xs font-black text-white disabled:opacity-50"
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
                            className="h-9 rounded-lg border border-amber-500/40 px-3 text-xs font-black text-amber-600 disabled:opacity-50"
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
                            className="h-9 rounded-lg border border-emerald-500/40 px-3 text-xs font-black text-emerald-600 disabled:opacity-50"
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
                            className="h-9 rounded-lg border border-[var(--nc-border)] px-3 text-xs font-black text-[var(--nc-foreground)] disabled:opacity-50"
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
                            className="h-9 rounded-lg border border-[var(--nc-border)] px-3 text-xs font-black text-[var(--nc-foreground)]"
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
