// app/operations/dashboard/DashboardView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { useAuth } from '@/app/context/AuthContext';
import { toArabicNumerals as toArabicNumeralsImport, formatCurrency as formatCurrencyImport } from '@/lib/formatters';
import ContractWizard from '@/components/features/ContractWizard';
import { SmartCard } from '@/components/ui/SmartCard';
import PageHeader from '@/components/ui/PageHeader';
import type { PipelineStage, TodayTask } from '@/app/actions/dashboard';
import { displayPerson, displayGeo, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

interface DashboardViewProps {
  tenant?: { companyName: string; subdomain: string; subscriptionPlan: string; extraAgents: number; };
  stats?: { totalLeads?: number; activeBookings?: number; dailyTours?: number; sentOffers?: number; closedContracts?: number; closedSales?: number; totalProjects?: number; pendingTasks?: number; monthlySales?: number; };
  recentLeads?: Array<{ id: string; firstName: string; lastName: string | null; phone: string; status: string; city: string; createdAt: string; project?: { name: string } | null; }>;
  aiPredictions?: {
    bestContactTimes: Array<{ name: string; slotAr: string; slotEn: string }>;
    expectedToClose: Array<{ name: string; score: number }>;
    projectsNeedingCampaign: Array<{ name: string; reasonAr: string; reasonEn: string }>;
    agentsNeedingSupport?: Array<{ name: string; reasonAr: string; reasonEn: string }>;
  };
  recentTasks?: Array<any>;
  projects?: Array<any>;
  agentPerformance?: Array<any>;
  leadSources?: Array<any>;
  systemAlerts?: Array<any>;
  pipelineStages?: PipelineStage[];
  todayTasks?: TodayTask[];
  whatsAppStats?: { conversationsCount: number; newLeadsCount: number; unreadMessagesCount: number; };
}

// ── Shared flat-row block ──
function FlatRowBlock({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`hover:bg-[var(--nc-accent-soft)] transition-colors rounded-lg ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}

export default function DashboardView({
  tenant, stats, recentLeads = [], aiPredictions,
  pipelineStages = [], todayTasks = [], whatsAppStats,
  recentTasks, projects, agentPerformance, leadSources, systemAlerts,
}: DashboardViewProps) {
  const { lang, t } = useApp();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';
  const displayTenant = displayEntity(tenant?.companyName, 'company', displayLocale, { route: '/operations/dashboard' });

  const getInitials = (firstName: string, lastName: string | null): string => {
    const fullName = `${firstName} ${lastName || ''}`.trim();
    const displayName = displayPerson(fullName, displayLocale, { route: '/operations/dashboard' });
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  };

  const navTo = (path: string) => router.push(path);

  // ── Listen for search from Header ──
  useEffect(() => {
    const handler = (e: Event) => { setSearchQuery((e as CustomEvent).detail || ''); };
    window.addEventListener('search-change', handler);
    return () => window.removeEventListener('search-change', handler);
  }, []);

  const s = searchQuery.toLowerCase().trim();
  const searchActive = s.length > 0;

  const formatNum = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return lang === 'AR' ? '٠' : '0';
    return lang === 'AR' ? toArabicNumeralsImport(num) : num.toString();
  };

  const matchesSearch = (...texts: (string | undefined | null)[]): boolean => {
    if (!searchActive) return true;
    return texts.some(t => t && t.toLowerCase().includes(s));
  };

  const totalLeadsCount = stats?.totalLeads ?? 0;
  const dailyToursCount = stats?.dailyTours ?? 0;
  const sentOffersCount = stats?.sentOffers ?? 0;
  const closedContractsCount = stats?.closedContracts ?? 0;

  const handleWizardSuccess = () => router.refresh();
  const anyWidgetVisible = matchesSearch(
    t('kpi.totalLeads'), t('kpi.dailyTours'), t('kpi.sentOffers'), t('kpi.closedContracts'),
    t('action.quick'), t('pipeline.title'), t('tasks.title'), t('requests.title'), t('ai.title'),
    ...todayTasks.map(t2 => t2.title),
    ...recentLeads.map(l => `${l.firstName} ${l.lastName || ''}`),
    ...pipelineStages.map(s2 => t('pipeline.' + s2.key)),
  );

  return (
    <div className="nc-stack overflow-x-hidden" dir={lang === 'AR' ? 'rtl' : 'ltr'} style={{ padding: '16px 24px 40px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>

      {/* Search badge */}
      {searchActive && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] rounded-xl text-xs font-bold text-[var(--nc-foreground)]">
          <span>{t('header.searchLabel')}: &quot;{searchQuery}&quot;</span>
          {!anyWidgetVisible && <span className="text-[var(--nc-foreground-muted)]">— {t('search.noResults')}</span>}
        </div>
      )}

      {/* ═══════════════════════════════════════
          A. HERO ROW
          ═══════════════════════════════════════ */}
      {matchesSearch(t('dash.welcome'), t('dash.welcomeDesc')) && (
        <PageHeader
          title={`${t('dash.welcome')} ${displayTenant}`}
          description={t('dash.welcomeDesc')}
        >
          <div className="px-4 py-2.5 text-center md:min-w-[170px] flex-shrink-0 max-h-[64px] flex flex-col justify-center rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)]">
             <p className="text-[var(--nc-text-dim)] font-medium text-xs mb-0.5 whitespace-nowrap">{t('dash.todayDate')}</p>
              <p className="text-[var(--nc-accent-text)] font-bold text-sm md:text-base font-mono whitespace-nowrap">
                {new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
             </p>
          </div>
        </PageHeader>
      )}

      {/* ═══════════════════════════════════════
          B. KPI GRID — Row 1: Core metrics
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {matchesSearch(t('kpi.totalLeads')) && (
          <SmartCard elevation="elevated" className="p-4 cursor-pointer" onClick={() => navTo('/operations/leads')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/leads'); } }} aria-label={t('kpi.totalLeads')}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-[var(--nc-text-dim)] text-xs font-bold uppercase tracking-wider">{t('kpi.totalLeads')}</p>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0"><i className="ph-fill ph-users-three text-base"></i></div>
            </div>
            <h3 className="text-2xl font-black text-[var(--nc-text-primary)] mb-1">{formatNum(totalLeadsCount)}</h3>
            <p className="text-[var(--nc-text-dim)] text-xs leading-snug">{t('kpi.totalLeads.desc')}</p>
          </SmartCard>
        )}
        {matchesSearch(t('kpi.dailyTours')) && (
          <SmartCard elevation="elevated" className="p-4 cursor-pointer" onClick={() => navTo('/operations/tours')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/tours'); } }} aria-label={t('kpi.dailyTours')}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-[var(--nc-text-dim)] text-xs font-bold uppercase tracking-wider">{t('kpi.dailyTours')}</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><i className="ph-fill ph-calendar-check text-base"></i></div>
            </div>
            <h3 className="text-2xl font-black text-[var(--nc-text-primary)] mb-1">{formatNum(dailyToursCount)}</h3>
            <p className="text-[var(--nc-text-dim)] text-xs leading-snug">{t('kpi.dailyTours.desc')}</p>
          </SmartCard>
        )}
        {matchesSearch(t('kpi.sentOffers')) && (
          <SmartCard elevation="elevated" className="p-4 cursor-pointer" onClick={() => navTo('/operations/offers')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/offers'); } }} aria-label={t('kpi.sentOffers')}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-[var(--nc-text-dim)] text-xs font-bold uppercase tracking-wider">{t('kpi.sentOffers')}</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0"><i className="ph-fill ph-paper-plane-tilt text-base"></i></div>
            </div>
            <h3 className="text-2xl font-black text-[var(--nc-text-primary)] mb-1">{formatNum(sentOffersCount)}</h3>
            <p className="text-[var(--nc-text-dim)] text-xs leading-snug">{t('kpi.sentOffers.desc')}</p>
          </SmartCard>
        )}
        {matchesSearch(t('kpi.closedContracts')) && (
          <SmartCard elevation="elevated" className="p-4 cursor-pointer" onClick={() => navTo('/operations/rental')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/rental'); } }} aria-label={t('kpi.closedContracts')}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-[var(--nc-text-dim)] text-xs font-bold uppercase tracking-wider">{t('kpi.closedContracts')}</p>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0"><i className="ph-fill ph-file-lock text-base"></i></div>
            </div>
            <h3 className="text-2xl font-black text-[var(--nc-text-primary)] mb-1">{formatNum(closedContractsCount)}</h3>
            <p className="text-[var(--nc-text-dim)] text-xs leading-snug">{t('kpi.closedContracts.desc')}</p>
          </SmartCard>
        )}
      </div>

      {/* KPI Row 2: WhatsApp KPIs — smaller, with Preview badge */}
      {whatsAppStats && (matchesSearch(t('kpi.whatsappConvos')) || matchesSearch(t('kpi.whatsappNewLeads')) || matchesSearch(t('kpi.unreadMessages'))) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {matchesSearch(t('kpi.whatsappConvos')) && (
            <SmartCard elevation="elevated" className="p-3 cursor-pointer" onClick={() => navTo('/operations/whatsapp')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/whatsapp'); } }} aria-label={t('kpi.whatsappConvos')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--nc-text-dim)] text-xs font-bold">{t('kpi.whatsappConvos')}</span>
              </div>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">{formatNum(whatsAppStats.conversationsCount)}</h3>
            </SmartCard>
          )}
          {matchesSearch(t('kpi.whatsappNewLeads')) && (
            <SmartCard elevation="elevated" className="p-3 cursor-pointer" onClick={() => navTo('/operations/whatsapp')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/whatsapp'); } }} aria-label={t('kpi.whatsappNewLeads')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--nc-text-dim)] text-xs font-bold">{t('kpi.whatsappNewLeads')}</span>
              </div>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">{formatNum(whatsAppStats.newLeadsCount)}</h3>
            </SmartCard>
          )}
          {whatsAppStats.unreadMessagesCount > 0 && matchesSearch(t('kpi.unreadMessages')) && (
            <SmartCard elevation="elevated" className="p-3 cursor-pointer" onClick={() => navTo('/operations/whatsapp')} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo('/operations/whatsapp'); } }} aria-label={t('kpi.unreadMessages')}>
              <span className="text-[var(--nc-text-dim)] text-xs font-bold block mb-1">{t('kpi.unreadMessages')}</span>
              <h3 className="text-xl font-black text-amber-700 dark:text-amber-400">{formatNum(whatsAppStats.unreadMessagesCount)}</h3>
            </SmartCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          C. QUICK ACTION — full-width strip
          ═══════════════════════════════════════ */}
      {matchesSearch(t('action.quick'), t('action.issueContract')) && (
        <SmartCard elevation="default" className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[var(--nc-text-primary)] mb-0.5">{t('action.quick')}</h4>
            <p className="text-[var(--nc-text-dim)] text-xs leading-relaxed max-w-lg">{t('action.quickDesc')}</p>
          </div>
          <button onClick={() => setIsWizardOpen(true)} className="nc-btn nc-btn-primary text-xs cursor-pointer flex-shrink-0">
            <i className="ph-fill ph-file-plus text-sm"></i>
            <span>{t('action.issueContract')}</span>
          </button>
        </SmartCard>
      )}

      {/* ═══════════════════════════════════════
          D. OPERATING SECTION — Pipeline + Tasks
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* Pipeline Snapshot — 2/3 width */}
        {matchesSearch(t('pipeline.title'), t('pipeline.inquiry'), t('pipeline.tour'), t('pipeline.offer'), t('pipeline.close')) && (
          <SmartCard elevation="default" className="xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h4 className="nc-heading-3">{t("pipeline.title")}</h4>
                {pipelineStages.length > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/20">{t("pipeline.live")}</span>
                )}
              </div>
              <p className="text-[var(--nc-text-dim)] text-xs">{t("pipeline.desc")}</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {pipelineStages.map((stage) => {
                const total = pipelineStages.reduce((s2, p) => s2 + p.count, 0);
                const percent = total > 0 ? Math.round((stage.count / total) * 100) : 0;
                const stageKeyMap: Record<string, string> = { inquiry: 'pipeline.inquiry', tour: 'pipeline.tour', offer: 'pipeline.offer', close: 'pipeline.close' };
                const stageColorMap: Record<string, string> = {
                  inquiry: 'text-blue-700 dark:text-blue-400',
                  tour: 'text-amber-700 dark:text-amber-400',
                  offer: 'text-purple-700 dark:text-purple-400',
                  close: 'text-emerald-700 dark:text-emerald-400',
                };
                const bgColorMap: Record<string, string> = {
                  inquiry: '#3B82F6', tour: '#F59E0B', offer: '#8B5CF6', close: '#10B981',
                };
                return (
                  <FlatRowBlock key={stage.key} className="p-3 text-center" onClick={() => navTo('/operations/leads')}>
                    <span className="text-xs font-bold text-[var(--nc-text-secondary)] block mb-1">{t(stageKeyMap[stage.key] || stage.key)}</span>
                    <span className={`text-xl font-black block mb-1 ${stageColorMap[stage.key] || 'text-[var(--nc-foreground)]'}`}>{formatNum(stage.count)}</span>
                    <div className="w-full h-1 rounded-full bg-[var(--nc-glass-border)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: bgColorMap[stage.key] || '#3B82F6' }} />
                    </div>
                    <span className="text-[11px] text-[var(--nc-text-dim)] mt-1 block">{percent}%</span>
                  </FlatRowBlock>
                );
              })}
            </div>
            {pipelineStages.length === 0 && (
              <div className="text-center py-8 text-[var(--nc-text-dim)] text-xs">{t("pipeline.empty")}</div>
            )}
          </SmartCard>
        )}

        {/* Today's Tasks — 1/3 width */}
        {matchesSearch(t('tasks.title'), ...todayTasks.map(t2 => t2.title)) && (
          <SmartCard elevation="default" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="nc-heading-3">{t("tasks.title")}</h4>
              {todayTasks.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-500 border border-amber-500/20">{formatNum(todayTasks.length)}</span>
              )}
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar">
              {todayTasks.map((task) => {
                const priorityColor = task.priority === "HIGH" ? "#EF4444" : task.priority === "MEDIUM" ? "#F59E0B" : "#3B82F6";
                const priorityLabel = task.priority === "HIGH" ? t("tasks.priority.high") : task.priority === "MEDIUM" ? t("tasks.priority.medium") : t("tasks.priority.low");
                if (!matchesSearch(task.title, priorityLabel, task.leadName)) return null;
                return (
                  <FlatRowBlock key={task.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--nc-text-primary)] leading-snug line-clamp-2">{task.title}</p>
                       <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: priorityColor }}>{priorityLabel}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--nc-text-dim)]">
                      {task.leadName && <span className="flex items-center gap-1"><i className="ph-bold ph-user text-[10px]"></i>{task.leadName}</span>}
                      {task.assignedName && <span className="flex items-center gap-1"><i className="ph-bold ph-handshake text-[10px]"></i>{task.assignedName}</span>}
                    </div>
                    <p className="text-[11px] text-[var(--nc-text-dim)] mt-1">
                      {new Date(task.dueDate).toLocaleTimeString(lang === "AR" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </FlatRowBlock>
                );
              })}
              {todayTasks.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <i className="ph-bold ph-check-circle text-green-400 text-lg"></i>
                  </div>
                  <p className="text-[var(--nc-text-dim)] text-xs font-medium">{t("tasks.empty")}</p>
                </div>
              )}
            </div>
          </SmartCard>
        )}

      </div>

      {/* ═══════════════════════════════════════
          E. RECENT REQUESTS
          ═══════════════════════════════════════ */}
      {matchesSearch(t('requests.title'), ...recentLeads.map(l => `${l.firstName} ${l.lastName || ''}`)) && (
        <SmartCard elevation="default" className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="nc-heading-3">{t("requests.title")}</h4>
              <p className="text-[var(--nc-text-dim)] text-xs mt-0.5">{t("requests.desc")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {recentLeads.slice(0, 5).map((lead) => {
              if (searchActive && !matchesSearch(`${lead.firstName} ${lead.lastName || ''}`, lead.phone, lead.city, lead.status, lead.project?.name)) return null;
              return (
                <FlatRowBlock key={lead.id} className="p-3 flex items-center justify-between" onClick={() => navTo('/operations/leads')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-foreground)] font-bold text-xs">{getInitials(lead.firstName, lead.lastName)}</div>
                    <div>
                      <h5 className="text-sm font-bold text-[var(--nc-text-primary)]">{displayPerson(`${lead.firstName} ${lead.lastName || ''}`, displayLocale, { route: '/operations/dashboard', entityId: lead.id })}</h5>
                      <p className="text-xs text-[var(--nc-text-dim)] mt-0.5">{lead.phone} • {displayGeo(lead.city, 'city', displayLocale, { route: '/operations/dashboard' })}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)]">{displayEnum(lead.status, 'leadStatus', displayLocale)}</span>
                    {lead.project && <p className="text-[10px] text-[var(--nc-text-dim)] mt-0.5 truncate max-w-[100px]">{displayEntity(lead.project.name, 'project', displayLocale, { route: '/operations/dashboard' })}</p>}
                  </div>
                </FlatRowBlock>
              );
            })}
            {recentLeads.length === 0 && (
              <div className="text-center py-8 text-[var(--nc-text-dim)] text-xs">{t('requests.empty')}</div>
            )}
          </div>
        </SmartCard>
      )}

      {/* ═══════════════════════════════════════
          F. AI / PREVIEW PANEL — shown only when real data exists
          ═══════════════════════════════════════ */}
      {aiPredictions && (
        (aiPredictions.bestContactTimes?.length > 0 || aiPredictions.expectedToClose?.length > 0 || aiPredictions.projectsNeedingCampaign?.length > 0) && matchesSearch(t('ai.title'), t('dash.previewLabel')) && (
        <SmartCard elevation="subtle" className="p-5 border-dashed border-purple-500/20">
          {/* Preview badge header */}
          <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-700 dark:text-purple-400 flex-shrink-0">
              <i className="ph-fill ph-eye text-xs"></i>
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">{t('dash.previewLabel')}</p>
              <p className="text-[9px] text-[var(--nc-text-dim)]">{t('dash.previewDesc')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <i className="ph-fill ph-sparkles text-[var(--nc-foreground)] text-sm"></i>
              <h4 className="text-sm font-bold text-[var(--nc-text-primary)]">{t('ai.title')}</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)] border border-[var(--nc-accent-border)]">{t('ai.status')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-2 uppercase tracking-wider">{t('ai.contactTimes')}</p>
              <div className="space-y-1.5">
                {aiPredictions?.bestContactTimes && aiPredictions.bestContactTimes.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] bg-[var(--nc-surface)] p-2 rounded-md">
                    <span className="font-semibold text-[var(--nc-text-primary)] truncate">{item.name}</span>
                    <span className="text-[var(--nc-foreground)] font-bold text-[10px]">{lang === 'AR' ? item.slotAr : item.slotEn}</span>
                  </div>
                ))}
                {(!aiPredictions?.bestContactTimes || aiPredictions.bestContactTimes.length === 0) && (
                  <div className="text-[var(--nc-text-dim)] text-[10px] py-2 text-center">{t('ai.noSlots')}</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-2 uppercase tracking-wider">{t('ai.closePrediction')}</p>
              <div className="space-y-1.5">
                {aiPredictions?.expectedToClose && aiPredictions.expectedToClose.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] bg-[var(--nc-surface)] p-2 rounded-md">
                    <span className="font-semibold text-[var(--nc-text-primary)] truncate">{item.name}</span>
                    <span className="bg-[var(--nc-accent-soft)] text-[var(--nc-foreground)] px-1.5 py-0.5 rounded font-bold text-[10px]">{formatNum(item.score)}%</span>
                  </div>
                ))}
                {(!aiPredictions?.expectedToClose || aiPredictions.expectedToClose.length === 0) && (
                  <div className="text-[var(--nc-text-dim)] text-[10px] py-2 text-center">{t('ai.noCandidates')}</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-2 uppercase tracking-wider">{t('ai.campaignGuidance')}</p>
              <div className="space-y-1.5">
                {aiPredictions?.projectsNeedingCampaign && aiPredictions.projectsNeedingCampaign.slice(0, 1).map((item, idx) => (
                  <div key={idx} className="bg-[var(--nc-surface)] p-2 rounded-md text-[10px]">
                    <span className="font-bold text-[var(--nc-text-primary)] block truncate mb-0.5">{item.name}</span>
                    <span className="text-[var(--nc-text-dim)] leading-tight">{lang === 'AR' ? item.reasonAr : item.reasonEn}</span>
                  </div>
                ))}
                {(!aiPredictions?.projectsNeedingCampaign || aiPredictions.projectsNeedingCampaign.length === 0) && (
                  <div className="text-[var(--nc-text-dim)] text-[10px] py-2 text-center">{t('ai.salesOptimal')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[9px] text-[var(--nc-text-dim)] mt-4 pt-3 border-t border-[var(--nc-glass-border)] flex justify-between items-center">
            <span>{t('ai.footer')}</span>
            <span className="font-bold font-mono text-[10px]">ORCA AI</span>
          </div>
        </SmartCard>
      ))}

      {/* Contract Wizard Modal */}
      <ContractWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} onSuccess={handleWizardSuccess} />
    </div>
  );
}
