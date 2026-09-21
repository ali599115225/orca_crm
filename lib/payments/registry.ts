// lib/payments/registry.ts — SERVER-ONLY
import "server-only";
import type { PaymentProviderAdapter, PaymentProviderCode } from './types';
import { moyasarProvider } from './providers/moyasar';
import { paylinkProvider } from './providers/paylink';
import { ngeniusProvider } from './providers/ngenius';

const providers: Map<string, PaymentProviderAdapter> = new Map();

function register(adapter: PaymentProviderAdapter): void {
  providers.set(adapter.code, adapter);
}

register(moyasarProvider);
register(paylinkProvider);
register(ngeniusProvider);

export function getPaymentProvider(code: string): PaymentProviderAdapter | null {
  return providers.get(code.toUpperCase()) || null;
}

export function isProviderEnabled(code: string): boolean {
  const enabledList = (process.env.ENABLED_PAYMENT_PROVIDERS || 'MOYASAR,PAYLINK')
    .split(',')
    .map((s) => s.trim().toUpperCase());
  return enabledList.includes(code.toUpperCase()) && providers.has(code.toUpperCase());
}

export function getDefaultProvider(): PaymentProviderAdapter {
  const defaultCode = (process.env.DEFAULT_PAYMENT_PROVIDER || 'MOYASAR').toUpperCase();
  const provider = providers.get(defaultCode);
  if (!provider) throw new Error(`Default payment provider ${defaultCode} is not registered`);
  return provider;
}

export function getEnabledProviderCodes(): string[] {
  return [...providers.keys()].filter((code) => isProviderEnabled(code));
}
