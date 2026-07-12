import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('contracts and payments workspace decomposition', () => {
  it('extracts invoice and payment workspaces from the center controller', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');
    const invoices = source('components/contracts-payments/InvoicesWorkspace.tsx');
    const payments = source('components/contracts-payments/PaymentsWorkspace.tsx');

    expect(center).toContain("import InvoicesWorkspace from '@/components/contracts-payments/InvoicesWorkspace'");
    expect(center).toContain("import PaymentsWorkspace from '@/components/contracts-payments/PaymentsWorkspace'");
    expect(center).toContain('<InvoicesWorkspace');
    expect(center).toContain('<PaymentsWorkspace');
    expect(center).not.toContain("const [invoiceSearch");
    expect(center).not.toContain("const [paymentSearch");
    expect(invoices).toContain('data-invoices-workspace');
    expect(payments).toContain('data-payments-workspace');
  });

  it('keeps filtering and pagination local to each extracted workspace', () => {
    const invoices = source('components/contracts-payments/InvoicesWorkspace.tsx');
    const payments = source('components/contracts-payments/PaymentsWorkspace.tsx');

    expect(invoices).toContain("const [search, setSearch]");
    expect(invoices).toContain('const filteredInvoices = useMemo');
    expect(payments).toContain("const [providerFilter, setProviderFilter]");
    expect(payments).toContain('const filteredPayments = useMemo');
  });

  it('reduces the center without changing its route ownership', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(center.split(/\r?\n/).length).toBeLessThan(2200);
    expect(center).toContain("router.push(CONTRACTS_PAYMENTS_ROUTES[pane]");
    expect(center).toContain("fetch('/api/v1/payments/')");
  });
});
