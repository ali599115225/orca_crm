// TEMP — Paylink auth isolation test. Disable after test.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const BASE = process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
  const API_ID = process.env.PAYLINK_API_ID || '';
  const SECRET_KEY = process.env.PAYLINK_SECRET_KEY || '';

  const hasApiId = !!(API_ID && API_ID.length > 0);
  const hasSecretKey = !!(SECRET_KEY && SECRET_KEY !== 'test_secret_key_placeholder');

  async function testAuth(persistToken: unknown) {
    const body = { apiId: API_ID, secretKey: SECRET_KEY, persistToken };
    try {
      const resp = await fetch(`${BASE}/api/auth`, {
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
      };
    } catch (err: any) {
      return { status: 0, providerMessage: err.message.substring(0, 200), hasIdToken: false, idTokenLength: 0 };
    }
  }

  const [resultA, resultB] = await Promise.all([testAuth("false"), testAuth(false)]);

  return NextResponse.json({
    hasApiId, apiIdPrefix: hasApiId ? API_ID.substring(0, 8) + '***' : 'N/A',
    hasSecretKey, secretKeyLength: SECRET_KEY.length,
    baseUrl: BASE, endpoint: `${BASE}/api/auth`,
    variantA_string: { persistToken: 'string "false"', ...resultA },
    variantB_boolean: { persistToken: 'boolean false', ...resultB },
    conclusion: (!resultA.hasIdToken && !resultB.hasIdToken)
      ? 'CREDENTIALS_REJECTED_BY_PAYLINK — Both variants failed. Credentials mismatch with sandbox.'
      : resultA.hasIdToken
        ? 'STRING_WORKS — Use persistToken: "false" (string)'
        : 'BOOLEAN_WORKS — Use persistToken: false (boolean)',
  });
}
