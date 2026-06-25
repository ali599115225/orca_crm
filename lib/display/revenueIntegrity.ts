export function displayRevenueIntegrityValue(value: string, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  switch (value) {
    // Risk rule codes
    case "NOT_CONFIGURED": return isAr ? "غير مهيأ" : "Not configured";
    case "REVENUE_RISK_DETECTED": return isAr ? "تم اكتشاف مخاطرة إيرادية" : "Revenue risk detected";
    case "FIRST_RESPONSE_BREACH": return isAr ? "تجاوز وقت الاستجابة الأولى" : "First response breach";
    case "LEAD_UNASSIGNED": return isAr ? "عميل محتمل غير مسند" : "Unassigned lead";
    case "NO_NEXT_ACTION": return isAr ? "لا يوجد إجراء تالٍ" : "No next action";
    case "TOUR_WITHOUT_OUTCOME": return isAr ? "جولة دون نتيجة" : "Tour without outcome";
    case "POSITIVE_TOUR_NO_OFFER": return isAr ? "جولة إيجابية دون عرض" : "Positive tour without offer";
    case "ACCEPTED_OFFER_NO_CONTRACT": return isAr ? "عرض مقبول دون عقد" : "Accepted offer without contract";
    case "SIGNED_CONTRACT_NO_INVOICE": return isAr ? "عقد موقّع دون فاتورة" : "Signed contract without invoice";
    case "OVERDUE_INVOICE": return isAr ? "فاتورة متأخرة" : "Overdue invoice";
    case "INVENTORY_CONFLICT": return isAr ? "تعارض في المخزون" : "Inventory conflict";
    case "COMPLIANCE_BLOCK": return isAr ? "حظر امتثال" : "Compliance block";

    // Statuses
    case "OPEN": return isAr ? "مفتوحة" : "Open";
    case "RESOLVED": return isAr ? "محلولة" : "Resolved";
    case "CRITICAL": return isAr ? "حرجة" : "Critical";
    case "HIGH": return isAr ? "مرتفعة" : "High";
    case "MEDIUM": return isAr ? "متوسطة" : "Medium";
    case "LOW": return isAr ? "منخفضة" : "Low";
    case "PENDING": return isAr ? "قيد الانتظار" : "Pending";
    case "PROCESSED": return isAr ? "تمت المعالجة" : "Processed";
    case "FAILED": return isAr ? "فشلت" : "Failed";
    case "ACKNOWLEDGED": return isAr ? "تم الاستلام" : "Acknowledged";
    case "CONNECTED": return isAr ? "متصل" : "Connected";
    case "ACTIVE": return isAr ? "نشط" : "Active";
    case "EXECUTED": return isAr ? "تم التنفيذ" : "Executed";
    case "DELIVERED": return isAr ? "تم التسليم" : "Delivered";
    case "ERROR": return isAr ? "خطأ" : "Error";
    case "DEAD_LETTER": return isAr ? "رسالة ميتة" : "Dead letter";
    case "PENDING_APPROVAL": return isAr ? "بانتظار الاعتماد" : "Pending approval";
    case "RETRY": return isAr ? "إعادة المحاولة" : "Retry";
    case "REJECTED": return isAr ? "مرفوض" : "Rejected";
    case "APPROVED": return isAr ? "معتمد" : "Approved";
    case "NOT_READY": return isAr ? "غير جاهز" : "Not ready";
    case "MANUAL": return isAr ? "يدوي" : "Manual";

    // Predictive intelligence status
    case "READY": return isAr ? "جاهز" : "Ready";
    case "INSUFFICIENT_DATA": return isAr ? "بيانات غير كافية" : "Insufficient data";

    // Channels
    case "WHATSAPP": return isAr ? "واتساب" : "WhatsApp";
    case "EMAIL": return isAr ? "البريد الإلكتروني" : "Email";
    case "SUPPORT": return isAr ? "الدعم" : "Support";
    case "OUTBOX": return isAr ? "صندوق الصادر" : "Outbox";

    // Action types — displayed to user
    case "CREATE_TASK": return isAr ? "إنشاء مهمة / Create task" : "Create task / إنشاء مهمة";
    case "SCHEDULE_TOUR": return isAr ? "جدولة جولة / Schedule tour" : "Schedule tour / جدولة جولة";
    case "CREATE_OFFER": return isAr ? "إنشاء عرض / Create offer" : "Create offer / إنشاء عرض";
    case "COLLECTION_FOLLOW_UP": return isAr ? "متابعة تحصيل / Collection follow-up" : "Collection follow-up / متابعة تحصيل";
    case "FOLLOW_UP": return isAr ? "متابعة / Follow-up" : "Follow-up / متابعة";

    // Event / aggregate type labels
    case "ACTION_SUGGESTION_CREATED": return isAr ? "تم إنشاء اقتراح" : "Suggestion created";
    case "ACTION_SUGGESTION_APPROVED": return isAr ? "تم اعتماد الاقتراح" : "Suggestion approved";
    case "ACTION_SUGGESTION_REJECTED": return isAr ? "تم رفض الاقتراح" : "Suggestion rejected";
    case "ACTION_SUGGESTION_EXECUTED": return isAr ? "تم تنفيذ الاقتراح" : "Suggestion executed";
    case "ACTION_SUGGESTION_EXECUTION_FAILED": return isAr ? "فشل تنفيذ الاقتراح" : "Suggestion execution failed";
    case "REVENUE_RISK_ACKNOWLEDGED": return isAr ? "تم استلام الخطر" : "Revenue risk acknowledged";
    case "REVENUE_RADAR_EVALUATED": return isAr ? "تم تقييم رادار الإيراد" : "Revenue radar evaluated";
    case "REVENUE_RULE_RUN": return isAr ? "تشغيل قواعد الإيراد / Revenue rule run" : "Revenue rule run / تشغيل قواعد الإيراد";
    case "REVENUE_RISK_SIGNAL": return isAr ? "إشارة مخاطر الإيراد / Revenue risk signal" : "Revenue risk signal / إشارة مخاطر الإيراد";
    case "RevenueRuleRun": return isAr ? "تشغيل قواعد الإيراد / Revenue rule run" : "Revenue rule run / تشغيل قواعد الإيراد";
    case "RevenueRiskSignal": return isAr ? "إشارة مخاطر الإيراد / Revenue risk signal" : "Revenue risk signal / إشارة مخاطر الإيراد";
    case "RevenueActionSuggestion": return isAr ? "اقتراح إجراء" : "Action suggestion";

    // Predictive intelligence categories
    case "REVENUE_LEAK": return isAr ? "تسرب إيراد" : "Revenue leak";
    case "COLLECTION_DELAY": return isAr ? "تأخر تحصيل" : "Collection delay";
    case "DEAL_FALL": return isAr ? "سقوط صفقة" : "Deal fall";
    case "INTERVENTION_PRIORITY": return isAr ? "أولوية التدخل" : "Intervention priority";

    // Risk level labels
    case "RISK_HIGH": return isAr ? "خطر مرتفع" : "High risk";
    case "RISK_MEDIUM": return isAr ? "خطر متوسط" : "Medium risk";
    case "RISK_LOW": return isAr ? "خطر منخفض" : "Low risk";

    default: return value;
  }
}

/** Returns a human-readable risk level label based on integer score 0-100 */
export function intelligenceRiskLevel(score: number, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  if (score >= 70) return isAr ? "خطر مرتفع" : "High risk";
  if (score >= 40) return isAr ? "خطر متوسط" : "Medium risk";
  return isAr ? "خطر منخفض" : "Low risk";
}

/** Returns the CSS color class for a score 0-100 */
export function intelligenceRiskClass(score: number): string {
  if (score >= 70) return "text-rose-600 dark:text-rose-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

/** Hides internal IDs, UUIDs, and manual- prefixes from display */
export function safeDisplayId(id: string | null | undefined, lang: "ar" | "en"): string {
  if (!id) return "";
  if (id.startsWith("manual-")) return "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return (lang === "ar" ? "مرجع #" : "Ref #") + id.replace(/-/g, "").slice(0, 8);
  }
  return id;
}

/** Translates a raw JSON metadata object into bilingual text. Does NOT expose raw JSON or keys. */
export function displayMetadataValue(metadata: unknown, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  if (!metadata || typeof metadata !== "object") return "";
  const obj = metadata as Record<string, unknown>;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;
    const valStr = String(val);
    switch (key) {
      case "city":
        parts.push(isAr ? `المدينة: ${valStr}` : `City: ${valStr}`);
        break;
      case "reason":
        parts.push(isAr ? `السبب: ${valStr}` : `Reason: ${valStr}`);
        break;
      default:
        // skip raw technical keys
        break;
    }
  }
  return parts.join(" · ");
}

/** Returns a human-readable risk band label */
export function riskBandLabel(band: string | null | undefined, lang: "ar" | "en"): string {
  if (!band) return "";
  const isAr = lang === "ar";
  switch (band) {
    case "LOW": return isAr ? "خطر منخفض" : "Low risk";
    case "MEDIUM": return isAr ? "خطر متوسط" : "Medium risk";
    case "HIGH": return isAr ? "خطر مرتفع" : "High risk";
    case "CRITICAL": return isAr ? "خطر حرج" : "Critical risk";
    default: return band;
  }
}

/** Returns CSS color class for a risk band */
export function riskBandClass(band: string | null | undefined): string {
  switch (band) {
    case "CRITICAL": return "text-rose-600 dark:text-rose-400";
    case "HIGH": return "text-orange-600 dark:text-orange-400";
    case "MEDIUM": return "text-amber-600 dark:text-amber-400";
    case "LOW": return "text-emerald-600 dark:text-emerald-400";
    default: return "text-[var(--nc-foreground-muted)]";
  }
}

/** Returns a human-readable horizon label */
export function horizonLabel(days: number | null | undefined, lang: "ar" | "en"): string {
  if (days == null) return "";
  const isAr = lang === "ar";
  if (days <= 7) return isAr ? "٧ أيام" : "7 days";
  if (days <= 14) return isAr ? "١٤ يومًا" : "14 days";
  return isAr ? "٣٠ يومًا" : "30 days";
}

/** Returns a human-readable expiry label */
export function expiryLabel(expiresAt: string | null | undefined, lang: "ar" | "en"): string {
  if (!expiresAt) return "";
  const isAr = lang === "ar";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  if (diffDays <= 0) return isAr ? "منتهي" : "Expired";
  if (diffDays === 1) return isAr ? "ينتهي غدًا" : "Expires tomorrow";
  return isAr ? `ينتهي خلال ${diffDays} أيام` : `Expires in ${diffDays} days`;
}
