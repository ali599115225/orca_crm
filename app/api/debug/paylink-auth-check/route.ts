// TEMP DEBUG ROUTE — disable after test
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET || '';
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (CRON_SECRET && bearerToken !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized — requires CRON_SECRET Bearer' }, { status: 401 });
  }

  const PAYLINK_BASE = process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
  const API_ID = process.env.PAYLINK_API_ID || '';
  const SECRET_KEY = process.env.PAYLINK_SECRET_KEY || '';

  const hasApiId = !!(API_ID && API_ID.length > 0);
  const hasSecretKey = !!(SECRET_KEY && SECRET_KEY !== 'test_secret_key_placeholder');

  async function testAuth(persistToken: string | boolean) {
    const body = { apiId: API_ID, secretKey: SECRET_KEY, persistToken };
    try {
      const resp = await fetch(`${PAYLINK_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}
      const idToken = data.id_token || data.token || data.access_token || '';
      return {
        status: resp.status,
        providerMessage: (data.message || data.error || data.Message || text).substring(0, 200),
        hasIdToken: !!idToken,
        idTokenLength: idToken.length,
        responseKeys: Object.keys(data).join(','),
      };
    } catch (err: any) {
      return { status: 0, providerMessage: `Network error: ${err.message}`, hasIdToken: false, idTokenLength: 0, responseKeys: '' };
    }
  }

  const resultA = await testAuth("false");
  const resultB = await testAuth(false);

  return NextResponse.json({
    env: {
      hasApiId,
      apiIdPrefix: hasApiId ? API_ID.substring(0, 8) + '***' : 'N/A',
      hasSecretKey,
      secretKeyLength: SECRET_KEY.length,
      baseUrl: PAYLINK_BASE,
      endpoint: `${PAYLINK_BASE}/api/auth`,
    },
    variantA_string: { persistToken: 'string "false"', ...resultA },
    variantB_boolean: { persistToken: 'boolean false', ...resultB },
    conclusion: (!resultA.hasIdToken && !resultB.hasIdToken)
      ? 'CREDENTIALS_REJECTED — Both variants failed. Credentials likely mismatched with Paylink sandbox.'
      : resultA.hasIdToken
        ? 'STRING_WORKS — Use persistToken: "false" (string)'
        : 'BOOLEAN_WORKS — Use persistToken: false (boolean)',
  });
}
