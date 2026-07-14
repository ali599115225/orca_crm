"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmartCard } from "@/components/ui/SmartCard";
import SettingsButton from "@/components/settings/SettingsButton";

type DrawerKind = "digital-identity" | "shared-credentials" | "disclaimer" | "zatca" | "ejar" | null;

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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
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
    if (document.activeElement && document.activeElement !== document.body) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
    }
    setDrawer(kind);
    if (kind === "disclaimer") {
      setShowSignatureModal(true);
      setSignatureError(null);
    }
  }

  function closeDrawer() {
    setDrawer(null);
    setShowSignatureModal(false);
    lastFocusedRef.current?.focus();
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

  function handleOverlayClick() {
    if (isDrawerDirty()) return;
    closeDrawer();
  }

  useEffect(() => {
    if (!drawer) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer]);

  useEffect(() => {
    if (drawer) titleRef.current?.focus();
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    const scrollContainer = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement | null;
    const previousContainerOverflow = scrollContainer?.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = previousContainerOverflow || "";
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [drawer]);

  const zatcaConnected = true;
  const ejarPending = true;

  const summaryItems = [
    {
      label: L("ZATCA", "ZATCA"),
      ok: zatcaConnected,
      text: zatcaConnected ? L("متصل", "Connected") : L("غير متصل", "Disconnected"),
    },
    {
      label: L("Ejar", "Ejar"),
      ok: !ejarPending,
      text: ejarPending ? L("قيد المراجعة", "Pending review") : L("متصل", "Connected"),
    },
    {
      label: L("الإقرار الرقمي", "Digital disclaimer"),
      ok: hasSigned,
      text: hasSigned ? L("موقع", "Signed") : L("غير موقع", "Not signed"),
    },
  ];

  const drawerWidthClass =
    drawer === "shared-credentials" || drawer === "digital-identity" ? "sm:w-[min(720px,100vw)]" : "sm:w-[640px]";

  return (
    <div className="orca-settings-section orca-settings-compliance-section">
      <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-5 py-4">
        <h2 className="text-lg font-black text-[var(--nc-foreground)]">
          {L("الامتثال والربط الحكومي", "Compliance & Gov Integrations")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
          {L(
            "المصدر الوحيد والموحد لإدارة هويات الربط مع بوابات إيجار والزكاة والضريبة والجمارك (ZATCA).",
            "Unified source of truth for managing integration identities with Ejar and ZATCA portals.",
          )}
        </p>
      </div>

      {/* 1. Compliance status summary */}
      <SmartCard className="orca-workspace-panel p-5">
        <h3 className="text-base font-black text-[var(--nc-foreground)]">
          {L("ملخص حالة الامتثال", "Compliance status summary")}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                item.ok
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.ok ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <div>
                <div className="text-xs font-bold text-[var(--nc-foreground-muted)]">{item.label}</div>
                <div
                  className={`text-sm font-black ${
                    item.ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {item.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SmartCard>

      {/* Row: company digital identity | shared credentials */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SmartCard className="orca-settings-card flex min-h-[210px] flex-col gap-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
              <i className="ph-bold ph-identification-badge text-base text-[var(--nc-foreground)]" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-[var(--nc-foreground)]">
                {L("الهوية الرقمية للمنشأة", "Company digital identity")}
              </h3>
              <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
                {L("السجل التجاري، الرقم الضريبي، والعنوان الوطني.", "Commercial registry, VAT number, and national address.")}
              </p>
            </div>
          </div>
          <div className="mt-auto border-t border-[var(--nc-border)] pt-4">
            <SettingsButton
              variant="secondary"
              className="w-[132px] justify-center"
              onClick={() => openDrawer("digital-identity")}
            >
              {L("تعديل", "Edit")}
            </SettingsButton>
          </div>
        </SmartCard>

        <SmartCard className="orca-settings-card flex min-h-[210px] flex-col gap-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
              <i className="ph-bold ph-key text-base text-[var(--nc-foreground)]" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-[var(--nc-foreground)]">
                {L("بيانات الاعتماد المشتركة", "Shared credentials")}
              </h3>
              <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
                {L("مفاتيح التكامل المشتركة بين ZATCA و Ejar.", "Integration keys shared between ZATCA and Ejar.")}
              </p>
            </div>
          </div>
          <div className="mt-auto border-t border-[var(--nc-border)] pt-4">
            <SettingsButton
              type="button"
              variant="primary"
              className="w-[132px] justify-center"
              onClick={() => openDrawer("shared-credentials")}
            >
              {L("ربط", "Connect")}
            </SettingsButton>
          </div>
        </SmartCard>
      </div>

      {/* Row: ZATCA integration | Ejar integration */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SmartCard className="orca-settings-card flex min-h-[210px] flex-col gap-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
              <i className="ph-bold ph-buildings text-base text-[var(--nc-foreground)]" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-[var(--nc-foreground)]">{L("تكامل ZATCA", "ZATCA integration")}</h3>
              <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
                {L("هيئة الزكاة والضريبة والجمارك (FATOORA).", "Zakat, Tax and Customs Authority (FATOORA).")}
              </p>
            </div>
            <span className="ms-auto shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
              {L("متصل", "Connected")}
            </span>
          </div>
          <div className="mt-auto flex gap-2 border-t border-[var(--nc-border)] pt-4">
            <SettingsButton variant="secondary" className="w-[132px] justify-center" onClick={() => openDrawer("zatca")}>
              {L("عرض التفاصيل", "View details")}
            </SettingsButton>
          </div>
        </SmartCard>

        <SmartCard className="orca-settings-card flex min-h-[210px] flex-col gap-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
              <i className="ph-bold ph-house-line text-base text-[var(--nc-foreground)]" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-[var(--nc-foreground)]">{L("تكامل Ejar", "Ejar integration")}</h3>
              <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
                {L("الشبكة الإيجارية (وزارة الإسكان).", "Rental Services Network.")}
              </p>
            </div>
            <span className="ms-auto shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
              {L("قيد المراجعة", "Pending review")}
            </span>
          </div>
          <div className="mt-auto flex gap-2 border-t border-[var(--nc-border)] pt-4">
            <SettingsButton variant="secondary" className="w-[132px] justify-center" onClick={() => openDrawer("ejar")}>
              {L("عرض التفاصيل", "View details")}
            </SettingsButton>
          </div>
        </SmartCard>
      </div>

      {/* Digital liability disclaimer — full width, last */}
      <SmartCard className="orca-settings-card flex min-h-[210px] flex-col gap-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 transition-all duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
            <i className="ph-bold ph-pen-nib text-base text-[var(--nc-foreground)]" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-black text-[var(--nc-foreground)]">
              {L("إقرار المسؤولية الرقمية", "Digital liability disclaimer")}
            </h3>
            <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
              {L("إقرار مطلوب قبل تفعيل بيانات الاعتماد المشتركة.", "Required before activating shared credentials.")}
            </p>
          </div>
          <span
            className={`ms-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${
              hasSigned
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            {hasSigned ? L("موقع", "Signed") : L("غير موقع", "Not signed")}
          </span>
        </div>
        <div className="mt-auto border-t border-[var(--nc-border)] pt-4">
          <SettingsButton
            variant="primary"
            className="w-[132px] justify-center"
            onClick={() => openDrawer("disclaimer")}
            disabled={hasSigned}
          >
            {hasSigned ? L("تم التوقيع", "Already signed") : L("توقيع", "Sign")}
          </SettingsButton>
        </div>
      </SmartCard>

      {drawer &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex">
            <div
              onClick={handleOverlayClick}
              className="absolute inset-0 bg-black/60"
            />

            <div
              className={`absolute inset-y-0 left-0 z-[110] flex w-screen flex-col bg-[var(--nc-surface-solid)] shadow-2xl ${drawerWidthClass}`}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--nc-border)] p-5">
                <h2 ref={titleRef} tabIndex={-1} className="text-lg font-black text-[var(--nc-foreground)] outline-none">
                  {drawer === "shared-credentials" &&
                    L("بيانات الاعتماد المشتركة", "Shared credentials")}
                  {drawer === "digital-identity" &&
                    L("الهوية الرقمية للمنشأة", "Company digital identity")}
                  {drawer === "disclaimer" && L("إقرار المسؤولية الرقمي", "Digital liability disclaimer")}
                  {drawer === "zatca" && L("تفاصيل تكامل ZATCA", "ZATCA integration details")}
                  {drawer === "ejar" && L("تفاصيل تكامل Ejar", "Ejar integration details")}
                </h2>
                <SettingsButton variant="icon" onClick={closeDrawer} aria-label={L("إغلاق", "Close")}>
                  ×
                </SettingsButton>
              </div>

              {drawer === "digital-identity" && (
                <form
                  ref={credentialsFormRef}
                  onSubmit={handleSaveCredentials}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    <SmartCard className="space-y-6 p-5">
                      <div>
                        <h3 className="mb-4 border-b border-[var(--nc-border)] pb-2 text-sm font-bold text-[var(--nc-foreground)]">
                          {L("الهوية الرقمية للمنشأة", "Company digital identity")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("السجل التجاري (CR)", "Commercial Registry (CR)")}
                            </label>
                            <input
                              name="commercialRegistry"
                              type="text"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("الرقم الضريبي (VAT)", "VAT Number")}
                            </label>
                            <input
                              name="vatNumber"
                              type="text"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("العنوان الوطني (كود المبنى)", "National Address (Building Code)")}
                            </label>
                            <input
                              name="nationalAddress"
                              type="text"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </SmartCard>
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton variant="primary" type="submit" disabled={saving}>
                      {saving ? L("جاري الحفظ...", "Saving...") : L("حفظ", "Save")}
                    </SettingsButton>
                  </div>
                </form>
              )}

              {drawer === "shared-credentials" && (
                <form
                  ref={credentialsFormRef}
                  onSubmit={handleSaveCredentials}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    <SmartCard className="space-y-6 p-5">
                      <div>
                        <h3 className="mb-4 border-b border-[var(--nc-border)] pb-2 text-sm font-bold text-[var(--nc-foreground)]">
                          {L("بيانات ZATCA", "ZATCA credentials")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("رمز الأمان الثنائي", "Binary security token")}
                            </label>
                            <input
                              name="zatcaBinarySecurityToken"
                              type="password"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("سر ZATCA", "ZATCA secret")}
                            </label>
                            <input
                              name="zatcaSecret"
                              type="password"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("سر Webhook الخاص بـ ZATCA", "ZATCA webhook secret")}
                            </label>
                            <input
                              name="zatcaWebhookSecret"
                              type="password"
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-4 flex items-center justify-between border-b border-[var(--nc-border)] pb-2 text-sm font-bold text-[var(--nc-foreground)]">
                          <span>{L("بيانات Ejar", "Ejar credentials")}</span>
                          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs uppercase text-amber-600">
                            {L("مشفرة", "Encrypted")}
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("رمز الوصول", "Access token")}
                            </label>
                            <input
                              name="ejarAccessToken"
                              type="password"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("معرف الوسيط", "Broker ID")}
                            </label>
                            <input
                              name="ejarBrokerId"
                              type="text"
                              required
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground-muted)]">
                              {L("سر Webhook الخاص بـ Ejar", "Ejar webhook secret")}
                            </label>
                            <input
                              name="ejarWebhookSecret"
                              type="password"
                              className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 font-mono text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </SmartCard>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--nc-border)] p-4">
                    {!hasSigned && (
                      <p className="text-xs font-bold text-rose-500">
                        {L(
                          "يجب توقيع إقرار المسؤولية الرقمي أولاً لتتمكن من الحفظ.",
                          "You must sign the digital disclaimer first.",
                        )}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <SettingsButton variant="primary" type="submit" disabled={saving || !hasSigned}>
                        {saving
                          ? L("جاري الحفظ...", "Saving...")
                          : L("حفظ وتشفير البيانات", "Save & Encrypt Data")}
                      </SettingsButton>
                    </div>
                  </div>
                </form>
              )}

              {drawer === "zatca" && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    <SmartCard className="space-y-4 p-5">
                      <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
                        <p className="mb-1 text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("حالة الارتباط الفني", "Technical Connection Status")}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-bold text-[var(--nc-foreground)]">{L("متصل", "Connected")}</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
                        <p className="mb-1 text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("صلاحية شهادة CSID", "CSID Certificate Validity")}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {L("صالحة", "Valid")}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-[var(--nc-foreground-muted)]">
                            {L("تاريخ الانتهاء:", "Expires:")}
                            <span dir="ltr">2027-12-31</span>
                          </span>
                        </div>
                      </div>
                    </SmartCard>
                  </div>
                  <div className="flex shrink-0 gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton variant="secondary" onClick={() => openDrawer("shared-credentials")}>
                      {L("تعديل بيانات الاعتماد", "Edit credentials")}
                    </SettingsButton>
                  </div>
                </div>
              )}

              {drawer === "ejar" && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    <SmartCard className="space-y-4 p-5">
                      <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
                        <p className="mb-1 text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("حالة الارتباط الفني", "Technical Connection Status")}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                          <span className="text-sm font-bold text-[var(--nc-foreground)]">
                            {L("قيد المراجعة", "Pending Review")}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4">
                        <p className="mb-1 text-xs font-bold text-[var(--nc-foreground-muted)]">
                          {L("حالة توثيق الوساطة", "Brokerage Authentication")}
                        </p>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {L("بانتظار الاعتماد", "Awaiting Approval")}
                        </span>
                      </div>
                    </SmartCard>
                  </div>
                  <div className="flex shrink-0 gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton variant="secondary" onClick={() => openDrawer("shared-credentials")}>
                      {L("تعديل بيانات الاعتماد", "Edit credentials")}
                    </SettingsButton>
                  </div>
                </div>
              )}

              {drawer === "disclaimer" && showSignatureModal && (
                <form onSubmit={handleSign} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    <SmartCard className="p-5">
                      <div className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4 text-justify text-sm leading-relaxed text-[var(--nc-foreground-muted)]">
                        {isArabic ? (
                          <p>
                            بصفتي الممثل النظامي المفوض لهذه المنشأة، أقر بأن جميع
                            البيانات المدخلة صحيحة وممثلة للمنشأة بشكل كامل. وأوافق على
                            تحمل المسؤولية الرقمية الكاملة عن العمليات الصادرة والواردة من
                            بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)، مع إخلاء طرف
                            مزود النظام ORCA من أي التزامات قانونية أو انقطاع ناتج عن
                            إساءة استخدام أو تسريب مفاتيح الربط خارج سياق المنشأة.
                          </p>
                        ) : (
                          <p>
                            As the authorized legal representative of this entity, I
                            acknowledge that all entered data is accurate and fully
                            represents the entity. I agree to bear full digital
                            responsibility for operations inbound and outbound from Ejar
                            and ZATCA portals, and I hold the system provider (ORCA)
                            harmless against any legal liabilities or disruptions
                            resulting from misuse or credential leakage outside the organization
                            context.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold text-[var(--nc-foreground)]">
                          {L("الاسم الكامل للمفوض بالتوقيع", "Full Name of Authorized Signatory")}
                        </label>
                        <input
                          type="text"
                          required
                          value={signatureName}
                          onChange={(e) => {
                            setSignatureName(e.target.value);
                            if (signatureError) setSignatureError(null);
                          }}
                          className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm font-bold text-[var(--nc-foreground)] focus:border-[var(--nc-accent-border)] focus:outline-none"
                          placeholder={L("اكتب اسمك الكامل للمصادقة", "Type your full name to certify")}
                        />
                        {signatureError && (
                          <p className="mt-2 text-xs font-bold text-rose-500">{signatureError}</p>
                        )}
                      </div>
                    </SmartCard>
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-[var(--nc-border)] p-4">
                    <SettingsButton variant="primary" type="submit" disabled={saving}>
                      {saving ? L("جاري التوثيق...", "Signing...") : L("أوافق وأقر التوقيع", "I Agree and Sign")}
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
