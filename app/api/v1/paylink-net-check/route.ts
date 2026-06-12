// TEMP — Paylink network reachability test. Disable after test.
import { NextResponse } from 'next/server';

export async function GET() {
  const DUMMY = { apiId: 'dummy', secretKey: 'dummy', persistToken: 'false' };
  const results: any[] = [];

  // Test 1: GET sandbox
  try {
    const r1 = await fetch('https://restpilot.paylink.sa', { signal: AbortSignal.timeout(10000) });
    results.push({ url: 'https://restpilot.paylink.sa', method: 'GET', status: r1.status, errorType: '', notes: r1.status === 405 ? '405 expected (no GET on auth base)' : '' });
  } catch (e: any) { results.push({ url: 'https://restpilot.paylink.sa', method: 'GET', status: 0, errorType: 'NETWORK', notes: e.message.substring(0, 120) }); }

  // Test 2: POST sandbox auth dummy
  try {
    const r2 = await fetch('https://restpilot.paylink.sa/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(DUMMY), signal: AbortSignal.timeout(10000),
    });
    const t2 = await r2.text();
    results.push({ url: 'https://restpilot.paylink.sa/api/auth', method: 'POST', status: r2.status, errorType: '', notes: t2.substring(0, 120) });
  } catch (e: any) { results.push({ url: 'https://restpilot.paylink.sa/api/auth', method: 'POST', status: 0, errorType: 'NETWORK', notes: e.message.substring(0, 120) }); }

  // Test 3: GET production
  try {
    const r3 = await fetch('https://restapi.paylink.sa', { signal: AbortSignal.timeout(10000) });
    results.push({ url: 'https://restapi.paylink.sa', method: 'GET', status: r3.status, errorType: '', notes: r3.status === 405 ? '405 expected' : '' });
  } catch (e: any) { results.push({ url: 'https://restapi.paylink.sa', method: 'GET', status: 0, errorType: 'NETWORK', notes: e.message.substring(0, 120) }); }

  // Test 4: POST production auth dummy
  try {
    const r4 = await fetch('https://restapi.paylink.sa/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(DUMMY), signal: AbortSignal.timeout(10000),
    });
    const t4 = await r4.text();
    results.push({ url: 'https://restapi.paylink.sa/api/auth', method: 'POST', status: r4.status, errorType: '', notes: t4.substring(0, 120) });
  } catch (e: any) { results.push({ url: 'https://restapi.paylink.sa/api/auth', method: 'POST', status: 0, errorType: 'NETWORK', notes: e.message.substring(0, 120) }); }

  return NextResponse.json({ results, env: { baseUrl: process.env.PAYLINK_BASE_URL }, generatedAt: new Date().toISOString() });
}
