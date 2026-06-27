export type DisplayLanguage = "ar" | "en";

export type UiAliasGroup =
  | "commandMode"
  | "maintenanceStatus"
  | "agentType"
  | "salesEntity"
  | "integrationStatus";

type BilingualLabel = {
  ar: string;
  en: string;
};

const UI_ALIASES: Record<
  UiAliasGroup,
  Record<string, BilingualLabel>
> = {
  commandMode: {
    NORMAL_MODE: { ar: "الوضع الطبيعي", en: "Normal" },
    VACATION_MODE: { ar: "وضع الإجازة", en: "Vacation" },
    EMERGENCY_MODE: { ar: "وضع الطوارئ", en: "Emergency" },
    APPROVAL_MODE: { ar: "وضع الموافقة", en: "Approval" },
  },

  maintenanceStatus: {
    PENDING: { ar: "معلق", en: "Pending" },
    IN_PROGRESS: { ar: "قيد التنفيذ", en: "In progress" },
    COMPLETED: { ar: "مكتمل", en: "Completed" },
    CANCELLED: { ar: "ملغي", en: "Cancelled" },
  },

  agentType: {
    CHAT_BOT: { ar: "💬 وكيل المحادثة", en: "💬 Chat agent" },
    SAHER: { ar: "🤖 ساهر للصيانة", en: "🤖 Saher maintenance agent" },
    SANAD: { ar: "🤖 سند للفوترة", en: "🤖 Sanad billing agent" },
  },

  salesEntity: {
    PAYMENT_TRANSACTIONS: { ar: "معاملة دفع", en: "Payment transaction" },
    CONTRACTS: { ar: "عقد", en: "Contract" },
    INSTALLMENTS: { ar: "قسط", en: "Installment" },
    PAYMENT_PLANS: { ar: "خطة دفع", en: "Payment plan" },
    INVOICES: { ar: "فاتورة", en: "Invoice" },
    RECEIPTS: { ar: "سند قبض", en: "Receipt" },
  },

  integrationStatus: {
    NOT_CONFIGURED: { ar: "غير مهيأ", en: "Not configured" },
    CONNECTED: { ar: "متصل", en: "Connected" },
    ACTIVE: { ar: "نشط", en: "Active" },
    CONFIGURED: { ar: "مهيأ", en: "Configured" },
    PENDING: { ar: "قيد الانتظار", en: "Pending" },
    SUBMITTED: { ar: "تم الإرسال", en: "Submitted" },
    UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under review" },
    TESTING: { ar: "جارٍ الاختبار", en: "Testing" },
    FAILED: { ar: "فشل", en: "Failed" },
    ERROR: { ar: "حدث خطأ", en: "Error" },
    DISCONNECTED: { ar: "غير متصل", en: "Disconnected" },
    REAUTH_REQUIRED: {
      ar: "تتطلب إعادة المصادقة",
      en: "Reauthentication required",
    },
    SUSPENDED: { ar: "معلق مؤقتًا", en: "Suspended" },
  },
};

function normalizeAliasValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[\s.-]+/g, "_")
    .toUpperCase();
}

export function displayUiAlias(
  group: UiAliasGroup,
  value: unknown,
  language: DisplayLanguage
): string {
  const normalized = normalizeAliasValue(value);
  const alias = UI_ALIASES[group][normalized];

  if (alias) {
    return alias[language];
  }

  return language === "ar" ? "غير معروف" : "Unknown";
}