import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('contracts and payments independent payments pane', () => {
  it('loads real payment transactions from the dedicated API', () => {
    const page = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(page).toContain("fetch('/api/v1/payments/')");
    expect(page).toContain('paymentsJson.payments');
    expect(page).toContain('setPayments(');
  });

  it('exposes payments through the shared operational shell', () => {
    const page = source('components/contracts-payments/ContractsPaymentsCenter.tsx');
    const shell = source(
      'components/contracts-payments/ContractsPaymentsShell.tsx',
    );
    const workspace = source(
      'components/contracts-payments/PaymentsWorkspace.tsx',
    );

    expect(page).toContain('type ActivePane = ContractsPaymentsPane');
    expect(page).toContain('<ContractsPaymentsShell');
    expect(shell).toContain("id: 'payments'");
    expect(page).toContain("activePane === 'payments'");
    expect(page).toContain('<PaymentsWorkspace');
    expect(workspace).toContain('data-payments-workspace');
  });
});