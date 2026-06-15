'use client';
import { toast } from '@/app/context/ToastContext';
import React, { useState } from 'react';
import {
  Building2, Plus, Search, Landmark, MapPin, Eye,
  CheckCircle2, Activity, DollarSign, Calendar
} from 'lucide-react';
import { Button, Card } from '../ui/orca-components';
import PageHeader from '../ui/PageHeader';
import { createProjectActionDirect } from '@/app/actions/projects';

interface ProjectItem {
  id: number | string;
  name: string;
  location: string;
  status: string;
  unitsTotal: number;
  unitsSold: number;
  progressPercent: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsOverviewProps {
  projects: ProjectItem[];
  isLoading: boolean;
  usingFallback: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectProject: (id: number | string) => void;
  onRefresh: () => void;
  hasPermission: (action: string) => boolean;
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

export default function ProjectsOverview({
  projects,
  isLoading,
  usingFallback,
  searchTerm,
  onSearchChange,
  onSelectProject,
  onRefresh,
  hasPermission,
  lang,
  isArabic,
}: ProjectsOverviewProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [newProjName, setNewProjName] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjUnits, setNewProjUnits] = useState(100);
  const [newProjDesc, setNewProjDesc] = useState('');
  const [phaseName, setPhaseName] = useState('');
  const [phaseStart, setPhaseStart] = useState('');
  const [phaseEnd, setPhaseEnd] = useState('');
  const [phaseProjectId, setPhaseProjectId] = useState<string>('');
  const [accountingCollected, setAccountingCollected] = useState(0);
  const [accountingOutstanding, setAccountingOutstanding] = useState(0);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnits = projects.reduce((s, p) => s + p.unitsTotal, 0);
  const totalSold = projects.reduce((s, p) => s + p.unitsSold, 0);
  const underConstruction = projects.filter(p => p.status === 'قيد الإنشاء').length;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('CREATE_PROJECT')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء مشروع عقاري.');
      return;
    }
    try {
      const res = await createProjectActionDirect({
        name: newProjName,
        city: newProjLocation,
        status: 'UNDER_CONSTRUCTION',
        unitsTotal: newProjUnits,
      });
      if (!res.success || !res.data) throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');
      toast.success('تم إنشاء المشروع بنجاح!');
      onRefresh();
    } catch (err: any) {
      toast.error('خطأ في إنشاء المشروع: ' + err.message);
    }
    setNewProjName('');
    setNewProjLocation('');
    setNewProjUnits(100);
    setNewProjDesc('');
    setActiveModal(null);
  };

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('ADD_PHASE')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإضافة مراحل تخطيطية.');
      return;
    }
    toast.success('تم إضافة المرحلة بنجاح!');
    setPhaseName('');
    setPhaseStart('');
    setPhaseEnd('');
    setPhaseProjectId('');
    setActiveModal(null);
  };

  const triggerPaymentSimulation = () => {
    const amount = 500000;
    setAccountingCollected(prev => prev + amount);
    setAccountingOutstanding(prev => Math.max(0, prev - amount));
    toast.success('تم استقبال إشعار مالي webhook بنجاح من المحاسبة! تم تحديث إجمالي المبالغ المحصلة بقيمة ٥٠٠,٠٠٠ ر.س.');
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isArabic ? 'إدارة المشاريع العقارية' : 'Real Estate Projects'}
        description={isArabic ? 'مراقبة حية لمشاريع البناء، مراحل التنفيذ، وأداء الوحدات العقارية' : 'Live monitoring of construction projects, phases, and property unit performance'}
      >
        {usingFallback && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
            <i className="ph-bold ph-warning-circle"></i>
            {isArabic ? 'بيانات تجريبية' : 'Mock Data'}
          </span>
        )}
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">إجمالي المشاريع</p>
              <h3 className="text-2xl font-black text-white">{projects.length}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-secondary)]">
              <Building2 size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">قيد الإنشاء</p>
              <h3 className="text-2xl font-black text-amber-400">{underConstruction}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Activity size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">إجمالي الوحدات</p>
              <h3 className="text-2xl font-black text-white">{totalUnits}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-secondary)]">
              <Landmark size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">وحدات مباعة</p>
              <h3 className="text-2xl font-black text-emerald-400">{totalSold}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Actions + Accounting */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="md:col-span-3">
          <Card className="p-5 h-full">
            <div className="flex items-center gap-3 h-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)]" />
                <input
                  placeholder="بحث بالمشروع أو الحي..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>
              <Button
                onClick={() => {
                  if (!hasPermission('CREATE_PROJECT')) {
                    toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء مشروع عقاري.');
                    return;
                  }
                  setActiveModal('new_project');
                }}
                className="whitespace-nowrap py-2 text-xs font-bold flex items-center gap-2 min-h-[44px]"
              >
                <Plus size={16} />
                مشروع عقاري جديد
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (!hasPermission('ADD_PHASE')) {
                    toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإضافة مراحل تخطيطية.');
                    return;
                  }
                  setActiveModal('new_phase');
                }}
                className="whitespace-nowrap py-2 text-xs font-bold flex items-center gap-2 min-h-[44px]"
              >
                <Calendar size={16} />
                إضافة مرحلة
              </Button>
            </div>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between gap-3 h-full">
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium text-[10px] font-bold">محصل (محاكاة)</p>
                <h3 className="text-lg font-black text-emerald-400">{accountingCollected.toLocaleString()} ر.س</h3>
                {accountingOutstanding > 0 && (
                  <p className="text-[10px] text-amber-400 font-medium">معلق: {accountingOutstanding.toLocaleString()} ر.س</p>
                )}
              </div>
              <button
                disabled={true}
                className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400/50 text-[11px] font-bold rounded-lg cursor-not-allowed shrink-0 min-h-[44px] flex items-center hidden"
              >
                <DollarSign size={14} className="inline ml-1" />
                محاكاة webhook (قيد التطوير)
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Project List */}
      <Card className="overflow-hidden border border-white/5">
        <div className="p-4 border-b border-[var(--nc-glass-border)] flex justify-between items-center">
          <h4 className="font-bold text-white">
            قائمة المشاريع العقارية
            {usingFallback && (
              <span className="mr-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                بيانات تجريبية
              </span>
            )}
          </h4>
          <span className="text-xs text-[var(--nc-text-dim)] font-medium">{filteredProjects.length} مشروع</span>
        </div>

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">جاري تحميل المشاريع...</span>
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="py-8 text-center text-xs text-[#C4D8E5] font-medium">لا توجد مشاريع عقارية مسجلة حالياً.</div>
        )}

        {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="py-8 text-center text-xs text-[#C4D8E5] font-medium">لا توجد نتائج للبحث المحدد.</div>
        )}

        {!isLoading && filteredProjects.length > 0 && (
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto custom-scrollbar">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>اسم المشروع</th>
                  <th>الموقع</th>
                  <th>الحالة</th>
                  <th>مبيعات الوحدات</th>
                  <th>تقدم التشييد</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--nc-accent-soft)] transition-colors group">
                    <td className="py-3 px-4 font-bold text-white text-xs">{p.name}</td>
                    <td className="py-3 px-4 text-xs text-[var(--nc-text-dim)]">
                      <div className="flex items-center gap-1.5"><MapPin size={11} />{p.location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'مكتمل' ? 'bg-emerald-500/25 text-emerald-400' : 'bg-amber-500/25 text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-bold text-white">{p.unitsSold}</span> / {p.unitsTotal} وحدة
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[var(--nc-surface-solid)] rounded-full h-1.5">
                          <div className="bg-[var(--nc-accent)] h-1.5 rounded-full" style={{ width: p.progressPercent + '%' }}></div>
                        </div>
                        <span className="text-[11px] font-bold text-[var(--nc-accent-text)]">{p.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent-text)] rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Eye size={12} />
                        استعراض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Project Modal */}
      {activeModal === 'new_project' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form
            onSubmit={handleCreateProject}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Building2 size={18} />
              إنشاء مشروع عقاري جديد
            </h3>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اسم المشروع:</label>
              <input
                type="text"
                required
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                placeholder="مثال: مشروع مجمع النخيل 6"
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">موقع المشروع (الحي، المدينة):</label>
              <input
                type="text"
                required
                value={newProjLocation}
                onChange={(e) => setNewProjLocation(e.target.value)}
                placeholder="مثال: النرجس، الرياض"
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">عدد الوحدات الإجمالي:</label>
              <input
                type="number"
                required
                value={newProjUnits}
                onChange={(e) => setNewProjUnits(Number(e.target.value))}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">وصف المشروع ومميزاته:</label>
              <textarea
                rows={3}
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
                placeholder="تفاصيل ترويجية وهندسية..."
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all">
                تأكيد الإنشاء
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Phase Modal */}
      {activeModal === 'new_phase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form
            onSubmit={handleAddPhase}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Calendar size={18} />
              إضافة مرحلة تنفيذية
            </h3>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">المشروع:</label>
              <select
                required
                value={phaseProjectId}
                onChange={(e) => setPhaseProjectId(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              >
                <option value="">-- اختر المشروع --</option>
                {projects.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اسم المرحلة:</label>
              <input
                type="text"
                required
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                placeholder="مثال: أعمال التمديدات والواجهات"
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">تاريخ بداية التنفيذ:</label>
              <input
                type="date"
                required
                value={phaseStart}
                onChange={(e) => setPhaseStart(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">تاريخ الانتهاء المتوقع:</label>
              <input
                type="date"
                required
                value={phaseEnd}
                onChange={(e) => setPhaseEnd(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={true} className="flex-1 py-2.5 bg-[#8EB1D1]/40 text-white/50 font-bold rounded-xl cursor-not-allowed">
                حفظ المرحلة التنفيذية (قريباً)
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
