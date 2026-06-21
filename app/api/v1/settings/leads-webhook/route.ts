import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from '@/lib/api-auth-guard';
import { encryptSecret } from '@/lib/secret-encryption';
import { ErrorCode, publicError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();
  if (!(await hasDatabaseRole(session, ['ADMIN']))) return forbiddenResponse();

  const tenant = await prisma.tenant.findFirst({
    where: { id: session.tenantId, isActive: true },
    select: {
      leadsWebhookKeyId: true,
      leadsWebhookSecretUpdatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    configured: Boolean(tenant?.leadsWebhookKeyId),
    keyId: tenant?.leadsWebhookKeyId ?? null,
    updatedAt: tenant?.leadsWebhookSecretUpdatedAt ?? null,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();
  if (!(await hasDatabaseRole(session, ['ADMIN']))) return forbiddenResponse();

  const limit = await rateLimit(
    `leads-webhook:rotate:${session.tenantId}:${session.userId}`,
    3,
    60 * 60 * 1_000,
    true
  );

  if (!limit.allowed) {
    return NextResponse.json(
      publicError(ErrorCode.RATE_LIMITED, 'leads webhook secret rotation limit'),
      { status: 429 }
    );
  }

  try {
    const keyId = randomBytes(16).toString('hex');
    const secret = randomBytes(32).toString('hex');
    const encryptedSecret = encryptSecret(secret);
    const updatedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: session.tenantId },
        data: {
          leadsWebhookKeyId: keyId,
          encryptedLeadsWebhookSecret: encryptedSecret,
          leadsWebhookSecretUpdatedAt: updatedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'ROTATE_LEADS_WEBHOOK_SECRET',
          tableName: 'tenants',
          recordId: session.tenantId,
          details: 'Lead webhook credential rotated',
        },
      });
    });

    return NextResponse.json({
      success: true,
      keyId,
      secret,
      updatedAt,
      warning: 'The secret is returned once. Store it securely.',
      signature: 'HMAC-SHA256(secret, `${timestamp}.${rawBody}`)',
      headers: [
        'X-Webhook-Key-Id',
        'X-Webhook-Timestamp',
        'X-Webhook-Signature',
      ],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(ErrorCode.INTERNAL_ERROR, 'leads webhook secret rotation failed', error),
      { status: 500 }
    );
  }
}
