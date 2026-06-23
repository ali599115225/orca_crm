"use client";

import { useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import { testAIProviderConnectionAction } from "@/app/actions/ai-providers"; // We will create this

type ProviderType = "openai" | "anthropic" | "gemini" | "azure" | "bedrock";

interface AIProvider {
  id: ProviderType;
  name: string;
  icon: string;
  fields: {
    key: string;
    labelEn: string;
    labelAr: string;
    type: "text" | "password";
  }[];
}

const PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "ph-open-ai-logo",
    fields: [
      {
        key: "apiKey",
        labelEn: "API Key",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        type: "password",
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "ph-brain",
    fields: [
      {
        key: "apiKey",
        labelEn: "API Key",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        type: "password",
      },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "ph-google-logo",
    fields: [
      {
        key: "apiKey",
        labelEn: "API Key",
        labelAr: "مفتاح واجهة البرمجة (API Key)",
        type: "password",
      },
    ],
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    icon: "ph-microsoft-logo",
    fields: [
      {
        key: "endpoint",
        labelEn: "Endpoint URL",
        labelAr: "رابط نقطة النهاية (Endpoint)",
        type: "text",
      },
      {
        key: "apiKey",
        labelEn: "API Key",
        labelAr: "مفتاح الوصول (API Key)",
        type: "password",
      },
      {
        key: "deploymentName",
        labelEn: "Deployment Name",
        labelAr: "اسم النشر (Deployment)",
        type: "text",
      },
    ],
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    icon: "ph-amazon-logo",
    fields: [
      {
        key: "accessKey",
        labelEn: "Access Key ID",
        labelAr: "معرف مفتاح الوصول",
        type: "text",
      },
      {
        key: "secretKey",
        labelEn: "Secret Access Key",
        labelAr: "مفتاح الوصول السري",
        type: "password",
      },
      {
        key: "region",
        labelEn: "Region",
        labelAr: "المنطقة (Region)",
        type: "text",
      },
    ],
  },
];

export default function SettingsAIProviders() {
  const { lang } = useApp();
  const isArabic = lang === "AR";

  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setStatus("testing");
    setErrorMessage("");

    try {
      const result = await testAIProviderConnectionAction(
        selectedProvider,
        formData,
      );
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(
          result.error ||
            (isArabic
              ? "فشل الاتصال بالمزود."
              : "Failed to connect to provider."),
        );
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(
        err.message ||
          (isArabic ? "حدث خطأ غير متوقع." : "An unexpected error occurred."),
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <SmartCard className="p-4">
          <h3 className="font-bold text-[var(--nc-foreground)] mb-4">
            {isArabic ? "مزودو الذكاء الاصطناعي" : "AI Providers"}
          </h3>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p.id);
                  setStatus("idle");
                  setFormData({});
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedProvider === p.id ? "bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-foreground)]" : "bg-[var(--nc-surface)] border-transparent text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]"}`}
              >
                <i className={`${p.icon} text-lg`} />
                <span className="font-semibold text-sm">{p.name}</span>
              </button>
            ))}
          </div>
        </SmartCard>
      </div>

      <div className="lg:col-span-8">
        {selectedProvider ? (
          <SmartCard className="p-6">
            <h3 className="font-bold text-[var(--nc-foreground)] text-lg mb-2">
              {isArabic ? "إعدادات الربط:" : "Connection Settings:"}{" "}
              {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
            </h3>
            <p className="text-[var(--nc-foreground-muted)] text-sm mb-6">
              {isArabic
                ? "يتم تشفير هذه البيانات وتخزينها بشكل آمن. يمكنك اختبار الاتصال لضمان صلاحية المفاتيح قبل الحفظ."
                : "These credentials are encrypted and stored securely. Test the connection to ensure validity before saving."}
            </p>

            <form onSubmit={handleTestConnection} className="space-y-4">
              {PROVIDERS.find((p) => p.id === selectedProvider)?.fields.map(
                (field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-[var(--nc-foreground-muted)] mb-1">
                      {isArabic ? field.labelAr : field.labelEn}
                    </label>
                    <input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.key]: e.target.value,
                        })
                      }
                      required
                      className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] transition-colors"
                    />
                  </div>
                ),
              )}

              <div className="pt-4 flex items-center gap-4 border-t border-[var(--nc-border)]">
                <button
                  type="submit"
                  disabled={status === "testing"}
                  className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground)] hover:bg-[var(--nc-surface)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {status === "testing"
                    ? isArabic
                      ? "جاري الاختبار..."
                      : "Testing..."
                    : isArabic
                      ? "اختبار الاتصال ⚡"
                      : "Test Connection ⚡"}
                </button>
                <button
                  type="button"
                  disabled={status !== "success"}
                  className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {isArabic ? "حفظ وتشفير البيانات 🔒" : "Save & Encrypt 🔒"}
                </button>
              </div>

              {status === "success" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl mt-4">
                  {isArabic
                    ? "✅ نجاح الاتصال! المفاتيح صالحة ويمكنك حفظها."
                    : "✅ Connection successful! Keys are valid and can be saved."}
                </div>
              )}
              {status === "error" && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl mt-4">
                  ❌ {errorMessage}
                </div>
              )}
            </form>
          </SmartCard>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-[var(--nc-border)] rounded-3xl p-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--nc-surface-strong)] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-[var(--nc-foreground-muted)]">
                <i className="ph-cpu" />
              </div>
              <h3 className="text-lg font-bold text-[var(--nc-foreground)] mb-2">
                {isArabic ? "اختر مزود الخدمة" : "Select a Provider"}
              </h3>
              <p className="text-[var(--nc-foreground-muted)] text-sm max-w-xs mx-auto">
                {isArabic
                  ? "قم باختيار مزود الذكاء الاصطناعي من القائمة الجانبية لإدارة مفاتيح الربط واختبارها."
                  : "Select an AI provider from the sidebar to manage API keys and test connections."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-12 mt-6">
        <SmartCard className="overflow-hidden">
          <div className="p-5 border-b border-[var(--nc-border)]">
            <h3 className="font-bold text-[var(--nc-foreground)] text-lg">
              {isArabic ? "تعيين مزود ونموذج لكل وكيل" : "Assign Provider & Model per Agent"}
            </h3>
            <p className="text-[var(--nc-foreground-muted)] text-sm mt-1">
              {isArabic
                ? "حدد المزود الأساسي والنموذج ونظام الترتيب البديل (Fallback) لكل وكيل."
                : "Select the primary provider, model, and fallback priority for each agent."}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] border-b border-[var(--nc-border)]">
                <tr>
                  <th className="px-5 py-3 text-start font-bold">{isArabic ? "الوكيل" : "Agent"}</th>
                  <th className="px-5 py-3 text-start font-bold">{isArabic ? "المزود الأساسي" : "Default Provider"}</th>
                  <th className="px-5 py-3 text-start font-bold">{isArabic ? "النموذج" : "Default Model"}</th>
                  <th className="px-5 py-3 text-start font-bold">Fallback 1</th>
                  <th className="px-5 py-3 text-start font-bold">Fallback 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nc-border)]">
                {[
                  { id: 'MANSOUR', nameAr: 'منصور', nameEn: 'Mansour' },
                  { id: 'SAHER', nameAr: 'ساهر', nameEn: 'Saher' },
                  { id: 'SANAD', nameAr: 'سند', nameEn: 'Sanad' },
                  { id: 'BASEER', nameAr: 'بصير', nameEn: 'Baseer' },
                  { id: 'KHABEER', nameAr: 'خبير', nameEn: 'Khabeer' },
                ].map((agent) => (
                  <tr key={agent.id} className="hover:bg-[var(--nc-surface)]">
                    <td className="px-5 py-4 font-bold text-[var(--nc-foreground)]">
                      {isArabic ? agent.nameAr : agent.nameEn}
                    </td>
                    <td className="px-5 py-4">
                      <select className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--nc-foreground)] focus:border-[var(--nc-accent-border)] outline-none">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="azure">Azure OpenAI</option>
                        <option value="bedrock">AWS Bedrock</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--nc-foreground)] focus:border-[var(--nc-accent-border)] outline-none font-mono">
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                        <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--nc-foreground)] focus:border-[var(--nc-accent-border)] outline-none text-[var(--nc-foreground-muted)]">
                        <option value="">{isArabic ? "لا يوجد" : "None"}</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="azure">Azure OpenAI</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--nc-foreground)] focus:border-[var(--nc-accent-border)] outline-none text-[var(--nc-foreground-muted)]">
                        <option value="">{isArabic ? "لا يوجد" : "None"}</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="bedrock">AWS Bedrock</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-[var(--nc-surface)] border-t border-[var(--nc-border)] flex justify-end">
             <button
               type="button"
               className="bg-[var(--nc-surface-strong)] hover:bg-[var(--nc-surface)] border border-[var(--nc-border)] text-[var(--nc-foreground)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
             >
               {isArabic ? "حفظ التعيينات" : "Save Assignments"}
             </button>
          </div>
        </SmartCard>
      </div>
    </div>
  );
}
