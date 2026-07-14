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
import { SmartCard } from "@/components/ui/SmartCard";
import SettingsButton from "@/components/settings/SettingsButton";
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
    <section className="orca-settings-section orca-settings-advertising-section">
      <header className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-5 py-4">
        <h2 className="text-xl font-black text-[var(--nc-foreground)]">
          {L("الحملات الإعلانية", "Advertising Campaigns")}
        </h2>
        <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
          {L(
            "إدارة حسابات الإعلانات وبيانات اعتماد كل شركة. إنشاء الحملات وتشغيلها يتم من مساحة الحملات التشغيلية.",
            "Manage advertising accounts and each company’s credentials. Campaign creation and execution remain in the operational campaigns workspace.",
          )}
        </p>
      </header>

      {notice ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {loading ? (
        <SmartCard className="p-6 text-center text-sm text-[var(--nc-foreground-muted)]">
          {L("جاري تحميل المنصات...", "Loading platforms...")}
        </SmartCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const connection = connections.find(
              (item) => item.platform === platform.id,
            );
            const status = platformStatus(connection);

            return (
              <SmartCard
                key={platform.id}
                className="orca-settings-card flex min-h-[230px] flex-col rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-border-strong)] hover:bg-[var(--nc-surface-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]">
                      <i
                        className={`ph-bold ${platform.icon} text-lg`}
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-[var(--nc-foreground)]">
                        {L(platform.ar, platform.en)}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                        {connection?.accountId
                          ? `${L("الحساب", "Account")}: ••••${connection.accountId.slice(-4)}`
                          : L("لا يوجد حساب محفوظ", "No saved account")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`min-w-[88px] shrink-0 rounded-full border px-2.5 py-1 text-center text-[10px] font-black ${statusClasses(
                      status.value,
                    )}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-6 text-[var(--nc-foreground-muted)]">
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

                <SettingsButton
                  variant={
                    connection ? "secondary" : "primary"
                  }
                  className="mt-auto w-[148px] justify-center self-start"
                  onClick={() => {
                    if (platform.id === "TIKTOK") {
                      window.location.assign(
                        "/api/integrations/tiktok/oauth/start",
                      );
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
                </SettingsButton>
              </SmartCard>
            );
          })}

          {(() => {
            const status = platformStatus(customConnection);

            return (
              <SmartCard className="orca-settings-card flex min-h-[230px] flex-col rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-border-strong)] hover:bg-[var(--nc-surface-strong)] md:col-span-2 xl:col-span-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]">
                      <i
                        className="ph-bold ph-plugs-connected text-lg"
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-[var(--nc-foreground)]">
                        {customConnection?.displayName ||
                          L("مزود إعلاني آخر", "Other advertising provider")}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                        {customConnection?.accountId
                          ? `${L("الحساب", "Account")}: ••••${customConnection.accountId.slice(-4)}`
                          : L("مزود مخصص للشركة", "Company-specific provider")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`min-w-[88px] shrink-0 rounded-full border px-2.5 py-1 text-center text-[10px] font-black ${statusClasses(
                      status.value,
                    )}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-6 text-[var(--nc-foreground-muted)]">
                  {L(
                    "ربط API أو OAuth أو رابط خارجي مع مسارات تشغيل الحملات.",
                    "API, OAuth, or external-link connection with campaign operation paths.",
                  )}
                </p>

                <SettingsButton
                  variant={customConnection ? "secondary" : "primary"}
                  className="mt-auto w-[148px] justify-center self-start"
                  onClick={openCustomProvider}
                >
                  {customConnection
                    ? L("إدارة المزود", "Manage provider")
                    : L("إضافة مزود", "Add provider")}
                </SettingsButton>
              </SmartCard>
            );
          })()}
        </div>
      )}

      {tiktokAdvertisers.length > 0 ? (
        <SmartCard className="p-5">
          <h3 className="text-base font-black text-[var(--nc-foreground)]">
            {L(
              "اختر حساب TikTok الإعلاني",
              "Select a TikTok advertiser account",
            )}
          </h3>

          <div className="mt-4 space-y-2">
            {tiktokAdvertisers.map((advertiser) => (
              <label
                key={advertiser.advertiserId}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--nc-border)] px-4 py-3"
              >
                <input
                  type="radio"
                  name="tiktok-advertiser"
                  checked={
                    tiktokAdvertiserId === advertiser.advertiserId
                  }
                  onChange={() =>
                    setTikTokAdvertiserId(advertiser.advertiserId)
                  }
                />
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-[var(--nc-foreground)]">
                    {advertiser.advertiserName}
                  </strong>
                  <span className="text-xs text-[var(--nc-foreground-muted)]">
                    {advertiser.advertiserId}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <SettingsButton
            variant="primary"
            className="mt-4"
            disabled={tiktokCompleting || !tiktokAdvertiserId}
            onClick={() => void completeTikTokConnection()}
          >
            {tiktokCompleting
              ? L("جاري الربط...", "Connecting...")
              : L("اعتماد الحساب المحدد", "Connect selected account")}
          </SettingsButton>
        </SmartCard>
      ) : null}

      {selectedPlatform ? (
        <SmartCard className="p-6">
          <form onSubmit={submitStandard} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[var(--nc-foreground)]">
                  {L("إعداد المنصة", "Platform configuration")}
                </h3>
                <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                  {L(
                    PLATFORMS.find(
                      (item) => item.id === selectedPlatform,
                    )?.ar || selectedPlatform,
                    PLATFORMS.find(
                      (item) => item.id === selectedPlatform,
                    )?.en || selectedPlatform,
                  )}
                </p>
              </div>

              <SettingsButton
                variant="ghost"
                onClick={() => setSelectedPlatform(null)}
              >
                {L("إغلاق", "Close")}
              </SettingsButton>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("معرّف الحساب", "Account ID")} *
                </span>
                <input
                  required
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {selectedConnection?.hasApiKey
                    ? L(
                        "مفتاح جديد — اتركه فارغًا للإبقاء على الحالي",
                        "New key — leave blank to retain the current one",
                      )
                    : L("مفتاح API", "API key")}
                </span>
                <input
                  type="password"
                  value={apiKey}
                  required={!selectedConnection?.hasApiKey}
                  autoComplete="new-password"
                  onChange={(event) => setApiKey(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("نبرة التواصل", "Lead communication tone")}
                </span>
                <SettingsSelect
                  className="w-full"
                  value={leadTone}
                  onChange={setLeadTone}
                  options={[
                    {
                      value: "PROFESSIONAL",
                      label: L("مهنية", "Professional"),
                    },
                    {
                      value: "FRIENDLY",
                      label: L("ودية", "Friendly"),
                    },
                    {
                      value: "FORMAL",
                      label: L("رسمية", "Formal"),
                    },
                  ]}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L(
                    "رسالة الترحيب التلقائية",
                    "Automatic welcome message",
                  )}
                </span>
                <textarea
                  rows={3}
                  value={autoWelcomeMsg}
                  onChange={(event) =>
                    setAutoWelcomeMsg(event.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 py-3 text-sm text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </label>
            </div>

            <SettingsButton
              type="submit"
              variant="primary"
              disabled={pending}
            >
              {pending
                ? L("جاري الحفظ...", "Saving...")
                : L("حفظ إعدادات الربط", "Save connection settings")}
            </SettingsButton>
          </form>
        </SmartCard>
      ) : null}

      {customOpen ? (
        <SmartCard className="p-6">
          <form onSubmit={submitCustom} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[var(--nc-foreground)]">
                  {L("مزود إعلاني آخر", "Other advertising provider")}
                </h3>
                <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                  {L(
                    "لا يتم ادعاء نجاح الاتصال قبل توفر موصل حقيقي من المزود.",
                    "Connection is not marked successful until a real provider connector is available.",
                  )}
                </p>
              </div>

              <SettingsButton
                variant="ghost"
                onClick={() => setCustomOpen(false)}
              >
                {L("إغلاق", "Close")}
              </SettingsButton>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("اسم المزود", "Provider name")} *
                </span>
                <input
                  required
                  value={customForm.displayName}
                  onChange={(event) =>
                    setCustomForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("معرّف الحساب الإعلاني", "Advertising account ID")} *
                </span>
                <input
                  required
                  value={customForm.accountId}
                  onChange={(event) =>
                    setCustomForm((current) => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("طريقة الربط", "Connection method")} *
                </span>
                <SettingsSelect
                  className="w-full"
                  value={customForm.connectionMode}
                  onChange={(value) =>
                    setCustomForm((current) => ({
                      ...current,
                      connectionMode: value as ConnectionMode,
                    }))
                  }
                  options={[
                    { value: "API", label: "API" },
                    { value: "OAUTH", label: "OAuth" },
                    {
                      value: "EXTERNAL_LINK",
                      label: L("رابط خارجي", "External link"),
                    },
                  ]}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("رابط API الأساسي", "Base API URL")} *
                </span>
                <input
                  required
                  type="url"
                  placeholder="https://api.provider.example"
                  value={customForm.baseUrl}
                  onChange={(event) =>
                    setCustomForm((current) => ({
                      ...current,
                      baseUrl: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                />
              </label>

              {customForm.connectionMode !== "EXTERNAL_LINK" ? (
                <>
                  <label className="space-y-2 md:col-span-2">
                    <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                      {customConnection?.hasCredentials
                        ? L(
                            "بيانات اعتماد جديدة — اتركها فارغة للإبقاء على الحالية",
                            "New credential — leave blank to retain the current one",
                          )
                        : L(
                            "مفتاح أو رمز الوصول",
                            "API key or access token",
                          )}
                    </span>
                    <input
                      type="password"
                      required={!customConnection?.hasCredentials}
                      autoComplete="new-password"
                      value={customForm.credential}
                      onChange={(event) =>
                        setCustomForm((current) => ({
                          ...current,
                          credential: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                      {L("اسم ترويسة التوثيق", "Authorization header")}
                    </span>
                    <input
                      value={customForm.authHeaderName}
                      onChange={(event) =>
                        setCustomForm((current) => ({
                          ...current,
                          authHeaderName: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                      {L("نظام التوثيق", "Authorization scheme")}
                    </span>
                    <input
                      value={customForm.authScheme}
                      onChange={(event) =>
                        setCustomForm((current) => ({
                          ...current,
                          authScheme: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)]"
                    />
                  </label>

                  {[
                    [
                      "createCampaignPath",
                      L("مسار إنشاء الحملة", "Create campaign path"),
                    ],
                    [
                      "pauseCampaignPath",
                      L("مسار إيقاف الحملة", "Pause campaign path"),
                    ],
                    [
                      "resumeCampaignPath",
                      L("مسار استئناف الحملة", "Resume campaign path"),
                    ],
                    [
                      "syncCampaignPath",
                      L("مسار مزامنة الحملة", "Sync campaign path"),
                    ],
                  ].map(([key, label]) => (
                    <label key={key} className="space-y-2">
                      <span className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                        {label} *
                      </span>
                      <input
                        required
                        placeholder="/v1/campaigns/..."
                        value={
                          customForm[
                            key as keyof typeof customForm
                          ] as string
                        }
                        onChange={(event) =>
                          setCustomForm((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)]"
                      />
                    </label>
                  ))}
                </>
              ) : null}
            </div>

            <SettingsButton
              type="submit"
              variant="primary"
              disabled={pending}
            >
              {pending
                ? L("جاري الحفظ...", "Saving...")
                : L("حفظ المزود الإعلاني", "Save advertising provider")}
            </SettingsButton>
          </form>
        </SmartCard>
      ) : null}
    </section>
  );
}

