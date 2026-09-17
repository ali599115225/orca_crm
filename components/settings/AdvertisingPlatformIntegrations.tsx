"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  getAdvertisingConnectionsAction,
  saveCustomAdvertisingProviderAction,
  saveStandardAdvertisingConnectionAction,
} from "@/app/actions/advertising-integrations";
import {
  OperationsDialog,
  OperationsFormField,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
  OperationsTextareaField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import SettingsSelect from "@/components/settings/SettingsSelect";

type StandardPlatform =
  | "GOOGLE"
  | "META"
  | "TIKTOK"
  | "SNAPCHAT"
  | "TWITTER"
  | "LINKEDIN";

type ConnectionMode = "API" | "OAUTH" | "EXTERNAL_LINK";

type ConnectionState = {
  id: string;
  platform: string;
  accountId: string;
  displayName: string | null;
  connectionMode: string;
  baseUrl: string | null;
  providerConfig: Record<string, unknown>;
  hasApiKey: boolean;
  hasCredentials: boolean;
  status: string;
  leadTone: string;
  autoWelcomeMsg: string;
  lastTestedAt: string | null;
  lastError: string | null;
};

const PLATFORMS: Array<{
  id: StandardPlatform;
  ar: string;
  en: string;
  icon: string;
}> = [
  {
    id: "GOOGLE",
    ar: "إعلانات Google",
    en: "Google Ads",
    icon: "ph-google-logo",
  },
  {
    id: "META",
    ar: "إعلانات Meta",
    en: "Meta Ads",
    icon: "ph-meta-logo",
  },
  {
    id: "TIKTOK",
    ar: "إعلانات TikTok",
    en: "TikTok Ads",
    icon: "ph-tiktok-logo",
  },
  {
    id: "SNAPCHAT",
    ar: "إعلانات Snapchat",
    en: "Snapchat Ads",
    icon: "ph-snapchat-logo",
  },
  {
    id: "TWITTER",
    ar: "منصة X",
    en: "X Ads",
    icon: "ph-x-logo",
  },
  {
    id: "LINKEDIN",
    ar: "إعلانات LinkedIn",
    en: "LinkedIn Ads",
    icon: "ph-linkedin-logo",
  },
];

const EMPTY_CUSTOM_FORM = {
  displayName: "",
  accountId: "",
  connectionMode: "API" as ConnectionMode,
  baseUrl: "",
  credential: "",
  authHeaderName: "Authorization",
  authScheme: "Bearer",
  createCampaignPath: "",
  pauseCampaignPath: "",
  resumeCampaignPath: "",
  syncCampaignPath: "",
};

function statusClasses(status: string) {
  if (status === "CONNECTED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "CONFIGURED" || status === "PENDING") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status === "ERROR" || status === "CONNECTION_ERROR") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)]";
}

export default function AdvertisingPlatformIntegrations({
  lang,
}: {
  lang: "AR" | "EN";
}) {
  const isArabic = lang === "AR";
  const L = (ar: string, en: string) => (isArabic ? ar : en);

  const [connections, setConnections] = useState<ConnectionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedPlatform, setSelectedPlatform] =
    useState<StandardPlatform | null>(null);
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [leadTone, setLeadTone] = useState("PROFESSIONAL");
  const [autoWelcomeMsg, setAutoWelcomeMsg] = useState("");

  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM_FORM);

  const [tiktokAdvertisers, setTikTokAdvertisers] = useState<
    Array<{ advertiserId: string; advertiserName: string }>
  >([]);
  const [tiktokAdvertiserId, setTikTokAdvertiserId] = useState("");
  const [tiktokCompleting, setTikTokCompleting] = useState(false);

  const loadConnections = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getAdvertisingConnectionsAction();

      if (!result.success || !result.data) {
        throw new Error(
          result.error || "ADVERTISING_CONNECTIONS_LOAD_FAILED",
        );
      }

      setConnections(result.data as ConnectionState[]);
    } catch {
      setNotice({
        type: "error",
        text: L(
          "تعذر تحميل إعدادات المنصات الإعلانية.",
          "Unable to load advertising platform settings.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokState = params.get("tiktok");

    if (tiktokState === "connected") {
      setNotice({
        type: "success",
        text: L(
          "تم ربط حساب TikTok الإعلاني بنجاح.",
          "TikTok advertiser account connected successfully.",
        ),
      });
      void loadConnections();
      return;
    }

    if (tiktokState === "error") {
      setNotice({
        type: "error",
        text: L(
          "تعذر إكمال تفويض TikTok. يبقى المسار جاهزًا حتى اعتماد التطبيق.",
          "TikTok authorization could not be completed. The route remains ready until app approval.",
        ),
      });
      return;
    }

    if (tiktokState !== "select") return;

    void fetch("/api/integrations/tiktok/oauth/pending", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.success || !Array.isArray(payload.data)) {
          throw new Error("TIKTOK_PENDING_LOAD_FAILED");
        }

        setTikTokAdvertisers(payload.data);

        if (payload.data.length > 0) {
          setTikTokAdvertiserId(payload.data[0].advertiserId);
        }
      })
      .catch(() => {
        setNotice({
          type: "error",
          text: L(
            "تعذر تحميل حسابات TikTok المصرح بها.",
            "Unable to load authorized TikTok advertiser accounts.",
          ),
        });
      });
  }, [isArabic, loadConnections]);

  const selectedConnection = useMemo(
    () =>
      connections.find(
        (connection) => connection.platform === selectedPlatform,
      ) ?? null,
    [connections, selectedPlatform],
  );

  const customConnection = useMemo(
    () =>
      connections.find(
        (connection) => connection.platform === "CUSTOM_ADVERTISING",
      ) ?? null,
    [connections],
  );

  function platformStatus(connection?: ConnectionState | null) {
    if (!connection) {
      return {
        value: "DISCONNECTED",
        label: L("غير مهيأة", "Not configured"),
      };
    }

    if (connection.status === "CONNECTED") {
      return {
        value: connection.status,
        label: L("متصل", "Connected"),
      };
    }

    if (connection.status === "CONFIGURED") {
      return {
        value: connection.status,
        label: L("مهيأة", "Configured"),
      };
    }

    if (
      connection.status === "ERROR" ||
      connection.status === "CONNECTION_ERROR"
    ) {
      return {
        value: connection.status,
        label: L("تحتاج معالجة", "Needs attention"),
      };
    }

    return {
      value: connection.status,
      label: L("بانتظار الربط", "Pending connection"),
    };
  }

  function openStandardPlatform(platform: StandardPlatform) {
    const connection =
      connections.find((item) => item.platform === platform) ?? null;

    setCustomOpen(false);
    setSelectedPlatform(platform);
    setAccountId(connection?.accountId ?? "");
    setApiKey("");
    setLeadTone(connection?.leadTone ?? "PROFESSIONAL");
    setAutoWelcomeMsg(connection?.autoWelcomeMsg ?? "");
    setNotice(null);
  }

  function openCustomProvider() {
    const config = customConnection?.providerConfig ?? {};

    setSelectedPlatform(null);
    setCustomOpen(true);
    setNotice(null);
    setCustomForm({
      displayName: customConnection?.displayName ?? "",
      accountId: customConnection?.accountId ?? "",
      connectionMode:
        (customConnection?.connectionMode as ConnectionMode) ?? "API",
      baseUrl: customConnection?.baseUrl ?? "",
      credential: "",
      authHeaderName: String(config.authHeaderName ?? "Authorization"),
      authScheme: String(config.authScheme ?? "Bearer"),
      createCampaignPath: String(config.createCampaignPath ?? ""),
      pauseCampaignPath: String(config.pauseCampaignPath ?? ""),
      resumeCampaignPath: String(config.resumeCampaignPath ?? ""),
      syncCampaignPath: String(config.syncCampaignPath ?? ""),
    });
  }

  async function submitStandard(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlatform) return;

    setPending(true);
    setNotice(null);

    try {
      const result = await saveStandardAdvertisingConnectionAction({
        platform: selectedPlatform,
        accountId: accountId.trim(),
        apiKey: apiKey.trim() || undefined,
        leadTone,
        autoWelcomeMsg: autoWelcomeMsg.trim(),
      });

      if (!result.success) {
        throw new Error(
          result.error || "ADVERTISING_CONNECTION_SAVE_FAILED",
        );
      }

      await loadConnections();
      setApiKey("");
      setNotice({
        type: "success",
        text: L(
          "تم حفظ إعدادات المنصة وبيانات الاعتماد المشفرة.",
          "Platform settings and encrypted credentials were saved.",
        ),
      });
    } catch {
      setNotice({
        type: "error",
        text: L(
          "تعذر حفظ إعدادات المنصة.",
          "Unable to save platform settings.",
        ),
      });
    } finally {
      setPending(false);
    }
  }

  async function submitCustom(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    try {
      const result = await saveCustomAdvertisingProviderAction({
        ...customForm,
        credential: customForm.credential.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(
          result.error || "CUSTOM_ADVERTISING_PROVIDER_SAVE_FAILED",
        );
      }

      await loadConnections();
      setCustomForm((current) => ({
        ...current,
        credential: "",
      }));
      setNotice({
        type: "success",
        text: L(
          "تم حفظ المزود الإعلاني وبيانات الاعتماد المشفرة.",
          "Custom advertising provider and encrypted credentials were saved.",
        ),
      });
    } catch {
      setNotice({
        type: "error",
        text: L(
          "تعذر حفظ المزود الإعلاني. تحقق من الرابط والمسارات المطلوبة.",
          "Unable to save the advertising provider. Check the URL and required paths.",
        ),
      });
    } finally {
      setPending(false);
    }
  }

  async function completeTikTokConnection() {
    if (!tiktokAdvertiserId) return;

    setTikTokCompleting(true);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/integrations/tiktok/oauth/pending",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            advertiserId: tiktokAdvertiserId,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error || "TIKTOK_CONNECTION_COMPLETE_FAILED",
        );
      }

      setTikTokAdvertisers([]);
      setTikTokAdvertiserId("");
      setNotice({
        type: "success",
        text: L(
          "تم ربط حساب TikTok الإعلاني بنجاح.",
          "TikTok advertiser account connected successfully.",
        ),
      });

      window.history.replaceState(
        {},
        "",
        "/operations/settings?tab=advertising",
      );

      await loadConnections();
    } catch {
      setNotice({
        type: "error",
        text: L(
          "تعذر حفظ حساب TikTok المحدد.",
          "Unable to save the selected TikTok account.",
        ),
      });
    } finally {
      setTikTokCompleting(false);
    }
  }

  return (
    <section className="orca-settings-section orca-settings-advertising-section grid gap-4">
      <OperationsPanel>
        <OperationsPanelHeader
          title={L("الحملات الإعلانية", "Advertising Campaigns")}
          description={L(
            "إدارة حسابات الإعلانات وبيانات اعتماد كل شركة. إنشاء الحملات وتشغيلها يتم من مساحة الحملات التشغيلية.",
            "Manage advertising accounts and each company’s credentials. Campaign creation and execution remain in the operational campaigns workspace.",
          )}
        />
      </OperationsPanel>

      {notice ? (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-xs font-bold ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {loading ? (
        <OperationsPanel padded>
          <p className="text-center text-xs text-[var(--nc-text-secondary)]">
            {L("جاري تحميل المنصات...", "Loading platforms...")}
          </p>
        </OperationsPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const connection = connections.find(
              (item) => item.platform === platform.id,
            );
            const status = platformStatus(connection);

            return (
              <OperationsPanel key={platform.id} padded className="flex min-h-[230px] flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={operationsVisual.sectionTitle}>
                      {L(platform.ar, platform.en)}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                      {connection?.accountId
                        ? `${L("الحساب", "Account")}: ••••${connection.accountId.slice(-4)}`
                        : L("لا يوجد حساب محفوظ", "No saved account")}
                    </p>
                  </div>
                  <span className={`min-w-[88px] shrink-0 rounded-full border px-2.5 py-1 text-center text-[10px] font-black ${statusClasses(status.value)}`}>
                    {status.label}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-6 text-[var(--nc-text-secondary)]">
                  {platform.id === "TIKTOK"
                    ? L(
                        "ربط آمن عبر OAuth واختيار حساب المعلن.",
                        "Secure OAuth authorization and advertiser selection.",
                      )
                    : L(
                        "حفظ حساب المنصة وبيانات الاعتماد المشفرة.",
                        "Store the platform account and encrypted credentials.",
                      )}
                </p>

                <button
                  type="button"
                  className={`${connection ? operationsVisual.secondaryButton : operationsVisual.primaryButton} mt-auto self-start`}
                  onClick={() => {
                    if (platform.id === "TIKTOK") {
                      window.location.assign("/api/integrations/tiktok/oauth/start");
                      return;
                    }
                    openStandardPlatform(platform.id);
                  }}
                >
                  {platform.id === "TIKTOK"
                    ? connection
                      ? L("إعادة ربط TikTok", "Reconnect TikTok")
                      : L("ربط TikTok Business", "Connect TikTok Business")
                    : connection
                      ? L("إدارة الربط", "Manage connection")
                      : L("تهيئة المنصة", "Configure platform")}
                </button>
              </OperationsPanel>
            );
          })}

          {(() => {
            const status = platformStatus(customConnection);
            return (
              <OperationsPanel padded className="flex min-h-[230px] flex-col md:col-span-2 xl:col-span-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={operationsVisual.sectionTitle}>
                      {customConnection?.displayName || L("مزود إعلاني آخر", "Other advertising provider")}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                      {customConnection?.accountId
                        ? `${L("الحساب", "Account")}: ••••${customConnection.accountId.slice(-4)}`
                        : L("مزود مخصص للشركة", "Company-specific provider")}
                    </p>
                  </div>
                  <span className={`min-w-[88px] shrink-0 rounded-full border px-2.5 py-1 text-center text-[10px] font-black ${statusClasses(status.value)}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-4 text-xs leading-6 text-[var(--nc-text-secondary)]">
                  {L(
                    "ربط API أو OAuth أو رابط خارجي مع مسارات تشغيل الحملات.",
                    "API, OAuth, or external-link connection with campaign operation paths.",
                  )}
                </p>
                <button
                  type="button"
                  className={`${customConnection ? operationsVisual.secondaryButton : operationsVisual.primaryButton} mt-auto self-start`}
                  onClick={openCustomProvider}
                >
                  {customConnection ? L("إدارة المزود", "Manage provider") : L("إضافة مزود", "Add provider")}
                </button>
              </OperationsPanel>
            );
          })()}
        </div>
      )}

      {tiktokAdvertisers.length > 0 ? (
        <OperationsPanel padded>
          <h3 className={operationsVisual.sectionTitle}>
            {L("اختر حساب TikTok الإعلاني", "Select a TikTok advertiser account")}
          </h3>
          <div className="mt-4 grid gap-2">
            {tiktokAdvertisers.map((advertiser) => (
              <label key={advertiser.advertiserId} className={operationsVisual.interactiveContentCard + " flex min-h-11 cursor-pointer items-center gap-3 p-3"}>
                <input
                  type="radio"
                  name="tiktok-advertiser"
                  checked={tiktokAdvertiserId === advertiser.advertiserId}
                  onChange={() => setTikTokAdvertiserId(advertiser.advertiserId)}
                />
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-[var(--nc-text-primary)]">{advertiser.advertiserName}</strong>
                  <span className={operationsVisual.meta}>{advertiser.advertiserId}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={`${operationsVisual.primaryButton} mt-4`}
            disabled={tiktokCompleting || !tiktokAdvertiserId}
            onClick={() => void completeTikTokConnection()}
          >
            {tiktokCompleting ? L("جاري الربط...", "Connecting...") : L("اعتماد الحساب المحدد", "Connect selected account")}
          </button>
        </OperationsPanel>
      ) : null}

      <OperationsDialog
        open={Boolean(selectedPlatform)}
        onClose={() => setSelectedPlatform(null)}
        title={L("إعداد المنصة", "Platform configuration")}
        description={selectedPlatform ? L(
          PLATFORMS.find((item) => item.id === selectedPlatform)?.ar || selectedPlatform,
          PLATFORMS.find((item) => item.id === selectedPlatform)?.en || selectedPlatform,
        ) : undefined}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={pending}
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-2xl"
        footer={
          <>
            <button type="button" className={operationsVisual.secondaryButton} onClick={() => setSelectedPlatform(null)} disabled={pending}>
              {L("إلغاء", "Cancel")}
            </button>
            <button type="submit" form="settings-ad-platform-form" className={operationsVisual.primaryButton} disabled={pending}>
              {pending ? L("جاري الحفظ...", "Saving...") : L("حفظ إعدادات الربط", "Save connection settings")}
            </button>
          </>
        }
      >
        {selectedPlatform ? (
          <form id="settings-ad-platform-form" onSubmit={submitStandard} noValidate className="grid gap-4 md:grid-cols-2">
            <OperationsFormField label={`${L("معرّف الحساب", "Account ID")} *`}>
              <OperationsTextField required value={accountId} onChange={(event) => setAccountId(event.target.value)} />
            </OperationsFormField>

            <OperationsFormField
              label={selectedConnection?.hasApiKey
                ? L("مفتاح جديد — اتركه فارغًا للإبقاء على الحالي", "New key — leave blank to retain the current one")
                : L("مفتاح API", "API key")}
            >
              <OperationsTextField
                type="password"
                value={apiKey}
                required={!selectedConnection?.hasApiKey}
                autoComplete="new-password"
                onChange={(event) => setApiKey(event.target.value)}
              />
            </OperationsFormField>

            <OperationsFormField label={L("نبرة التواصل", "Lead communication tone")}>
              <SettingsSelect
                className="w-full"
                value={leadTone}
                onChange={setLeadTone}
                options={[
                  { value: "PROFESSIONAL", label: L("مهنية", "Professional") },
                  { value: "FRIENDLY", label: L("ودية", "Friendly") },
                  { value: "FORMAL", label: L("رسمية", "Formal") },
                ]}
              />
            </OperationsFormField>

            <OperationsFormField className="md:col-span-2" label={L("رسالة الترحيب التلقائية", "Automatic welcome message")}>
              <OperationsTextareaField rows={3} value={autoWelcomeMsg} onChange={(event) => setAutoWelcomeMsg(event.target.value)} />
            </OperationsFormField>
          </form>
        ) : null}
      </OperationsDialog>

      <OperationsDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title={L("مزود إعلاني آخر", "Other advertising provider")}
        description={L(
          "لا يتم ادعاء نجاح الاتصال قبل توفر موصل حقيقي من المزود.",
          "Connection is not marked successful until a real provider connector is available.",
        )}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={pending}
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-3xl"
        footer={
          <>
            <button type="button" className={operationsVisual.secondaryButton} onClick={() => setCustomOpen(false)} disabled={pending}>
              {L("إلغاء", "Cancel")}
            </button>
            <button type="submit" form="settings-custom-ad-provider-form" className={operationsVisual.primaryButton} disabled={pending}>
              {pending ? L("جاري الحفظ...", "Saving...") : L("حفظ المزود الإعلاني", "Save advertising provider")}
            </button>
          </>
        }
      >
        <form id="settings-custom-ad-provider-form" onSubmit={submitCustom} noValidate className="grid gap-4 md:grid-cols-2">
          <OperationsFormField label={`${L("اسم المزود", "Provider name")} *`}>
            <OperationsTextField
              required
              value={customForm.displayName}
              onChange={(event) => setCustomForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </OperationsFormField>

          <OperationsFormField label={`${L("معرّف الحساب الإعلاني", "Advertising account ID")} *`}>
            <OperationsTextField
              required
              value={customForm.accountId}
              onChange={(event) => setCustomForm((current) => ({ ...current, accountId: event.target.value }))}
            />
          </OperationsFormField>

          <OperationsFormField label={`${L("طريقة الربط", "Connection method")} *`}>
            <SettingsSelect
              className="w-full"
              value={customForm.connectionMode}
              onChange={(value) => setCustomForm((current) => ({ ...current, connectionMode: value as ConnectionMode }))}
              options={[
                { value: "API", label: "API" },
                { value: "OAUTH", label: "OAuth" },
                { value: "EXTERNAL_LINK", label: L("رابط خارجي", "External link") },
              ]}
            />
          </OperationsFormField>

          <OperationsFormField label={`${L("رابط API الأساسي", "Base API URL")} *`}>
            <OperationsTextField
              required
              type="url"
              placeholder="https://api.provider.example"
              value={customForm.baseUrl}
              onChange={(event) => setCustomForm((current) => ({ ...current, baseUrl: event.target.value }))}
            />
          </OperationsFormField>

          {customForm.connectionMode !== "EXTERNAL_LINK" ? (
            <>
              <OperationsFormField
                className="md:col-span-2"
                label={customConnection?.hasCredentials
                  ? L("بيانات اعتماد جديدة — اتركها فارغة للإبقاء على الحالية", "New credential — leave blank to retain the current one")
                  : L("مفتاح أو رمز الوصول", "API key or access token")}
              >
                <OperationsTextField
                  type="password"
                  required={!customConnection?.hasCredentials}
                  autoComplete="new-password"
                  value={customForm.credential}
                  onChange={(event) => setCustomForm((current) => ({ ...current, credential: event.target.value }))}
                />
              </OperationsFormField>

              <OperationsFormField label={L("اسم ترويسة التوثيق", "Authorization header")}>
                <OperationsTextField value={customForm.authHeaderName} onChange={(event) => setCustomForm((current) => ({ ...current, authHeaderName: event.target.value }))} />
              </OperationsFormField>

              <OperationsFormField label={L("نظام التوثيق", "Authorization scheme")}>
                <OperationsTextField value={customForm.authScheme} onChange={(event) => setCustomForm((current) => ({ ...current, authScheme: event.target.value }))} />
              </OperationsFormField>

              {([
                ["createCampaignPath", L("مسار إنشاء الحملة", "Create campaign path")],
                ["pauseCampaignPath", L("مسار إيقاف الحملة", "Pause campaign path")],
                ["resumeCampaignPath", L("مسار استئناف الحملة", "Resume campaign path")],
                ["syncCampaignPath", L("مسار مزامنة الحملة", "Sync campaign path")],
              ] as const).map(([key, label]) => (
                <OperationsFormField key={key} label={`${label} *`}>
                  <OperationsTextField
                    required
                    placeholder="/v1/campaigns/..."
                    value={customForm[key]}
                    onChange={(event) => setCustomForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="font-mono"
                  />
                </OperationsFormField>
              ))}
            </>
          ) : null}
        </form>
      </OperationsDialog>
    </section>
  );
}
