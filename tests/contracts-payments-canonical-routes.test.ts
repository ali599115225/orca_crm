import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panes = ['leases', 'sales', 'invoices', 'payments', 'reconciliation', 'settlements'] as const;

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('contracts and payments canonical workspace routes', () => {
  it.each(panes)('renders the %s workspace through the shared center', (pane) => {
    const page = source(`app/operations/rental/${pane}/page.tsx`);

    expect(page).toContain('ContractsPaymentsCenter');
    expect(page).toContain(`defaultPane="${pane}"`);
  });

  it('keeps the root route as the rental leases compatibility entry', () => {
    const page = source('app/operations/rental/page.tsx');

    expect(page).toContain('ContractsPaymentsCenter');
    expect(page).toContain('defaultPane="leases"');
  });

  it('moves the operational controller out of the route file', () => {
    const routePage = source('app/operations/rental/page.tsx');
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');

    expect(routePage.split(/\r?\n/).length).toBeLessThan(10);
    expect(center).toContain("fetch('/api/v1/payments/')");
    expect(center).toContain('<ContractsPaymentsShell');
  });
});
