// lib/ui-status.ts — centralized status display formatters
// No raw English statuses exposed to users. Any unknown status shows "غير معروف".

const LEAD_STATUS: Record<string, string> = {
  NEW: 'جديد', CONTACTED: 'تم التواصل', QUALIFIED: 'مؤهل',
  VISIT_SCHEDULED: 'مجدول للزيارة', VISITED: 'تمت الزيارة',
  OFFER_MADE: 'تم العرض', RESERVED: 'محجوز',
  CONTRACT_SIGNED: 'تم التوقيع', WON: 'مكتمل', LOST: 'ملغي',
};

const TASK_STATUS: Record<string, string> = {
  PENDING: 'معلق', COMPLETED: 'مكتمل', OVERDUE: 'متأخر',
};

const INVOICE_STATUS: Record<string, string> = {
  paid: 'مدفوعة', unpaid: 'غير مدفوعة', overdue: 'متأخرة عن الدفع',
  PENDING: 'معلق', SENT: 'مرسل', FAILED: 'فشل', DRAFT: 'مسودة',
};

const PROJECT_STATUS: Record<string, string> = {
  PLANNING: 'مخطط له', UNDER_CONSTRUCTION: 'قيد الإنشاء',
  COMPLETED: 'مكتمل', SOLD_OUT: 'مباع بالكامل',
};

const OFFER_STATUS: Record<string, string> = {
  PENDING: 'معلق', ACCEPTED: 'مقبول', REJECTED: 'مرفوض',
};

const OPPORTUNITY_STATUS: Record<string, string> = {
  OPEN: 'مفتوح', NEGOTIATION: 'تفاوض',
  CLOSED_WON: 'مغلق مكتمل', CLOSED_LOST: 'مغلق ملغي',
};

const GENERIC_STATUS: Record<string, string> = {
  ACTIVE: 'نشط', INACTIVE: 'غير نشط',
  SCHEDULED: 'مجدول', CANCELLED: 'ملغي',
  active: 'نشط', expired: 'منتهي', terminated: 'ملغي',
};

function resolve(map: Record<string, string>, status?: string | null): string {
  if (!status) return '—';
  return map[status] || GENERIC_STATUS[status] || status;
}

export function formatLeadStatus(status?: string | null): string {
  return resolve(LEAD_STATUS, status);
}

export function formatTaskStatus(status?: string | null): string {
  return resolve(TASK_STATUS, status);
}

export function formatInvoiceStatus(status?: string | null): string {
  return resolve(INVOICE_STATUS, status);
}

export function formatProjectStatus(status?: string | null): string {
  return resolve(PROJECT_STATUS, status);
}

export function formatOfferStatus(status?: string | null): string {
  return resolve(OFFER_STATUS, status);
}

export function formatOpportunityStatus(status?: string | null): string {
  return resolve(OPPORTUNITY_STATUS, status);
}

export function formatLeaseStatus(status?: string | null): string {
  const map: Record<string, string> = { active: 'نشط', expired: 'منتهي', terminated: 'ملغي' };
  return map[status || ''] || status || '—';
}
