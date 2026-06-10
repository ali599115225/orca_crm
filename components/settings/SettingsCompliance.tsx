'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkComplianceReadinessAction,
  updateTenantComplianceDetailsAction,
  signComplianceDisclaimerAction,
  activateGovernmentConnectionAction,
  getTenantComplianceInfoAction,
  saveTenantCredentialsAction
} from '@/app/actions/compliance';
import { SmartCard } from '@/components/ui/SmartCard';

interface SettingsComplianceProps {
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

const TRANSLATIONS = {
  AR: {
    complianceTitle: "بوابة الربط والامتثال الحكومي (إيجار وزاتكا)",
    complianceDesc: "إدارة بيانات الاعتماد المشفرة للربط بالمنصات الحكومية، وفحص مدى التزام المنشأة بالمعايير التشغيلية واللوائح القانونية لعام ٢٠٢٦م.",
    credentialsFormTitle: "مفاتيح وبيانات الربط الحكومي الآمنة",
    credentialsFormDesc: "يتم تشفير هذه البيانات فوراً وتخزينها بأمان في قاعدة البيانات الخاصة بـ tenantId الخاص بك.",
    clientIdLabel: "معرف العميل (Client ID)",
    clientSecretLabel: "السر الخاص بالعميل (Client Secret)",
    apiKeyLabel: "مفتاح واجهة البرمجيات (API Key)",
    zatcaCredsLabel: "بيانات اعتماد زاتكا/إيجار (ZATCA / Eijar Credentials Payload)",
    saveAndEncryptBtn: "حفظ وتشفير البيانات الآمنة 🔒",
    savingEncrypting: "جاري التشفير والحفظ...",
    savedStatus: "محفوظ بقاعدة البيانات (مُشفر)",
    notSavedStatus: "غير معين",
    checklistTitle: "قائمة الحوكمة والامتثال الرقمي (Governance Checklist)",
    checklistDesc: "متابعة الشروط الإلزامية المطلوبة لتفعيل البوابات الحكومية بشكل فوري ولحظي.",
    profileCompletenessLabel: "اكتمال بيانات الملف الأساسي للشركة",
    profileCompletenessDesc: "(السجل التجاري، الرقم الضريبي، العنوان الوطني)",
    crInput: "السجل التجاري (١٠ أرقام)",
    vatInput: "الرقم الضريبي (١٥ رقماً يبدأ بـ ٣)",
    addressInput: "العنوان الوطني الكامل",
    saveProfileBtn: "تحديث بيانات الملف",
    savingProfile: "جاري التحديث...",
    disclaimerLabel: "إقرار المسؤولية الرقمي (ميثاق الحوكمة)",
    disclaimerLink: "اضغط لفتح نموذج التوقيع الرقمي ✍",
    disclaimerSigned: "تم التوقيع والموافقة رقمياً",
    saherLabel: "صحة وتنسيق بيانات الاعتماد (الوكيل ساهر)",
    saherDesc: "وكيل الامتثال ساهر يؤكد صحة صياغة المفاتيح وسلامتها.",
    saherCompliant: "مكتملة ومؤكدة وصالحة",
    saherNonCompliant: "غير صالحة أو مفقودة",
    statusIndicatorTitle: "مركز مراقبة الامتثال لزاتكا وإيجار (ZATCA / Ejar)",
    statusLabel: "حالة الربط والامتثال:",
    csidLabel: "شهادة الامتثال الفنية (CSID):",
    statusConnected: "مرتبط ونشط (آمن)",
    statusVerifying: "جاري التحقق (مراجعة الطلب)",
    statusDisconnected: "غير مرتبط",
    csidValid: "صالحة ونشطة",
    csidInvalid: "غير صالحة أو مفقودة",
    disclaimerModalTitle: "إقرار المسؤولية القانونية والتشغيلية الرقمي",
    disclaimerText: "بصفتي المسؤول والمطور العقاري المفوض لهذه المنشأة، أقر بأن جميع البيانات المدخلة (السجل التجاري، الرقم الضريبي، بيانات الاعتماد) صحيحة وممثلة للمنشأة بشكل كامل. وأوافق على تحمل المسؤولية الرقمية الكاملة عن العمليات الصادرة والواردة من بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)، مع إخلاء طرف كامل لمزود النظام ORCA من أي انقطاع أو استخدام غير مصرح به ناتج عن تسريب مفاتيح الربط الخاصة بنا خارج سياق المستأجر.",
    agreeCheckboxLabel: "أوافق على بنود إقرار المسؤولية الرقمي كاملاً",
    signNameLabel: "اسم المفوض بالتوقيع والبريد الإلكتروني",
    signBtn: "اعتماد التوقيع الرقمي وحفظه بالسجل 📝",
    signing: "جاري تسجيل التوقيع الرقمي...",
    activateBtn: "تفعيل الربط والتشغيل الفوري ⚡",
    activating: "جاري التفعيل والتحقق من البوابة...",
    activationDisabledAlert: "تنبيه: لا يمكنك تفعيل الربط حتى تكتمل كافة بنود قائمة الامتثال والحوكمة الواردة أعلاه.",
    activationSuccess: "تم تفعيل الربط الحكومي بنجاح! حالة النظام الآن نشطة.",
    saveCredentialsSuccess: "تم حفظ وتشفير مفاتيح الربط الخاصة بك بنجاح.",
    saveProfileSuccess: "تم تحديث بيانات ملف الشركة بنجاح."
  },
  EN: {
    complianceTitle: "Government Connection & Compliance Portal (Ejar & ZATCA)",
    complianceDesc: "Manage encrypted credentials for government APIs and monitor operational compliance for 2026.",
    credentialsFormTitle: "Secure Government API Credentials",
    credentialsFormDesc: "This data is encrypted instantly and stored securely within your tenant context.",
    clientIdLabel: "Client ID",
    clientSecretLabel: "Client Secret",
    apiKeyLabel: "API Key",
    zatcaCredsLabel: "ZATCA / Ejar Credentials Payload",
    saveAndEncryptBtn: "Save & Encrypt Credentials 🔒",
    savingEncrypting: "Encrypting and saving...",
    savedStatus: "Saved in Database (Encrypted)",
    notSavedStatus: "Not Set",
    checklistTitle: "Governance & Compliance Checklist",
    checklistDesc: "Monitor core prerequisites for government integrations in real-time.",
    profileCompletenessLabel: "Profile Data Completeness",
    profileCompletenessDesc: "(Commercial Registry, VAT, National Address)",
    crInput: "Commercial Registry (10 digits)",
    vatInput: "VAT Number (15 digits, starts with 3)",
    addressInput: "Full National Address",
    saveProfileBtn: "Update Profile Info",
    savingProfile: "Updating...",
    disclaimerLabel: "Digital Liability Disclaimer Signature",
    disclaimerLink: "Click to open signature modal ✍",
    disclaimerSigned: "Digitally signed & agreed",
    saherLabel: "Credential Formats (Agent Saher)",
    saherDesc: "Compliance agent Saher verifies credential format and health.",
    saherCompliant: "Verified & Compliant",
    saherNonCompliant: "Invalid or Missing",
    statusIndicatorTitle: "ZATCA & Ejar Connection Monitor",
    statusLabel: "Connection Status:",
    csidLabel: "Technical Certificate (CSID):",
    statusConnected: "Connected & Active (Secure)",
    statusVerifying: "Verifying...",
    statusDisconnected: "Disconnected",
    csidValid: "Valid & Active",
    csidInvalid: "Invalid or Missing",
    disclaimerModalTitle: "Digital Liability & Operational Agreement",
    disclaimerText: "As the authorized representative and real estate developer for this entity, I declare that all entered profile data, registration numbers, and API credentials are correct. I accept full responsibility for all transmissions and entries to/from the Ejar and ZATCA portals, releasing ORCA from any liabilities, interruptions, or security violations occurring from handling of these keys outside the tenant context.",
    agreeCheckboxLabel: "I agree to the terms of the digital liability agreement",
    signNameLabel: "Authorized Signatory Name & Email",
    signBtn: "Record Digital Signature 📝",
    signing: "Recording signature...",
    activateBtn: "Activate Government Connection ⚡",
    activating: "Activating connection...",
    activationDisabledAlert: "Warning: You cannot activate the connection until all governance checklist items are marked compliant.",
    activationSuccess: "Government connection activated successfully! System status is now live.",
    saveCredentialsSuccess: "API credentials saved and encrypted successfully.",
    saveProfileSuccess: "Company profile updated successfully."
  }
};

export default function SettingsCompliance({ lang, isArabic }: SettingsComplianceProps) {
  const router = useRouter();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const dir = isArabic ? 'rtl' : 'ltr';

  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [complianceInfo, setComplianceInfo] = useState<any>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerName, setDisclaimerName] = useState("");
  const [signingDisclaimer, setSigningDisclaimer] = useState(false);

  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activatingConnection, setActivatingConnection] = useState(false);

  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({
    clientId: false,
    clientSecret: false,
    apiKey: false,
    zatcaCredentials: false,
  });

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceData = async () => {
    setLoadingCompliance(true);
    const resReadiness = await checkComplianceReadinessAction(lang);
    const resInfo = await getTenantComplianceInfoAction();
    setLoadingCompliance(false);

    if (resReadiness.success) {
      setComplianceResult(resReadiness.data);
    }
    if (resInfo.success) {
      setComplianceInfo(resInfo.data);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSavingCredentials(true);

    const formData = new FormData(e.currentTarget);
    const clientId = formData.get("clientId") as string;
    const clientSecret = formData.get("clientSecret") as string;
    const apiKey = formData.get("apiKey") as string;
    const zatcaCredentials = formData.get("zatcaCredentials") as string;

    const result = await saveTenantCredentialsAction({
      clientId,
      clientSecret,
      apiKey,
      zatcaCredentials
    });
    setSavingCredentials(false);

    if (result.success) {
      setSuccess(t.saveCredentialsSuccess);
      await fetchComplianceData();
      (e.target as HTMLFormElement).reset();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل حفظ وتشفير مفاتيح الربط." : "Failed to encrypt and save credentials."));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSavingProfile(true);

    const formData = new FormData(e.currentTarget);
    const commercialRegistry = formData.get("commercialRegistry") as string;
    const vatNumber = formData.get("vatNumber") as string;
    const nationalAddress = formData.get("nationalAddress") as string;

    const result = await updateTenantComplianceDetailsAction({
      commercialRegistry,
      vatNumber,
      nationalAddress
    });
    setSavingProfile(false);

    if (result.success) {
      setSuccess(t.saveProfileSuccess);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تحديث بيانات الملف." : "Failed to update profile details."));
    }
  };

  const handleSignDisclaimer = async () => {
    setSuccess(null);
    setError(null);
    setSigningDisclaimer(true);

    const result = await signComplianceDisclaimerAction();
    setSigningDisclaimer(false);
    setIsDisclaimerOpen(false);

    if (result.success) {
      setSuccess(t.disclaimerSigned);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تسجيل التوقيع الرقمي." : "Failed to sign disclaimer."));
    }
  };

  const handleActivateConnection = async () => {
    setSuccess(null);
    setError(null);
    setActivatingConnection(true);

    const result = await activateGovernmentConnectionAction();
    setActivatingConnection(false);

    if (result.success) {
      setSuccess(t.activationSuccess);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(result.error || (isArabic ? "فشل تفعيل الربط الحكومي لعدم استيفاء الشروط." : "Failed to activate government connection."));
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 fade-in">
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Top Banner / Status Indicator */}
      {(() => {
        const hasCreds = complianceInfo?.hasClientId && complianceInfo?.hasClientSecret && complianceInfo?.hasApiKey && complianceInfo?.hasZatcaCredentials;
        const isConnected = complianceInfo?.whatsappConnected;

        let statusText = t.statusDisconnected;
        let statusBadgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";
        let dotColor = "bg-rose-500";
        let csidText = t.csidInvalid;
        let csidBadgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";

        if (isConnected) {
          statusText = t.statusConnected;
          statusBadgeClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";
          dotColor = "bg-emerald-500";
          csidText = t.csidValid;
          csidBadgeClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";
        } else if (hasCreds) {
          statusText = t.statusVerifying;
          statusBadgeClass = "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400";
          dotColor = "bg-amber-500";
          csidText = t.csidValid;
          csidBadgeClass = "bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)]";
        }

        return (
          <SmartCard className="p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-xs font-semibold">
                <i className="ph-bold ph-shield-check"></i> {t.statusIndicatorTitle}
              </div>
              <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
                {t.complianceTitle}
              </h2>
              <p className="text-xs text-[var(--nc-foreground-muted)] font-medium max-w-xl">
                {t.complianceDesc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto shrink-0">
              <div className="p-4 rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] space-y-2">
                <div className="flex justify-between items-center gap-6 text-xs">
                  <span className="text-[var(--nc-foreground-muted)] font-semibold">{t.statusLabel}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${statusBadgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${dotColor} ${isConnected ? 'animate-pulse' : ''}`}></span>
                    {statusText}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-6 text-xs">
                  <span className="text-[var(--nc-foreground-muted)] font-semibold">{t.csidLabel}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[9px] ${csidBadgeClass}`}>
                    {csidText}
                  </span>
                </div>
              </div>
            </div>
          </SmartCard>
        );
      })()}

      {loadingCompliance ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-xs text-[var(--nc-foreground-muted)] font-semibold">{isArabic ? "جاري فحص حالة الامتثال..." : "Checking compliance status..."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

          {/* Left Side: Compliance Checklist & Profile Completeness Forms */}
          <div className="lg:col-span-6 space-y-6">
            <SmartCard className="p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-[var(--nc-foreground)] font-bold text-base border-b border-[var(--nc-border)] pb-3 flex items-center gap-2">
                  <i className="ph-bold ph-list-checks text-[var(--nc-text-secondary)]"></i>
                  {t.checklistTitle}
                </h3>
                <p className="text-xs text-[var(--nc-foreground-muted)] mt-2">{t.checklistDesc}</p>
              </div>

              {/* Checklist items list */}
              <div className="space-y-4">

                {/* Item 1: Profile Completeness */}
                {(() => {
                  const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "profile_completeness")?.status === "COMPLIANT";
                  const itemError = complianceResult?.checklist.find((c: any) => c.id === "profile_completeness")?.error;

                  return (
                    <div className={`p-4 rounded-xl border transition-all ${
                      isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                    }`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[var(--nc-foreground)] flex items-center gap-1.5">
                            {isCompliant ? (
                              <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                            ) : (
                              <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                            )}
                            {t.profileCompletenessLabel}
                          </span>
                          <p className="text-[10px] text-[var(--nc-foreground-muted)]">{t.profileCompletenessDesc}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                          {isCompliant ? (isArabic ? "مكتمل" : "Compliant") : (isArabic ? "غير مكتمل" : "Non-Compliant")}
                        </span>
                      </div>

                      {itemError && (
                        <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                          {itemError}
                        </p>
                      )}

                      {/* Profile fields update form inside checklist card for UX convenience */}
                      <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-[var(--nc-border)] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[var(--nc-foreground-muted)] mb-1">{t.crInput}</label>
                            <input
                              type="text"
                              name="commercialRegistry"
                              defaultValue={complianceInfo?.commercialRegistry}
                              placeholder="1010XXXXXX"
                              required
                              className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[var(--nc-foreground-muted)] mb-1">{t.vatInput}</label>
                            <input
                              type="text"
                              name="vatNumber"
                              defaultValue={complianceInfo?.vatNumber}
                              placeholder="3000XXXXXXXXXXX"
                              required
                              className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--nc-foreground-muted)] mb-1">{t.addressInput}</label>
                          <input
                            type="text"
                            name="nationalAddress"
                            defaultValue={complianceInfo?.nationalAddress}
                            placeholder="الرياض، الياسمين، رمز بريدي 12345"
                            required
                            className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-55"
                        >
                          {savingProfile ? t.savingProfile : t.saveProfileBtn}
                        </button>
                      </form>
                    </div>
                  );
                })()}

                {/* Item 2: Disclaimer Signature */}
                {(() => {
                  const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "digital_signature")?.status === "COMPLIANT";
                  const itemError = complianceResult?.checklist.find((c: any) => c.id === "digital_signature")?.error;

                  return (
                    <div className={`p-4 rounded-xl border transition-all ${
                      isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                    }`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[var(--nc-foreground)] flex items-center gap-1.5">
                            {isCompliant ? (
                              <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                            ) : (
                              <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                            )}
                            {t.disclaimerLabel}
                          </span>
                          <p className="text-[10px] text-[var(--nc-foreground-muted)]">
                            {isCompliant ? t.disclaimerSigned : t.disclaimerLink}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                          {isCompliant ? (isArabic ? "مكتمل" : "Compliant") : (isArabic ? "غير مكتمل" : "Non-Compliant")}
                        </span>
                      </div>

                      {itemError && (
                        <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                          {itemError}
                        </p>
                      )}

                      {!isCompliant && (
                        <button
                          onClick={() => {
                            setDisclaimerAccepted(false);
                            setDisclaimerName("");
                            setIsDisclaimerOpen(true);
                          }}
                          className="mt-3 bg-indigo-500 hover:bg-indigo-600 text-[var(--nc-foreground)] text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ph-bold ph-pen"></i> {isArabic ? "التوقيع على إقرار المسؤولية" : "Sign Digital Disclaimer"}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Item 3: Credential Health (Saher verification check) */}
                {(() => {
                  const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "api_credentials")?.status === "COMPLIANT";
                  const itemError = complianceResult?.checklist.find((c: any) => c.id === "api_credentials")?.error;

                  return (
                    <div className={`p-4 rounded-xl border transition-all ${
                      isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                    }`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[var(--nc-foreground)] flex items-center gap-1.5">
                            {isCompliant ? (
                              <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                            ) : (
                              <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                            )}
                            {t.saherLabel}
                          </span>
                          <p className="text-[10px] text-[var(--nc-foreground-muted)]">{t.saherDesc}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                          {isCompliant ? t.saherCompliant : t.saherNonCompliant}
                        </span>
                      </div>

                      {itemError && (
                        <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                          {itemError}
                        </p>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Activation Button Panel */}
              <div className="pt-4 border-t border-[var(--nc-border)] space-y-4">
                {(() => {
                  const isAllCompliant = complianceResult?.isReady === true;
                  const isConnected = complianceInfo?.whatsappConnected;
                  return (
                    <>
                      <button
                        onClick={handleActivateConnection}
                        disabled={!isAllCompliant || activatingConnection || isConnected}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                          isConnected
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 cursor-not-allowed'
                            : isAllCompliant
                              ? 'bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] cursor-pointer hover:shadow-md'
                              : 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] border border-[var(--nc-border)] cursor-not-allowed'
                        }`}
                      >
                        {activatingConnection ? t.activating : isConnected ? (isArabic ? "✓ الربط مفعل ونشط حالياً" : "✓ Connection active") : t.activateBtn}
                      </button>

                      {!isAllCompliant && !isConnected && (
                        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed">
                          {t.activationDisabledAlert}
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            {complianceResult?.checklist
                              .filter((c: any) => c.status === "NON_COMPLIANT")
                              .map((c: any) => (
                                <li key={c.id}>{isArabic ? c.labelAr : c.labelEn}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </SmartCard>
          </div>

          {/* Right Side: Secure Credentials Input Form */}
          <div className="lg:col-span-6 space-y-6">
            <SmartCard className="p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-[var(--nc-foreground)] font-bold text-base border-b border-[var(--nc-border)] pb-3 flex items-center gap-2">
                  <i className="ph-bold ph-key text-[var(--nc-text-secondary)]"></i>
                  {t.credentialsFormTitle}
                </h3>
                <p className="text-xs text-[var(--nc-foreground-muted)] mt-2">
                  {t.credentialsFormDesc}
                </p>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2">
                {/* Client ID */}
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.clientIdLabel}</label>
                  <div className="relative">
                    <input
                      type={showCredentials.clientId ? "text" : "password"}
                      name="clientId"
                      required
                      placeholder={complianceInfo?.hasClientId ? "••••••••••••••••" : "Client ID..."}
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials(prev => ({ ...prev, clientId: !prev.clientId }))}
                      className="absolute inset-y-0 left-3 flex items-center text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer px-1"
                    >
                      <i className={`ph-bold ${showCredentials.clientId ? "ph-eye-slash" : "ph-eye"}`}></i>
                    </button>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--nc-foreground-muted)] mt-1 block">
                    {complianceInfo?.hasClientId ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                  </span>
                </div>

                {/* Client Secret */}
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.clientSecretLabel}</label>
                  <div className="relative">
                    <input
                      type={showCredentials.clientSecret ? "text" : "password"}
                      name="clientSecret"
                      required
                      placeholder={complianceInfo?.hasClientSecret ? "••••••••••••••••" : "Client Secret..."}
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                      className="absolute inset-y-0 left-3 flex items-center text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer px-1"
                    >
                      <i className={`ph-bold ${showCredentials.clientSecret ? "ph-eye-slash" : "ph-eye"}`}></i>
                    </button>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--nc-foreground-muted)] mt-1 block">
                    {complianceInfo?.hasClientSecret ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                  </span>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.apiKeyLabel}</label>
                  <div className="relative">
                    <input
                      type={showCredentials.apiKey ? "text" : "password"}
                      name="apiKey"
                      required
                      placeholder={complianceInfo?.hasApiKey ? "••••••••••••••••" : "API Key..."}
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials(prev => ({ ...prev, apiKey: !prev.apiKey }))}
                      className="absolute inset-y-0 left-3 flex items-center text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer px-1"
                    >
                      <i className={`ph-bold ${showCredentials.apiKey ? "ph-eye-slash" : "ph-eye"}`}></i>
                    </button>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--nc-foreground-muted)] mt-1 block">
                    {complianceInfo?.hasApiKey ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                  </span>
                </div>

                {/* ZATCA Credentials */}
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.zatcaCredsLabel}</label>
                  <div className="relative">
                    <textarea
                      name="zatcaCredentials"
                      required
                      rows={3}
                      placeholder={complianceInfo?.hasZatcaCredentials ? "••••••••••••••••••••••••••••••••" : "ZATCA private keys payload structure..."}
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--nc-foreground-muted)] mt-1 block">
                    {complianceInfo?.hasZatcaCredentials ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingCredentials}
                  className="w-full py-3.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md disabled:opacity-55"
                >
                  {savingCredentials ? t.savingEncrypting : t.saveAndEncryptBtn}
                </button>
              </form>
            </SmartCard>
          </div>

        </div>
      )}

      {/* Digital Signature Disclaimer Agreement Modal */}
      {isDisclaimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-scale-up" dir={dir}>
            <div className="border-b border-[var(--nc-border)] pb-3 flex justify-between items-center">
              <h3 className="text-[var(--nc-foreground)] font-bold text-base flex items-center gap-2">
                <i className="ph-bold ph-scroll text-[var(--nc-text-secondary)]"></i>
                {t.disclaimerModalTitle}
              </h3>
              <button
                onClick={() => setIsDisclaimerOpen(false)}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-[var(--nc-surface)] border border-[var(--nc-border)] p-4 rounded-xl text-xs md:text-sm text-[var(--nc-foreground-muted)] leading-relaxed max-h-60 overflow-y-auto">
              {t.disclaimerText}
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs text-[var(--nc-foreground)] font-bold font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-[var(--nc-text-secondary)] focus:ring-[var(--nc-accent-border)]"
                />
                <span>{t.agreeCheckboxLabel}</span>
              </label>

              <div>
                <label className="block text-[10px] font-semibold text-[var(--nc-foreground-muted)] mb-2">{t.signNameLabel}</label>
                <input
                  type="text"
                  value={disclaimerName}
                  onChange={(e) => setDisclaimerName(e.target.value)}
                  placeholder="علي محمد (ali.orca@outlook.sa)"
                  required
                  className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                onClick={handleSignDisclaimer}
                disabled={!disclaimerAccepted || disclaimerName.trim().length < 3 || signingDisclaimer}
                className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {signingDisclaimer ? t.signing : t.signBtn}
              </button>
              <button
                onClick={() => setIsDisclaimerOpen(false)}
                className="bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                ✕ {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
