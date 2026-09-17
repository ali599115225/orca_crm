"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import {
  OperationsDialog,
  OperationsFormField,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
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

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !activeDefinition) return;

    const missingField = activeDefinition.fields.find(
      (field) => !String(formData[field.key] || "").trim(),
    );
    if (missingField) {
      setStatus("error");
      setErrorMessage(
        isArabic
          ? `أدخل ${missingField.labelAr}.`
          : `Enter ${missingField.labelEn}.`,
      );
      return;
    }

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
    setSelectedProvider(id);
    setStatus("idle");
    setErrorMessage("");
    setFormData({});
  }

  function closeDrawer() {
    setSelectedProvider(null);
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


  return (
    <div className="orca-settings-section orca-settings-ai-section">
      <OperationsPanel className="overflow-hidden">
        <OperationsPanelHeader
          title={L("إعدادات الذكاء الاصطناعي", "AI Settings")}
          description={L(
            "إدارة مزودي الذكاء الاصطناعي وتعيين الوكلاء والنماذج البديلة.",
            "Manage AI providers and assign agents and fallback models.",
          )}
        />
      </OperationsPanel>

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

      <OperationsDialog
        open={Boolean(activeDefinition)}
        onClose={closeDrawer}
        title={activeDefinition?.name || L("مزود الذكاء الاصطناعي", "AI provider")}
        description={L(
          "يتم تشفير بيانات الاعتماد. اختبر الاتصال قبل اعتماد إعدادات المزود.",
          "Credentials are encrypted. Test the connection before adopting the provider settings.",
        )}
        closeLabel={L("إغلاق", "Close")}
        closeDisabled={status === "testing" || isDirty}
        closeOnBackdrop={!isDirty}
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeDrawer}
              disabled={status === "testing"}
              className={operationsVisual.secondaryButton}
            >
              {L("إلغاء", "Cancel")}
            </button>
            <button
              type="submit"
              form="settings-ai-provider-form"
              disabled={status === "testing"}
              className={operationsVisual.secondaryButton}
            >
              {status === "testing"
                ? L("جاري الاختبار...", "Testing...")
                : L("اختبار الاتصال", "Test Connection")}
            </button>
            <button
              type="button"
              disabled={status !== "success"}
              className={operationsVisual.primaryButton}
            >
              {L("حفظ وتشفير", "Save & Encrypt")}
            </button>
          </>
        }
      >
        {activeDefinition ? (
          <form
            id="settings-ai-provider-form"
            onSubmit={handleTestConnection}
            noValidate
            className="grid gap-4"
          >
            {activeDefinition.fields.map((field) => (
              <OperationsFormField
                key={field.key}
                label={isArabic ? field.labelAr : field.labelEn}
              >
                <OperationsTextField
                  type={field.type}
                  value={formData[field.key] || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [field.key]: e.target.value,
                    })
                  }
                  autoComplete={field.type === "password" ? "new-password" : "off"}
                />
              </OperationsFormField>
            ))}

            {status === "success" ? (
              <div
                role="status"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                {L(
                  "نجاح الاتصال! المفاتيح صالحة ويمكنك حفظها.",
                  "Connection successful! Keys are valid and can be saved.",
                )}
              </div>
            ) : null}

            {status === "error" ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                {errorMessage}
              </div>
            ) : null}
          </form>
        ) : null}
      </OperationsDialog>

    </div>
  );
}
