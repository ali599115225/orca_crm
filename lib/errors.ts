/**
 * ORCA CRM central public error boundary.
 * Server-only: never import this module from client components.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PLAN_LIMIT: 'PLAN_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

const SAFE_AR_MESSAGES: Record<ErrorCodeType, string> = {
  VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة. يرجى مراجعة الحقول.',
  NOT_FOUND: 'العنصر المطلوب غير موجود.',
  UNAUTHORIZED: 'يجب تسجيل الدخول أولاً للوصول إلى هذه الخدمة.',
  FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذه العملية.',
  CONFLICT: 'تعارض في البيانات. قد يكون العنصر موجودًا مسبقًا.',
  RATE_LIMITED: 'تجاوزت عدد المحاولات المسموح بها. حاول مرة أخرى لاحقًا.',
  PLAN_LIMIT: 'وصلت إلى الحد الأقصى المتاح في باقتك الحالية.',
  INTERNAL_ERROR: 'حدث خطأ داخلي. يرجى المحاولة لاحقًا.',
  BAD_REQUEST: 'الطلب غير مكتمل. يرجى التحقق من البيانات المرسلة.',
  PAYMENT_ERROR: 'حدث خطأ في عملية الدفع. يرجى المحاولة لاحقًا.',
  FILE_TOO_LARGE: 'حجم الملف أكبر من المسموح به.',
  INVALID_FILE_TYPE: 'نوع الملف غير مدعوم.',
  WEBHOOK_INVALID: 'طلب غير صالح.',
  SERVICE_UNAVAILABLE: 'الخدمة غير متاحة حاليًا. يرجى المحاولة لاحقًا.',
};

const SAFE_EN_MESSAGES: Record<ErrorCodeType, string> = {
  VALIDATION_ERROR: 'Invalid input data. Please review the submitted fields.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'Authentication required.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  CONFLICT: 'Data conflict. The resource may already exist.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  PLAN_LIMIT: 'Plan limit reached. Please upgrade your subscription.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  BAD_REQUEST: 'Incomplete request. Please verify the submitted data.',
  PAYMENT_ERROR: 'Payment processing error. Please try again later.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'Unsupported file type.',
  WEBHOOK_INVALID: 'Invalid request.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
};

export interface PublicErrorResponse {
  success: false;
  code: ErrorCodeType;
  messageAr: string;
  messageEn: string;
  requestId: string;
}

const MAX_LOG_VALUE = 1_000;

const REDACTION_RULES: Array<[RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[JWT_REDACTED]'],
  [/(password|passphrase|token|secret|cookie|authorization|api[_-]?key|private[_-]?key)\s*["']?\s*[:=]\s*["']?[^"',\s}\]]+/gi, '$1=[REDACTED]'],
  [/(DATABASE_URL|NEXTAUTH_SECRET|JWT_SECRET|ENCRYPTION_KEY|CRON_SECRET|WEBHOOK_SECRET|LEADS_WEBHOOK_SECRET|PAYLINK_SECRET_KEY|RESEND_API_KEY|GEMINI_API_KEY|WHATSAPP_ACCESS_TOKEN|WHATSAPP_APP_SECRET)\s*[:=]?\s*[^\s,;]+/gi, '$1=[REDACTED]'],
  [/([?&](?:token|secret|key|signature|authorization)=)[^&#\s]+/gi, '$1[REDACTED]'],
  [/[A-Za-z]:\\[^\s"',;)]+/g, '[PATH]'],
  [/\/(?:home|var|usr|tmp|root|Users)\/[^\s"',;)]+/g, '[PATH]'],
];

function redactSensitive(value: string): string {
  let output = value.slice(0, MAX_LOG_VALUE);
  for (const [pattern, replacement] of REDACTION_RULES) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function safeSerialize(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value === 'string') return value;

  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) return '[Circular]';
        seen.add(nestedValue);
      }
      return nestedValue;
    });
  } catch {
    return String(value);
  }
}

export function publicError(
  code: ErrorCodeType,
  internalContext?: string,
  rawError?: unknown
): PublicErrorResponse {
  const requestId = randomUUID();
  const details = [`code=${code}`, `requestId=${requestId}`];

  if (internalContext) {
    details.push(`ctx=${redactSensitive(internalContext)}`);
  }

  if (rawError instanceof Error) {
    details.push(`err=${redactSensitive(`${rawError.name}: ${rawError.message}`)}`);
    if (rawError.stack) {
      details.push(
        `stack=${redactSensitive(
          rawError.stack.split('\n').slice(0, 5).join(' | ')
        )}`
      );
    }
  } else if (rawError !== undefined) {
    details.push(`raw=${redactSensitive(safeSerialize(rawError))}`);
  }

  console.error('[ORCA-ERR]', details.join(' | '));

  return {
    success: false,
    code,
    messageAr: SAFE_AR_MESSAGES[code],
    messageEn: SAFE_EN_MESSAGES[code],
    requestId,
  };
}

export function classifyError(error: unknown): ErrorCodeType {
  if (!error || typeof error !== 'object') {
    return ErrorCode.INTERNAL_ERROR;
  }

  const candidate = error as { code?: unknown; name?: unknown };

  switch (candidate.code) {
    case 'P2002':
      return ErrorCode.CONFLICT;
    case 'P2025':
      return ErrorCode.NOT_FOUND;
    case 'P2003':
    case 'P2011':
    case 'P2012':
    case 'P2013':
      return ErrorCode.VALIDATION_ERROR;
    case 'P2024':
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      break;
  }

  if (candidate.name === 'PlanLimitError') {
    return ErrorCode.PLAN_LIMIT;
  }

  return ErrorCode.INTERNAL_ERROR;
}

export function statusForErrorCode(code: ErrorCodeType): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.INVALID_FILE_TYPE:
      return 400;
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.WEBHOOK_INVALID:
      return 401;
    case ErrorCode.FORBIDDEN:
    case ErrorCode.PLAN_LIMIT:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
      return 409;
    case ErrorCode.FILE_TOO_LARGE:
      return 413;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    case ErrorCode.PAYMENT_ERROR:
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Backward-compatible framework-neutral helper.
 * Prefer publicError() plus an explicit HTTP status at the route boundary.
 */
export function makeErrorResponse(
  code: ErrorCodeType,
  _httpStatus: number,
  internalContext?: string,
  rawError?: unknown
): PublicErrorResponse {
  return publicError(code, internalContext, rawError);
}
