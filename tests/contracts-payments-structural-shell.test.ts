import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('contracts and payments structural shell', () => {
  it('moves the page into a dedicated operational shell', () => {
    const page = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(page).toContain('ContractsPaymentsShell');
    expect(page).toContain("title={L('مركز العقود والتحصيل المالي'");
    expect(page).toContain('metrics={[');
    expect(page).toContain('alerts={[');
    expect(page).not.toContain('import PageHeader');
    expect(page).not.toContain('const compactOperationsStrip');
  });

  it('keeps all six workspaces without a decorative global lifecycle', () => {
    const shell = source('components/contracts-payments/ContractsPaymentsShell.tsx');

    expect(shell).toContain("id: 'sales'");
    expect(shell).toContain("id: 'leases'");
    expect(shell).toContain("id: 'invoices'");
    expect(shell).toContain("id: 'payments'");
    expect(shell).toContain("id: 'reconciliation'");
    expect(shell).toContain("id: 'settlements'");
    expect(shell).toContain('data-contracts-payments-shell');
    expect(shell).not.toContain("'السلسلة المالية'");
    expect(shell).not.toContain('activeLifecycleIndex');
  });
});
