import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  assertPlanLimit,
  logPlanBlockedAttempt,
  PlanLimitError,
} from '@/lib/plan-guard';
import { rateLimit } from '@/lib/rate-limit';
import { decryptSecret } from '@/lib/secret-encryption';
import { hashEmail, hashPhone } from '@/lib/privacy-mask';
import {
  classifyError,
  ErrorCode,
  publicError,
  statusForErrorCode,
  type ErrorCodeType,
} from '@/lib/errors';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function errorResponse(
  code: ErrorCodeType,
  context: string,
  error?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, error), { status });
}

function secureHexEqual(left: string, right: string): boolean {
  if (
    !/^[a-f0-9]{64}$/i.test(left) ||
    !/^[a-f0-9]{64}$/i.test(right)
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function cleanText(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
}

function firstText(
  body: Record<string, unknown>,
  keys: readonly string[],
  maximumLength: number
): string {
  for (const key of keys) {
    const value = cleanText(body[key], maximumLength);
    if (value) return value;
  }

  return '';
}

function normalizePhone(value: string): string | null {
  let normalized = value.replace(/[\s\-().]/g, '');

  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  } else if (normalized.startsWith('00')) {
    normalized = normalized.slice(2);
  }

  if (
    !/^\d{9,15}$/.test(normalized) ||
    /^(\d)\1+$/.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

function validEmail(value: string): boolean {
  return (
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function requestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'leads webhook body exceeds size limit',
        undefined,
        413
      );
    }

    const ipLimit = await rateLimit(
      `leads:webhook:ip:${requestIp(request)}`,
      60,
      60_000,
      true
    );

    if (!ipLimit.allowed) {
      return errorResponse(
        ErrorCode.RATE_LIMITED,
        'leads webhook IP rate limit exceeded'
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'leads webhook requires application/json'
      );
    }

    const keyId = cleanText(request.headers.get('x-webhook-key-id'), 100);
    const timestampHeader = request.headers
      .get('x-webhook-timestamp')
      ?.trim();
    const signatureHeader = request.headers
      .get('x-webhook-signature')
      ?.trim();

    if (!keyId || !timestampHeader || !signatureHeader) {
      return errorResponse(
        ErrorCode.WEBHOOK_INVALID,
        'leads webhook authentication headers are missing'
      );
    }

    if (!/^[a-f0-9]{32}$/i.test(keyId)) {
      return errorResponse(
        ErrorCode.WEBHOOK_INVALID,
        'leads webhook key identifier is invalid'
      );
    }

    const timestamp = Number(timestampHeader);
    const nowSeconds = Math.floor(Date.now() / 1_000);

    if (
      !Number.isInteger(timestamp) ||
      Math.abs(nowSeconds - timestamp) > MAX_CLOCK_SKEW_SECONDS
    ) {
      return errorResponse(
        ErrorCode.WEBHOOK_INVALID,
        'leads webhook timestamp is invalid or expired'
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { leadsWebhookKeyId: keyId },
      select: {
        id: true,
        isActive: true,
        encryptedLeadsWebhookSecret: true,
      },
    });

    if (
      !tenant?.isActive ||
      !tenant.encryptedLeadsWebhookSecret
    ) {
      return errorResponse(
        ErrorCode.WEBHOOK_INVALID,
        'leads webhook tenant is unavailable'
      );
    }

    let secret: string;
    try {
      secret = decryptSecret(tenant.encryptedLeadsWebhookSecret);
    } catch (error: unknown) {
      return errorResponse(
        ErrorCode.SERVICE_UNAVAILABLE,
        'leads webhook secret decryption failed',
        error
      );
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'leads webhook body exceeds size limit',
        undefined,
        413
      );
    }

    const suppliedSignature = signatureHeader.replace(/^sha256=/i, '');
    const expectedSignature = createHmac('sha256', secret)
      .update(`${timestampHeader}.${rawBody}`)
      .digest('hex');

    if (!secureHexEqual(suppliedSignature, expectedSignature)) {
      return errorResponse(
        ErrorCode.WEBHOOK_INVALID,
        'leads webhook signature verification failed'
      );
    }

    const replayLimit = await rateLimit(
      `leads:webhook:replay:${keyId}:${timestampHeader}:${suppliedSignature}`,
      1,
      MAX_CLOCK_SKEW_SECONDS * 1_000,
      true
    );

    if (!replayLimit.allowed) {
      return errorResponse(
        ErrorCode.CONFLICT,
        'leads webhook replay detected'
      );
    }

    const tenantLimit = await rateLimit(
      `leads:webhook:tenant:${tenant.id}`,
      20,
      60_000,
      true
    );

    if (!tenantLimit.allowed) {
      return errorResponse(
        ErrorCode.RATE_LIMITED,
        'leads webhook tenant rate limit exceeded'
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'leads webhook body is not valid JSON'
      );
    }

    if (
      !parsedBody ||
      typeof parsedBody !== 'object' ||
      Array.isArray(parsedBody)
    ) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'leads webhook body must be an object'
      );
    }

    const body = parsedBody as Record<string, unknown>;

    const providedFullName = firstText(
      body,
      ['fullName', 'full_name'],
      160
    );
    const firstNameInput = firstText(
      body,
      ['firstName', 'first_name'],
      80
    );
    const lastNameInput = firstText(
      body,
      ['lastName', 'last_name'],
      80
    );
    const fullName =
      providedFullName ||
      `${firstNameInput} ${lastNameInput}`.trim();

    const phoneInput = firstText(
      body,
      ['phone', 'phone_number', 'phoneNumber'],
      32
    );
    const phone = normalizePhone(phoneInput);

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          status: 'Filtered',
          message: 'تمت تصفية العميل لعدم صلاحية رقم الهاتف المرفق.',
        },
        { status: 200 }
      );
    }

    const email = firstText(body, ['email'], 254).toLowerCase();
    if (email && !validEmail(email)) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'leads webhook email is invalid'
      );
    }

    const campaignSource =
      firstText(
        body,
        ['campaignSource', 'campaign_source', 'source'],
        120
      ) || 'Google Ads';
    const notes = firstText(
      body,
      ['notes', 'user_notes', 'user_intent'],
      2_000
    );
    const city = firstText(body, ['city'], 100) || 'الرياض';

    const existingLead = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        phone,
      },
      select: { id: true },
    });

    if (existingLead) {
      return NextResponse.json({
        success: false,
        status: 'Duplicate',
        message: 'هذا العميل مسجل مسبقاً في قاعدة بيانات المنشأة.',
      });
    }

    let intentScore = 50;
    const notesLower = notes.toLowerCase();
    const highIntentKeywords = [
      'شراء',
      'عاجل',
      'مستعد',
      'شقة',
      'استثمار',
      'كاش',
      'تمويل',
      'دفعة',
      'توقيع',
      'حجز',
      'برج',
      'شراء فوري',
    ];
    const lowIntentKeywords = [
      'سؤال',
      'استفسار',
      'غالي',
      'تصفح',
      'بين فترة',
      'خطأ',
      'غلط',
      'فضول',
    ];

    for (const keyword of highIntentKeywords) {
      if (notesLower.includes(keyword)) intentScore += 15;
    }

    for (const keyword of lowIntentKeywords) {
      if (notesLower.includes(keyword)) intentScore -= 15;
    }

    intentScore = Math.max(0, Math.min(100, intentScore));

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'عميل';
    const lastName = nameParts.slice(1).join(' ') || 'محتمل';
    const isHotLead = intentScore >= 75;
    let assignedRepId: string | null = null;

    if (isHotLead) {
      const salesRepresentatives = await prisma.user.findMany({
        where: {
          tenantId: tenant.id,
          role: 'SALES_EMPLOYEE',
        },
        select: { id: true },
      });

      if (salesRepresentatives.length > 0) {
        const representativeIds = salesRepresentatives.map(
          (representative) => representative.id
        );
        const leadCounts = await prisma.lead.groupBy({
          by: ['assignedTo'],
          where: {
            assignedTo: { in: representativeIds },
          },
          _count: { id: true },
        });
        const countByRepresentative = new Map(
          leadCounts.map((entry) => [
            entry.assignedTo,
            entry._count.id,
          ])
        );

        assignedRepId = salesRepresentatives
          .map((representative) => ({
            id: representative.id,
            count: countByRepresentative.get(representative.id) ?? 0,
          }))
          .sort((left, right) => left.count - right.count)[0]?.id ?? null;
      }
    }

    let newLead;
    try {
      newLead = await prisma.$transaction(async (tx) => {
        await assertPlanLimit({
          tenantId: tenant.id,
          feature: 'leads',
          tx,
        });

        return tx.lead.create({
          data: {
            tenantId: tenant.id,
            firstName,
            lastName,
            phone,
            phoneHash: hashPhone(tenant.id, phone),
            email: email || null,
            emailHash: email ? hashEmail(email, tenant.id) : null,
            city,
            source: campaignSource,
            status: isHotLead ? 'NEW' : 'CONTACTED',
            leadScore: intentScore,
            assignedTo: assignedRepId,
          },
        });
      });
    } catch (error: unknown) {
      if (error instanceof PlanLimitError) {
        await logPlanBlockedAttempt({
          tenantId: tenant.id,
          error,
        }).catch((logError) => {
          publicError(
            ErrorCode.INTERNAL_ERROR,
            'leads webhook plan-limit audit failed',
            logError
          );
        });

        return errorResponse(
          ErrorCode.PLAN_LIMIT,
          'leads webhook plan limit reached'
        );
      }

      throw error;
    }

    const telemetryMessage = `«قام الوكيل ساهر بفرز عميل جديد من حملة [${campaignSource}] وتوجيهه لفريق النخبة لارتفاع ملاءته المالية تلقائياً»`;

    await prisma.agentTelemetryLog
      .create({
        data: {
          tenantId: tenant.id,
          agentId: 'Saher',
          actionType: 'Lead_Screening',
          logMessageAr: telemetryMessage,
          severity: 'Info',
        },
      })
      .catch((telemetryError) => {
        publicError(
          ErrorCode.INTERNAL_ERROR,
          'leads webhook telemetry failed',
          telemetryError
        );
      });

    return NextResponse.json(
      {
        success: true,
        status: isHotLead
          ? 'Hot_Lead_Routed'
          : 'Lead_Nurture_Pipeline',
        leadId: newLead.id,
        assignedTo: assignedRepId,
        score: intentScore,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const code = classifyError(error);
    return errorResponse(
      code,
      'leads webhook processing failed',
      error
    );
  }
}
