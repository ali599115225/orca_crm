// components/views/tabs/LeadsTabs.tsx
"use client";
import { toast } from '@/app/context/ToastContext';
import { useState, useTransition, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import Pipeline from "../pipeline/Pipeline";
import Contacts from "./Contacts";
import Opportunities from "./Opportunities";
import Tours from "./Tours";
import Offers from "./Offers";
import Tasks from "./Tasks";
import InsightsAutomation from "./InsightsAutomation";

import { 
  Users, Activity, Calendar, DollarSign, Search, Plus, 
  Settings, Bot, Sparkles, ChevronRight
} from "lucide-react";
import { Card, Button } from "../../ui/orca-components";
import { LayoutContainer } from '../../ui/LayoutContainer';

export default function LeadsTabs() {
  const { lang } = useApp();
  const [active, setActive] = useState("pipeline");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

  useEffect(() => {
    setTelemetryLogs([
      {
        id: "evt_leads_init",
        type: "leads.initialized",
        timestamp: new Date().toISOString(),
        payload: { message: "تهيئة نظام إدارة الصفقات والعملاء بنجاح" }
      }
    ]);
  }, []);

  const addTelemetryEvent = (type: string, payload: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
  };

  const triggerLeadWebhookSimulation = () => {
    const names = ["خالد بن فهد", "سارة الشمري", "محمد العتيبي", "ابتسام الرويلي"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const phone = "050" + Math.floor(1000000 + Math.random() * 9000000);
    const score = Math.floor(65 + Math.random() * 30);
    
    addTelemetryEvent("lead.webhook_received", {
      source: "Facebook Ads API",
      name: randomName,
      phone,
      aiScore: score,
      status: "Unassigned"
    });
    toast.success(`[WEBHOOK SIMULATOR]\nتم تلقي بيانات عميل جديد بنجاح من Facebook Ads:\nالاسم: ${randomName}\nالجوال: ${phone}\nالتقييم الأولي للـ AI: ${score}%`);
  };

  const tabs = [
    { id: "pipeline", labelAr: "متابعة الصفقات", labelEn: "Pipeline" },
    { id: "contacts", labelAr: "دفتر العملاء", labelEn: "Contacts" },
    { id: "opportunities", labelAr: "الفرص", labelEn: "Opportunities" },
    { id: "tours", labelAr: "الجولات العقارية", labelEn: "Property Tours" },
    { id: "offers", labelAr: "العروض", labelEn: "Offers" },
    { id: "tasks", labelAr: "المهام والأنشطة", labelEn: "Tasks" },
    { id: "insights", labelAr: "الرؤى والأتمتة", labelEn: "Insights" },
  ];

  const handleTabChange = (tabId: string) => {
    startTransition(() => {
      setActive(tabId);
    });
  };

  // KPIs
  const kpisContent = (
    <>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">العملاء الجدد (هذا الأسبوع)</p>
            <h3 className="text-2xl font-black text-white">48</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-secondary)]">
            <Users size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">الفرص النشطة</p>
            <h3 className="text-2xl font-black text-amber-500">126</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Activity size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">الجولات المجدولة</p>
            <h3 className="text-2xl font-black text-emerald-500">14</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Calendar size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">نسبة نجاح الصفقات</p>
            <h3 className="text-2xl font-black text-cyan-400">76%</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Sparkles size={18} />
          </div>
        </div>
      </Card>
    </>
  );

  // Actions
  const actionsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings size={16} className="text-[var(--nc-text-secondary)]" />
          إجراءات العملاء السريعة
        </h4>
        <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium mt-1">البحث الشامل ومحاكاة الويب هوك للعملاء</p>
      </div>

      <div className="space-y-3 flex-grow pt-2">
        <div className="flex gap-2">
          <input 
            placeholder={lang === 'AR' ? 'بحث شامل...' : 'Global search leads...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]" 
          />
          <Button 
            onClick={() => {
              addTelemetryEvent("leads.search", { query: searchTerm });
              toast.success(`تم تشغيل البحث الشامل عن: ${searchTerm}`);
            }}
            className="px-4 py-2 text-xs font-bold"
          >
            {lang === 'AR' ? 'بحث' : 'Search'}
          </Button>
        </div>

        <div className="border-t border-white/5 my-3 pt-3 space-y-2">
          <button 
            type="button"
            onClick={triggerLeadWebhookSimulation}
            className="w-full py-2 text-right px-3 text-xs bg-[var(--nc-surface-solid)] border border-white/5 hover:border-[var(--nc-accent-border)] rounded-xl hover:text-white transition-all flex items-center justify-between"
          >
            <span>محاكاة webhook عميل جديد</span>
            <ChevronRight size={14} className="opacity-50" />
          </button>
        </div>
      </div>
    </Card>
  );

  // Insights (AI Predictor)
  const insightsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot size={16} className="text-cyan-400" />
          مساعد أتمتة العملاء وتوقع الفوز (AI Predictor)
        </h4>
        <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium mt-1">تقييم جودة العملاء (Lead Scoring) والرؤى الذكية والتوصيات</p>
      </div>

      <div className="space-y-4 flex-grow pt-2 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[var(--nc-surface)] p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-xs text-slate-500">العميل الأعلى اهتماماً متوقع</span>
            <span className="font-semibold text-white text-lg">خالد الفيصل (معدل فوز: 92%)</span>
            <p className="text-xs text-slate-500 text-emerald-400">التوصية: تم إرسال كتالوج مشروع النخيل، يرجى الاتصال هاتفياً اليوم.</p>
          </div>
          <div className="bg-[var(--nc-surface)] p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-xs text-slate-500">حالة المهام التلقائية</span>
            <span className="font-semibold text-white text-lg">تمت أتمتة 18 متابعة هذا اليوم</span>
            <p className="text-xs text-slate-500 text-[var(--nc-text-secondary)]">تنبيه: يوجد عميل واحد معلق لم يتم تعيينه منذ 4 ساعات.</p>
          </div>
        </div>
      </div>
    </Card>
  );

  // Details
  const detailsContent = (
    <div className="space-y-6">
      {/* Tabs Selector Bar */}
      <div className="tabs-row flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              active === t.id 
                ? "bg-[var(--nc-accent)] text-white shadow-sm" 
                : "bg-[var(--nc-surface)] text-[var(--nc-text-dim)] border border-white/5 hover:text-white hover:bg-[var(--nc-surface-solid)]"
            }`}
          >
            {lang === 'AR' ? t.labelAr : t.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Area Content */}
      <div className="tab-area">
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">جاري الانتقال للقسم المحدد...</span>
          </div>
        ) : (
          <>
            {active === "pipeline" && <Pipeline />}
            {active === "contacts" && <Contacts />}
            {active === "opportunities" && <Opportunities />}
            {active === "tours" && <Tours />}
            {active === "offers" && <Offers />}
            {active === "tasks" && <Tasks />}
            {active === "insights" && <InsightsAutomation />}
          </>
        )}
      </div>

      {/* Webhook logs or Telemetry log console at the very bottom */}
      <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-3xl p-5 shadow-2xl flex flex-col flex-1 min-h-0 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
            <Bot size={15} />
            سجل تتبع أتمتة العملاء الفورية (Telemetry Event Bus Logs)
          </h4>
          <button 
            type="button"
            onClick={() => setTelemetryLogs([])}
            className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium hover:text-[var(--nc-text-dim)] font-medium border border-white/5 px-2 py-0.5 rounded"
          >
            مسح السجل
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="p-2.5 bg-[var(--nc-surface-strong)] rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--nc-text-secondary)] font-bold">[{log.type.toUpperCase()}]</span>
                <span className="text-[var(--nc-text-dim)] font-medium">{log.timestamp}</span>
              </div>
              <pre className="text-[9px] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] p-1.5 rounded overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="leads-page p-6 text-[var(--ds-text-primary)]" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-[#94A3B8] font-bold tracking-wider uppercase">
            {lang === 'AR' ? 'إدارة علاقات العملاء' : 'Customer Relationship Management'}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">
            {lang === 'AR' ? 'مركز إدارة العملاء والصفقات — ORCA' : 'Deals & Leads Hub — ORCA'}
          </h1>
        </div>
      </div>

      <LayoutContainer
        kpis={kpisContent}
        actions={actionsContent}
        insights={insightsContent}
        details={detailsContent}
      />
    </div>
  );
}









