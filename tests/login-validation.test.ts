import { describe, it, expect, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies to isolate the API route logic
vi.mock('@/lib/prisma', () => ({
  rawPrisma: {}
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true })
}));
vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(true)
}));

let POST: typeof import('@/app/api/v1/auth/login/route')['POST'];

describe('Login API Validation', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    ({ POST } = await import('@/app/api/v1/auth/login/route'));
  });

  it('should return 400 when body is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
      // No body provided
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('بيانات الطلب غير صالحة. تأكد من إرسال JSON صحيح.');
  });

  it('should return 400 when body is malformed JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: '{ invalid: json'
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('بيانات الطلب غير صالحة. تأكد من إرسال JSON صحيح.');
  });

  it('should return 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('البريد الإلكتروني وكلمة المرور حقول إلزامية.');
  });
});
