"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsSelect from "@/components/settings/SettingsSelect";
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

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "azure", label: "Azure OpenAI" },
  { value: "bedrock", label: "AWS Bedrock" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4-turbo", label: "gpt-4-turbo" },
  { value: "claude-3-5-sonnet", label: "claude-3-5-sonnet" },
];

const AGENTS = [
  { id: "MANSOUR", nameAr: "منصور", nameEn: "Mansour" },
  { id: "SAHER", nameAr: "ساهر", nameEn: "Saher" },
  { id: "SANAD", nameAr: "سند", nameEn: "Sanad" },
  { id: "BASEER", nameAr: "بصير", nameEn: "Baseer" },
  { id: "KHABEER", nameAr: "خبير", nameEn: "Khabeer" },
];

type AgentAssignment = {
  provider: string;
  model: string;
  fallback1: string;
  fallback2: string;
};

const DEFAULT_ASSIGNMENT: AgentAssignment = {
  provider: "openai",
  model: "gpt-4o",
  fallback1: "",
  fallback2: "",
};

export default function SettingsAIProviders() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const L = (ar: string, en: string) => (isArabic ? ar : en);

  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [assignments, setAssignments] = useState<Record<string, AgentAssignment>>(() =>
    Object.fromEntries(AGENTS.map((agent) => [agent.id, { ...DEFAULT_ASSIGNMENT }])),
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

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

  function openProvider(id: ProviderType) {
    if (document.activeElement && document.activeElement !== document.body) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
    }
    setSelectedProvider(id);
    setStatus("idle");
    setFormData({});
  }

  function closeDrawer() {
    setSelectedProvider(null);
    lastFocusedRef.current?.focus();
  }

  function updateAssignment(agentId: string, field: keyof AgentAssignment, value: string) {
    setAssignments((current) => ({
      ...current,
      [agentId]: { ...current[agentId], [field]: value },
    }));
  }

  const activeDefinition = PROVIDERS.find((p) => p.id === selectedProvider) || null;

  const isDirty = useMemo(
    () => Object.values(formData).some((value) => String(value || "").trim()),
    [formData],
  );

  function handleOverlayClick() {
    if (isDirty) return;
    closeDrawer();
  }

  useEffect(() => {
    if (!activeDefinition) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDefinition]);

  useEffect(() => {
    if (activeDefinition) titleRef.current?.focus();
  }, [activeDefinition]);

  useEffect(() => {
    if (!activeDefinition) return;
    const scrollContainer = document.querySelector('[class*="overflow-y-auto"]') as HTMLElement | null;
    const previousContainerOverflow = scrollContainer?.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = previousContainerOverflow || "";
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [activeDefinition]);

  return (
    <div className="orca-settings-section orca-settings-ai-section">
      <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-5 py-4">
        <h2 className="text-lg font-black text-[var(--nc-foreground)]">
          {L("إعدادات الذكاء الاصطناعي", "AI Settings")}
        </h2>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
          {L(
            "إدارة مزودي الذكاء الاصطناعي وتعيين الوكلاء والنماذج البديلة.",
            "Manage AI providers and assign agents and fallback models.",
          )}
        </p>
      </div>

      <div className="orca-settings-provider-grid">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openProvider(p.id)}
            className={`orca-settings-provider-card flex flex-col items-center justify-center gap-2 rounded-2xl border transition-colors ${
              selectedProvider === p.id
                ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]"
                : "border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]"
            }`}
          >
            <i className={`${p.icon} text-lg`} aria-hidden="true" />
            <span className="truncate px-2 text-xs font-semibold">{p.name}</span>
          </button>
        ))}
      </div>

      <SmartCard className="orca-workspace-panel overflow-hidden">
        <div className="border-b border-[var(--nc-border)] p-5">
          <h3 className="text-lg font-bold text-[var(--nc-foreground)]">
            {L("تعيين مزود ونموذج لكل وكيل", "Assign Provider & Model per Agent")}
          </h3>
          <p className="mt-1 text-sm text-[var(--nc-foreground-muted)]">
            {L(
              "حدد المزود الأساسي والنموذج ونظام الترتيب البديل (Fallback) لكل وكيل.",
              "Select the primary provider, model, and fallback priority for each agent.",
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)]">
              <tr>
                <th className="px-5 py-3 text-start font-bold">{L("الوكيل", "Agent")}</th>
                <th className="px-5 py-3 text-start font-bold">{L("المزود الأساسي", "Default Provider")}</th>
                <th className="px-5 py-3 text-start font-bold">{L("النموذج", "Default Model")}</th>
                <th className="px-5 py-3 text-start font-bold">Fallback 1</th>
                <th className="px-5 py-3 text-start font-bold">Fallback 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nc-border)]">
              {AGENTS.map((agent) => {
                const assignment = assignments[agent.id] ?? DEFAULT_ASSIGNMENT;
                const fallback1Options = [
                  { value: "", label: L("لا يوجد", "None") },
                  { value: "anthropic", label: "Anthropic" },
                  { value: "azure", label: "Azure OpenAI" },
                ];
                const fallback2Options = [
                  { value: "", label: L("لا يوجد", "None") },
                  { value: "gemini", label: "Google Gemini" },
                  { value: "bedrock", label: "AWS Bedrock" },
                ];

                return (
                  <tr key={agent.id} className="hover:bg-[var(--nc-surface)]">
                    <td className="px-5 py-4 font-bold text-[var(--nc-foreground)]">
                      {isArabic ? agent.nameAr : agent.nameEn}
                    </td>
                    <td className="px-5 py-4">
                      <SettingsSelect
                        className="w-44"
                        placement="bottom"
                        aria-label={L("المزود الأساسي", "Default Provider")}
                        value={assignment.provider}
                        onChange={(value) => updateAssignment(agent.id, "provider", value)}
                        options={PROVIDER_OPTIONS}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <SettingsSelect
                        className="w-44"
                        placement="bottom"
                        mono
                        aria-label={L("النموذج", "Default Model")}
                        value={assignment.model}
                        onChange={(value) => updateAssignment(agent.id, "model", value)}
                        options={MODEL_OPTIONS}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <SettingsSelect
                        className="w-36"
                        placement="bottom"
                        aria-label="Fallback 1"
                        value={assignment.fallback1}
                        onChange={(value) => updateAssignment(agent.id, "fallback1", value)}
                        options={fallback1Options}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <SettingsSelect
                        className="w-36"
                        placement="bottom"
                        aria-label="Fallback 2"
                        value={assignment.fallback2}
                        onChange={(value) => updateAssignment(agent.id, "fallback2", value)}
                        options={fallback2Options}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
          <SettingsButton variant="secondary">
            {L("حفظ التعيينات", "Save Assignments")}
          </SettingsButton>
        </div>
      </SmartCard>

      {activeDefinition &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex">
            <div
              onClick={handleOverlayClick}
              className="absolute inset-0 bg-black/60"
            />

            <div className="absolute inset-y-0 left-0 z-[110] flex w-screen flex-col bg-[var(--nc-surface-solid)] shadow-2xl sm:w-[640px]">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--nc-border)] p-5">
                <h2 ref={titleRef} tabIndex={-1} className="text-lg font-black text-[var(--nc-foreground)] outline-none">
                  {activeDefinition.name}
                </h2>
                <SettingsButton variant="icon" onClick={closeDrawer} aria-label={L("إغلاق", "Close")}>
                  ×
                </SettingsButton>
              </div>

              <form onSubmit={handleTestConnection} className="flex min-h-0 flex-1 flex-col">
                <div className="min-w-0 flex-1 overflow-y-auto p-6">
                  <SmartCard className="p-5">
                    <h3 className="mb-2 text-base font-bold text-[var(--nc-foreground)]">
                      {L("إعدادات الربط", "Connection Settings")}
                    </h3>
                    <p className="mb-6 text-sm text-[var(--nc-foreground-muted)]">
                      {L(
                        "يتم تشفير هذه البيانات وتخزينها بشكل آمن. يمكنك اختبار الاتصال لضمان صلاحية المفاتيح قبل الحفظ.",
                        "These credentials are encrypted and stored securely. Test the connection to ensure validity before saving.",
                      )}
                    </p>

                    <div className="space-y-4">
                      {activeDefinition.fields.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-xs font-semibold text-[var(--nc-foreground-muted)]">
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
                            className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
                          />
                        </div>
                      ))}

                      {status === "success" && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {L(
                            "نجاح الاتصال! المفاتيح صالحة ويمكنك حفظها.",
                            "Connection successful! Keys are valid and can be saved.",
                          )}
                        </div>
                      )}
                      {status === "error" && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                          {errorMessage}
                        </div>
                      )}
                    </div>
                  </SmartCard>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--nc-border)] p-4">
                  <SettingsButton variant="secondary" type="submit" disabled={status === "testing"}>
                    {status === "testing"
                      ? L("جاري الاختبار...", "Testing...")
                      : L("اختبار الاتصال", "Test Connection")}
                  </SettingsButton>
                  <SettingsButton variant="primary" disabled={status !== "success"}>
                    {L("حفظ وتشفير", "Save & Encrypt")}
                  </SettingsButton>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
