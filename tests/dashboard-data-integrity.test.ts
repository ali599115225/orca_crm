import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const view = fs.readFileSync(
  'app/operations/dashboard/DashboardView.tsx',
  'utf8',
);

describe('DASH-V02 data integrity', () => {
  it('keeps WhatsApp visible with zero defaults', () => {
    expect(view).toContain(
      'whatsAppStats = { conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0 }',
    );
  });

  it('uses the approved requests and WhatsApp grid (8/12 and 4/12)', () => {
    expect(view).toContain('xl:grid-cols-12');
    expect(view).toContain('xl:col-span-8');
    expect(view).toContain('xl:col-span-4');
  });

  it('uses centralized translations', () => {
    expect(view).toContain("t('tasks.viewAll')");
    expect(view).toContain("t('dash.welcome')");
    expect(view).toContain("t('kpi.totalLeads')");
    expect(view).toContain("t('pipeline.title')");
  });

  it('uses items-start for operating row', () => {
    expect(view).toMatch(/items-start[\s\S]*?Pipeline/);
  });

  it('does not display agents summary', () => {
    expect(view).not.toContain('DashboardAgentsSummary');
    expect(view).not.toContain('agents={dashboardAgents}');
  });

  it('does not contain AI Preview section', () => {
    expect(view).not.toContain('AI / PREVIEW PANEL');
    expect(view).not.toContain('aiPredictions');
  });

  it('uses DashboardMetricCard for KPI cards', () => {
    expect(view).toContain("import DashboardMetricCard from './components/DashboardMetricCard'");
    expect(view).toContain('<DashboardMetricCard');
  });

  it('shows no results message when search has no matches', () => {
    expect(view).toContain('search.noResults');
    expect(view).toContain('anyWidgetVisible');
  });

  it('search visibility follows filtered section data', () => {
    expect(view).toContain('const pipelineVisible =');
    expect(view).toContain('const tasksVisible =');
    expect(view).toContain('const requestsVisible =');
    expect(view).toContain('const whatsappVisible =');
  });

  it('keeps recent requests visible for matching lead details', () => {
    expect(view).toContain('filteredRecentLeads.length > 0');
    expect(view).toContain('{requestsVisible && (');
  });

  it('includes WhatsApp labels in search visibility', () => {
    expect(view).toContain("t('tab.whatsapp')");
    expect(view).toContain("t('kpi.whatsappConvos')");
    expect(view).toContain("t('kpi.whatsappNewLeads')");
    expect(view).toContain("t('kpi.unreadMessages')");
    expect(view).toContain('whatsappVisible');
  });

  it('hides the requests and WhatsApp row when neither matches', () => {
    expect(view).toContain(
      '{(requestsVisible || whatsappVisible) && (',
    );
    expect(view).toContain('{whatsappVisible && (');
    expect(view).toContain('!anyWidgetVisible');
  });

  it('calculates pipeline percentages from the complete pipeline', () => {
    expect(view).toContain(
      'const total = pipelineStages.reduce',
    );
    expect(view).not.toContain(
      'const total = filteredPipelineStages.reduce',
    );
  });
});
