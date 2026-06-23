"use client";

import { useState } from "react";
import { SmartCard } from "@/components/ui/SmartCard";

export default function SettingsCompliance({
  lang,
  isArabic,
}: {
  lang: "AR" | "EN";
  isArabic: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"credentials" | "status">(
    "credentials",
  );
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) return;
    setSaving(true);
    setTimeout(() => {
      setHasSigned(true);
      setShowSignatureModal(false);
      setSaving(false);
    }, 800);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--nc-foreground)]">
            {isArabic
              ? "الامتثال والربط الحكومي"
              : "Compliance & Gov Integrations"}
          </h2>
          <p className="text-sm text-[var(--nc-foreground-muted)] mt-1 max-w-2xl">
            {isArabic
              ? "المصدر الوحيد والموحد لإدارة هويات الربط مع بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)."
              : "Unified source of truth for managing integration identities with Ejar and ZATCA portals."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasSigned ? (
            <button
              onClick={() => setShowSignatureModal(true)}
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-all"
            >
              <i className="ph-pen-nib" />
              {isArabic
                ? "إقرار المسؤولية الرقمي"
                : "Digital Disclaimer Signature"}
            </button>
          ) : (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <i className="ph-check-circle" />
              {isArabic ? "موقع ومصادق عليه" : "Signed & Verified"}
            </span>
          )}
        </div>
      </div>

      <nav className="flex gap-2 border-b border-[var(--nc-border)] pb-4">
        <button
          onClick={() => setActiveTab("credentials")}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === "credentials" ? "bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]" : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)]"}`}
        >
          {isArabic ? "بيانات الاعتماد المشتركة" : "Shared Credentials"}
        </button>
        <button
          onClick={() => setActiveTab("status")}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === "status" ? "bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]" : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)]"}`}
        >
          {isArabic
            ? "حالة الارتباط والصلاحية"
            : "Connection & Validity Status"}
        </button>
      </nav>

      {activeTab === "credentials" && (
        <SmartCard className="p-6">
          <form
            onSubmit={handleSaveCredentials}
            className="space-y-6 max-w-3xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <h3 className="font-bold text-base text-[var(--nc-foreground)] mb-4 pb-2 border-b border-[var(--nc-border)]">
                  {isArabic
                    ? "الهوية الرقمية للمنشأة"
                    : "Company Digital Identity"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic
                        ? "السجل التجاري (CR)"
                        : "Commercial Registry (CR)"}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic ? "الرقم الضريبي (VAT)" : "VAT Number"}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic
                        ? "العنوان الوطني (كود المبنى)"
                        : "National Address (Building Code)"}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)]"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <h3 className="font-bold text-base text-[var(--nc-foreground)] mb-4 pb-2 border-b border-[var(--nc-border)] flex items-center justify-between">
                  <span>
                    {isArabic
                      ? "مفاتيح التكامل (ZATCA / Ejar)"
                      : "Integration Keys (ZATCA / Ejar)"}
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded uppercase">
                    {isArabic ? "مشفرة" : "Encrypted"}
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic ? "معرف العميل (Client ID)" : "Client ID"}
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic
                        ? "السر الخاص بالعميل (Client Secret)"
                        : "Client Secret"}
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving || !hasSigned}
                className="bg-[var(--nc-accent)] text-slate-950 px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {saving
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "حفظ وتشفير البيانات"
                    : "Save & Encrypt Data"}
              </button>
              {!hasSigned && (
                <p className="text-xs text-rose-500 font-bold self-center">
                  {isArabic
                    ? "يجب توقيع إقرار المسؤولية الرقمي أولاً لتتمكن من الحفظ."
                    : "You must sign the digital disclaimer first."}
                </p>
              )}
            </div>
          </form>
        </SmartCard>
      )}

      {activeTab === "status" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SmartCard className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="w-12 h-12 bg-[var(--nc-surface-strong)] rounded-2xl flex items-center justify-center border border-[var(--nc-border)]">
                <i className="ph-buildings text-2xl text-[var(--nc-foreground)]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--nc-foreground)]">
                  ZATCA (FATOORA)
                </h3>
                <p className="text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic
                    ? "هيئة الزكاة والضريبة والجمارك"
                    : "Zakat, Tax and Customs Authority"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[var(--nc-surface-strong)] rounded-xl border border-[var(--nc-border)]">
                <p className="text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                  {isArabic
                    ? "حالة الارتباط الفني"
                    : "Technical Connection Status"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="font-bold text-[var(--nc-foreground)] text-sm">
                    {isArabic ? "متصل" : "Connected"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[var(--nc-surface-strong)] rounded-xl border border-[var(--nc-border)]">
                <p className="text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                  {isArabic ? "صلاحية شهادة CSID" : "CSID Certificate Validity"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {isArabic ? "صالحة" : "Valid"}
                  </span>
                  <span className="text-[10px] text-[var(--nc-foreground-muted)] flex items-center gap-1 font-mono">
                    {isArabic ? "تاريخ الانتهاء:" : "Exp:"}
                    <span dir="ltr">2027-12-31</span>
                  </span>
                </div>
              </div>
            </div>
          </SmartCard>

          <SmartCard className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="w-12 h-12 bg-[var(--nc-surface-strong)] rounded-2xl flex items-center justify-center border border-[var(--nc-border)]">
                <i className="ph-house-line text-2xl text-[var(--nc-foreground)]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--nc-foreground)]">
                  Ejar (إيجار)
                </h3>
                <p className="text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic
                    ? "الشبكة الإيجارية (وزارة الإسكان)"
                    : "Rental Services Network"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[var(--nc-surface-strong)] rounded-xl border border-[var(--nc-border)]">
                <p className="text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                  {isArabic
                    ? "حالة الارتباط الفني"
                    : "Technical Connection Status"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                  <span className="font-bold text-[var(--nc-foreground)] text-sm">
                    {isArabic ? "قيد المراجعة" : "Pending Review"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[var(--nc-surface-strong)] rounded-xl border border-[var(--nc-border)]">
                <p className="text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                  {isArabic ? "حالة توثيق الوساطة" : "Brokerage Authentication"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {isArabic ? "بانتظار الاعتماد" : "Awaiting Approval"}
                  </span>
                </div>
              </div>
            </div>
          </SmartCard>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <SmartCard className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-[var(--nc-border)] pb-4 mb-6">
              <h3 className="text-xl font-black text-[var(--nc-foreground)]">
                {isArabic
                  ? "إقرار المسؤولية الرقمي"
                  : "Digital Liability Disclaimer"}
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="prose prose-sm dark:prose-invert text-[var(--nc-foreground-muted)] mb-6 text-justify leading-relaxed">
              {isArabic ? (
                <p>
                  بصفتي الممثل النظامي المفوض لهذه المنشأة، أقر بأن جميع
                  البيانات المدخلة صحيحة وممثلة للمنشأة بشكل كامل. وأوافق على
                  تحمل المسؤولية الرقمية الكاملة عن العمليات الصادرة والواردة من
                  بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)، مع إخلاء طرف
                  مزود النظام ORCA من أي التزامات قانونية أو انقطاع ناتج عن
                  إساءة استخدام أو تسريب مفاتيح الربط خارج سياق المستأجر.
                </p>
              ) : (
                <p>
                  As the authorized legal representative of this entity, I
                  acknowledge that all entered data is accurate and fully
                  represents the entity. I agree to bear full digital
                  responsibility for operations inbound and outbound from Ejar
                  and ZATCA portals, and I hold the system provider (ORCA)
                  harmless against any legal liabilities or disruptions
                  resulting from misuse or credential leakage outside the tenant
                  context.
                </p>
              )}
            </div>

            <form onSubmit={handleSign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--nc-foreground)] mb-2">
                  {isArabic
                    ? "الاسم الكامل للمفوض بالتوقيع"
                    : "Full Name of Authorized Signatory"}
                </label>
                <input
                  type="text"
                  required
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)] font-bold focus:outline-none focus:border-[var(--nc-accent-border)]"
                  placeholder={
                    isArabic
                      ? "اكتب اسمك الكامل للمصادقة"
                      : "Type your full name to certify"
                  }
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={saving || !signatureName.trim()}
                  className="flex-1 bg-amber-500 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-amber-400 transition-colors"
                >
                  {saving
                    ? isArabic
                      ? "جاري التوثيق..."
                      : "Signing..."
                    : isArabic
                      ? "أوافق وأقر التوقيع"
                      : "I Agree and Sign"}
                </button>
              </div>
            </form>
          </SmartCard>
        </div>
      )}
    </div>
  );
}
