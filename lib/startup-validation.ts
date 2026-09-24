import 'server-only';

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i,
  /^replace[_-]/i,
  /^change[_-]/i,
  /^placeholder/i,
  /^example/i,
  /^test[_-]secret/i,
  /^dev[_-]only/i,
  /orca_crm_dev_only/i,
  /^x{3,}/i,
  /^todo/i,
  /^fixme/i,
];

function placeholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function requireSecret(
  issues: string[],
  name: string,
  minimumLength: number
): void {
  const value = process.env[name]?.trim() ?? '';
  if (!value) issues.push(`${name} is missing`);
  else if (value.length < minimumLength) {
    issues.push(`${name} must be at least ${minimumLength} characters`);
  } else if (placeholder(value)) issues.push(`${name} contains a placeholder`);
}

export function validateStartupSecrets(): void {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.VERCEL_ENV !== 'production'
  ) {
    return;
  }

  const issues: string[] = [];
  requireSecret(issues, 'JWT_SECRET', 32);
  requireSecret(issues, 'ENCRYPTION_KEY', 32);
  requireSecret(issues, 'CRON_SECRET', 32);

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) issues.push('DATABASE_URL is missing');
  else if (placeholder(databaseUrl)) issues.push('DATABASE_URL contains a placeholder');

  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (superAdmins.length === 0) issues.push('SUPER_ADMIN_EMAILS is missing');

  if (issues.length > 0) {
    const message = `ORCA CRM startup blocked: ${issues.join('; ')}`;
    console.error('[ORCA-STARTUP]', message);
    throw new Error(message);
  }
}
