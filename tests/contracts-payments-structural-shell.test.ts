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
    expect(page).toContain("L('مركز العقود والتحصيل المالي', 'Contracts & Financial Collection Center')");
    expect(page).toContain('detailLeaseId');
    expect(page).toContain('getLeaseDisplayNumber(selectedLease, displayLocale)');
    expect(page).toContain('metrics={');
    expect(page).toContain('alerts={detailLeaseId ? [] : [');
    expect(page).not.toContain('import PageHeader');
    expect(page).not.toContain('const compactOperationsStrip');
  });

  it('keeps all six workspaces without a decorative global lifecycle', () => {
    const shell = source('components/contracts-payments/ContractsPaymentsShell.tsx');

    expect(shell).toContain('id: "sales"');
    expect(shell).toContain('id: "leases"');
    expect(shell).toContain('id: "invoices"');
    expect(shell).toContain('id: "payments"');
    expect(shell).toContain('id: "reconciliation"');
    expect(shell).toContain('id: "settlements"');
    expect(shell).toContain('data-contracts-payments-shell');
    expect(shell).not.toContain("'السلسلة المالية'");
    expect(shell).not.toContain('activeLifecycleIndex');
  });
  it('uses a dedicated rental lease detail route and one V3 contract-detail anatomy', () => {
    const center = source('components/contracts-payments/ContractsPaymentsCenter.tsx');
    const shell = source('components/contracts-payments/ContractsPaymentsShell.tsx');
    const sales = source('components/sales/SalesContractWorkspace.tsx');
    const leaseRoute = source('app/operations/rental/leases/[id]/page.tsx');
    const backAction = source('components/operations/OperationsBackAction.tsx');
    const tabPanel = source('components/operations/OperationsTabPanel.tsx');
    const css = source('app/operations/orca-page-contract-v1.css');

    expect(leaseRoute).toContain('detailLeaseId={id}');
    expect(center).toContain('router.push(`/operations/rental/leases/${lease.id}`)');
    expect(center).toContain('showWorkspaceNavigation={!detailLeaseId}');
    expect(center).toContain('data-rental-leases-list');
    expect(center).toContain('data-rental-lease-detail');
    expect(center).not.toContain('variant={selectedLease ? "masterRightDetailWide" : "singlePane"}');
    expect(center).toContain('<OperationsExecutiveGrid variant="singlePane" data-lease-detail-grid>');
    expect(center).toContain('href="/operations/rental/leases"');
    expect(sales).toContain('href="/operations/rental/sales"');
    expect(backAction).toContain('data-operations-back-action');

    expect(shell).toContain('showWorkspaceNavigation = true');
    expect(shell).toContain('data-contracts-payments-tabs');
    expect(shell).toContain('className="w-full justify-start"');

    const leaseTabsBlock = center.slice(
      center.indexOf('{/* Sub-tabs list */}'),
      center.indexOf('{/* Sub-tab Panes */}'),
    );
    expect(leaseTabsBlock.indexOf("id: 'summary'")).toBeLessThan(leaseTabsBlock.indexOf("id: 'invoices'"));
    expect(leaseTabsBlock.indexOf("id: 'invoices'")).toBeLessThan(leaseTabsBlock.indexOf("id: 'payments'"));
    expect(leaseTabsBlock.indexOf("id: 'payments'")).toBeLessThan(leaseTabsBlock.indexOf("id: 'docs'"));
    expect(leaseTabsBlock.indexOf("id: 'docs'")).toBeLessThan(leaseTabsBlock.indexOf("id: 'settlements'"));
    expect(leaseTabsBlock.indexOf("id: 'settlements'")).toBeLessThan(leaseTabsBlock.indexOf("id: 'events'"));

    expect(center).toContain('data-lease-tab-panel="summary"');
    expect(center).toContain('data-lease-tab-panel="invoices"');
    expect(center).toContain('data-lease-tab-panel="payments"');
    expect(center).toContain('data-lease-tab-panel="docs"');
    expect(center).toContain('data-lease-tab-panel="settlements"');
    expect(center).toContain('data-lease-tab-panel="events"');
    expect(tabPanel).toContain('horizontalScroll?: boolean');
    expect(css).toContain('.orca-contracts-payments-tabs .orca-operations-tab:not(.is-active):hover');
    expect(css).toContain('.orca-contract-summary-grid');
    expect(css).toContain('.orca-lease-summary-grid');
    expect(css).toContain('.orca-operations-tab-panel.is-horizontal-scroll');
    expect(css).toContain('overscroll-behavior-y: auto');
    expect(css).toMatch(/\.orca-operations-executive-grid\.is-single-pane\s*\{[\s\S]*?direction:\s*inherit/);

    const lifecycle = source('components/contracts-payments/FinancialLifecycleProgress.tsx');
    const globals = source('app/globals.css');
    expect(lifecycle).toContain("dir={isArabic ? 'rtl' : 'ltr'}");
    expect(globals).toMatch(/\.orca-lifecycle-grid\s*\{[\s\S]*?direction:\s*inherit/);

    const lifecycleStages = center.slice(
      center.indexOf('const selectedLeaseLifecycleStages'),
      center.indexOf('const selectedLeaseLifecycleNextAction'),
    );
    expect(lifecycleStages.indexOf("id: 'contract'")).toBeLessThan(lifecycleStages.indexOf("id: 'invoices'"));
    expect(lifecycleStages.indexOf("id: 'invoices'")).toBeLessThan(lifecycleStages.indexOf("id: 'payments'"));
    expect(lifecycleStages.indexOf("id: 'payments'")).toBeLessThan(lifecycleStages.indexOf("id: 'settlement'"));
    expect(lifecycleStages.indexOf("id: 'settlement'")).toBeLessThan(lifecycleStages.indexOf("id: 'close'"));
  });

});
