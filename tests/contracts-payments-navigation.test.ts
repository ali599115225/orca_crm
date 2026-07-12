import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('contracts and payments navigation', () => {
  it('uses canonical workspace routes instead of query-only navigation', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');
    const routes = source('components/contracts-payments/routes.ts');

    expect(center).toContain('router.push(CONTRACTS_PAYMENTS_ROUTES[pane]');
    expect(routes).toContain("payments: '/operations/rental/payments'");
    expect(routes).toContain("invoices: '/operations/rental/invoices'");
    expect(routes).toContain("sales: '/operations/rental/sales'");
    expect(center).not.toContain("params.set('pane', pane)");
  });

  it('keeps old pane query links compatible', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(center).toContain("const requestedPane = searchParams.get('pane')");
    expect(center).toContain('isActivePane(requestedPane)');
  });

  it('returns from a sales contract to the canonical sales workspace', () => {
    const workspace = source('components/sales/SalesContractWorkspace.tsx');

    expect(workspace).toContain('router.push("/operations/rental/sales")');
    expect(workspace).not.toContain('router.push("/operations/rental?pane=sales")');
  });
});
