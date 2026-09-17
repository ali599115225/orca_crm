"use client";

import { useEffect, useRef, useState } from "react";
import { getRevenueTrustStateAction } from "@/app/actions/revenue-integrity";
import {
  OperationsDialog,
  OperationsFormField,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

type DrawerKind = "digital-identity" | "shared-credentials" | "disclaimer" | "zatca" | "ejar" | null;

type ProviderTrustState = {
  provider: string;
  status: string;
  lastTestedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

type ProviderApplicationState = {
  provider: string;
  status: string;
};

export default function SettingsCompliance({
  lang,
  isArabic,
}: {
  lang: "AR" | "EN";
  isArabic: boolean;
}) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [providerStates, setProviderStates] = useState<ProviderTrustState[]>([]);
  const [providerApplications, setProviderApplications] = useState<ProviderApplicationState[]>([]);
  const [trustLoading, setTrustLoading] = useState(true);
  const [trustError, setTrustError] = useState(false);
  const credentialsFormRef = useRef<HTMLFormElement>(null);

  const L = (ar: string, en: string) => (isArabic ? ar : en);

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      setSignatureError(L("يرجى إدخال الاسم الكامل للمفوض بالتوقيع.", "Please enter the authorized signatory's full name."));
      return;
    }
    setSignatureError(null);
    setSaving(true);
    setTimeout(() => {
      setHasSigned(true);
      setShowSignatureModal(false);
      setSaving(false);
      setDrawer(null);
    }, 800);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  function openDrawer(kind: Exclude<DrawerKind, null>) {
    setDrawer(kind);
    if (kind === "disclaimer") {
      setShowSignatureModal(true);
      setSignatureError(null);
    }
  }

  function closeDrawer() {
    setDrawer(null);
    setShowSignatureModal(false);
  }

  function isDrawerDirty(): boolean {
    if (drawer === "disclaimer") return signatureName.trim() !== "";
    if (drawer === "shared-credentials" || drawer === "digital-identity") {
      const formEl = credentialsFormRef.current;
      if (!formEl) return false;
      const data = new FormData(formEl);
      for (const value of data.values()) {
        if (String(value).trim()) return true;
      }
      return false;
    }
    return false;
  }

  useEffect(() => {
    let active = true;

    void getRevenueTrustStateAction()
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setTrustError(true);
          return;
        }

        const data = result.data as {
          providers?: ProviderTrustState[];
          applications?: ProviderApplicationState[];
        };
        setProviderStates(Array.isArray(data.providers) ? data.providers : []);
        setProviderApplications(Array.isArray(data.applications) ? data.applications : []);
      })
      .catch(() => {
        if (active) setTrustError(true);
      })
      .finally(() => {
        if (active) setTrustLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function providerStatus(provider: "ZATCA" | "EJAR") {
    if (trustLoading) {
      return { ok: false, text: L("جار التحقق...", "Checking...") };
    }

    const state = providerStates.find((item) => item.provider === provider);
    if (!state) {
      return {
        ok: false,
        text: trustError
          ? L("تعذر التحقق", "Unable to verify")
          : L("غير مهيأ", "Not configured"),
      };
    }

    switch (state.status) {
      case "CONNECTED":
        return { ok: true, text: L("متصل", "Connected") };
      case "PENDING":
        return { ok: false, text: L("بانتظار الاختبار", "Pending test") };
      case "ERROR":
        return { ok: false, text: L("خطأ في الاتصال", "Connection error") };
      case "DISCONNECTED":
        return { ok: false, text: L("غير متصل", "Disconnected") };
      case "NOT_CONFIGURED":
      default:
        return { ok: false, text: L("غير مهيأ", "Not configured") };
    }
  }

  function ejarApplicationStatusLabel(status: string | undefined) {
    switch (status) {
      case "DRAFT":
        return L("مسودة", "Draft");
      case "SUBMITTED":
        return L("مُقدَّم", "Submitted");
      case "UNDER_REVIEW":
        return L("قيد المراجعة", "Under review");
      case "APPROVED":
        return L("معتمد", "Approved");
      case "REJECTED":
        return L("مرفوض", "Rejected");
      case "CANCELLED":
        return L("ملغى", "Cancelled");
      default:
        return L("لا يوجد طلب موثق", "No documented application");
    }
  }

  function providerLastSuccess(provider: "ZATCA" | "EJAR") {
    const value = providerStates.find((item) => item.provider === provider)?.lastSuccessAt;
    if (!value) return L("لا يوجد اختبار ناجح موثق", "No verified successful test");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return L("غير متاح", "Unavailable");
    return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  const zatcaStatus = providerStatus("ZATCA");
  const ejarStatus = providerStatus("EJAR");
  const ejarApplication = providerApplications.find((item) => item.provider === "EJAR");

  const summaryItems = [
    {
      label: L("ZATCA", "ZATCA"),
      ok: zatcaStatus.ok,
      text: zatcaStatus.text,
    },
    {
      label: L("Ejar", "Ejar"),
      ok: ejarStatus.ok,
      text: ejarStatus.text,
    },
    {
      label: L("الإقرار الرقمي", "Digital disclaimer"),
      ok: hasSigned,
      text: hasSigned ? L("موقع", "Signed") : L("غير موقع", "Not signed"),
    },
  ];

  const drawerTitle =
    drawer === "shared-credentials"
      ? L("بيانات الاعتماد المشتركة", "Shared credentials")
      : drawer === "digital-identity"
        ? L("الهوية الرقمية للمنشأة", "Company digital identity")
        : drawer === "disclaimer"
          ? L("إقرار المسؤولية الرقمي", "Digital liability disclaimer")
          : drawer === "zatca"
            ? L("تفاصيل تكامل ZATCA", "ZATCA integration details")
            : drawer === "ejar"
              ? L("تفاصيل تكامل Ejar", "Ejar integration details")
              : "";

  const settingsCardClass = "min-h-[210px]";

  return (
    <div className="orca-settings-section orca-settings-compliance-section grid gap-4">
      <OperationsPanel>
        <OperationsPanelHeader
          title={L("الامتثال والربط الحكومي", "Compliance & Gov Integrations")}
          description={L(
            "المصدر الموحد لإدارة هوية المنشأة واعتمادات الربط مع إيجار وZATCA.",
            "Unified source of truth for company identity and Ejar/ZATCA integration credentials.",
          )}
        />
      </OperationsPanel>

      <OperationsPanel padded>
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div key={item.label} className={operationsVisual.contentCard + " flex min-h-[72px] items-center gap-3 p-3"}>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className={operationsVisual.meta}>{item.label}</div>
                <strong className="mt-1 block truncate text-xs text-[var(--nc-text-primary)]">
                  {item.text}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </OperationsPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <OperationsPanel padded className={settingsCardClass}>
          <div className="flex h-full flex-col gap-4">
            <div>
              <h3 className={operationsVisual.sectionTitle}>{L("الهوية الرقمية للمنشأة", "Company digital identity")}</h3>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                {L("السجل التجاري والرقم الضريبي والعنوان الوطني.", "Commercial registry, VAT number, and national address.")}
              </p>
            </div>
            <div className="mt-auto">
              <button type="button" className={operationsVisual.secondaryButton} onClick={() => openDrawer("digital-identity")}>
                {L("تعديل الهوية", "Edit identity")}
              </button>
            </div>
          </div>
        </OperationsPanel>

        <OperationsPanel padded className={settingsCardClass}>
          <div className="flex h-full flex-col gap-4">
            <div>
              <h3 className={operationsVisual.sectionTitle}>{L("بيانات الاعتماد المشتركة", "Shared credentials")}</h3>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                {L("مفاتيح التكامل المشفرة بين ZATCA وإيجار.", "Encrypted integration credentials shared by ZATCA and Ejar.")}
              </p>
            </div>
            <div className="mt-auto">
              <button type="button" className={operationsVisual.primaryButton} onClick={() => openDrawer("shared-credentials")}>
                {L("إدارة الاعتمادات", "Manage credentials")}
              </button>
            </div>
          </div>
        </OperationsPanel>

        <OperationsPanel padded className={settingsCardClass}>
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={operationsVisual.sectionTitle}>{L("تكامل ZATCA", "ZATCA integration")}</h3>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {L("حالة الربط مع هيئة الزكاة والضريبة والجمارك.", "Connection state with the Zakat, Tax and Customs Authority.")}
                </p>
              </div>
              <span className={operationsVisual.statusBadge}>{zatcaStatus.text}</span>
            </div>
            <div className="mt-auto">
              <button type="button" className={operationsVisual.secondaryButton} onClick={() => openDrawer("zatca")}>
                {L("عرض التفاصيل", "View details")}
              </button>
            </div>
          </div>
        </OperationsPanel>

        <OperationsPanel padded className={settingsCardClass}>
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={operationsVisual.sectionTitle}>{L("تكامل Ejar", "Ejar integration")}</h3>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {L("حالة الربط وطلب المزود في الشبكة الإيجارية.", "Connection and provider-application state for Ejar.")}
                </p>
              </div>
              <span className={operationsVisual.statusBadge}>{ejarStatus.text}</span>
            </div>
            <div className="mt-auto">
              <button type="button" className={operationsVisual.secondaryButton} onClick={() => openDrawer("ejar")}>
                {L("عرض التفاصيل", "View details")}
              </button>
            </div>
          </div>
        </OperationsPanel>
      </div>

      <OperationsPanel padded className={settingsCardClass}>
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={operationsVisual.sectionTitle}>{L("إقرار المسؤولية الرقمية", "Digital liability disclaimer")}</h3>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                {L("إقرار مطلوب قبل تفعيل بيانات الاعتماد المشتركة.", "Required before activating shared credentials.")}
              </p>
            </div>
            <span className={operationsVisual.statusBadge}>{hasSigned ? L("موقع", "Signed") : L("غير موقع", "Not signed")}</span>
          </div>
          <div className="mt-auto">
            <button
              type="button"
              className={operationsVisual.primaryButton}
              onClick={() => openDrawer("disclaimer")}
              disabled={hasSigned}
            >
              {hasSigned ? L("تم التوقيع", "Already signed") : L("توقيع الإقرار", "Sign disclaimer")}
            </button>
          </div>
        </div>
      </OperationsPanel>

      <OperationsDialog
        open={Boolean(drawer)}
        onClose={closeDrawer}
        title={drawerTitle}
        description={L(
          "تستخدم هذه النافذة عقد النماذج الموحد في ORCA.",
          "This dialog uses ORCA's canonical form contract.",
        )}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={saving}
        closeOnBackdrop={!isDrawerDirty()}
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-2xl"
        footer={
          drawer === "digital-identity" ? (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer} disabled={saving}>
                {L("إلغاء", "Cancel")}
              </button>
              <button type="submit" form="settings-compliance-identity-form" className={operationsVisual.primaryButton} disabled={saving}>
                {saving ? L("جاري الحفظ...", "Saving...") : L("حفظ الهوية", "Save identity")}
              </button>
            </>
          ) : drawer === "shared-credentials" ? (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer} disabled={saving}>
                {L("إلغاء", "Cancel")}
              </button>
              <button type="submit" form="settings-compliance-credentials-form" className={operationsVisual.primaryButton} disabled={saving || !hasSigned}>
                {saving ? L("جاري الحفظ...", "Saving...") : L("حفظ وتشفير البيانات", "Save & encrypt")}
              </button>
            </>
          ) : drawer === "disclaimer" ? (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer} disabled={saving}>
                {L("إلغاء", "Cancel")}
              </button>
              <button type="submit" form="settings-compliance-disclaimer-form" className={operationsVisual.primaryButton} disabled={saving}>
                {saving ? L("جاري التوثيق...", "Signing...") : L("أوافق وأوقع", "Agree & sign")}
              </button>
            </>
          ) : drawer === "zatca" || drawer === "ejar" ? (
            <>
              <button type="button" className={operationsVisual.secondaryButton} onClick={closeDrawer}>
                {L("إغلاق", "Close")}
              </button>
              <button type="button" className={operationsVisual.primaryButton} onClick={() => openDrawer("shared-credentials")}>
                {L("تعديل بيانات الاعتماد", "Edit credentials")}
              </button>
            </>
          ) : null
        }
      >
        {drawer === "digital-identity" ? (
          <form ref={credentialsFormRef} id="settings-compliance-identity-form" onSubmit={handleSaveCredentials} noValidate className="grid gap-4">
            <OperationsFormField label={L("السجل التجاري (CR)", "Commercial Registry (CR)")}>
              <OperationsTextField name="commercialRegistry" required />
            </OperationsFormField>
            <OperationsFormField label={L("الرقم الضريبي (VAT)", "VAT Number")}>
              <OperationsTextField name="vatNumber" required />
            </OperationsFormField>
            <OperationsFormField label={L("العنوان الوطني (كود المبنى)", "National Address (Building Code)")}>
              <OperationsTextField name="nationalAddress" required />
            </OperationsFormField>
          </form>
        ) : null}

        {drawer === "shared-credentials" ? (
          <form ref={credentialsFormRef} id="settings-compliance-credentials-form" onSubmit={handleSaveCredentials} noValidate className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <OperationsFormField label={L("رمز الأمان الثنائي لـ ZATCA", "ZATCA binary security token")}>
                <OperationsTextField name="zatcaBinarySecurityToken" type="password" required autoComplete="new-password" />
              </OperationsFormField>
              <OperationsFormField label={L("سر ZATCA", "ZATCA secret")}>
                <OperationsTextField name="zatcaSecret" type="password" required autoComplete="new-password" />
              </OperationsFormField>
              <OperationsFormField label={L("سر Webhook الخاص بـ ZATCA", "ZATCA webhook secret")}>
                <OperationsTextField name="zatcaWebhookSecret" type="password" autoComplete="new-password" />
              </OperationsFormField>
              <OperationsFormField label={L("رمز وصول Ejar", "Ejar access token")}>
                <OperationsTextField name="ejarAccessToken" type="password" required autoComplete="new-password" />
              </OperationsFormField>
              <OperationsFormField label={L("معرف الوسيط", "Broker ID")}>
                <OperationsTextField name="ejarBrokerId" required />
              </OperationsFormField>
              <OperationsFormField label={L("سر Webhook الخاص بـ Ejar", "Ejar webhook secret")}>
                <OperationsTextField name="ejarWebhookSecret" type="password" autoComplete="new-password" />
              </OperationsFormField>
            </div>
            {!hasSigned ? (
              <p role="alert" className="text-xs font-bold text-rose-400">
                {L("يجب توقيع إقرار المسؤولية الرقمية قبل حفظ الاعتمادات.", "Sign the digital disclaimer before saving credentials.")}
              </p>
            ) : null}
          </form>
        ) : null}

        {drawer === "zatca" ? (
          <div className="grid gap-3">
            <div className={operationsVisual.contentCard + " p-3"}>
              <span className={operationsVisual.meta}>{L("حالة الارتباط الفني", "Technical connection status")}</span>
              <strong className="mt-1 block text-sm text-[var(--nc-text-primary)]">{zatcaStatus.text}</strong>
            </div>
            <div className={operationsVisual.contentCard + " p-3"}>
              <span className={operationsVisual.meta}>{L("آخر اختبار ناجح موثق", "Last verified successful test")}</span>
              <strong className="mt-1 block text-sm text-[var(--nc-text-primary)]">{providerLastSuccess("ZATCA")}</strong>
            </div>
          </div>
        ) : null}

        {drawer === "ejar" ? (
          <div className="grid gap-3">
            <div className={operationsVisual.contentCard + " p-3"}>
              <span className={operationsVisual.meta}>{L("حالة الارتباط الفني", "Technical connection status")}</span>
              <strong className="mt-1 block text-sm text-[var(--nc-text-primary)]">{ejarStatus.text}</strong>
            </div>
            <div className={operationsVisual.contentCard + " p-3"}>
              <span className={operationsVisual.meta}>{L("حالة طلب المزوّد", "Provider application status")}</span>
              <strong className="mt-1 block text-sm text-[var(--nc-text-primary)]">{ejarApplicationStatusLabel(ejarApplication?.status)}</strong>
            </div>
            <div className={operationsVisual.contentCard + " p-3"}>
              <span className={operationsVisual.meta}>{L("آخر اختبار ناجح موثق", "Last verified successful test")}</span>
              <strong className="mt-1 block text-sm text-[var(--nc-text-primary)]">{providerLastSuccess("EJAR")}</strong>
            </div>
          </div>
        ) : null}

        {drawer === "disclaimer" && showSignatureModal ? (
          <form id="settings-compliance-disclaimer-form" onSubmit={handleSign} noValidate className="grid gap-4">
            <div className={operationsVisual.contentCard + " max-h-64 overflow-y-auto p-4 text-justify text-xs leading-6 text-[var(--nc-text-secondary)]"}>
              {isArabic ? (
                <p>
                  بصفتي الممثل النظامي المفوض لهذه المنشأة، أقر بأن جميع البيانات المدخلة صحيحة وممثلة للمنشأة بشكل كامل. وأوافق على تحمل المسؤولية الرقمية الكاملة عن العمليات الصادرة والواردة من بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)، مع إخلاء طرف مزود النظام ORCA من أي التزامات قانونية أو انقطاع ناتج عن إساءة استخدام أو تسريب مفاتيح الربط خارج سياق المنشأة.
                </p>
              ) : (
                <p>
                  As the authorized legal representative of this entity, I acknowledge that all entered data is accurate and fully represents the entity. I accept digital responsibility for operations with Ejar and ZATCA and hold ORCA harmless for misuse or credential leakage outside the organization context.
                </p>
              )}
            </div>
            <OperationsFormField
              label={L("الاسم الكامل للمفوض بالتوقيع", "Full name of authorized signatory")}
              error={signatureError}
            >
              <OperationsTextField
                required
                value={signatureName}
                onChange={(event) => {
                  setSignatureName(event.target.value);
                  if (signatureError) setSignatureError(null);
                }}
                placeholder={L("اكتب اسمك الكامل للمصادقة", "Type your full name to certify")}
              />
            </OperationsFormField>
          </form>
        ) : null}
      </OperationsDialog>
    </div>
  );
}
