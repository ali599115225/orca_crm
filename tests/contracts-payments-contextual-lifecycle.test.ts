import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('contextual financial lifecycle', () => {
  it('removes the decorative lifecycle from the global center shell', () => {
    const shell = source('components/contracts-payments/ContractsPaymentsShell.tsx');

    expect(shell).not.toContain("'السلسلة المالية'");
    expect(shell).not.toContain('activeLifecycleIndex');
  });

  it('derives sales-contract progress from real contract financial data', () => {
    const workspace = source('components/sales/SalesContractWorkspace.tsx');

    expect(workspace).toContain('contractLifecycleStages');
    expect(workspace).toContain('contract.paymentPlan');
    expect(workspace).toContain('contract.installments.length');
    expect(workspace).toContain('contract.invoice');
    expect(workspace).toContain('contract.financials.remainingBalance');
    expect(workspace).toContain('<FinancialLifecycleProgress');
  });

  it('derives rental progress from linked invoices, payments, and settlement reference', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(center).toContain('selectedLeaseLifecycleStages');
    expect(center).toContain('selectedLeaseInvoices');
    expect(center).toContain('selectedLeasePayments');
    expect(center).toContain('selectedLease.financialRef');
    expect(center).toContain("title={L('مسار عقد الإيجار المالي'");
  });
});
