"use client";

import { useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";

type IntegrationCategory = "payments" | "email" | "communications";
type IntegrationProvider =
  | "moyasar"
  | "hyperpay"
  | "paytabs"
  | "tap"
  | "ngenius"
  | "resend"
  | "ses"
  | "sendgrid"
  | "mailgun"
  | "postmark"
  | "whatsapp";

interface CategoryDef {
  id: IntegrationCategory;
  ar: string;
  en: string;
  icon: string;
}

interface ProviderDef {
  id: IntegrationProvider;
  categoryId: IntegrationCategory;
  name: string;
  icon: string;
  fields: {
    key: string;
    labelAr: string;
    labelEn: string;
    type: "text" | "password" | "checkbox";
  }[];
  descriptionAr: string;
  descriptionEn: string;
  isActive?: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "payments",
    ar: "الدفع والتحصيل",
    en: "Payments & Collections",
    icon: "ph-credit-card",
  },
  {
    id: "email",
    ar: "البريد الإلكتروني",
    en: "Email Services",
    icon: "ph-envelope-simple",
  },
  {
    id: "communications",
    ar: "الاتصالات والمراسلة",
    en: "Communications & Messaging",
    icon: "ph-chat-circle-text",
  },
];

const PROVIDERS: ProviderDef[] = [
  {
    id: "moyasar",
    categoryId: "payments",
    name: "Moyasar",
    icon: "ph-currency-circle-dollar",
    descriptionAr:
      "بوابة ميسر للدفع الإلكتروني مع دعم روابط الدفع (Payment Links).",
    descriptionEn: "Moyasar payment gateway with Payment Links support.",
    fields: [
      {
        key: "secretKey",
        labelAr: "المفتاح السري (Secret Key)",
        labelEn: "Secret Key",
        type: "password",
      },
      {
        key: "publishableKey",
        labelAr: "المفتاح العام (Publishable Key)",
        labelEn: "Publishable Key",
        type: "text",
      },
      {
        key: "enablePaylink",
        labelAr: "تفعيل روابط الدفع (Payment Links Capability)",
        labelEn: "Enable Payment Links Capability",
        type: "checkbox",
      },
    ],
  },
  {
    id: "hyperpay",
    categoryId: "payments",
    name: "HyperPay",
    icon: "ph-currency-circle-dollar",
    descriptionAr: "بوابة هايبر باي للدفع الإلكتروني المتكامل.",
    descriptionEn: "HyperPay integrated payment gateway.",
    fields: [
      {
        key: "entityId",
        labelAr: "معرف المنشأة (Entity ID)",
        labelEn: "Entity ID",
        type: "text",
      },
      {
        key: "bearerToken",
        labelAr: "رمز الوصول (Bearer Token)",
        labelEn: "Bearer Token",
        type: "password",
      },
    ],
  },
  {
    id: "paytabs",
    categoryId: "payments",
    name: "PayTabs",
    icon: "ph-currency-circle-dollar",
    descriptionAr: "بوابة بيتابس للدفع الإلكتروني الموثوق.",
    descriptionEn: "PayTabs secure payment gateway.",
    fields: [
      {
        key: "profileId",
        labelAr: "معرف الملف (Profile ID)",
        labelEn: "Profile ID",
        type: "text",
      },
      {
        key: "serverKey",
        labelAr: "مفتاح الخادم (Server Key)",
        labelEn: "Server Key",
        type: "password",
      },
    ],
  },
  {
    id: "tap",
    categoryId: "payments",
    name: "Tap Payments",
    icon: "ph-currency-circle-dollar",
    descriptionAr: "بوابة تاب بايمنتس للدفع الإلكتروني.",
    descriptionEn: "Tap Payments gateway.",
    fields: [
      {
        key: "secretApiKey",
        labelAr: "المفتاح السري (Secret API Key)",
        labelEn: "Secret API Key",
        type: "password",
      },
    ],
  },
  {
    id: "ngenius",
    categoryId: "payments",
    name: "N-Genius",
    icon: "ph-currency-circle-dollar",
    descriptionAr: "بوابة الدفع N-Genius من Network International.",
    descriptionEn: "N-Genius payment gateway by Network International.",
    fields: [
      {
        key: "outletId",
        labelAr: "معرف المنفذ (Outlet ID)",
        labelEn: "Outlet ID",
        type: "text",
      },
      {
        key: "apiKey",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        labelEn: "API Key",
        type: "password",
      },
    ],
  },
  {
    id: "resend",
    categoryId: "email",
    name: "Resend",
    icon: "ph-paper-plane-right",
    descriptionAr: "خدمة إرسال البريد الإلكتروني السريعة (Resend).",
    descriptionEn: "Fast transactional email service (Resend).",
    fields: [
      {
        key: "apiKey",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        labelEn: "API Key",
        type: "password",
      },
      {
        key: "fromEmail",
        labelAr: "البريد المرسل منه (From Email)",
        labelEn: "From Email",
        type: "text",
      },
    ],
  },
  {
    id: "ses",
    categoryId: "email",
    name: "Amazon SES",
    icon: "ph-amazon-logo",
    descriptionAr: "خدمة إرسال البريد الإلكتروني عبر خوادم أمازون.",
    descriptionEn: "Amazon Simple Email Service.",
    fields: [
      {
        key: "accessKeyId",
        labelAr: "معرف مفتاح الوصول (Access Key ID)",
        labelEn: "Access Key ID",
        type: "text",
      },
      {
        key: "secretAccessKey",
        labelAr: "مفتاح الوصول السري (Secret Access Key)",
        labelEn: "Secret Access Key",
        type: "password",
      },
      {
        key: "region",
        labelAr: "المنطقة (Region)",
        labelEn: "Region",
        type: "text",
      },
    ],
  },
  {
    id: "sendgrid",
    categoryId: "email",
    name: "SendGrid",
    icon: "ph-paper-plane-right",
    descriptionAr: "خدمة SendGrid لإرسال وإدارة البريد الإلكتروني.",
    descriptionEn: "SendGrid email delivery service.",
    fields: [
      {
        key: "apiKey",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        labelEn: "API Key",
        type: "password",
      },
    ],
  },
  {
    id: "mailgun",
    categoryId: "email",
    name: "Mailgun",
    icon: "ph-paper-plane-right",
    descriptionAr: "خدمة Mailgun للمراسلات البريدية.",
    descriptionEn: "Mailgun email service.",
    fields: [
      {
        key: "apiKey",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        labelEn: "API Key",
        type: "password",
      },
      {
        key: "domain",
        labelAr: "النطاق (Domain)",
        labelEn: "Domain",
        type: "text",
      },
    ],
  },
  {
    id: "postmark",
    categoryId: "email",
    name: "Postmark",
    icon: "ph-paper-plane-right",
    descriptionAr: "خدمة Postmark للبريد الإلكتروني الموثوق.",
    descriptionEn: "Postmark fast and reliable email service.",
    fields: [
      {
        key: "serverToken",
        labelAr: "رمز الخادم (Server Token)",
        labelEn: "Server Token",
        type: "password",
      },
    ],
  },
  {
    id: "whatsapp",
    categoryId: "communications",
    name: "Meta WhatsApp Business",
    icon: "ph-whatsapp-logo",
    isActive: true,
    descriptionAr:
      "ربط رسمي عبر Meta لإدارة المحادثات العقارية وإرسال التنبيهات من الوكلاء (مثال: منصور).",
    descriptionEn:
      "Official Meta WhatsApp integration for real estate conversations and agent alerts.",
    fields: [
      {
        key: "phoneNumberId",
        labelAr: "معرف رقم الهاتف (Phone Number ID)",
        labelEn: "Phone Number ID",
        type: "text",
      },
      {
        key: "wabaId",
        labelAr: "معرف حساب الأعمال (WABA ID)",
        labelEn: "WABA ID",
        type: "text",
      },
      {
        key: "accessToken",
        labelAr: "رمز الوصول الدائم (System User Token)",
        labelEn: "Permanent Access Token",
        type: "password",
      },
      {
        key: "verifyToken",
        labelAr: "رمز تحقق الـ Webhook",
        labelEn: "Webhook Verify Token",
        type: "text",
      },
    ],
  },
];

export default function SettingsIntegrationsHub({
  lang,
}: {
  lang: "AR" | "EN";
}) {
  const isArabic = lang === "AR";
  const [activeCategory, setActiveCategory] =
    useState<IntegrationCategory>("payments");
  const [activeProvider, setActiveProvider] =
    useState<IntegrationProvider | null>("moyasar");
  const [formData, setFormData] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleCategoryChange = (cat: IntegrationCategory) => {
    setActiveCategory(cat);
    const firstProvider = PROVIDERS.find((p) => p.categoryId === cat);
    if (firstProvider) {
      setActiveProvider(firstProvider.id);
    } else {
      setActiveProvider(null);
    }
  };

  const currentProviderDef = PROVIDERS.find((p) => p.id === activeProvider);
  const currentProvidersList = PROVIDERS.filter(
    (p) => p.categoryId === activeCategory,
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProvider) return;

    setSaving(true);
    setSuccessMsg("");
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSuccessMsg(
      isArabic
        ? "تم حفظ إعدادات الربط بنجاح."
        : "Integration settings saved successfully.",
    );
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleInputChange = (
    provider: string,
    key: string,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [provider]: {
        ...(prev[provider] || {}),
        [key]: typeof value === "boolean" ? (value ? "true" : "false") : value,
      },
    }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar - Categories & List */}
      <div className="space-y-6">
        <SmartCard className="p-2">
          <nav
            className="flex xl:flex-col gap-1 overflow-x-auto"
            aria-label={isArabic ? "فئات التكامل" : "Integration Categories"}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex min-w-max items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${activeCategory === cat.id ? "bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]" : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]"}`}
              >
                <i className={`${cat.icon} text-lg`} />
                {isArabic ? cat.ar : cat.en}
              </button>
            ))}
          </nav>
        </SmartCard>

        <SmartCard className="p-3 hidden xl:block">
          <h3 className="text-xs font-bold text-[var(--nc-foreground-muted)] mb-3 px-2">
            {isArabic ? "المزودون المتاحون" : "Available Providers"}
          </h3>
          <div className="space-y-1">
            {currentProvidersList.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setActiveProvider(provider.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-semibold ${activeProvider === provider.id ? "bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)]" : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface)] hover:text-[var(--nc-foreground)]"}`}
              >
                <div className="flex items-center gap-3">
                  <i className={`${provider.icon} text-lg`} />
                  <span>{provider.name}</span>
                </div>
                {provider.isActive && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </SmartCard>
      </div>

      {/* Main Detail Area */}
      <div className="min-w-0">
        {currentProviderDef ? (
          <SmartCard className="p-6 md:p-8">
            <div className="flex items-start justify-between border-b border-[var(--nc-border)] pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--nc-surface-strong)] rounded-2xl flex items-center justify-center border border-[var(--nc-border)]">
                  <i
                    className={`${currentProviderDef.icon} text-2xl text-[var(--nc-foreground)]`}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[var(--nc-foreground)]">
                    {currentProviderDef.name}
                  </h2>
                  <p className="text-sm text-[var(--nc-foreground-muted)] mt-1 max-w-lg">
                    {isArabic
                      ? currentProviderDef.descriptionAr
                      : currentProviderDef.descriptionEn}
                  </p>
                </div>
              </div>
              {currentProviderDef.isActive && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                  {isArabic ? "نشط حالياً" : "Currently Active"}
                </span>
              )}
            </div>

            {successMsg && (
              <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold border border-emerald-500/20">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
              {currentProviderDef.fields.map((field) => {
                const value =
                  formData[currentProviderDef.id]?.[field.key] || "";

                if (field.type === "checkbox") {
                  return (
                    <label
                      key={field.key}
                      className="flex items-center gap-3 p-4 border border-[var(--nc-border)] rounded-xl bg-[var(--nc-surface-strong)] cursor-pointer hover:bg-[var(--nc-surface)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={value === "true"}
                        onChange={(e) =>
                          handleInputChange(
                            currentProviderDef.id,
                            field.key,
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 rounded accent-[var(--nc-accent)]"
                      />
                      <span className="text-sm font-bold text-[var(--nc-foreground)]">
                        {isArabic ? field.labelAr : field.labelEn}
                      </span>
                    </label>
                  );
                }

                return (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-2">
                      {isArabic ? field.labelAr : field.labelEn}
                    </label>
                    <input
                      type={field.type}
                      value={value}
                      onChange={(e) =>
                        handleInputChange(
                          currentProviderDef.id,
                          field.key,
                          e.target.value,
                        )
                      }
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] transition-colors"
                      placeholder={
                        field.type === "password" ? "••••••••••••••••" : ""
                      }
                    />
                  </div>
                );
              })}

              <div className="pt-6 mt-6 border-t border-[var(--nc-border)] flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[var(--nc-accent)] text-slate-950 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-[var(--nc-accent-hover)] disabled:opacity-50"
                >
                  {saving
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isArabic
                      ? "حفظ التكوين"
                      : "Save Configuration"}
                </button>
                <button
                  type="button"
                  className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground)] hover:bg-[var(--nc-surface)] px-6 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </SmartCard>
        ) : (
          <div className="h-full min-h-[400px] flex items-center justify-center border border-[var(--nc-border)] border-dashed rounded-3xl bg-[var(--nc-surface)]/50">
            <p className="text-[var(--nc-foreground-muted)] font-semibold text-sm">
              {isArabic
                ? "الرجاء اختيار مزود من القائمة"
                : "Please select a provider from the list"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
