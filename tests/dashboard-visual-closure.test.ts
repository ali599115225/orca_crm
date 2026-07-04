import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('DASH-V02: Dashboard Visual Rebuild', () => {
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
    });

    it('Dashboard provides fallback when user name is not available', () => {
      expect(dashboardViewContent).toMatch(/welcomeName\s*=.*\?.*User.*المستخدم/);
    });
  });

  describe('2. Navigation Links', () => {
    it('Closed contracts KPI links to /operations/sales (not /operations/rental)', () => {
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
      const whatsappSection = dashboardViewContent.match(/DashboardWhatsAppSummary[\s\S]*?\/>/);
      expect(whatsappSection).toBeTruthy();
      expect(dashboardViewContent).not.toMatch(/unreadMessagesCount\s*>\s*0.*DashboardWhatsAppSummary/);
    });
  });

  describe('4. Agents Not Displayed', () => {
    it('Dashboard does not import DashboardAgentsSummary', () => {
      expect(dashboardViewContent).not.toContain("import DashboardAgentsSummary");
    });

    it('Dashboard does not render DashboardAgentsSummary', () => {
      expect(dashboardViewContent).not.toContain('<DashboardAgentsSummary');
    });
  });

  describe('5. Quick Action Button', () => {
    it('Issue New Contract button is in PageHeader', () => {
      expect(dashboardViewContent).toContain('action.issueContract');
      expect(dashboardViewContent).toContain('setIsWizardOpen(true)');
    });

    it('Old quick action strip is removed', () => {
      expect(dashboardViewContent).not.toMatch(/C\. QUICK ACTION.*full-width strip/);
    });
  });

  describe('6. Component Isolation', () => {
    it('DashboardWhatsAppSummary component exists', () => {
      const componentPath = path.join(process.cwd(), 'app/operations/dashboard/components/DashboardWhatsAppSummary.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('DashboardMetricCard component exists', () => {
      const componentPath = path.join(process.cwd(), 'app/operations/dashboard/components/DashboardMetricCard.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });
  });

  describe('7. No Old Blue Primary Button', () => {
    it('Dashboard does not use old blue primary button styling', () => {
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
      expect(dashboardViewContent).toMatch(/lang === 'AR'/);
      expect(dashboardViewContent).toMatch(/lang === 'EN'/);
    });
  });

  describe('10. Page Structure', () => {
    it('Dashboard has PageHeader section', () => {
      expect(dashboardViewContent).toContain('A. PAGE HEADER');
    });

    it('Dashboard has KPI Grid with 4 cards', () => {
      expect(dashboardViewContent).toMatch(/grid-cols-1.*sm:grid-cols-2.*xl:grid-cols-4/);
    });

    it('Dashboard has Pipeline + Tasks section', () => {
      expect(dashboardViewContent).toContain('pipeline.title');
      expect(dashboardViewContent).toContain('tasks.title');
    });

    it('Dashboard has Recent Requests section', () => {
      expect(dashboardViewContent).toContain('requests.title');
    });

    it('Dashboard has WhatsApp section', () => {
      expect(dashboardViewContent).toContain('DashboardWhatsAppSummary');
    });

    it('Dashboard uses correct 8/12 and 4/12 grid ratios', () => {
      expect(dashboardViewContent).toContain('xl:col-span-8');
      expect(dashboardViewContent).toContain('xl:col-span-4');
    });

    it('Dashboard uses items-start for operating row', () => {
      expect(dashboardViewContent).toMatch(/items-start[\s\S]*?Pipeline/);
    });
  });

  describe('11. Visual Identity', () => {
    const metricCardPath = path.join(process.cwd(), 'app/operations/dashboard/components/DashboardMetricCard.tsx');
    const metricCardContent = fs.readFileSync(metricCardPath, 'utf-8');

    it('Dashboard uses white background in light mode', () => {
      expect(dashboardViewContent).toContain('bg-white');
    });

    it('Dashboard uses #07182D background in dark mode', () => {
      expect(dashboardViewContent).toContain('dark:bg-[#07182D]');
    });

    it('Dashboard uses gold color #D9AD55', () => {
      expect(dashboardViewContent).toContain('#D9AD55');
    });

    it('Dashboard uses text color #0A1F3A', () => {
      expect(dashboardViewContent).toContain('#0A1F3A');
    });

    it('KPI cards have 144px height (h-36)', () => {
      expect(metricCardContent).toContain('h-36');
    });

    it('Header elements have 56px height (h-14)', () => {
      expect(dashboardViewContent).toContain('h-14');
    });

    it('KPI numbers use text-4xl font-black', () => {
      expect(metricCardContent).toContain('text-4xl font-black');
    });

    it('Dashboard uses Western numerals (0-9) not Arabic numerals', () => {
      expect(dashboardViewContent).not.toContain('toArabicNumerals');
    });
  });

  describe('12. AI Preview Panel Removed', () => {
    it('Dashboard does not contain AI Preview section', () => {
      expect(dashboardViewContent).not.toContain('AI / PREVIEW PANEL');
      expect(dashboardViewContent).not.toContain('aiPredictions');
    });
  });

  describe('13. DashboardMetricCard Usage', () => {
    it('Dashboard imports DashboardMetricCard', () => {
      expect(dashboardViewContent).toContain("import DashboardMetricCard from './components/DashboardMetricCard'");
    });

    it('Dashboard uses DashboardMetricCard for KPI cards', () => {
      expect(dashboardViewContent).toContain('<DashboardMetricCard');
    });

    it('DashboardMetricCard is used at least 4 times', () => {
      const matches = dashboardViewContent.match(/<DashboardMetricCard/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('14. Search No Results Message', () => {
    it('Dashboard shows no results message when search has no matches', () => {
      expect(dashboardViewContent).toContain('search.noResults');
      expect(dashboardViewContent).toContain('anyWidgetVisible');
    });
  });
});
