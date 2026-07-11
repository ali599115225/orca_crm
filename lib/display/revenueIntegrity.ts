type RevenueLanguage = "ar" | "en";

function humanizeCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function displayRevenueIntegrityValue(
  value: string,
  lang: RevenueLanguage,
): string {
  const isAr = lang === "ar";

  const labels: Record<string, [string, string]> = {
    NOT_CONFIGURED: ["غير مهيأ", "Not configured"],
    DISCONNECTED: ["غير متصل", "Disconnected"],
    SUBMITTED: ["تم الإرسال", "Submitted"],
    REVENUE_RISK_DETECTED: ["تم اكتشاف مخاطرة إيرادية", "Revenue risk detected"],
    FIRST_RESPONSE_BREACH: ["تجاوز وقت الاستجابة الأولى", "First response breach"],
    LEAD_UNASSIGNED: ["عميل محتمل غير مسند", "Unassigned lead"],
    NO_NEXT_ACTION: ["لا يوجد إجراء تالٍ", "No next action"],
    TOUR_WITHOUT_OUTCOME: ["جولة دون نتيجة", "Tour without outcome"],
    POSITIVE_TOUR_NO_OFFER: ["جولة إيجابية دون عرض", "Positive tour without offer"],
    ACCEPTED_OFFER_NO_CONTRACT: ["عرض مقبول دون عقد", "Accepted offer without contract"],
    SIGNED_CONTRACT_NO_INVOICE: ["عقد موقّع دون فاتورة", "Signed contract without invoice"],
    OVERDUE_INVOICE: ["فاتورة متأخرة", "Overdue invoice"],
    INVENTORY_CONFLICT: ["تعارض في المخزون", "Inventory conflict"],
    COMPLIANCE_BLOCK: ["حظر امتثال", "Compliance block"],

    OPEN: ["مفتوحة", "Open"],
    RESOLVED: ["محلولة", "Resolved"],
    DISMISSED: ["مستبعدة", "Dismissed"],
    CRITICAL: ["حرجة", "Critical"],
    HIGH: ["مرتفعة", "High"],
    MEDIUM: ["متوسطة", "Medium"],
    LOW: ["منخفضة", "Low"],
    PENDING: ["قيد الانتظار", "Pending"],
    PROCESSED: ["تمت المعالجة", "Processed"],
    FAILED: ["فشلت", "Failed"],
    ACKNOWLEDGED: ["تم الاستلام", "Acknowledged"],
    CONNECTED: ["متصل", "Connected"],
    ACTIVE: ["نشط", "Active"],
    EXECUTED: ["تم التنفيذ", "Executed"],
    DELIVERED: ["تم التسليم", "Delivered"],
    ERROR: ["خطأ", "Error"],
    DEAD_LETTER: ["رسالة ميتة", "Dead letter"],
    PENDING_APPROVAL: ["بانتظار الاعتماد", "Pending approval"],
    RETRY: ["إعادة المحاولة", "Retry"],
    REJECTED: ["مرفوض", "Rejected"],
    APPROVED: ["معتمد", "Approved"],
    NOT_READY: ["غير جاهز", "Not ready"],
    MANUAL: ["يدوي", "Manual"],
    READY: ["جاهز", "Ready"],
    INSUFFICIENT_DATA: ["بيانات غير كافية", "Insufficient data"],

    WHATSAPP: ["واتساب", "WhatsApp"],
    EMAIL: ["البريد الإلكتروني", "Email"],
    SUPPORT: ["الدعم", "Support"],
    OUTBOX: ["صندوق الصادر", "Outbox"],

    CREATE_TASK: ["إنشاء مهمة", "Create task"],
    SCHEDULE_TOUR: ["جدولة جولة", "Schedule tour"],
    CREATE_OFFER: ["إنشاء عرض", "Create offer"],
    COLLECTION_FOLLOW_UP: ["متابعة تحصيل", "Collection follow-up"],
    FOLLOW_UP: ["متابعة", "Follow-up"],

    ACTION_SUGGESTION_LEAD_LINKED: ["تم ربط الاقتراح بعميل محتمل", "Suggestion linked to a lead"],
    ACTION_SUGGESTION_CREATED: ["تم إنشاء اقتراح", "Suggestion created"],
    ACTION_SUGGESTION_APPROVED: ["تم اعتماد الاقتراح", "Suggestion approved"],
    ACTION_SUGGESTION_REJECTED: ["تم رفض الاقتراح", "Suggestion rejected"],
    ACTION_SUGGESTION_EXECUTED: ["تم تنفيذ الاقتراح", "Suggestion executed"],
    ACTION_SUGGESTION_EXECUTION_FAILED: ["فشل تنفيذ الاقتراح", "Suggestion execution failed"],
    REVENUE_RISK_ACKNOWLEDGED: ["تم استلام الخطر", "Revenue risk acknowledged"],
    REVENUE_RISK_RESOLVED: ["تم إغلاق الخطر", "Revenue risk resolved"],
    REVENUE_RISK_REOPENED: ["أُعيد فتح الخطر", "Revenue risk reopened"],
    REVENUE_RISK_AUTO_RESOLVED: ["أُغلق الخطر آليًا", "Revenue risk auto-resolved"],
    REVENUE_RADAR_EVALUATED: ["تم تقييم رادار الإيراد", "Revenue radar evaluated"],
    REVENUE_RULE_RUN: ["تشغيل قواعد الإيراد", "Revenue rule run"],
    REVENUE_RISK_SIGNAL: ["إشارة مخاطر الإيراد", "Revenue risk signal"],
    RevenueRuleRun: ["تشغيل قواعد الإيراد", "Revenue rule run"],
    RevenueRiskSignal: ["إشارة مخاطر الإيراد", "Revenue risk signal"],
    RevenueActionSuggestion: ["اقتراح إجراء", "Action suggestion"],
    RevenueProviderConnection: ["اتصال مزود", "Provider connection"],
    RevenueProviderWebhook: ["إشعار مزود", "Provider webhook"],
    RevenueIntelligenceScore: ["نتيجة ذكاء الإيراد", "Revenue intelligence score"],
    PROVIDER_CONNECTION_CREATED: ["تم إنشاء اتصال المزود", "Provider connection created"],
    PROVIDER_CREDENTIALS_ROTATED: ["تم تحديث بيانات اعتماد المزود", "Provider credentials rotated"],
    PROVIDER_CONNECTION_VERIFIED: ["تم التحقق من اتصال المزود", "Provider connection verified"],
    PROVIDER_CONNECTION_FAILED: ["فشل اتصال المزود", "Provider connection failed"],
    PROVIDER_CONNECTION_DISCONNECTED: ["تم فصل اتصال المزود", "Provider disconnected"],
    PROVIDER_APPLICATION_SUBMITTED: ["تم إرسال طلب المزود", "Provider application submitted"],
    PROVIDER_WEBHOOK_VERIFIED: ["تم التحقق من إشعار المزود", "Provider webhook verified"],
    PROVIDER_WEBHOOK_REJECTED: ["رُفض إشعار المزود", "Provider webhook rejected"],
    PREDICTIVE_INSUFFICIENT_DATA: ["بيانات التنبؤ غير كافية", "Predictive data insufficient"],
    PREDICTIVE_BAND_CHANGED: ["تغير مستوى المخاطر", "Risk band changed"],
    PREDICTIVE_INTELLIGENCE_SCORED: ["اكتمل تقييم الفرصة", "Opportunity intelligence scored"],
    PREDICTIVE_INTELLIGENCE_BATCH_SCORED: ["اكتمل تقييم الفرص", "Opportunity batch scored"],
    PREDICTIVE_ENTITY_FAILED: ["تعذر تقييم كيان", "Entity scoring failed"],

    REVENUE_LEAK: ["تسرب إيراد", "Revenue leak"],
    COLLECTION_DELAY: ["تأخر تحصيل", "Collection delay"],
    DEAL_FALL: ["سقوط صفقة", "Deal fall"],
    INTERVENTION_PRIORITY: ["أولوية التدخل", "Intervention priority"],
    RISK_HIGH: ["خطر مرتفع", "High risk"],
    RISK_MEDIUM: ["خطر متوسط", "Medium risk"],
    RISK_LOW: ["خطر منخفض", "Low risk"],

    RISK_SIGNAL: ["إشارة مخاطر", "Risk signal"],
    MISSING_ACTIVITY: ["نشاط مفقود", "Missing activity"],
    MISSING_OFFER: ["عرض مفقود", "Missing offer"],

    RESEND: ["Resend", "Resend"],
    PAYLINK: ["Paylink", "Paylink"],
    NGENIUS: ["N-Genius", "N-Genius"],
    ZATCA: ["هيئة الزكاة والضريبة والجمارك", "ZATCA"],
    EJAR: ["إيجار", "Ejar"],
    SIGNATURE: ["التوقيع الإلكتروني", "E-signature"],
  };

  const label = labels[value];
  if (label) return isAr ? label[0] : label[1];

  if (/^[A-Z0-9_]+$/.test(value)) {
    return isAr ? "حدث نظام" : humanizeCode(value);
  }

  return value;
}

export function displayRevenueIntegrityError(
  value: string | null | undefined,
  lang: RevenueLanguage,
): string {
  const isAr = lang === "ar";
  const code = String(value || "").trim();

  if (!code) {
    return isAr ? "تعذر تنفيذ العملية." : "The operation could not be completed.";
  }

  if (
    code === "AUTH_REQUIRED" ||
    code === "AUTHENTICATION_REQUIRED" ||
    code === "UNAUTHORIZED"
  ) {
    return isAr ? "يلزم تسجيل الدخول للمتابعة." : "Sign in to continue.";
  }

  if (
    code === "FORBIDDEN" ||
    code.startsWith("FORBIDDEN:") ||
    code.includes("CROSS_TENANT")
  ) {
    return isAr ? "لا تملك صلاحية تنفيذ هذه العملية." : "You do not have permission to perform this action.";
  }

  if (
    code.includes("NOT_FOUND") ||
    code === "SUGGESTION_NOT_FOUND" ||
    code === "RISK_NOT_FOUND"
  ) {
    return isAr ? "تعذر العثور على السجل المطلوب." : "The requested record could not be found.";
  }

  if (
    code === "LEAD_LINK_REQUIRED" ||
    code.includes("LEAD_ID_REQUIRED")
  ) {
    return isAr
      ? "اربط المحادثة بعميل محتمل قبل تنفيذ المتابعة."
      : "Link the conversation to a lead before executing the follow-up.";
  }

  if (
    code.includes("REQUIRED") ||
    code.includes("INVALID_") ||
    code.includes("CANNOT_") ||
    code.includes("UNSUPPORTED_")
  ) {
    return isAr
      ? "تحقق من البيانات المطلوبة وحالة السجل ثم أعد المحاولة."
      : "Check the required data and record state, then try again.";
  }

  if (
    code.includes("PROVIDER") ||
    code.includes("RESEND") ||
    code.includes("PAYLINK") ||
    code.includes("NGENIUS") ||
    code.includes("ZATCA") ||
    code.includes("EJAR") ||
    code.includes("SIGNATURE") ||
    code.includes("_HTTP_") ||
    code.includes("EVENT_SINK")
  ) {
    return isAr
      ? "تعذر الاتصال بالمزود. راجع إعدادات التكامل ثم أعد الاختبار."
      : "The provider could not be reached. Review the integration settings and test again.";
  }

  if (code.includes("EXECUTION_FAILED")) {
    return isAr
      ? "تعذر تنفيذ الاقتراح. لم يتم اعتماد نتيجة جزئية."
      : "The suggestion could not be executed. No partial result was accepted.";
  }

  return isAr ? "تعذر تنفيذ العملية." : "The operation could not be completed.";
}

export function displayPredictionReason(
  reason: { code?: string; label?: string; weight?: number },
  lang: RevenueLanguage,
): string {
  const isAr = lang === "ar";
  const code = String(reason.code || "");

  if (!isAr) return String(reason.label || humanizeCode(code));

  if (code === "NO_RISKS") return "لا توجد إشارات مخاطر مفتوحة";
  if (code === "RISK_VOLUME") return "ارتفاع عدد المخاطر المفتوحة";
  if (code === "NO_OVERDUE") return "لا توجد فواتير متأخرة";
  if (code === "OVERDUE_COUNT") return "وجود فواتير متأخرة";
  if (code === "MAX_AGING_DAYS") return "ارتفاع مدة التأخر";
  if (code === "OVERDUE_AMOUNT") return "ارتفاع قيمة المبالغ المتأخرة";
  if (code === "OPP_AGE") return "ارتفاع عمر الفرصة";
  if (code === "LOW_PROBABILITY") return "انخفاض احتمال الإغلاق";
  if (code === "NO_TOURS") return "لا توجد جولات مجدولة";
  if (code === "NO_OFFERS") return "لا توجد عروض للفرصة";
  if (code === "OPEN_RISKS") return "وجود مخاطر مفتوحة على الفرصة";
  if (code === "LEAK_CONTRIBUTION") return "مساهمة مخاطر تسرب الإيراد";
  if (code === "COLLECTION_CONTRIBUTION") return "مساهمة مخاطر تأخر التحصيل";
  if (code === "DEAL_FALL_CONTRIBUTION") return "مساهمة مخاطر سقوط الصفقة";
  if (code === "LOW_PRIORITY") return "جميع المؤشرات دون حد التدخل";
  if (code === "RADAR_STALE") return "بيانات الرادار قديمة أو غير متوفرة";
  if (code.startsWith("SEVERITY_")) return "مخاطر مفتوحة بحسب مستوى الشدة";

  return "سبب تشغيلي محسوب";
}

export function displayRevenueModelVersion(
  value: string | null | undefined,
  lang: RevenueLanguage,
): string {
  if (!value) return "—";
  return lang === "ar" ? "الإصدار 1" : "Version 1";
}

export function intelligenceRiskLevel(
  score: number,
  lang: RevenueLanguage,
): string {
  const isAr = lang === "ar";
  if (score >= 70) return isAr ? "خطر مرتفع" : "High risk";
  if (score >= 40) return isAr ? "خطر متوسط" : "Medium risk";
  return isAr ? "خطر منخفض" : "Low risk";
}

export function intelligenceRiskClass(score: number): string {
  if (score >= 70) return "text-rose-600 dark:text-rose-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function safeDisplayId(
  id: string | null | undefined,
  lang: RevenueLanguage,
): string {
  if (!id || id.startsWith("manual-")) return "";

  const compact = id.replace(/[^a-z0-9]/gi, "");
  if (!compact) return "";

  const prefix = lang === "ar" ? "مرجع #" : "Ref #";
  return `${prefix}${compact.slice(0, 8)}`;
}

export function displayMetadataValue(
  metadata: unknown,
  lang: RevenueLanguage,
): string {
  const isAr = lang === "ar";
  if (!metadata || typeof metadata !== "object") return "";

  const obj = metadata as Record<string, unknown>;
  const parts: string[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;
    const valStr = String(val);

    if (key === "city") {
      parts.push(isAr ? `المدينة: ${valStr}` : `City: ${valStr}`);
    } else if (key === "reason") {
      parts.push(isAr ? "سبب تشغيلي" : `Reason: ${valStr}`);
    }
  }

  return parts.join(" · ");
}

export function riskBandLabel(
  band: string | null | undefined,
  lang: RevenueLanguage,
): string {
  if (!band) return "";
  const isAr = lang === "ar";

  switch (band) {
    case "LOW":
      return isAr ? "خطر منخفض" : "Low risk";
    case "MEDIUM":
      return isAr ? "خطر متوسط" : "Medium risk";
    case "HIGH":
      return isAr ? "خطر مرتفع" : "High risk";
    case "CRITICAL":
      return isAr ? "خطر حرج" : "Critical risk";
    default:
      return isAr ? "مستوى مخاطر" : humanizeCode(band);
  }
}

export function riskBandClass(
  band: string | null | undefined,
): string {
  switch (band) {
    case "CRITICAL":
      return "text-rose-600 dark:text-rose-400";
    case "HIGH":
      return "text-orange-600 dark:text-orange-400";
    case "MEDIUM":
      return "text-amber-600 dark:text-amber-400";
    case "LOW":
      return "text-emerald-600 dark:text-emerald-400";
    default:
      return "text-[var(--nc-foreground-muted)]";
  }
}

export function horizonLabel(
  days: number | null | undefined,
  lang: RevenueLanguage,
): string {
  if (days == null) return "";
  const isAr = lang === "ar";
  if (days <= 7) return isAr ? "٧ أيام" : "7 days";
  if (days <= 14) return isAr ? "١٤ يومًا" : "14 days";
  return isAr ? "٣٠ يومًا" : "30 days";
}

export function expiryLabel(
  expiresAt: string | null | undefined,
  lang: RevenueLanguage,
): string {
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
