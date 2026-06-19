import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(path.join(repoRoot, 'prisma/schema.prisma'), 'utf8');
const migrationPath = path.join(
  repoRoot,
  'prisma/migrations/20260619000200_whatsapp_webhook_persistence_foundation/migration.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

function modelBlock(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  expect(match, `${name} model should exist`).not.toBeNull();
  return match?.[1] ?? '';
}

function changedFiles() {
  const statusPaths = execFileSync('git', ['-C', repoRoot, 'status', '--short'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[AMDRCU?!]{1,2}\s+/, ''))
    .filter(Boolean);

  return statusPaths.flatMap((file) => {
    if (!file.endsWith('/')) return [file];

    return execFileSync('git', ['-C', repoRoot, 'ls-files', '--others', '--exclude-standard', '--', file], {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter(Boolean);
  });
}

describe('WhatsApp persistence foundation schema', () => {
  const phoneNumberModel = modelBlock('WhatsAppPhoneNumber');
  const tenantModel = modelBlock('Tenant');
  const messageModel = modelBlock('WhatsAppMessage');

  it('defines the WhatsAppPhoneNumber tenant mapping model', () => {
    expect(phoneNumberModel).toContain('@@map("whatsapp_phone_numbers")');
    expect(phoneNumberModel).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("gen_random_uuid\(\)"\)\)\s+@db\.Uuid/);
    expect(phoneNumberModel).toMatch(/tenantId\s+String\s+@map\("tenant_id"\)\s+@db\.Uuid/);
    expect(phoneNumberModel).toContain(
      'phoneNumberId     String   @unique(map: "uq_whatsapp_phone_numbers_phone_number_id") @map("phone_number_id")',
    );
    expect(phoneNumberModel).toContain('isActive          Boolean  @default(true) @map("is_active")');
    expect(phoneNumberModel).toContain(
      'tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)',
    );
    expect(phoneNumberModel).toContain(
      '@@index([tenantId, isActive], map: "idx_whatsapp_phone_numbers_tenant_active")',
    );
    expect(tenantModel).toContain('whatsappPhoneNumbers WhatsAppPhoneNumber[]');
  });

  it('stores no WhatsApp credentials or secrets in the phone number model', () => {
    expect(phoneNumberModel).not.toMatch(/\b(accessToken|appSecret|verifyToken|credential|credentials|secret|token)\b/i);
  });

  it('makes Meta message IDs unique and removes the old normal Prisma index', () => {
    expect(messageModel).toContain(
      'metaMessageId String?              @unique(map: "uq_whatsapp_messages_meta_message_id") @map("meta_message_id")',
    );
    expect(messageModel).not.toContain('@@index([metaMessageId])');
    expect(messageModel).toContain('@@map("whatsapp_messages")');
  });
});

describe('WhatsApp persistence foundation migration', () => {
  it('creates only the WhatsApp phone number mapping table and indexes', () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.whatsapp_phone_numbers/i);
    expect(migration).toMatch(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
    expect(migration).toMatch(/tenant_id UUID NOT NULL/i);
    expect(migration).toMatch(/phone_number_id TEXT NOT NULL/i);
    expect(migration).toMatch(/is_active BOOLEAN NOT NULL DEFAULT true/i);
    expect(migration).toMatch(/FOREIGN KEY \(tenant_id\) REFERENCES public\.tenants\(id\) ON DELETE CASCADE/i);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_phone_numbers_phone_number_id/i);
    expect(migration).toMatch(/ON public\.whatsapp_phone_numbers \(phone_number_id\)/i);
    expect(migration).toMatch(/CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_tenant_active/i);
  });

  it('replaces the old Meta message normal index with one unique index', () => {
    expect(migration).toMatch(/DROP INDEX IF EXISTS public\.idx_whatsapp_messages_meta_id/i);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_meta_message_id/i);
    expect(migration).toMatch(/ON public\.whatsapp_messages \(meta_message_id\)/i);

    const droppedNames = [...migration.matchAll(/DROP\s+(?:INDEX|TABLE|CONSTRAINT)\s+(?:IF EXISTS\s+)?(?:public\.)?("?[\w_]+"?)/gi)]
      .map((match) => match[1].replace(/"/g, ''));
    expect(droppedNames).toEqual(['idx_whatsapp_messages_meta_id']);
  });

  it('contains no data mutation or unrelated table changes', () => {
    expect(migration).not.toMatch(/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|DROP\s+TABLE)\b/im);

    const referencedTables = new Set(
      [...migration.matchAll(/\b(?:public\.)?([a-z_]+)\b/g)]
        .map((match) => match[1])
        .filter((name) => ['whatsapp_phone_numbers', 'whatsapp_messages', 'tenants'].includes(name)),
    );
    expect([...referencedTables].sort()).toEqual(['tenants', 'whatsapp_messages', 'whatsapp_phone_numbers']);
    expect(migration).not.toMatch(
      /\b(payment_transactions|users|leads|contracts|whatsapp_contacts|mansour_chats|email_messages)\b/i,
    );
  });
});

describe('WhatsApp persistence foundation scope guards', () => {
  it('keeps changed files inside the approved persistence foundation scope', () => {
    const allowedFiles = new Set([
      'prisma/schema.prisma',
      'prisma/migrations/20260619000200_whatsapp_webhook_persistence_foundation/migration.sql',
      'tests/whatsapp-persistence-foundation.test.ts',
    ]);

    expect(changedFiles().map((file) => file.replaceAll('\\', '/')).filter(Boolean)).toSatisfy((files: string[]) =>
      files.every((file) => allowedFiles.has(file)),
    );
  });

  it('does not change webhook route or old migrations', () => {
    const forbiddenChanges = changedFiles()
      .map((file) => file.replaceAll('\\', '/'))
      .filter(
        (file) =>
          file === 'app/api/whatsapp/webhook/route.ts' ||
          (file.startsWith('prisma/migrations/') &&
            file !== 'prisma/migrations/20260619000200_whatsapp_webhook_persistence_foundation/migration.sql'),
      );

    expect(forbiddenChanges).toEqual([]);
  });
});
