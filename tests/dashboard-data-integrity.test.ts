import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const view = fs.readFileSync(
  'app/operations/dashboard/DashboardView.tsx',
  'utf8',
);

const agentsComponent = fs.readFileSync(
  'app/operations/dashboard/components/DashboardAgentsSummary.tsx',
  'utf8',
);

describe('DASH-V01 data integrity', () => {
  it('derives agent cards from agentPerformance', () => {
    expect(view).toContain('(agentPerformance ?? [])');
    expect(view).toContain('const dashboardAgents');
    expect(view).toContain('agents={dashboardAgents}');
  });

  it('does not hardcode active agent states', () => {
    expect(view).not.toContain("status: 'ACTIVE'");
    expect(view).not.toContain(
      "lastActivity: lang === 'AR' ? 'نشط' : 'Active'",
    );
  });

  it('keeps WhatsApp visible with zero defaults', () => {
    expect(view).toContain(
      'whatsAppStats = { conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0 }',
    );

    expect(view).not.toContain('{whatsAppStats && (');
  });

  it('uses the approved requests and WhatsApp grid', () => {
    expect(view).toContain(
      'grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch',
    );

    expect(view).toContain(
      'xl:col-span-2 p-5 h-full',
    );

    expect(view).toContain(
      'h-full xl:col-span-1',
    );
  });

  it('uses centralized translations', () => {
    expect(view).toContain("t('tasks.viewAll')");
    expect(view).toContain("t('agents.title')");
    expect(view).toContain("t('agents.viewAll')");
    expect(view).toContain("t('agents.empty')");
  });

  it('shows a stable empty agent state', () => {
    expect(agentsComponent).toContain(
      'agents.length === 0',
    );

    expect(agentsComponent).toContain(
      'labels.empty',
    );
  });
});