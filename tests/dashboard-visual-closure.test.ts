import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('DASH-V01: Dashboard Visual & Navigation Closure', () => {
  const dashboardViewPath = path.join(process.cwd(), 'app/operations/dashboard/DashboardView.tsx');
  const dashboardPagePath = path.join(process.cwd(), 'app/operations/dashboard/page.tsx');
  const dashboardViewContent = fs.readFileSync(dashboardViewPath, 'utf-8');
  const dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf-8');

  describe('1. User Name in Welcome Message', () => {
    it('Dashboard accepts user prop', () => {
      expect(dashboardViewContent).toMatch(/user\?\s*:\s*\{\s*name\?\s*:\s*string/);
    });

    it('Dashboard page fetches user from session', () => {
      expect(dashboardPageContent).toContain('getSession()');
      expect(dashboardPageContent).toContain('session?.name');
    });

    it('Dashboard uses user name in welcome message, not tenant name', () => {
      expect(dashboardViewContent).toMatch(/welcomeName\s*=\s*user\?\.name/);
      expect(dashboardViewContent).not.toMatch(/title=\{.*displayTenant.*\}/);
    });

    it('Dashboard provides fallback when user name is not available', () => {
      expect(dashboardViewContent).toMatch(/welcomeName\s*=.*\?.*User.*المستخدم/);
    });
  });

  describe('2. Navigation Links', () => {
    it('Closed contracts KPI links to /operations/sales (not /operations/rental)', () => {
      // Find the closed contracts card section
      const closedContractsMatch = dashboardViewContent.match(/kpi\.closedContracts[\s\S]{0,500}onClick=\{[^}]*navTo\(['"]\/operations\/[^'"]+['"]\)/);
      expect(closedContractsMatch).toBeTruthy();
      expect(closedContractsMatch![0]).toContain('/operations/sales');
      expect(closedContractsMatch![0]).not.toContain('/operations/rental');
    });

    it('Recent leads link to individual lead details /operations/leads/[id]', () => {
      expect(dashboardViewContent).toContain('/operations/leads/${lead.id}');
    });

    it('WhatsApp summary links to /operations/whatsapp', () => {
      expect(dashboardViewContent).toContain("navTo('/operations/whatsapp')");
    });

    it('AI agents summary links to /operations/agents', () => {
      expect(dashboardViewContent).toContain("navTo('/operations/agents')");
    });

    it('Tasks section has "View All Tasks" link to /operations/tasks', () => {
      expect(dashboardViewContent).toContain('/operations/tasks');
      expect(dashboardViewContent).toContain("t('tasks.viewAll')");

      const translationsContent = fs.readFileSync(
        'lib/i18n/translations.ts',
        'utf8',
      );

      expect(translationsContent).toContain(
        "'tasks.viewAll':",
      );
      expect(translationsContent).toContain(
        "ar: 'عرض جميع المهام'",
      );
      expect(translationsContent).toContain(
        "en: 'View all tasks'",
      );
    });
  });

  describe('3. WhatsApp Summary Card', () => {
    it('Dashboard uses DashboardWhatsAppSummary component', () => {
      expect(dashboardViewContent).toContain('DashboardWhatsAppSummary');
    });

    it('WhatsApp summary displays all three indicators (conversations, new leads, unread)', () => {
      expect(dashboardViewContent).toContain('conversationsCount');
      expect(dashboardViewContent).toContain('newLeadsCount');
      expect(dashboardViewContent).toContain('unreadMessagesCount');
    });

    it('WhatsApp summary shows zero values (not hidden when zero)', () => {
      // The component should always render, not conditionally hide zero values
      const whatsappSection = dashboardViewContent.match(/DashboardWhatsAppSummary[\s\S]*?\/>/);
      expect(whatsappSection).toBeTruthy();
      // Should not have conditional rendering based on unreadMessagesCount > 0
      expect(dashboardViewContent).not.toMatch(/unreadMessagesCount\s*>\s*0.*DashboardWhatsAppSummary/);
    });
  });

  describe('4. AI Agents Summary Card', () => {
    it('derives MANSOUR and SAHER from actual agentPerformance data', () => {
      expect(dashboardViewContent).toContain(
        '(agentPerformance ?? [])',
      );

      expect(dashboardViewContent).toContain(
        "normalizedIdentity.includes('MANSOUR')",
      );

      expect(dashboardViewContent).toContain(
        "normalizedIdentity.includes('SAHER')",
      );

      expect(dashboardViewContent).toContain(
        'agents={dashboardAgents}',
      );
    });

    it('does not inject a static agents array or fake active states', () => {
      expect(dashboardViewContent).not.toContain(
        'agents={[',
      );

      expect(dashboardViewContent).not.toContain(
        "status: 'ACTIVE'",
      );

      expect(dashboardViewContent).not.toContain(
        "lastActivity: lang === 'AR' ? 'نشط' : 'Active'",
      );
    });

    it('provides a stable empty state when no agent data exists', () => {
      const agentsComponentContent = fs.readFileSync(
        'app/operations/dashboard/components/DashboardAgentsSummary.tsx',
        'utf8',
      );

      expect(agentsComponentContent).toContain(
        'agents.length === 0',
      );

      expect(agentsComponentContent).toContain(
        'labels.empty',
      );
    });
  });
  describe('5. Quick Action Button', () => {
    it('Issue New Contract button is in PageHeader', () => {
      const pageHeaderSection = dashboardViewContent.match(/PageHeader[\s\S]*?<\/PageHeader>/);
      expect(pageHeaderSection).toBeTruthy();
      expect(pageHeaderSection![0]).toContain('action.issueContract');
      expect(pageHeaderSection![0]).toContain('setIsWizardOpen(true)');
    });

    it('Old quick action strip is removed', () => {
      // Should not have the old quick action section
      expect(dashboardViewContent).not.toMatch(/C\. QUICK ACTION.*full-width strip/);
    });
  });

  describe('6. Component Isolation', () => {



    it('DashboardWhatsAppSummary component exists', () => {
      const componentPath = path.join(process.cwd(), 'app/operations/dashboard/components/DashboardWhatsAppSummary.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('DashboardAgentsSummary component exists', () => {
      const componentPath = path.join(process.cwd(), 'app/operations/dashboard/components/DashboardAgentsSummary.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });
  });

  describe('7. No Old Blue Primary Button', () => {
    it('Dashboard does not use old blue primary button styling', () => {
      // Should not have blue background buttons as primary actions
      expect(dashboardViewContent).not.toMatch(/bg-blue-600.*hover:bg-blue-700/);
      expect(dashboardViewContent).not.toMatch(/bg-blue-500.*hover:bg-blue-600/);
    });
  });

  describe('8. No Local Theme State', () => {
    it('DashboardView does not create local theme state', () => {
      expect(dashboardViewContent).not.toMatch(/useState.*theme/);
      expect(dashboardViewContent).not.toMatch(/useState.*darkMode/);
    });
  });

  describe('9. Translations', () => {
    it('Dashboard uses translation keys for labels', () => {
      expect(dashboardViewContent).toContain("t('dash.welcome')");
      expect(dashboardViewContent).toContain("t('kpi.totalLeads')");
      expect(dashboardViewContent).toContain("t('kpi.closedContracts')");
      expect(dashboardViewContent).toContain("t('action.issueContract')");
    });

    it('Dashboard supports both Arabic and English', () => {
      // Check that both language conditions exist in the file
      expect(dashboardViewContent).toMatch(/lang === 'AR'/);
      expect(dashboardViewContent).toMatch(/lang === 'EN'/);
    });
  });

  describe('10. Page Structure', () => {
    it('Dashboard has PageHeader section', () => {
      expect(dashboardViewContent).toContain('PageHeader');
    });

    it('Dashboard has KPI Grid with 4 cards', () => {
      const kpiSection = dashboardViewContent.match(/grid-cols-1 sm:grid-cols-2 xl:grid-cols-4/);
      expect(kpiSection).toBeTruthy();
    });

    it('Dashboard has Pipeline + Tasks section', () => {
      expect(dashboardViewContent).toContain('pipeline.title');
      expect(dashboardViewContent).toContain('tasks.title');
    });

    it('Dashboard has Recent Requests section', () => {
      expect(dashboardViewContent).toContain('requests.title');
    });

    it('Dashboard has WhatsApp + Agents section', () => {
      expect(dashboardViewContent).toContain('DashboardWhatsAppSummary');
      expect(dashboardViewContent).toContain('DashboardAgentsSummary');
    });
  });
});
