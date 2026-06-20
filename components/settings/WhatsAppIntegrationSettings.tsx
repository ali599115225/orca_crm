"use client";

import {
  CheckCircle2,
  Link2,
  Loader2,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

type Language = "AR" | "EN";

type ConnectionStatus = {
  connected: boolean;
  status: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  activeSince: string | null;
  lastHealthCheck: string | null;
};

type SignupRuntime = {
  state: string;
  appId: string;
  configId: string;
};

type PendingSignup = {
  state: string;
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string | null;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            code?: string;
          };
          status?: string;
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
  }
}

const TEXT = {
  AR: {
    title: "تكامل واتساب",
    description:
      "اربط حساب واتساب للأعمال بهذه الشركة عبر التسجيل المضمن من Meta.",
    connected: "متصل",
    disconnected: "غير متصل",
    connect: "ربط حساب واتساب",
    reconnect: "إعادة ربط الحساب",
    disconnect: "فصل الحساب",
    connecting: "جاري فتح Meta…",
    completing: "جاري إكمال الربط…",
    loading: "جاري التحقق من الاتصال…",
    connectedSuccess: "تم ربط واتساب بنجاح",
    disconnectedSuccess: "تم فصل واتساب",
    failed: "تعذر إكمال ربط واتساب",
    disconnectFailed: "تعذر فصل واتساب",
    confirmDisconnect:
      "سيتم إيقاف الإرسال وفصل Webhook عن هذا الحساب. هل تريد المتابعة؟",
    verifiedName: "اسم النشاط",
    phone: "رقم واتساب",
    quality: "جودة الرقم",
    security:
      "لا تظهر الرموز السرية في المتصفح، ويُحفظ الاعتماد مشفرًا لكل شركة.",
    adminOnly:
      "يتطلب الربط أو الفصل صلاحية مدير الشركة.",
  },
  EN: {
    title: "WhatsApp Integration",
    description:
      "Connect this company’s WhatsApp Business account through Meta Embedded Signup.",
    connected: "Connected",
    disconnected: "Disconnected",
    connect: "Connect WhatsApp",
    reconnect: "Reconnect account",
    disconnect: "Disconnect",
    connecting: "Opening Meta…",
    completing: "Completing connection…",
    loading: "Checking connection…",
    connectedSuccess:
      "WhatsApp connected successfully",
    disconnectedSuccess:
      "WhatsApp disconnected",
    failed:
      "Could not complete WhatsApp connection",
    disconnectFailed:
      "Could not disconnect WhatsApp",
    confirmDisconnect:
      "This stops sending and unsubscribes the webhook for this account. Continue?",
    verifiedName: "Business name",
    phone: "WhatsApp number",
    quality: "Number quality",
    security:
      "Secrets never reach the browser. Credentials are encrypted per company.",
    adminOnly:
      "Connecting or disconnecting requires a company administrator.",
  },
};

function parseMessageData(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value &&
    typeof value === "object"
    ? value
    : null;
}

async function readJson(response: Response) {
  const payload = await response.json().catch(
    () => ({}),
  );

  if (!response.ok || !payload?.success) {
    throw new Error(
      String(payload?.code || "WHATSAPP_REQUEST_FAILED"),
    );
  }

  return payload;
}

async function loadFacebookSdk(appId: string) {
  if (window.FB) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: "v25.0",
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      "facebook-jssdk",
    ) as HTMLScriptElement | null;

    const initialize = () => {
      if (!window.FB) {
        reject(
          new Error("WHATSAPP_META_SDK_UNAVAILABLE"),
        );
        return;
      }

      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v25.0",
      });
      resolve();
    };

    if (existing) {
      existing.addEventListener("load", initialize, {
        once: true,
      });
      existing.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              "WHATSAPP_META_SDK_LOAD_FAILED",
            ),
          ),
        { once: true },
      );
      return;
    }

    const script =
      document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://connect.facebook.net/en_US/sdk.js";
    script.onload = initialize;
    script.onerror = () =>
      reject(
        new Error("WHATSAPP_META_SDK_LOAD_FAILED"),
      );
    document.body.appendChild(script);
  });
}

export default function WhatsAppIntegrationSettings({
  lang,
}: {
  lang: Language;
}) {
  const t = TEXT[lang] || TEXT.AR;
  const isArabic = lang === "AR";
  const [status, setStatus] =
    useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<
    "connect" | "complete" | "disconnect" | null
  >(null);
  const pendingRef = useRef<PendingSignup | null>(
    null,
  );
  const completingRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/whatsapp/embedded-signup/status",
        {
          cache: "no-store",
        },
      );
      const payload = await readJson(response);

      setStatus({
        connected: Boolean(payload.connected),
        status: String(
          payload.status || "DISCONNECTED",
        ),
        displayPhoneNumber:
          payload.displayPhoneNumber || null,
        verifiedName:
          payload.verifiedName || null,
        qualityRating:
          payload.qualityRating || null,
        activeSince: payload.activeSince || null,
        lastHealthCheck:
          payload.lastHealthCheck || null,
      });
    } catch {
      setStatus({
        connected: false,
        status: "DISCONNECTED",
        displayPhoneNumber: null,
        verifiedName: null,
        qualityRating: null,
        activeSince: null,
        lastHealthCheck: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const completeIfReady = useCallback(async () => {
    const pending = pendingRef.current;

    if (
      !pending ||
      !pending.state ||
      !pending.code ||
      !pending.wabaId ||
      !pending.phoneNumberId ||
      completingRef.current
    ) {
      return;
    }

    completingRef.current = true;
    setBusy("complete");

    try {
      const response = await fetch(
        "/api/whatsapp/embedded-signup/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            state: pending.state,
            code: pending.code,
            wabaId: pending.wabaId,
            phoneNumberId:
              pending.phoneNumberId,
            businessId:
              pending.businessId || null,
          }),
        },
      );

      await readJson(response);
      toast.success(t.connectedSuccess);
      pendingRef.current = null;
      await refreshStatus();
    } catch {
      toast.error(t.failed);
    } finally {
      completingRef.current = false;
      setBusy(null);
    }
  }, [refreshStatus, t.connectedSuccess, t.failed]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const current = pendingRef.current;

      if (!current) {
        return;
      }

      const data = parseMessageData(event.data) as
        | Record<string, any>
        | null;

      if (!data) {
        return;
      }

      if (
        event.origin === window.location.origin &&
        data.type ===
          "ORCA_WHATSAPP_OAUTH_CALLBACK"
      ) {
        if (
          data.state &&
          data.state !== current.state
        ) {
          return;
        }

        current.code = String(data.code || "");
        void completeIfReady();
        return;
      }

      let isMetaOrigin = false;

      try {
        const origin = new URL(event.origin);

        isMetaOrigin =
          origin.protocol === "https:" &&
          (origin.hostname === "facebook.com" ||
            origin.hostname.endsWith(
              ".facebook.com",
            ));
      } catch {
        isMetaOrigin = false;
      }

      if (!isMetaOrigin) {
        return;
      }

      if (
        data.type !== "WA_EMBEDDED_SIGNUP"
      ) {
        return;
      }

      const signupEvent = String(
        data.event || "",
      );

      if (
        signupEvent === "FINISH" ||
        signupEvent ===
          "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        current.wabaId = String(
          data.data?.waba_id || "",
        );
        current.phoneNumberId = String(
          data.data?.phone_number_id || "",
        );
        current.businessId = data.data?.business_id
          ? String(data.data.business_id)
          : null;
        void completeIfReady();
      }

      if (
        data.event === "CANCEL" ||
        data.event === "ERROR"
      ) {
        pendingRef.current = null;
        setBusy(null);
      }
    };

    window.addEventListener("message", listener);

    return () =>
      window.removeEventListener(
        "message",
        listener,
      );
  }, [completeIfReady]);

  const connect = async () => {
    setBusy("connect");

    try {
      const sessionResponse = await fetch(
        "/api/whatsapp/embedded-signup/session",
        {
          method: "POST",
        },
      );
      const runtime = (await readJson(
        sessionResponse,
      )) as SignupRuntime;

      pendingRef.current = {
        state: runtime.state,
      };

      await loadFacebookSdk(runtime.appId);

      if (!window.FB) {
        throw new Error(
          "WHATSAPP_META_SDK_UNAVAILABLE",
        );
      }

      window.FB.login(
        (response) => {
          const code = String(
            response?.authResponse?.code || "",
          );

          if (!code || !pendingRef.current) {
            pendingRef.current = null;
            setBusy(null);
            return;
          }

          pendingRef.current.code = code;
          void completeIfReady();
        },
        {
          config_id: runtime.configId,
          response_type: "code",
          override_default_response_type: true,
          state: runtime.state,
          extras: {
            setup: {},
            sessionInfoVersion: "3",
          },
        },
      );
    } catch {
      pendingRef.current = null;
      setBusy(null);
      toast.error(t.failed);
    }
  };

  const disconnect = async () => {
    if (!window.confirm(t.confirmDisconnect)) {
      return;
    }

    setBusy("disconnect");

    try {
      const response = await fetch(
        "/api/whatsapp/embedded-signup/disconnect",
        {
          method: "POST",
        },
      );
      await readJson(response);
      toast.success(t.disconnectedSuccess);
      await refreshStatus();
    } catch {
      toast.error(t.disconnectFailed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--nc-foreground)]">
                {t.title}
              </h2>
              <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
                {t.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.loading}</span>
              </>
            ) : status?.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{t.connected}</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--nc-foreground-muted)]" />
                <span>{t.disconnected}</span>
              </>
            )}
          </div>

          {status?.connected && (
            <dl className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--nc-border)] p-3">
                <dt className="text-[var(--nc-foreground-muted)]">
                  {t.verifiedName}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--nc-foreground)]">
                  {status.verifiedName || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--nc-border)] p-3">
                <dt className="text-[var(--nc-foreground-muted)]">
                  {t.phone}
                </dt>
                <dd
                  dir="ltr"
                  className="mt-1 font-semibold text-[var(--nc-foreground)]"
                >
                  {status.displayPhoneNumber || "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--nc-border)] p-3">
                <dt className="text-[var(--nc-foreground-muted)]">
                  {t.quality}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--nc-foreground)]">
                  {status.qualityRating || "—"}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex items-center gap-2 text-xs text-[var(--nc-foreground-muted)]">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{t.security}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={connect}
            disabled={Boolean(busy)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--nc-primary)] px-4 py-2 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "connect" ||
            busy === "complete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {busy === "complete"
              ? t.completing
              : busy === "connect"
                ? t.connecting
                : status?.connected
                  ? t.reconnect
                  : t.connect}
          </button>

          {status?.connected && (
            <button
              type="button"
              onClick={disconnect}
              disabled={Boolean(busy)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
            >
              {busy === "disconnect" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              {t.disconnect}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}