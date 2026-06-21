/**
 * ORCA CRM production startup validation.
 * Checks only platform-critical secrets. External provider credentials remain
 * validated by their own integration routes until launch activation.
 */
import 'server-only';

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i,
  /^replace[_-]/i,
  /^change[_-]/i,
  /^placeholder/i,
  /^example/i,
  /^test[_-]?secret/i,
  /^dev[_-]?only/i,
  /orca_crm_dev_only/i,
  /^x{3,}$/i,
  /^todo/i,
  /^fixme/i,
];

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function requireSecret(
  issues: string[],
  name: string,
  minimumLength: number
): void {
  const value = process.env[name]?.trim() ?? '';

  if (!value) {
    issues.push(`${name} is missing`);
    return;
  }

  if (value.length < minimumLength) {
    issues.push(`${name} must be at least ${minimumLength} characters`);
    return;
  }

  if (isPlaceholder(value)) {
    issues.push(`${name} contains a placeholder value`);
  }
}

export function validateStartupSecrets(): void {
  if (!isProductionRuntime()) return;

  const issues: string[] = [];

  requireSecret(issues, 'JWT_SECRET', 32);
  requireSecret(issues, 'ENCRYPTION_KEY', 32);
  requireSecret(issues, 'CRON_SECRET', 32);

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) {
    issues.push('DATABASE_URL is missing');
  } else if (isPlaceholder(databaseUrl)) {
    issues.push('DATABASE_URL contains a placeholder value');
  } else if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    issues.push('DATABASE_URL must use a PostgreSQL connection URL');
  }

  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (superAdminEmails.length === 0) {
    issues.push('SUPER_ADMIN_EMAILS is missing');
  } else if (
    superAdminEmails.some(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
  ) {
    issues.push('SUPER_ADMIN_EMAILS contains an invalid email');
  }

  if (issues.length > 0) {
    const message = `ORCA CRM startup blocked: ${issues.join('; ')}`;
    console.error('[ORCA-STARTUP]', message);
    throw new Error(message);
  }
}
