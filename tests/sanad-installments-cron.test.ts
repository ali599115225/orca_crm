import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('server-only', () => ({}));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { rateLimitMock, runInstallmentAgentInternalMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
  runInstallmentAgentInternalMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({ rateLimit: rateLimitMock }));
vi.mock('@/lib/server/internal', () => ({
  runInstallmentAgentInternal: runInstallmentAgentInternalMock,
}));

import { GET } from '@/app/api/cron/installments/route';

function cronRequest(pathname = '/api/cron/installments', token?: string) {
  return new Request(`https://orca.test${pathname}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  }) as any;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') return [];
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe('SANAD installments cron security', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 0, resetIn: 300000 });
    runInstallmentAgentInternalMock.mockResolvedValue({ success: true, processedCount: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('fails closed when CRON_SECRET is missing', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const response = await GET(cronRequest('/api/cron/installments', 'cron-secret'));

    expect(response.status).toBe(503);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(runInstallmentAgentInternalMock).not.toHaveBeenCalled();
  });

  it('rejects a missing Authorization header', async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(runInstallmentAgentInternalMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong Bearer token', async () => {
    const response = await GET(cronRequest('/api/cron/installments', 'wrong-secret'));

    expect(response.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(runInstallmentAgentInternalMock).not.toHaveBeenCalled();
  });

  it('passes an authorized request to the persistent execution guard', async () => {
    await GET(cronRequest('/api/cron/installments', 'cron-secret'));

    expect(rateLimitMock).toHaveBeenCalledWith('cron:sanad-installments', 1, 300000, true);
  });

  it('does not run SANAD when the execution guard denies the request', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 300000 });

    const response = await GET(cronRequest('/api/cron/installments', 'cron-secret'));

    expect(response.status).toBe(429);
    expect(runInstallmentAgentInternalMock).not.toHaveBeenCalled();
  });

  it('runs SANAD once when authorization and guard pass', async () => {
    const response = await GET(cronRequest('/api/cron/installments', 'cron-secret'));

    await expect(response.json()).resolves.toEqual({ ok: true, processed: 1, failed: 0 });
    expect(response.status).toBe(200);
    expect(runInstallmentAgentInternalMock).toHaveBeenCalledTimes(1);
    expect(runInstallmentAgentInternalMock).toHaveBeenCalledWith();
  });

  it('allows only one internal execution across concurrent requests', async () => {
    rateLimitMock
      .mockResolvedValueOnce({ allowed: true, remaining: 0, resetIn: 300000 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 300000 });

    const responses = await Promise.all([
      GET(cronRequest('/api/cron/installments', 'cron-secret')),
      GET(cronRequest('/api/cron/installments', 'cron-secret')),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(runInstallmentAgentInternalMock).toHaveBeenCalledTimes(1);
  });

  it('ignores tenantId query parameters and never forwards request data', async () => {
    await GET(cronRequest('/api/cron/installments?tenantId=tenant-from-client', 'cron-secret'));

    expect(runInstallmentAgentInternalMock).toHaveBeenCalledWith();
  });

  it('has no server action wrapper or client caller for the internal SANAD function', () => {
    const actionSource = readFileSync(path.join(repoRoot, 'app/actions/sanadAgent.ts'), 'utf8');
    expect(actionSource).not.toMatch(/runInstallmentAgentInternal|runInstallmentAgentAction|use server/);

    const callers = sourceFiles(path.join(repoRoot, 'app'))
      .filter((filePath) => !filePath.endsWith(path.join('app', 'api', 'cron', 'installments', 'route.ts')))
      .filter((filePath) => readFileSync(filePath, 'utf8').includes('runInstallmentAgentInternal'));

    expect(callers).toEqual([]);
  });
});
