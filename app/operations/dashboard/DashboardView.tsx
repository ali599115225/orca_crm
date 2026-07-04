// app/operations/dashboard/DashboardView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { useAuth } from '@/app/context/AuthContext';
import ContractWizard from '@/components/features/ContractWizard';
import type { PipelineStage, TodayTask } from '@/app/actions/dashboard';
import { displayPerson, displayGeo, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';
import { formatDisplayDate, formatDisplayTime } from '@/lib/display/dateTime';
import DashboardWhatsAppSummary from './components/DashboardWhatsAppSummary';
import DashboardMetricCard from './components/DashboardMetricCard';
import InteractiveSurface from '@/components/ui/InteractiveSurface';
import {
  CalendarCheck2,
  FileCheck2,
  FilePlus2,
  Handshake,
  SendHorizontal,
  UserRound,
  UsersRound,
} from 'lucide-react';

interface DashboardViewProps {
  user?: { name?: string | null };
  tenant?: { companyName: string; subdomain: string; subscriptionPlan: string; extraAgents: number };
  stats?: {
    totalLeads?: number;
    activeBookings?: number;
    dailyTours?: number;
    sentOffers?: number;
    closedContracts?: number;
    closedSales?: number;
    totalProjects?: number;
    pendingTasks?: number;
    monthlySales?: number;
  };
  recentLeads?: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    status: string;
    city: string;
    createdAt: string;
    project?: { name: string } | null;
  }>;
  recentTasks?: Array<any>;
  projects?: Array<any>;
  agentPerformance?: Array<any>;
  leadSources?: Array<any>;
  systemAlerts?: Array<any>;
  pipelineStages?: PipelineStage[];
  todayTasks?: TodayTask[];
  whatsAppStats?: { conversationsCount: number; newLeadsCount: number; unreadMessagesCount: number };
}

export default function DashboardView({
  user,
  tenant,
  stats,
  recentLeads = [],
  pipelineStages = [],
  todayTasks = [],
  whatsAppStats = { conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0 },
  recentTasks,
  projects,
  agentPerformance,
  leadSources,
  systemAlerts,
}: DashboardViewProps) {
  const { lang, t } = useApp();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';
  const displayName = displayPerson(user?.name || '', displayLocale, { route: '/operations/dashboard' });
  const welcomeName = user?.name ? displayName : lang === 'EN' ? 'User' : 'المستخدم';

  const getInitials = (firstName: string, lastName: string | null): string => {
    const fullName = `${firstName} ${lastName || ''}`.trim();
    const displayName = displayPerson(fullName, displayLocale, { route: '/operations/dashboard' });
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  };

  const navTo = (path: string) => router.push(path);

  useEffect(() => {
    const handler = (e: Event) => {
      setSearchQuery((e as CustomEvent).detail || '');
    };
    window.addEventListener('search-change', handler);
    return () => window.removeEventListener('search-change', handler);
  }, []);

  const s = searchQuery.toLowerCase().trim();
  const searchActive = s.length > 0;

  const formatNum = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return '0';
    return num.toString();
  };

  const matchesSearch = (...texts: (string | undefined | null)[]): boolean => {
    if (!searchActive) return true;
    return texts.some((text) => text && text.toLowerCase().includes(s));
  };

  const totalLeadsCount = stats?.totalLeads ?? 0;
  const dailyToursCount = stats?.dailyTours ?? 0;
  const sentOffersCount = stats?.sentOffers ?? 0;
  const closedContractsCount = stats?.closedContracts ?? 0;

  const handleWizardSuccess = () => router.refresh();

  const filteredRecentLeads = recentLeads.slice(0, 5).filter((lead) => {
    if (!searchActive) return true;
    return matchesSearch(
      `${lead.firstName} ${lead.lastName || ''}`,
      lead.phone,
      lead.city,
      lead.status,
      lead.project?.name,
    );
  });

  const filteredTodayTasks = todayTasks.filter((task) => {
    if (!searchActive) return true;
    const priorityLabel =
      task.priority === 'HIGH'
        ? t('tasks.priority.high')
        : task.priority === 'MEDIUM'
        ? t('tasks.priority.medium')
        : t('tasks.priority.low');
    return matchesSearch(task.title, priorityLabel, task.leadName);
  });

  const filteredPipelineStages = pipelineStages.filter((stage) => {
    if (!searchActive) return true;
    const stageKeyMap: Record<string, string> = {
      inquiry: 'pipeline.inquiry',
      tour: 'pipeline.tour',
      offer: 'pipeline.offer',
      close: 'pipeline.close',
    };
    return matchesSearch(t(stageKeyMap[stage.key] || stage.key));
  });

  const pipelineVisible =
    matchesSearch(
      t('pipeline.title'),
      t('pipeline.inquiry'),
      t('pipeline.tour'),
      t('pipeline.offer'),
      t('pipeline.close'),
    ) || filteredPipelineStages.length > 0;

  const tasksVisible =
    matchesSearch(t('tasks.title')) ||
    filteredTodayTasks.length > 0;

  const requestsVisible =
    matchesSearch(t('requests.title')) ||
    filteredRecentLeads.length > 0;

  const whatsappVisible = matchesSearch(
    t('tab.whatsapp'),
    t('kpi.whatsappConvos'),
    t('kpi.whatsappNewLeads'),
    t('kpi.unreadMessages'),
  );

  const anyWidgetVisible =
    matchesSearch(t('dash.welcome'), t('dash.welcomeDesc')) ||
    matchesSearch(t('kpi.totalLeads')) ||
    matchesSearch(t('kpi.dailyTours')) ||
    matchesSearch(t('kpi.sentOffers')) ||
    matchesSearch(t('kpi.closedContracts')) ||
    pipelineVisible ||
    tasksVisible ||
    requestsVisible ||
    whatsappVisible;

  return (
    <div
      className="min-h-full bg-white dark:bg-[#07182D]"
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
      style={{ padding: '24px 32px 48px', maxWidth: 1600, margin: '0 auto', width: '100%' }}
    >
      {/* Search badge */}
      {searchActive && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#D9AD55]/30 bg-[#EDC66D]/10 px-4 py-2 text-sm font-semibold text-[#0A1F3A] dark:text-white">
          <span>{t('header.searchLabel')}:</span>
          <span className="font-bold">&quot;{searchQuery}&quot;</span>
          {!anyWidgetVisible && (
            <span className="text-[#0A1F3A]/60 dark:text-white/60">
              — {t('search.noResults')}
            </span>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          A. PAGE HEADER
          ═══════════════════════════════════════ */}
      {matchesSearch(t('dash.welcome'), t('dash.welcomeDesc')) && (
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-[#0A1F3A] dark:text-white">
              {t('dash.welcome')} {welcomeName}
            </h1>
            <p className="mt-2 text-sm text-[#0A1F3A]/70 dark:text-white/70">
              {t('dash.welcomeDesc')}
            </p>
          </div>
          <div className="flex items-center gap-3" style={{ height: 56 }}>
            <div className="flex h-14 flex-col items-center justify-center rounded-lg border border-[#0A1F3A]/10 bg-white px-4 dark:border-white/10 dark:bg-[#0A1F3A]">
              <p className="text-xs font-medium text-[#0A1F3A]/60 dark:text-white/60">
                {t('dash.todayDate')}
              </p>
              <p className="text-sm font-bold text-[#0A1F3A] dark:text-white">
                {formatDisplayDate(new Date())}
              </p>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex h-14 items-center gap-2 rounded-lg bg-[#D9AD55] px-5 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2"
            >
              <FilePlus2 size={18} strokeWidth={2.2} aria-hidden="true" />
              <span>{t('action.issueContract')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          B. KPI CARDS — 4 cards, 144px height
          ═══════════════════════════════════════ */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {matchesSearch(t('kpi.totalLeads')) && (
          <DashboardMetricCard
            title={t('kpi.totalLeads')}
            value={formatNum(totalLeadsCount)}
            description={t('kpi.totalLeads.desc')}
            icon={<UsersRound size={18} strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => navTo('/operations/leads')}
            ariaLabel={t('kpi.totalLeads')}
          />
        )}

        {matchesSearch(t('kpi.dailyTours')) && (
          <DashboardMetricCard
            title={t('kpi.dailyTours')}
            value={formatNum(dailyToursCount)}
            description={t('kpi.dailyTours.desc')}
            icon={<CalendarCheck2 size={18} strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => navTo('/operations/tours')}
            ariaLabel={t('kpi.dailyTours')}
          />
        )}

        {matchesSearch(t('kpi.sentOffers')) && (
          <DashboardMetricCard
            title={t('kpi.sentOffers')}
            value={formatNum(sentOffersCount)}
            description={t('kpi.sentOffers.desc')}
            icon={<SendHorizontal size={18} strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => navTo('/operations/offers')}
            ariaLabel={t('kpi.sentOffers')}
          />
        )}

        {matchesSearch(t('kpi.closedContracts')) && (
          <DashboardMetricCard
            title={t('kpi.closedContracts')}
            value={formatNum(closedContractsCount)}
            description={t('kpi.closedContracts.desc')}
            icon={<FileCheck2 size={18} strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => navTo('/operations/sales')}
            ariaLabel={t('kpi.closedContracts')}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════
          C. OPERATING ROW — Pipeline (8/12) + Tasks (4/12)
          ═══════════════════════════════════════ */}
      <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-12 items-start">
        {/* Pipeline Snapshot — 8/12 */}
        {pipelineVisible && (
          <div className="rounded-xl border border-[#0A1F3A]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0A1F3A] xl:col-span-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-[#0A1F3A] dark:text-white">
                  {t('pipeline.title')}
                </h4>
                {filteredPipelineStages.length > 0 && (
                  <span className="rounded-full bg-[#D9AD55]/10 px-2 py-0.5 text-xs font-bold text-[#D9AD55]">
                    {t('pipeline.live')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#0A1F3A]/60 dark:text-white/60">
                {t('pipeline.desc')}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {filteredPipelineStages.map((stage) => {
                const total = pipelineStages.reduce((sum, p) => sum + p.count, 0);
                const percent = total > 0 ? Math.round((stage.count / total) * 100) : 0;
                const stageKeyMap: Record<string, string> = {
                  inquiry: 'pipeline.inquiry',
                  tour: 'pipeline.tour',
                  offer: 'pipeline.offer',
                  close: 'pipeline.close',
                };
                return (
                  <InteractiveSurface
                    key={stage.key}
                    variant="stage"
                    className="p-4 text-center"
                    onClick={() => navTo('/operations/leads')}
                    aria-label={t(stageKeyMap[stage.key] || stage.key)}
                  >
                    <p className="mb-2 text-xs font-bold text-[#0A1F3A]/70 dark:text-white/70">
                      {t(stageKeyMap[stage.key] || stage.key)}
                    </p>
                    <p className="mb-2 text-3xl font-black text-[#0A1F3A] dark:text-white">
                      {formatNum(stage.count)}
                    </p>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#0A1F3A]/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#D9AD55] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                      {percent}%
                    </p>
                  </InteractiveSurface>
                );
              })}
            </div>
            {filteredPipelineStages.length === 0 && (
              <div className="py-8 text-center text-sm text-[#0A1F3A]/60 dark:text-white/60">
                {t('pipeline.empty')}
              </div>
            )}
          </div>
        )}

        {/* Today's Tasks — 4/12 */}
        {tasksVisible && (
          <div className="rounded-xl border border-[#0A1F3A]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0A1F3A] xl:col-span-4">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-lg font-bold text-[#0A1F3A] dark:text-white">
                {t('tasks.title')}
              </h4>
              {filteredTodayTasks.length > 0 && (
                <span className="rounded-full bg-[#D9AD55]/10 px-2 py-0.5 text-xs font-bold text-[#D9AD55]">
                  {formatNum(filteredTodayTasks.length)}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {filteredTodayTasks.map((task) => {
                const priorityColor =
                  task.priority === 'HIGH'
                    ? '#EF4444'
                    : task.priority === 'MEDIUM'
                    ? '#F59E0B'
                    : '#3B82F6';
                const priorityLabel =
                  task.priority === 'HIGH'
                    ? t('tasks.priority.high')
                    : task.priority === 'MEDIUM'
                    ? t('tasks.priority.medium')
                    : t('tasks.priority.low');
                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-[#0A1F3A]/10 bg-white p-3 dark:border-white/10 dark:bg-[#0A1F3A]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-bold text-[#0A1F3A] dark:text-white">
                        {task.title}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: priorityColor }}
                      >
                        {priorityLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                      {task.leadName && (
                        <span className="flex items-center gap-1">
                          <UserRound size={13} aria-hidden="true" />
                          {task.leadName}
                        </span>
                      )}
                      {task.assignedName && (
                        <span className="flex items-center gap-1">
                          <Handshake size={13} aria-hidden="true" />
                          {task.assignedName}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                      {formatDisplayTime(task.dueDate)}
                    </p>
                  </div>
                );
              })}
              {filteredTodayTasks.length === 0 && (
                <div className="py-4 text-center text-sm text-[#0A1F3A]/60 dark:text-white/60">
                  {t('tasks.empty')}
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-[#0A1F3A]/10 pt-4 dark:border-white/10">
              <button
                onClick={() => navTo('/operations/tasks')}
                className="text-sm font-medium text-[#D9AD55] hover:text-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55]"
              >
                {t('tasks.viewAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          D. RECENT REQUESTS (8/12) + WHATSAPP (4/12)
          ═══════════════════════════════════════ */}
      {(requestsVisible || whatsappVisible) && (
      <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Recent Requests — 8/12 */}
        {requestsVisible && (

          <div className="rounded-xl border border-[#0A1F3A]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0A1F3A] xl:col-span-8">
            <div className="mb-5">
              <h4 className="text-lg font-bold text-[#0A1F3A] dark:text-white">
                {t('requests.title')}
              </h4>
              <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                {t('requests.desc')}
              </p>
            </div>
            <div className="space-y-2">
              {filteredRecentLeads.map((lead) => {
                return (
                  <InteractiveSurface
                    key={lead.id}
                    variant="row"
                    className="flex items-center justify-between gap-4 p-3 text-start"
                    onClick={() => navTo(`/operations/leads/${lead.id}`)}
                    aria-label={displayPerson(
                      `${lead.firstName} ${lead.lastName || ''}`,
                      displayLocale,
                      { route: '/operations/dashboard', entityId: lead.id },
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D9AD55]/10 text-sm font-bold text-[#D9AD55]">
                        {getInitials(lead.firstName, lead.lastName)}
                      </div>
                      <div className="min-w-0">
                        <h5 className="truncate text-sm font-bold text-[#0A1F3A] dark:text-white">
                          {displayPerson(`${lead.firstName} ${lead.lastName || ''}`, displayLocale, {
                            route: '/operations/dashboard',
                            entityId: lead.id,
                          })}
                        </h5>
                        <p className="mt-0.5 truncate text-xs text-[#0A1F3A]/60 dark:text-white/60">
                          {lead.phone} •{' '}
                          {displayGeo(lead.city, 'city', displayLocale, {
                            route: '/operations/dashboard',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-end">
                      <span className="inline-block rounded bg-[#D9AD55]/10 px-2 py-1 text-xs font-bold text-[#D9AD55]">
                        {displayEnum(lead.status, 'leadStatus', displayLocale)}
                      </span>
                      <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                        {formatDisplayDate(new Date(lead.createdAt))}
                      </p>
                      {lead.project && (
                        <p className="mt-0.5 max-w-[140px] truncate text-xs text-[#0A1F3A]/60 dark:text-white/60">
                          {displayEntity(lead.project.name, 'project', displayLocale, {
                            route: '/operations/dashboard',
                          })}
                        </p>
                      )}
                    </div>
                  </InteractiveSurface>
                );
              })}
              {filteredRecentLeads.length === 0 && (
                <div className="py-8 text-center text-sm text-[#0A1F3A]/60 dark:text-white/60">
                  {t('requests.empty')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Summary — 4/12 */}
        {whatsappVisible && (
          <div className="xl:col-span-4">
          <DashboardWhatsAppSummary
            conversationsCount={whatsAppStats.conversationsCount}
            newLeadsCount={whatsAppStats.newLeadsCount}
            unreadMessagesCount={whatsAppStats.unreadMessagesCount}
            onClick={() => navTo('/operations/whatsapp')}
            labels={{
              title: t('tab.whatsapp'),
              conversations: t('kpi.whatsappConvos'),
              newLeads: t('kpi.whatsappNewLeads'),
              unread: t('kpi.unreadMessages'),
            }}
            formatNumber={formatNum}
          />
          </div>
        )}
      </div>
      )}

      {/* Contract Wizard Modal */}
      <ContractWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
