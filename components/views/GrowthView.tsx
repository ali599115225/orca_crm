// components/views/GrowthView.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import {
  getGrowthMarketingStatsAction,
  getFollowupSequencesAction,
  saveFollowupSequenceAction,
  deleteFollowupSequenceAction,
  getMansourChatsAction,
  sendMansourMessageAction,
  getBaseerInsightAction,
  getPlatformConnectionsAction,
  savePlatformConnectionAction,
  testPlatformConnectionAction,
  getAgentLeasesAction,
  leaseAgentAction
} from '@/app/actions/growth';

interface Followup {
  id: string;
  status: string;
  delayDays: number;
  message: string;
  isActive: boolean;
}

interface Message {
  sender: string;
  text: string;
  time: string;
}

interface Chat {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  status: string;
  messages: Message[];
  updatedAt: Date | string;
}

interface GrowthViewProps {
  tenantPlan?: string;
}

export default function GrowthView({ tenantPlan = 'basic' }: GrowthViewProps) {
  const { theme, lang } = useApp();
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';
  const isDark = theme === 'dark';

  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const agentIdParam = searchParams.get('agentId') || 'BASEER';

  // Scenario Modal State
  const [showScenarioModal, setShowScenarioModal] = useState(false);

  // Agent Leases State
  const [leases, setLeases] = useState<any[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [leasingAgentModal, setLeasingAgentModal] = useState<{ isOpen: boolean; agentId: string } | null>(null);
  const [autoRenewalOption, setAutoRenewalOption] = useState(false);
  const [submittingLease, setSubmittingLease] = useState(false);
  const [selectedAgentToLease, setSelectedAgentToLease] = useState('BASEER');
  const [countdownTicks, setCountdownTicks] = useState<Record<string, string>>({});

  // Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'ads_center'>('analytics');

  // Ad platforms integration state
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  
  // Platform configuration state
  const [platformAccountId, setPlatformAccountId] = useState('');
  const [platformApiKey, setPlatformApiKey] = useState('');
  const [platformLeadTone, setPlatformLeadTone] = useState('PROFESSIONAL');
  const [platformAutoWelcome, setPlatformAutoWelcome] = useState('');
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [testingPlatform, setTestingPlatform] = useState<Record<string, boolean>>({});

  // Stats State
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Followup Sequences State
  const [sequences, setSequences] = useState<Followup[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(true);
  const [savingSequence, setSavingSequence] = useState(false);

  // Chats State
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Encryption Visual Toggle State
  const [isDecryptedView, setIsDecryptedView] = useState(true);

  // Baseer Agent State
  const [baseerInsight, setBaseerInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [upgradeAgentModal, setUpgradeAgentModal] = useState<{ isOpen: boolean; agentName: string; details: string } | null>(null);

  // Form inputs for new followup sequence
  const [seqStatus, setSeqStatus] = useState('INTERESTED');
  const [seqDelay, setSeqDelay] = useState(1);
  const [seqMessage, setSeqMessage] = useState('');

  // General messages
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAllProjects, setShowAllProjects] = useState(false);
  const PROJECT_PREVIEW_LIMIT = 8;

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const growthRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = growthRootRef.current;
    if (!root) return;

    const hideTimers = new WeakMap<EventTarget, ReturnType<typeof setTimeout>>();

    const onScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('scrollbar-fade')) return;

      target.classList.add('scrollbar-fade--visible');
      const prev = hideTimers.get(target);
      if (prev) clearTimeout(prev);
      hideTimers.set(
        target,
        setTimeout(() => target.classList.remove('scrollbar-fade--visible'), 900)
      );
    };

    root.addEventListener('scroll', onScroll, true);
    return () => root.removeEventListener('scroll', onScroll, true);
  }, [activeSubTab, loadingStats, loadingChats, loadingSequences, showAllProjects]);

  const sortedProjectStats = useMemo(() => {
    if (!stats?.projectStats?.length) return [];
    return [...stats.projectStats].sort((a: any, b: any) => {
      const scoreA = Number(a.contractValue) + Number(a.leadsCount) * 500 + Number(a.closedDeals) * 2000;
      const scoreB = Number(b.contractValue) + Number(b.leadsCount) * 500 + Number(b.closedDeals) * 2000;
      return scoreB - scoreA;
    });
  }, [stats]);

  const visibleProjectStats = useMemo(() => {
    if (showAllProjects) return sortedProjectStats;
    return sortedProjectStats.slice(0, PROJECT_PREVIEW_LIMIT);
  }, [sortedProjectStats, showAllProjects]);

  const fetchStats = async () => {
    setLoadingStats(true);
    const res = await getGrowthMarketingStatsAction();
    setLoadingStats(false);
    if (res.success) {
      setStats(res.data);
    } else {
      setError(res.error || 'Failed to fetch growth stats.');
    }
  };

  const fetchSequences = async () => {
    setLoadingSequences(true);
    const res = await getFollowupSequencesAction();
    setLoadingSequences(false);
    if (res.success && res.data) {
      setSequences(res.data as any[]);
    }
  };

  const fetchChats = async () => {
    setLoadingChats(true);
    const res = await getMansourChatsAction();
    setLoadingChats(false);
    if (res.success && res.data) {
      setChats(res.data as Chat[]);
      if (res.data.length > 0 && !activeChatId) {
        setActiveChatId(res.data[0].id);
      }
    }
  };

  const fetchPlatforms = async () => {
    setLoadingPlatforms(true);
    const res = await getPlatformConnectionsAction();
    setLoadingPlatforms(false);
    if (res.success && res.data) {
      setPlatforms(res.data);
    }
  };

  const fetchLeases = async () => {
    setLoadingLeases(true);
    const res = await getAgentLeasesAction();
    setLoadingLeases(false);
    if (res.success && res.data) {
      setLeases(res.data);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSequences();
    fetchChats();
    fetchPlatforms();
    fetchLeases();
  }, []);

  useEffect(() => {
    if (actionParam === 'view-scenario') {
      setShowScenarioModal(true);
    } else if (actionParam === 'renew-lease') {
      setSelectedAgentToLease(agentIdParam);
      setLeasingAgentModal({ isOpen: true, agentId: agentIdParam });
    }
  }, [actionParam, agentIdParam]);

  const updateCountdowns = (activeLeases: any[]) => {
    const ticks: Record<string, string> = {};
    const now = new Date().getTime();

    activeLeases.forEach(l => {
      const end = new Date(l.endDate).getTime();
      const diff = end - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        ticks[l.agentId] = lang === 'AR' 
          ? `${days} يوم و ${hours} ساعة` 
          : `${days}d ${hours}h`;
      } else {
        ticks[l.agentId] = lang === 'AR' ? "منتهي الصلاحية" : "Expired";
      }
    });

    setCountdownTicks(ticks);
  };

  useEffect(() => {
    if (leases.length === 0) return;
    updateCountdowns(leases);
    const interval = setInterval(() => {
      updateCountdowns(leases);
    }, 30000);
    return () => clearInterval(interval);
  }, [leases, lang]);

  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [chats, activeChatId]);

  const handleConfirmLease = async () => {
    if (!selectedAgentToLease) return;
    setSubmittingLease(true);
    const res = await leaseAgentAction({
      agentId: selectedAgentToLease,
      autoRenewal: autoRenewalOption
    });
    setSubmittingLease(false);
    if (res.success) {
      setSuccess(isArabic ? 'تم تفعيل استئجار الوكيل بنجاح لمدة 30 يوماً!' : 'Agent lease activated successfully for 30 days!');
      setLeasingAgentModal(null);
      fetchLeases();
    } else {
      setError(res.error || 'Failed to activate agent lease.');
    }
  };

  const handleSelectPlatform = (plat: any) => {
    setSelectedPlatform(plat.platform);
    setPlatformAccountId(plat.accountId);
    setPlatformApiKey('');
    setPlatformLeadTone(plat.leadTone);
    setPlatformAutoWelcome(plat.autoWelcomeMsg);
  };

  const handleSavePlatformConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !platformAccountId.trim()) return;
    setSavingPlatform(true);
    const res = await savePlatformConnectionAction({
      platform: selectedPlatform,
      accountId: platformAccountId,
      apiKey: platformApiKey.trim() || undefined,
      leadTone: platformLeadTone,
      autoWelcomeMsg: platformAutoWelcome
    });
    setSavingPlatform(false);
    if (res.success) {
      setSuccess(isArabic ? 'تم حفظ وتشفير إعدادات المنصة بنجاح.' : 'Platform settings encrypted and saved successfully.');
      fetchPlatforms();
      setSelectedPlatform(null);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error || 'Failed to save platform.');
    }
  };

  const handleTestPlatformConnection = async (platName: string) => {
    setTestingPlatform(prev => ({ ...prev, [platName]: true }));
    const res = await testPlatformConnectionAction(platName);
    setTestingPlatform(prev => ({ ...prev, [platName]: false }));
    if (res.success) {
      setSuccess(
        res.status === 'CONNECTED'
          ? (isArabic ? `تم فحص الاتصال بـ ${platName} بنجاح! الحالة: مرتبط ونشط` : `Handshake with ${platName} succeeded! Status: Connected`)
          : (isArabic ? `خطأ في ربط ${platName}. يرجى التحقق من المفاتيح ومعرف الحساب.` : `Connection error on ${platName}. Check keys and Account ID.`)
      );
      fetchPlatforms();
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(res.error || 'Failed to test connection.');
    }
  };

  const handleSaveSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seqMessage.trim().length === 0) return;
    setSavingSequence(true);
    const res = await saveFollowupSequenceAction({
      status: seqStatus,
      delayDays: seqDelay,
      message: seqMessage
    });
    setSavingSequence(false);
    if (res.success) {
      setSeqMessage('');
      setSuccess(isArabic ? 'تم حفظ مسار المتابعة المخصصة للوكيل منصور.' : 'Follow-up sequence saved successfully.');
      fetchSequences();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error || 'Failed to save sequence.');
    }
  };

  const handleDeleteSequence = async (id: string) => {
    const res = await deleteFollowupSequenceAction(id);
    if (res.success) {
      setSuccess(isArabic ? 'تم حذف مسار المتابعة.' : 'Sequence deleted successfully.');
      fetchSequences();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || messageInput.trim().length === 0) return;
    const msg = messageInput;
    setMessageInput('');
    setSendingMessage(true);

    // Append client message locally for instant response feel
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          lastMessage: msg,
          messages: [...c.messages, { sender: 'client', text: msg, time: isArabic ? 'الآن' : 'Now' }]
        };
      }
      return c;
    }));

    // Trigger AI response typing state after a delay
    setTimeout(() => {
      setIsTyping(true);
    }, 600);

    const res = await sendMansourMessageAction(activeChatId, msg);
    setIsTyping(false);
    setSendingMessage(false);

    if (res.success && res.messages) {
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: res.messages[res.messages.length - 1].text,
            messages: res.messages
          };
        }
        return c;
      }));
      fetchStats(); // Update stats in case conversions increased
    } else {
      if (res.isRestricted) {
        setUpgradeAgentModal({
          isOpen: true,
          agentName: "MANSOUR",
          details: res.error || (isArabic ? "عذراً، لقد تجاوزت حدود المراسلات المخصصة للوكيل منصور في الباقة الحالية." : "Sorry, you have exceeded the Mansour messaging limits for your current tier.")
        });
      } else {
        setError(res.error || 'Failed to send message.');
      }
    }
  };

  const handleRunBaseerInsight = async () => {
    setLoadingInsight(true);
    const res = await getBaseerInsightAction();
    setLoadingInsight(false);
    if (res.success && res.insight) {
      setBaseerInsight(res.insight);
      setIsInsightOpen(true);
    } else {
      if (res.isRestricted) {
        setUpgradeAgentModal({
          isOpen: true,
          agentName: "BASEER",
          details: res.error || (isArabic ? "تحليلات الوكيل بصير الحصرية متاحة فقط لمشتركي الباقة الماسية." : "Agent Baseer strategic reports are exclusively available for Diamond tier subscribers.")
        });
      } else {
        setError(res.error || 'Failed to generate Baseer report.');
      }
    }
  };

  // Convert numbers to Arabic eastern format
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return '';
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, '٪');
  };

  const formatCurrency = (amount: number): string => {
    return `${toArabicNumerals(amount.toLocaleString('en-US'))} ${isArabic ? 'ر.س' : 'SAR'}`;
  };

  const getLockedAgents = () => {
    const plan = 'diamond'; // Forced Diamond by Ali
    if (plan === 'pro') {
      return [
        { id: 'BASEER', nameAr: 'بصير (التحليل والاستشراف الإعلاني)', nameEn: 'Baseer (Ad ROI Analysis)' },
        { id: 'KHABEER', nameAr: 'خبير (الدعم والأتمتة القانونية)', nameEn: 'Khabeer (Legal & Support Automation)' }
      ];
    }
    // basic plan
    return [
      { id: 'SAHER', nameAr: 'ساهر (التدقيق والتحقق المروري/الحوكمة)', nameEn: 'Saher (Compliance & Verification)' },
      { id: 'SANAD', nameAr: 'سند (الفوترة والمهام السحابية)', nameEn: 'Sanad (Billing & Task Queue)' },
      { id: 'BASEER', nameAr: 'بصير (التحليل والاستشراف الإعلاني)', nameEn: 'Baseer (Ad ROI Analysis)' },
      { id: 'KHABEER', nameAr: 'خبير (الدعم والأتمتة القانونية)', nameEn: 'Khabeer (Legal & Support Automation)' }
    ];
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  return (
    <div ref={growthRootRef} className="w-full orca-view-enter" dir={dir}>
    <div className="orca-page orca-stack">
      
      {/* Page Header (Cyber Glass) */}
      <div className="orca-hero bg-gradient-to-r from-slate-900 via-[#151f32] to-slate-900 p-5 md:p-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#df7b62]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
              <i className="ph-bold ph-rocket-launch"></i> 
              {tenantPlan.toLowerCase() === 'diamond' 
                ? (isArabic ? "باقة الريادة الماسية" : "Diamond Leadership Tier")
                : tenantPlan.toLowerCase() === 'pro'
                  ? (isArabic ? "الباقة الاحترافية" : "Professional Tier")
                  : (isArabic ? "الباقة الأساسية" : "Basic Tier")
              }
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-wide">
              {isArabic ? "لوحة تحكم النمو والتسويق" : "Growth & Marketing Operations"}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-2 font-medium">
              {isArabic 
                ? "متابعة أداء العوائد التسويقية وقنوات الاستحواذ، وإدارة مسارات واتساب الآلية للوكيل منصور، والتحليلات الاستباقية للوكيل بصير."
                : "Monitor ROI performance, manage automated followups via Agent Mansour, and forecast with Agent Baseer."}
            </p>
          </div>

          <button
            onClick={handleRunBaseerInsight}
            disabled={loadingInsight}
            className="orca-focus flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#df7b62] to-[#c5654e] hover:shadow-[0_0_20px_rgba(223,123,98,0.35)] text-white font-bold text-xs orca-transition cursor-pointer disabled:opacity-50 shrink-0 border border-[#df7b62]/40"
          >
            {loadingInsight ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <i className="ph-bold ph-magic-wand text-sm"></i>
            )}
            <span>{isArabic ? "تقرير الوكيل الاستشرافي بصير 🔮" : "Baseer AI Insight report 🔮"}</span>
          </button>
        </div>

        {Object.keys(countdownTicks).length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex flex-wrap gap-3 z-10 relative">
            {Object.entries(countdownTicks).map(([agentId, tick]) => (
              <div 
                key={agentId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                <span>{isArabic ? `الوكيل المؤقت ${agentId}:` : `Leased Agent ${agentId}:`}</span>
                <span className="font-mono text-white">{tick}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed orca-view-enter">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed orca-view-enter">
          {success}
        </div>
      )}

      {/* Sub-Tab Navigation (Cyber Glassmorphism) */}
      <div className="flex border-b border-slate-850 gap-6 mb-6">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'analytics'
              ? 'border-[#df7b62] text-[#df7b62] shadow-[0_4px_12px_rgba(223,123,98,0.15)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ph-bold ph-chart-line-up"></i>
          <span>{isArabic ? "لوحة تحكم النمو والتحليل" : "Growth ROI Dashboard"}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('ads_center')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'ads_center'
              ? 'border-[#df7b62] text-[#df7b62] shadow-[0_4px_12px_rgba(223,123,98,0.15)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ph-bold ph-globe"></i>
          <span>{isArabic ? "مركز إدارة الإعلانات" : "Ad Management Center"}</span>
        </button>
      </div>

      {activeSubTab === 'analytics' && (
        <>
          {/* ROI Statistics Grid */}
          {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-[#151f32]/40 border border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            
            {/* Total Marketing Spend */}
            <div className="w-full h-auto orca-panel p-5 relative overflow-hidden group hover:border-[#df7b62]/30 orca-transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">{isArabic ? "إجمالي الإنفاق التسويقي" : "Total Ad Spend"}</span>
                <i className="ph-fill ph-hand-coins text-rose-400 text-lg"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white font-en">{formatCurrency(stats.totalSpend)}</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-2">{isArabic ? "موزع على ٤ حملات إعلانية نشطة" : "Distributed over 4 campaigns"}</p>
            </div>

            {/* Average CAC */}
            <div className="w-full h-auto orca-panel p-5 relative overflow-hidden group hover:border-[#df7b62]/30 orca-transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">{isArabic ? "تكلفة الاستحواذ على العميل (CAC)" : "Average CAC"}</span>
                <i className="ph-fill ph-users text-amber-400 text-lg"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white font-en">{formatCurrency(stats.avgCac)}</h2>
              <p className="text-[10px] text-amber-400 font-semibold mt-2">{isArabic ? "معدل تكلفة الاستحواذ لكل صفقة إيجار" : "Cost per signed contract"}</p>
            </div>

            {/* Closed Contract Value */}
            <div className="w-full h-auto orca-panel p-5 relative overflow-hidden group hover:border-[#df7b62]/30 orca-transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">{isArabic ? "قيمة العقود الموقعة" : "Closed Contract Value"}</span>
                <i className="ph-fill ph-folder-open text-emerald-400 text-lg"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white font-en">{formatCurrency(stats.totalContractValue)}</h2>
              <p className="text-[10px] text-emerald-400 font-semibold mt-2">{isArabic ? "إجمالي قيم الصفقات المحولة بنجاح" : "Sum of all closed real estate deals"}</p>
            </div>

            {/* Marketing ROI % */}
            <div className="w-full h-auto orca-panel p-5 relative overflow-hidden group hover:border-[#df7b62]/30 orca-transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">{isArabic ? "معدل العائد التسويقي (ROI)" : "Marketing ROI"}</span>
                <i className="ph-fill ph-trend-up text-indigo-400 text-lg"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-[#df7b62] font-en">{toArabicNumerals(stats.marketingRoi)}%</h2>
              <p className="text-[10px] text-[#df7b62] font-semibold mt-2">{isArabic ? "صافي القيمة المحصلة مقارنة بالإنفاق" : "Net efficiency of ad expenditures"}</p>
            </div>

          </div>
        )
      )}

      {/* ROI & Funnel View Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* CAC vs Contract Value per Project (7 cols) */}
        <div className="lg:col-span-7 w-full h-auto orca-panel p-5">
          <h3 className="orca-section-title text-white font-bold text-sm border-b orca-divider pb-2.5 flex items-center gap-2 mb-4">
            <i className="ph-bold ph-chart-bar text-[#df7b62]"></i>
            {isArabic ? "أداء المشاريع الاستثمارية: الإنفاق والتسويق مقابل المبيعات" : "Project ROI: Marketing CAC vs Contract Value"}
          </h3>

          {loadingStats ? (
            <div className="space-y-4">
              {[1, 2].map(n => <div key={n} className="h-16 bg-[#151f32]/60 animate-pulse rounded-xl"></div>)}
            </div>
          ) : (
            stats && (
              <div className="space-y-4">
                {sortedProjectStats.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {isArabic
                        ? `عرض ${toArabicNumerals(visibleProjectStats.length)} من ${toArabicNumerals(sortedProjectStats.length)} مشروع`
                        : `Showing ${visibleProjectStats.length} of ${sortedProjectStats.length} projects`}
                    </span>
                    {sortedProjectStats.length > PROJECT_PREVIEW_LIMIT && (
                      <button
                        type="button"
                        onClick={() => setShowAllProjects((v) => !v)}
                        className="text-[10px] font-bold text-[#df7b62] hover:text-[#c5654e] cursor-pointer transition-colors"
                      >
                        {showAllProjects
                          ? (isArabic ? "عرض أقل ▲" : "Show less ▲")
                          : (isArabic ? `عرض الكل (${toArabicNumerals(sortedProjectStats.length)}) ▼` : `Show all (${sortedProjectStats.length}) ▼`)}
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={`space-y-1.5 ps-0.5 pe-1 ${
                    visibleProjectStats.length > 5 ? 'max-h-[min(280px,38vh)] overflow-y-auto scrollbar-fade' : ''
                  }`}
                >
                {(() => {
                  const maxMetric = Math.max(
                    ...sortedProjectStats.map((x: any) =>
                      Number(x.contractValue) > 0 ? Number(x.contractValue) : Number(x.leadsCount)
                    ),
                    1
                  );
                  return visibleProjectStats.map((p: any) => {
                  const metric =
                    Number(p.contractValue) > 0 ? Number(p.contractValue) : Number(p.leadsCount);
                  const percentage =
                    metric > 0 ? Math.max(8, Math.round((metric / maxMetric) * 100)) : 0;
                  return (
                    <div key={p.id} className="px-3 py-2 rounded-lg bg-slate-900/30 border border-slate-800/60">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-white text-[11px] font-bold truncate leading-tight">{p.name}</h4>
                          <span className="text-[9px] text-slate-500 font-semibold">{p.city}</span>
                        </div>
                        <div className="shrink-0 text-end">
                          <span className="text-[9px] text-slate-400 font-bold block leading-none">{isArabic ? "العقود" : "Contracts"}</span>
                          <span className="text-[11px] text-white font-black font-en">{formatCurrency(p.contractValue)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#0b1120] h-1.5 rounded-full overflow-hidden mb-1">
                        {percentage > 0 && (
                          <div
                            style={{ width: `${percentage}%` }}
                            className="bg-gradient-to-r from-[#df7b62] to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-500">
                        <span className="truncate">{isArabic ? `CAC: ${formatCurrency(p.cac)}` : `CAC: ${formatCurrency(p.cac)}`}</span>
                        <span className="shrink-0">{isArabic ? `عملاء ${toArabicNumerals(p.leadsCount)} · صفقات ${toArabicNumerals(p.closedDeals)}` : `Leads ${p.leadsCount} · Closed ${p.closedDeals}`}</span>
                      </div>
                    </div>
                  );
                });
                })()}
                </div>

                {/* Lead conversion path funnel */}
                <div className="pt-3 mt-1 border-t border-slate-800 shrink-0">
                  <h4 className="text-slate-400 text-[11px] font-bold mb-3">{isArabic ? "مسار تحول العميل من إعلان إلى عقد موقع" : "Ad to Contract Conversion Funnel"}</h4>
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-center text-[10px]">
                    <div className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] font-bold">
                      <p className="font-en font-black text-sm leading-none">{toArabicNumerals(stats.totalLeads)}</p>
                      <p className="mt-1 leading-tight">{isArabic ? "إعلان وارد" : "Incoming Ad"}</p>
                    </div>
                    <i className={`ph-bold ${isArabic ? 'ph-caret-left' : 'ph-caret-right'} text-slate-600 text-sm shrink-0`} aria-hidden />
                    <div className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                      <p className="font-en font-black text-sm leading-none">{toArabicNumerals(Math.round(stats.totalLeads * 0.7))}</p>
                      <p className="mt-1 leading-tight">{isArabic ? "تأهيل وتواصل" : "Contacted"}</p>
                    </div>
                    <i className={`ph-bold ${isArabic ? 'ph-caret-left' : 'ph-caret-right'} text-slate-600 text-sm shrink-0`} aria-hidden />
                    <div className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      <p className="font-en font-black text-sm leading-none">{toArabicNumerals(stats.closedSalesCount)}</p>
                      <p className="mt-1 leading-tight">{isArabic ? "عقد موقع" : "Signed Contract"}</p>
                    </div>
                  </div>
                </div>

              </div>
            )
          )}

        </div>

        {/* Lead Sources Breakdown ROI (5 cols) */}
        <div className="lg:col-span-5 w-full h-auto orca-panel p-5 flex flex-col gap-3 min-h-0">
          <h3 className="orca-section-title text-white font-bold text-sm border-b orca-divider pb-2.5 flex items-center gap-2 shrink-0">
            <i className="ph-bold ph-funnel text-[#df7b62]"></i>
            {isArabic ? "تحليل كفاءة قنوات الاستحواذ والتسويق" : "Lead Sources Efficiency Analysis"}
          </h3>

          {loadingStats ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => <div key={n} className="h-8 bg-[#151f32]/60 animate-pulse rounded-lg"></div>)}
            </div>
          ) : (
            stats && (
              <div className="flex-1 min-h-0 max-h-[min(280px,38vh)] overflow-auto scrollbar-fade -mx-0.5 px-0.5">
                <table className="w-full text-right border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-[#151f32]/95 backdrop-blur-sm">
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1.5 pe-2 font-bold text-start">{isArabic ? "المصدر" : "Source"}</th>
                      <th className="py-1.5 px-1 font-bold text-center whitespace-nowrap">{isArabic ? "العملاء" : "Leads"}</th>
                      <th className="py-1.5 px-1 font-bold text-center whitespace-nowrap">{isArabic ? "التحويل" : "Conv."}</th>
                      <th className="py-1.5 ps-2 font-bold text-end whitespace-nowrap">{isArabic ? "CAC" : "CAC"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-slate-300">
                    {stats.sourcesBreakdown.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-1.5 pe-2 font-bold text-white text-[10px] leading-tight">{s.source}</td>
                        <td className="py-1.5 px-1 text-center font-en text-[10px]">{toArabicNumerals(s.count)}</td>
                        <td className="py-1.5 px-1 text-center font-en text-[#df7b62] font-bold text-[10px]">{toArabicNumerals(s.conversionRate)}</td>
                        <td className="py-1.5 ps-2 text-end font-en font-bold text-[10px] whitespace-nowrap">{s.spend === 0 ? "0 SAR" : formatCurrency(s.cac)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          <div className="bg-[#df7b62]/5 border border-[#df7b62]/10 p-2.5 rounded-xl text-[10px] text-slate-400 leading-snug shrink-0">
            💡 {isArabic 
              ? "تحليل تكلفة الاستحواذ (CAC) المذكورة مبني على متوسط الإنفاق لكل قناة إعلانية مقابل العقود العقارية المغلقة والمسجلة تحت سياق المستأجر بنجاح."
              : "Customer Acquisition Cost (CAC) calculation is calculated using total spend per ad platform divided by converted signed leases."}
          </div>
        </div>

      </div>

      {/* WhatsApp CRM & Followups Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Chats List Column (3 cols) */}
        <div className="lg:col-span-3 w-full h-[min(480px,72vh)] orca-panel flex flex-col overflow-hidden min-h-0">
          <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-900/30 shrink-0">
            <h3 className="text-white font-bold text-xs flex items-center gap-2">
              <i className="ph-bold ph-chat text-[#df7b62] text-sm"></i>
              {isArabic ? "محادثات الوكيل منصور" : "Mansour Automated Chats"}
            </h3>
            <span className="text-[9px] text-slate-500 font-semibold block mt-1">
              {isArabic ? "محادثات العملاء المحتملين المشفرة بالكامل" : "Fully encrypted leads conversations"}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-fade divide-y divide-slate-850/60">
            {loadingChats ? (
              [1, 2, 3].map(n => <div key={n} className="px-3 py-2 animate-pulse h-12 bg-[#151f32]/20"></div>)
            ) : (
              chats.map(chat => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`px-3 py-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#df7b62]/10 border-e-4 border-[#df7b62]'
                        : 'hover:bg-slate-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 mb-0.5">
                      <span className="font-bold text-white text-[11px] truncate">{chat.contactName}</span>
                      <span className="text-[9px] text-slate-500 font-semibold shrink-0">{chat.status === "INTERESTED" ? (isArabic ? "مهتم" : "Interested") : chat.status === "STUDY" ? (isArabic ? "قيد الدراسة" : "Study") : (isArabic ? "مغلق" : "Closed")}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate leading-tight">{chat.lastMessage}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold mt-0.5">
                      <span className="font-en">{chat.contactPhone}</span>
                      <span className="text-emerald-500 flex items-center gap-1">
                        <i className="ph-bold ph-shield-check"></i>
                        {isArabic ? "مشفر" : "Encrypted"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* WhatsApp Chat Window (5 cols) */}
        <div className="lg:col-span-5 w-full h-[min(480px,72vh)] orca-panel flex flex-col overflow-hidden min-h-0">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-900/30 flex flex-wrap justify-between items-center gap-2 shrink-0">
                <div>
                  <h4 className="text-white font-bold text-xs">{activeChat.contactName}</h4>
                  <p className="text-[9px] text-slate-500 font-semibold font-en">{activeChat.contactPhone}</p>
                </div>
                
                {/* Security Decrypt view switch */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-bold">{isArabic ? "أمان البيانات:" : "Data Privacy:"}</span>
                  <button
                    onClick={() => setIsDecryptedView(!isDecryptedView)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isDecryptedView
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    <i className={`ph-bold ${isDecryptedView ? "ph-eye-slash" : "ph-eye"}`}></i>
                    <span>{isDecryptedView ? (isArabic ? "تفعيل تشفير العرض" : "Mask view") : (isArabic ? "فك تشفير العرض" : "Decrypt view")}</span>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={chatScrollContainerRef as any} className="flex-1 min-h-0 overflow-y-auto scrollbar-fade p-3 space-y-3 bg-slate-900/10">
                <div className="text-center shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded bg-slate-900/50 border border-slate-850 text-[9px] text-slate-500 font-bold leading-tight">
                    🔒 {isArabic ? "المحادثات مشفرة بالكامل بقاعدة البيانات بمعيار AES-256" : "All conversations are encrypted in database via AES-256"}
                  </span>
                </div>

                {activeChat.messages.map((m, idx) => {
                  const isClient = m.sender === 'client';
                  // Simple text masking if decryption view is disabled
                  const displayMessage = isDecryptedView 
                    ? m.text 
                    : "AES_DEC_MASK_" + Buffer.from(m.text).toString('hex').substring(0, 16) + "...";

                  return (
                    <div
                      key={idx}
                      className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-md ${
                        isClient
                          ? 'bg-[#151f32] border border-slate-800 text-white rounded-br-none'
                          : 'bg-[#df7b62]/10 border border-[#df7b62]/20 text-white rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed">{displayMessage}</p>
                        <div className="flex justify-end text-[8px] text-slate-500 mt-1.5 font-semibold">
                          <span>{!isClient ? (isArabic ? "الوكيل منصور" : "Agent Mansour") : ""} {m.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-end">
                    <div className="bg-[#df7b62]/5 border border-[#df7b62]/10 rounded-2xl rounded-bl-none p-3 text-xs text-slate-500 font-bold flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-[#df7b62] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[#df7b62] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#df7b62] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span>{isArabic ? "الوكيل منصور يصيغ الرد..." : "Mansour is typing..."}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Send Message input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/30 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={isArabic ? "اكتب رسالة كأنك العميل (مثل: كم الأسعار؟)..." : "Type a message..."}
                  disabled={sendingMessage}
                  className="flex-grow rounded-xl bg-[#0b1120] border border-slate-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#df7b62]"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || messageInput.trim().length === 0}
                  className="bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  <i className="ph-bold ph-paper-plane-tilt text-sm"></i>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 text-xs font-semibold">
              <i className="ph ph-chat-circle text-2xl text-slate-600"></i>
              <p>{isArabic ? "الرجاء اختيار محادثة للبدء" : "Please select a conversation to start"}</p>
            </div>
          )}
        </div>

        {/* Followups Sequences Configurations (4 cols) */}
        <div className="lg:col-span-4 w-full h-[min(480px,72vh)] orca-panel p-4 flex flex-col overflow-hidden min-h-0">
          <h3 className="text-white font-bold text-xs border-b border-slate-800 pb-2.5 flex items-center gap-2 shrink-0">
            <i className="ph-bold ph-gear-six text-[#df7b62] text-sm"></i>
            {isArabic ? "مسارات المتابعة الآلية لمنصور" : "Mansour Sequences Settings"}
          </h3>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-fade space-y-1.5 ps-0.5 pe-1 mt-2">
              {loadingSequences ? (
                [1, 2].map(n => <div key={n} className="h-10 bg-[#151f32]/25 animate-pulse rounded-lg"></div>)
              ) : (
                sequences.map(seq => (
                  <div key={seq.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850/80 text-[10px] space-y-1 relative">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#df7b62]">
                        {seq.status === "INTERESTED" ? (isArabic ? "مهتم" : "Interested") : seq.status === "STUDY" ? (isArabic ? "قيد الدراسة" : "Study") : (isArabic ? "مغلق" : "Closed")}
                      </span>
                      <span className="text-slate-500 font-semibold">{isArabic ? `بعد ${toArabicNumerals(seq.delayDays)} يوم` : `After ${seq.delayDays} days`}</span>
                    </div>
                    <p className="text-slate-400 leading-snug font-sans line-clamp-3">{seq.message}</p>
                    <button
                      onClick={() => handleDeleteSequence(seq.id)}
                      className="absolute top-2 left-2 text-rose-500 hover:text-rose-455 text-[9px] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
          </div>

          {/* New Sequence Form */}
          <form onSubmit={handleSaveSequence} className="space-y-2 pt-2.5 border-t border-slate-800 mt-2 shrink-0">
            <h4 className="text-slate-400 text-[10px] font-bold">{isArabic ? "إضافة مسار متابعة جديد" : "Add follow-up sequence"}</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">{isArabic ? "حالة العميل" : "Lead Status"}</label>
                <select
                  value={seqStatus}
                  onChange={(e) => setSeqStatus(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#df7b62]"
                >
                  <option value="INTERESTED">{isArabic ? "مهتم" : "Interested"}</option>
                  <option value="STUDY">{isArabic ? "قيد الدراسة" : "Under Study"}</option>
                  <option value="CLOSED">{isArabic ? "مغلق" : "Closed"}</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">{isArabic ? "فترة التأخير (أيام)" : "Delay (days)"}</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={seqDelay}
                  onChange={(e) => setSeqDelay(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-2 py-1.5 text-[10px] text-white font-en focus:outline-none focus:border-[#df7b62]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 mb-1">{isArabic ? "محتوى رسالة التذكير" : "Reminder message text"}</label>
              <textarea
                value={seqMessage}
                onChange={(e) => setSeqMessage(e.target.value)}
                rows={2}
                required
                placeholder={isArabic ? "اكتب محتوى الرسالة هنا..." : "Type sequence message template..."}
                className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-[10px] text-white focus:outline-none focus:border-[#df7b62] scrollbar-fade resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingSequence || seqMessage.trim().length === 0}
              className="w-full py-2 bg-[#df7b62] hover:bg-[#c5654e] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              {savingSequence ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ المسار الجديد ➔" : "Save sequence ➔")}
            </button>
          </form>
        </div>

      </div>
      </>
      )}

      {activeSubTab === 'ads_center' && (
        <div className="space-y-8 animate-fade-in">
          {/* Security Banner */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 flex items-center gap-3 text-xs font-semibold relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            <i className="ph-bold ph-lock text-base"></i>
            <div>
              <p>{isArabic ? "تشفير كامل عند الراحة (Encryption at Rest) مفعل بمعيار AES-256-CBC" : "Full AES-256-CBC Encryption at Rest active"}</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">{isArabic ? "يتم تشفير وتخزين جميع مفاتيح ورموز الربط بقاعدة البيانات بشكل معزول تماماً لكل مستأجر (Multi-Tenant Isolation)." : "All keys are encrypted and isolated per subscriber tenant. Raw integration keys are never leaked to client web interface."}</p>
            </div>
          </div>

          {/* Platform Orchestrator Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <i className="ph-bold ph-plugs-connected text-[#df7b62]"></i>
                {isArabic ? "موزع المنصات الإعلانية (Platform Orchestrator)" : "Platform Orchestrator"}
              </h3>
              
              {tenantPlan.toLowerCase() !== 'diamond' && (
                <button
                  onClick={() => {
                    const locked = getLockedAgents();
                    if (locked.length > 0) {
                      setSelectedAgentToLease(locked[0].id);
                    }
                    setLeasingAgentModal({ isOpen: true, agentId: 'BASEER' });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <i className="ph-bold ph-hand-coins text-xs"></i>
                  <span>{isArabic ? "طلب وكيل لحملة" : "Lease Agent for Campaign"}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              {isArabic ? "انقر على أي منصة لتهيئة معرف الحساب، مفاتيح الربط الآمنة، وتخصيص طريقة معالجة الوكيل منصور للعملاء القادمين منها." : "Click on any ad platform to configure Account ID, secure keys, and customize Agent Mansour's lead welcome response."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {loadingPlatforms ? (
                [1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-40 bg-[#151f32]/40 border border-slate-800 rounded-2xl animate-pulse"></div>
                ))
              ) : (
                platforms.map(plat => {
                  const isSelected = selectedPlatform === plat.platform;
                  const isTesting = !!testingPlatform[plat.platform];
                  
                  // Get branding color & logo
                  let colorClass = "from-indigo-600/20 to-slate-900 border-indigo-900/30";
                  let glowColor = "rgba(99,102,241,0.2)";
                  let logoIcon = "ph-google-logo";
                  let officialName = plat.platform;

                  if (plat.platform === 'GOOGLE') {
                    colorClass = "from-blue-600/20 to-slate-900 border-blue-900/30";
                    logoIcon = "ph-google-logo";
                    glowColor = "rgba(59,130,246,0.25)";
                    officialName = isArabic ? "إعلانات جوجل" : "Google Ads";
                  } else if (plat.platform === 'META') {
                    colorClass = "from-[#1877f2]/20 to-slate-900 border-[#1877f2]/30";
                    logoIcon = "ph-facebook-logo";
                    glowColor = "rgba(24,119,242,0.25)";
                    officialName = isArabic ? "إعلانات ميتا (فيسبوك)" : "Meta Ads";
                  } else if (plat.platform === 'TIKTOK') {
                    colorClass = "from-[#00f2fe]/10 to-slate-900 border-[#00f2fe]/20";
                    logoIcon = "ph-tiktok-logo";
                    glowColor = "rgba(0,242,254,0.2)";
                    officialName = isArabic ? "إعلانات تيك توك" : "TikTok Ads";
                  } else if (plat.platform === 'SNAPCHAT') {
                    colorClass = "from-yellow-600/10 to-slate-900 border-yellow-900/20";
                    logoIcon = "ph-snapchat-logo";
                    glowColor = "rgba(234,179,8,0.2)";
                    officialName = isArabic ? "إعلانات سناب شات" : "Snapchat Ads";
                  } else if (plat.platform === 'TWITTER') {
                    colorClass = "from-slate-700/20 to-slate-900 border-slate-700/30";
                    logoIcon = "ph-twitter-logo";
                    glowColor = "rgba(255,255,255,0.1)";
                    officialName = isArabic ? "إعلانات إكس (تويتر)" : "X / Twitter Ads";
                  } else if (plat.platform === 'LINKEDIN') {
                    colorClass = "from-[#0a66c2]/20 to-slate-900 border-[#0a66c2]/30";
                    logoIcon = "ph-linkedin-logo";
                    glowColor = "rgba(10,102,194,0.25)";
                    officialName = isArabic ? "إعلانات لينكد إن" : "LinkedIn Ads";
                  }

                  return (
                    <div 
                      key={plat.platform}
                      className={`relative w-full h-auto overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass} border p-5 orca-transition ${
                        isSelected ? 'ring-2 ring-[#df7b62]' : 'hover:scale-[1.02]'
                      }`}
                      style={{ boxShadow: isSelected ? `0 0 20px ${glowColor}` : undefined }}
                    >
                      {/* Connection status badge */}
                      <div className="absolute top-4 left-4">
                        {plat.status === 'CONNECTED' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {isArabic ? "مرتبط ونشط" : "Connected"}
                          </span>
                        )}
                        {plat.status === 'SYNCING' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin border border-t-transparent"></span>
                            {isArabic ? "جاري المزامنة" : "Syncing"}
                          </span>
                        )}
                        {plat.status === 'CONNECTION_ERROR' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-450"></span>
                            {isArabic ? "خطأ في الاتصال" : "Connection Error"}
                          </span>
                        )}
                        {plat.status === 'DISCONNECTED' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[9px] font-bold">
                            {isArabic ? "غير نشط" : "Disconnected"}
                          </span>
                        )}
                      </div>

                      {/* Header */}
                      <div className="flex justify-end items-center mb-5">
                        <i className={`ph-bold ${logoIcon} text-2xl text-white`}></i>
                      </div>

                      <h4 className="text-white font-extrabold text-xs">{officialName}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-en truncate">
                        {plat.accountId ? `ID: ${plat.accountId}` : (isArabic ? "لم يتم الربط بعد" : "Not connected yet")}
                      </p>

                      <div className="flex gap-2 mt-5">
                        <button
                          type="button"
                          onClick={() => handleSelectPlatform(plat)}
                          className="flex-grow py-1.5 bg-[#df7b62]/10 hover:bg-[#df7b62]/20 border border-[#df7b62]/30 text-[#df7b62] text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          {isArabic ? "إعدادات الربط" : "Configure"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestPlatformConnection(plat.platform)}
                          disabled={isTesting || !plat.accountId}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          {isTesting ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            isArabic ? "فحص الاتصال" : "Test"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Platform Setup Inline Modal / Pane */}
          {selectedPlatform && (
            <div className="p-6 rounded-2xl bg-[#151f32]/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#df7b62]/5 rounded-full blur-[80px] pointer-events-none"></div>
              <h4 className="text-white font-extrabold text-sm border-b border-slate-850 pb-3 flex justify-between items-center mb-5">
                <span className="flex items-center gap-2">
                  <i className="ph-bold ph-gear text-[#df7b62]"></i>
                  {isArabic 
                    ? `إعدادات الربط وحوكمة مسار منصور لـ ${selectedPlatform}` 
                    : `Configure Connection & Mansour Routing for ${selectedPlatform}`}
                </span>
                <button 
                  type="button"
                  onClick={() => setSelectedPlatform(null)}
                  className="text-slate-400 hover:text-white cursor-pointer text-xs"
                >
                  ✕
                </button>
              </h4>

              <form onSubmit={handleSavePlatformConnection} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Credentials Side (6 cols) */}
                <div className="lg:col-span-6 space-y-4">
                  <h5 className="text-[#df7b62] text-[10px] font-bold">{isArabic ? "بيانات الاعتماد الآمنة" : "Secure API Credentials"}</h5>
                  
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">
                      {isArabic ? "معرّف الحساب الإعلاني (Ad Account / Org ID) *" : "Ad Account ID / Organization ID *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={platformAccountId}
                      onChange={(e) => setPlatformAccountId(e.target.value)}
                      placeholder="e.g. act_12893812 or org-938210"
                      className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-xs text-white font-en focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">
                      {isArabic ? "مفتاح ربط الواجهة الإعلانية (API Integration Key)" : "API Integration Key"}
                    </label>
                    <input
                      type="password"
                      value={platformApiKey}
                      onChange={(e) => setPlatformApiKey(e.target.value)}
                      placeholder={isArabic ? "أدخل المفتاح لتحديثه أو اتركه فارغاً للإبقاء على المفتاح المشفر الحالي" : "Enter API key to update it or leave empty to keep current key encrypted"}
                      className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-xs text-white font-en focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>
                </div>

                {/* Mansour Routing Side (6 cols) */}
                <div className="lg:col-span-6 space-y-4">
                  <h5 className="text-[#df7b62] text-[10px] font-bold">{isArabic ? "تكامل مسار العميل التلقائي للوكيل منصور" : "Mansour Customer Lead Customization"}</h5>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">
                      {isArabic ? "أسلوب الحوار وطبيعة المعالجة (Lead Routing Style)" : "Lead Routing Dialogue Style"}
                    </label>
                    <select
                      value={platformLeadTone}
                      onChange={(e) => setPlatformLeadTone(e.target.value)}
                      className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#df7b62]"
                    >
                      <option value="PROFESSIONAL">{isArabic ? "رسمي واحترافي وعملي" : "Professional & Analytical"}</option>
                      <option value="CASUAL">{isArabic ? "ودي ومبسط ومرحّب" : "Casual & Friendly"}</option>
                      <option value="URGENT">{isArabic ? "سريع وموجه لإتمام الحجز" : "Urgent Booking Focused"}</option>
                      <option value="DETAILED">{isArabic ? "شامل ويركز على المواصفات والضمانات" : "Detailed & Feature Focused"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">
                      {isArabic ? "رسالة واتساب التلقائية الأولى للعملاء الواردين من هذه المنصة" : "Automatic Welcome WhatsApp template for this platform"}
                    </label>
                    <textarea
                      value={platformAutoWelcome}
                      onChange={(e) => setPlatformAutoWelcome(e.target.value)}
                      required
                      rows={3}
                      placeholder={isArabic ? "اكتب صيغة الترحيب هنا..." : "Define custom greeting template..."}
                      className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>
                </div>

                <div className="lg:col-span-12 flex justify-end gap-3 pt-3 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform(null)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={savingPlatform}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#df7b62] to-[#c5654e] text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
                  >
                    {savingPlatform ? (isArabic ? "جاري التثبيت والتشفير..." : "Saving & Encrypting...") : (isArabic ? "حفظ وتشفير الإعدادات 🔒" : "Save & Encrypt Configuration 🔒")}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Unified ROI Comparison Dashboard Table */}
          <div className="orca-panel p-6">
            <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3 flex items-center gap-2 mb-5">
              <i className="ph-bold ph-presentation-chart text-[#df7b62]"></i>
              {isArabic ? "التحليل الموحد ومقارنة كفاءة المنصات الإعلانية (Unified ROI Dashboard)" : "Unified Multi-Channel Ad ROI Comparison"}
            </h3>

            <div className="overflow-x-auto scrollbar-fade">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-bold">{isArabic ? "المنصة الإعلانية" : "Platform Name"}</th>
                    <th className="pb-3 font-bold text-center">{isArabic ? "معرّف الحساب" : "Connected Account"}</th>
                    <th className="pb-3 font-bold text-center">{isArabic ? "الميزانية المصروفة" : "Ad Budget Spent"}</th>
                    <th className="pb-3 font-bold text-center">{isArabic ? "العملاء المحتملين" : "Generated Leads"}</th>
                    <th className="pb-3 font-bold text-center">{isArabic ? "تكلفة العميل (CAC)" : "Average CAC"}</th>
                    <th className="pb-3 font-bold text-center">{isArabic ? "تحويل المبيعات" : "Conv. Rate"}</th>
                    <th className="pb-3 font-bold text-left">{isArabic ? "العقود الموقعة" : "Closed Contracts"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                  {[
                    { key: 'GOOGLE', label: isArabic ? 'جوجل' : 'Google Ads', spend: 18500, sourceStr: 'Google Ads' },
                    { key: 'META', label: isArabic ? 'ميتا' : 'Meta Ads', spend: 14200, sourceStr: 'Meta Ads' },
                    { key: 'TIKTOK', label: isArabic ? 'تيك توك' : 'TikTok Ads', spend: 9800, sourceStr: 'TikTok Ads' },
                    { key: 'SNAPCHAT', label: isArabic ? 'سناب شات' : 'Snapchat Ads', spend: 11500, sourceStr: 'Snapchat Ads' },
                    { key: 'TWITTER', label: isArabic ? 'إكس (تويتر)' : 'X Ads', spend: 7600, sourceStr: 'X Ads' },
                    { key: 'LINKEDIN', label: isArabic ? 'لينكد إن' : 'LinkedIn Ads', spend: 12500, sourceStr: 'LinkedIn Ads' }
                  ].map(platformData => {
                    const conn = platforms.find(p => p.platform === platformData.key);
                    const leadCount = stats ? (stats.sourcesBreakdown.find((s: any) => s.source === platformData.sourceStr)?.count || 0) : 0;
                    const rawCac = stats ? (stats.sourcesBreakdown.find((s: any) => s.source === platformData.sourceStr)?.cac || platformData.spend) : platformData.spend;
                    const convRate = stats ? (stats.sourcesBreakdown.find((s: any) => s.source === platformData.sourceStr)?.conversionRate || "0.0%") : "0.0%";
                    const closedDealsCount = rawCac > 0 ? Math.round(platformData.spend / rawCac) : 0;

                    return (
                      <tr key={platformData.key} className="hover:bg-slate-900/10">
                        <td className="py-3 font-extrabold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${conn?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                          {platformData.label}
                        </td>
                        <td className="py-3 text-center text-slate-450 font-en">
                          {conn?.accountId ? (
                            <span className="text-white bg-slate-900/50 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                              {conn.accountId}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold">{isArabic ? "غير مرتبط" : "Not connected"}</span>
                          )}
                        </td>
                        <td className="py-3 text-center font-en font-bold text-white">{formatCurrency(platformData.spend)}</td>
                        <td className="py-3 text-center font-en text-white font-bold">{toArabicNumerals(leadCount)}</td>
                        <td className="py-3 text-center font-en text-[#df7b62] font-extrabold">{formatCurrency(rawCac)}</td>
                        <td className="py-3 text-center font-en text-indigo-400 font-bold">{toArabicNumerals(convRate)}</td>
                        <td className="py-3 text-left font-en font-extrabold text-emerald-400">{toArabicNumerals(closedDealsCount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Baseer AI Insight Forecast Modal */}
      {isInsightOpen && baseerInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#151f32] to-slate-900 border border-[#df7b62]/30 max-w-3xl w-full p-6 space-y-6 shadow-2xl animate-scale-up" dir={dir}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#df7b62]/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="border-b border-slate-800 pb-3 flex justify-between items-center relative z-10">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <i className="ph-bold ph-magic-wand text-[#df7b62]"></i>
                {isArabic ? "تقرير الوكيل الاستشرافي بصير" : "Agent Baseer Strategic Report"}
              </h3>
              <button 
                onClick={() => setIsInsightOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Report Content */}
            <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl text-xs md:text-sm text-slate-300 leading-relaxed max-h-[450px] overflow-y-auto scrollbar-fade pr-2 relative z-10 space-y-4">
              <div className="markdown-body font-sans space-y-4">
                {baseerInsight.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h3 key={idx} className="text-white font-extrabold text-sm border-b border-slate-800 pb-1 pt-3">{line.replace('###', '')}</h3>;
                  }
                  if (line.startsWith('####')) {
                    return <h4 key={idx} className="text-[#df7b62] font-bold text-xs pt-2">{line.replace('####', '')}</h4>;
                  }
                  if (line.startsWith('*')) {
                    return (
                      <div key={idx} className="flex gap-2 items-start text-xs">
                        <span className="text-[#df7b62] font-bold mt-0.5">•</span>
                        <span>{line.replace('*', '').trim()}</span>
                      </div>
                    );
                  }
                  return <p key={idx} className="text-xs text-slate-400">{line}</p>;
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 relative z-10">
              <button 
                onClick={() => setIsInsightOpen(false)}
                className="bg-[#df7b62] hover:bg-[#c5654e] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
              >
                {isArabic ? "حسناً، فهمت" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💎 Glassmorphism Upgrade Agent Modal (Upsell Card) */}
      {upgradeAgentModal && upgradeAgentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-fade-in animate-scale-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#192239] to-slate-950 border-2 border-[#df7b62]/40 max-w-md w-full p-6 space-y-6 shadow-[0_0_30px_rgba(223,123,98,0.25)] text-center relative z-10" dir={dir}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#df7b62]/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#df7b62]/20 border border-[#df7b62]/40 flex items-center justify-center text-[#df7b62] text-xl animate-pulse">
                <i className="ph-bold ph-lock-key text-lg"></i>
              </div>
              <h3 className="text-white font-extrabold text-base tracking-wide">
                {isArabic ? "ميزة مقيدة - ترقية الباقة مطلوبة" : "Restricted Feature - Upgrade Required"}
              </h3>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl text-xs text-slate-300 leading-relaxed font-sans text-right" dir={dir}>
              <p className="font-bold text-[#df7b62] mb-2 text-center">
                {isArabic ? `الوكيل النشط المطلوب: ${upgradeAgentModal.agentName}` : `Required AI Agent: ${upgradeAgentModal.agentName}`}
              </p>
              <p className="text-center">{upgradeAgentModal.details}</p>
              <p className="mt-3 text-[10px] text-slate-450 border-t border-slate-850 pt-2.5 text-center">
                {isArabic 
                  ? "تواصل مع الوكلاء الخمسة الذكيين بالتناغم التام، وتجاوز قيود المراسلات في الباقة الماسية الشاملة (باقة الريادة)." 
                  : "Enable all 5 virtual agents to work together and unlock unlimited operations under the elite Diamond Plan."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button 
                onClick={() => setUpgradeAgentModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all border border-slate-750"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
              <a 
                href="/operations?tab=billing" 
                onClick={() => setUpgradeAgentModal(null)}
                className="flex-1 bg-gradient-to-r from-[#df7b62] to-[#c5654e] hover:shadow-[0_0_15px_rgba(223,123,98,0.3)] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all border border-[#df7b62]/30 flex items-center justify-center gap-1.5"
              >
                <i className="ph-bold ph-sparkle"></i>
                <span>{isArabic ? "ترقية الاشتراك الآن ➔" : "Upgrade Plan Now ➔"}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* On-Demand Agent Leasing Modal */}
      {leasingAgentModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md border border-slate-800">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-[#151f32] to-[#0b1120] border border-slate-800 p-6 shadow-2xl">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <h3 className="text-white font-extrabold text-base flex items-center gap-2 border-b border-slate-850 pb-3 mb-4">
              <i className="ph-bold ph-hand-coins text-[#df7b62]"></i>
              {isArabic ? "طلب وكيل لحملة (استئجار مؤقت)" : "Request Campaign Agent (Leasing)"}
            </h3>

            <p className="text-slate-400 text-xs mb-4">
              {isArabic 
                ? "قم باستئجار وكيل مخصص للعمل على حملتك الإعلانية بمرونة وتكلفة منخفضة دون الحاجة لترقية باقة النظام بالكامل."
                : "Lease a specialized agent to run your marketing campaigns temporarily without upgrading your entire subscription tier."}
            </p>

            <div className="space-y-4">
              {/* Agent Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">
                  {isArabic ? "اختر الوكيل المطلوب" : "Select Agent"}
                </label>
                <select
                  value={selectedAgentToLease}
                  onChange={(e) => setSelectedAgentToLease(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1120] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#df7b62]"
                >
                  {getLockedAgents().map(ag => (
                    <option key={ag.id} value={ag.id}>
                      {isArabic ? ag.nameAr : ag.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Details */}
              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">
                  {isArabic ? "سعر الاستئجار الثابت (30 يوماً)" : "Fixed Leasing Price (30 days)"}
                </span>
                <span className="text-white font-black text-sm">
                  {isArabic ? "250 ريال سعودي" : "250 SAR"}
                </span>
              </div>

              {/* Auto Renewal Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold text-white">
                    {isArabic ? "التجديد التلقائي للوكيل" : "Auto-Renewal"}
                  </span>
                  <span className="block text-[9px] text-slate-500 mt-0.5">
                    {isArabic 
                      ? "سيتم تجديد العقد ومضاعفة السعر تلقائياً عند انتهاء المدة." 
                      : "Lease will renew and price will double automatically upon expiration."}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoRenewalOption}
                  onChange={(e) => setAutoRenewalOption(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-[#0b1120] text-[#df7b62] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setLeasingAgentModal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={submittingLease}
                onClick={handleConfirmLease}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingLease ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <i className="ph-bold ph-check"></i>
                )}
                <span>{isArabic ? "تفعيل واستئجار" : "Confirm & Lease"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📈 Expected ROI Scenario Modal (لوحة سيناريو الأرباح والعوائد المتوقع) */}
      {showScenarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-fade-in animate-scale-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#151f32] to-slate-950 border border-indigo-500/30 max-w-2xl w-full p-6 space-y-6 shadow-[0_0_30px_rgba(99,102,241,0.25)]" dir={dir}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#df7b62]/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="border-b border-slate-800 pb-3 flex justify-between items-center relative z-10">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                <i className="ph-bold ph-presentation-chart text-[#df7b62]"></i>
                {isArabic ? "سيناريو الأرباح والعوائد المتوقع 📈" : "Expected Profit & ROI Scenario 📈"}
              </h3>
              <button 
                onClick={() => setShowScenarioModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 relative z-10 text-xs md:text-sm text-slate-350 leading-relaxed font-sans">
              <p className="text-slate-400">
                {isArabic
                  ? "قمنا بتحليل أداء حملاتك الحالية عبر المنصات الإعلانية ومقارنة وضعك الحالي مع تفعيل السيناريوهات الذكية للنمو:"
                  : "We analyzed your current ad campaign performance and compared your current setup with active growth scenarios:"}
              </p>

              {/* Comparison Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Current Scenario */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0b1120]/60 space-y-3">
                  <h4 className="text-slate-400 font-bold text-xs border-b border-slate-850 pb-2">
                    {isArabic ? "الوضع الحالي (الباقة الحالية)" : "Current Setup"}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-550 text-[10px] font-bold">{isArabic ? "تكلفة الاستحواذ (CAC):" : "Acquisition Cost (CAC):"}</span>
                      <span className="text-rose-455 font-bold font-en">{formatCurrency(1450)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-555 text-[10px] font-bold">{isArabic ? "معدل العائد (ROI):" : "Ad ROI:"}</span>
                      <span className="text-rose-455 font-bold font-en">{toArabicNumerals(312)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-555 text-[10px] font-bold">{isArabic ? "سرعة الاستجابة والمتابعة:" : "Response Time:"}</span>
                      <span className="text-slate-400 font-bold">{isArabic ? "ساعتان (يدوي)" : "2 hours (Manual)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-555 text-[10px] font-bold">{isArabic ? "قنوات التواصل والمتابعة:" : "Followup Channels:"}</span>
                      <span className="text-slate-400 font-bold">{isArabic ? "محدودة وبشكل متقطع" : "Limited / Intermittent"}</span>
                    </div>
                  </div>
                </div>

                {/* Projected Scenario */}
                <div className="p-4 rounded-xl border border-indigo-900/35 bg-indigo-950/20 space-y-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <h4 className="text-indigo-400 font-black text-xs border-b border-indigo-900/20 pb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    {isArabic ? "السيناريو المحسن (الماسية / استئجار الوكيل)" : "Projected Scenario (Diamond/Lease)"}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] font-bold">{isArabic ? "تكلفة الاستحواذ المتوقعة (CAC):" : "Projected CAC:"}</span>
                      <span className="text-emerald-400 font-extrabold font-en">{formatCurrency(942)} <span className="text-[9px] text-emerald-500 font-bold">({isArabic ? "انخفاض ٣٥٪" : "-35%"})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] font-bold">{isArabic ? "معدل العائد المتوقع (ROI):" : "Projected ROI:"}</span>
                      <span className="text-emerald-400 font-extrabold font-en">{toArabicNumerals(495)}% <span className="text-[9px] text-emerald-500 font-bold">({isArabic ? "نمو ١.٥ ضعف" : "1.5x Boost"})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] font-bold">{isArabic ? "سرعة الاستجابة والمتابعة:" : "Response Time:"}</span>
                      <span className="text-emerald-400 font-bold">{isArabic ? "أقل من دقيقتين (منصور)" : "< 2 mins (Mansour)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] font-bold">{isArabic ? "قنوات التواصل والمتابعة:" : "Followup Channels:"}</span>
                      <span className="text-indigo-300 font-bold">{isArabic ? "متابعة تلقائية ٢٤/٧" : "Automated 24/7 WhatsApp"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logical Analysis Text */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-xs text-slate-300 leading-relaxed font-sans text-right space-y-2">
                <p className="font-extrabold text-[#df7b62]">
                  {isArabic ? "💡 التحليل المنطقي والجدوى الاقتصادية:" : "💡 Technical Analysis & Feasibility:"}
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {isArabic 
                    ? "عند تفعيل الأتمتة المتقدمة للوكيل منصور، يتم اصطياد كافة الفرص البيعية الضائعة عبر المتابعة اللحظية ومسارات المحادثة الذكية. إن بقاءك على الباقة الحالية دون تفعيل الوكلاء يعني خسارتك لـ 80% من قيمة الإنفاق الإعلاني بسبب التأخير في المتابعة."
                    : "Activating Agent Mansour's advanced follow-ups captures missed leads instantly via automatic conversations. Staying on the current plan without active virtual agents means losing up to 80% of ad efficiency due to manual followup latency."}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-800">
              <button 
                onClick={() => {
                  setShowScenarioModal(false);
                  setLeasingAgentModal({ isOpen: true, agentId: 'BASEER' });
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all border border-slate-755 flex items-center justify-center gap-1.5"
              >
                <i className="ph-bold ph-hand-coins"></i>
                <span>{isArabic ? "تمديد استئجار الوكيل مؤقتاً" : "Extend / Renew Lease"}</span>
              </button>
              <a 
                href="/operations?tab=settings" 
                onClick={() => setShowScenarioModal(false)}
                className="flex-1 bg-gradient-to-r from-[#df7b62] to-[#c5654e] hover:shadow-[0_0_15px_rgba(223,123,98,0.3)] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all border border-[#df7b62]/30 flex items-center justify-center gap-1.5"
              >
                <i className="ph-bold ph-sparkle"></i>
                <span>{isArabic ? "الترقية للباقة الماسية الشاملة ➔" : "Upgrade to Diamond Tier ➔"}</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
