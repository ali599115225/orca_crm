'use client';
import { toast } from '@/app/context/ToastContext';
import React, { useState, useTransition } from 'react';
import {
  Building2, Plus, Calendar, MapPin,
  FileText, CheckCircle2, Activity, DollarSign,
  FileCheck, Bot, CloudUpload, ArrowRight
} from 'lucide-react';
import { Button, Card } from '../ui/orca-components';
import { toggleUnitStatusAction } from '@/app/actions/projects';

interface ProjectDetailProps {
  project: any;
  phases: any[];
  units: any[];
  reports: any[];
  documents: any[];
  bookings: any[];
  accounting: any;
  hasPermission: (action: string) => boolean;
  onBack: () => void;
  lang: 'AR' | 'EN';
  isArabic: boolean;
  addTelemetryEvent: (type: string, projectId: number | string, payload?: any) => void;
}

export default function ProjectDetail({
  project,
  phases: initialPhases,
  units: initialUnits,
  reports: initialReports,
  documents: initialDocuments,
  bookings: initialBookings,
  accounting: initialAccounting,
  hasPermission,
  onBack,
  lang,
  isArabic,
  addTelemetryEvent,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [localPhases, setLocalPhases] = useState(initialPhases);
  const [localUnits, setLocalUnits] = useState(initialUnits);
  const [localReports, setLocalReports] = useState(initialReports);
  const [localDocs, setLocalDocs] = useState(initialDocuments);
  const [localBookings, setLocalBookings] = useState(initialBookings);
  const [localAccounting, setLocalAccounting] = useState(initialAccounting);

  const [phaseName, setPhaseName] = useState('');
  const [phaseStart, setPhaseStart] = useState('');
  const [phaseEnd, setPhaseEnd] = useState('');
  const [bookingUnitId, setBookingUnitId] = useState('');
  const [bookingLeadName, setBookingLeadName] = useState('');
  const [bookingPrice, setBookingPrice] = useState('');
  const [reportPhaseId, setReportPhaseId] = useState('');
  const [reportPercent, setReportPercent] = useState(30);
  const [reportNote, setReportNote] = useState('');
  const [reportMedia] = useState('https://assets.orca.pro/const/img.jpg');

  const isAllowed = (action: string) => hasPermission(action);

  const changeTab = (tabId: string) => {
    startTransition(() => setActiveTab(tabId));
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('CREATE_BOOKING')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
      return;
    }

    const unit = localUnits.find(u => u.id === bookingUnitId);
    if (!unit) return;

    const bkId = `bk_${Date.now()}`;
    const newBk = {
      id: bkId,
      unitNo: unit.no,
      leadName: bookingLeadName,
      price: Number(bookingPrice),
      date: new Date().toISOString().split('T')[0],
      contractId: `ct_${Date.now()}`
    };

    setLocalBookings(prev => [...prev, newBk]);
    setLocalUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: 'Sold' } : u));

    addTelemetryEvent('booking.created', project.id, {
      bookingId: bkId,
      unitId: unit.id,
      leadName: bookingLeadName,
      price: Number(bookingPrice)
    });

    setBookingUnitId('');
    setBookingLeadName('');
    setBookingPrice('');
    setActiveModal(null);
  };

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('ADD_PHASE')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإضافة مراحل تخطيطية.');
      return;
    }

    const newPh = {
      id: `ph_${Date.now()}`,
      name: phaseName,
      startAt: phaseStart,
      endAt: phaseEnd,
      status: 'مخطط لها'
    };

    setLocalPhases(prev => [...prev, newPh]);
    addTelemetryEvent('phase.created', project.id, newPh);

    setPhaseName('');
    setPhaseStart('');
    setPhaseEnd('');
    setActiveModal(null);
  };

  const handlePostReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('POST_PROGRESS')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لرفع تقارير إنشائية.');
      return;
    }

    const phase = localPhases.find(p => p.id === reportPhaseId);
    const phaseTitle = phase ? phase.name : 'مرحلة عامة';

    const newRep = {
      id: `rep_${Date.now()}`,
      phaseName: phaseTitle,
      progressPercent: Number(reportPercent),
      date: new Date().toISOString().split('T')[0],
      note: reportNote
    };

    setLocalReports(prev => [newRep, ...prev]);

    if (Number(reportPercent) >= 100) {
      setLocalPhases(prev => prev.map(ph => ph.id === reportPhaseId ? { ...ph, status: 'مكتملة' } : ph));
    } else {
      setLocalPhases(prev => prev.map(ph => ph.id === reportPhaseId ? { ...ph, status: 'قيد التنفيذ' } : ph));
    }

    addTelemetryEvent('construction.reported', project.id, {
      reportId: newRep.id,
      progressPercent: reportPercent,
      mediaUrls: [reportMedia]
    });

    setReportPhaseId('');
    setReportPercent(30);
    setReportNote('');
    setActiveModal(null);
  };

  const handleUploadDoc = () => {
    const docId = `doc-ref-${Date.now().toString().slice(-4)}`;
    const newD = {
      id: `doc_${Date.now()}`,
      name: 'مخطط التوزيع الداخلي الجديد.pdf',
      category: 'مخططات هندسية',
      documentId: docId
    };

    setLocalDocs(prev => [...prev, newD]);
    addTelemetryEvent('document.uploaded', project.id, newD);
    toast.success(`تم رفع الملف بنجاح وإصدار المعرف السحابي الموحد: ${docId}`);
    setActiveModal(null);
  };

  const triggerPaymentReceivedSimulation = () => {
    const amount = 500000;

    setLocalAccounting((prev: { contractsTotal: number; collected: number; outstanding: number }) => ({
      ...prev,
      collected: prev.collected + amount,
      outstanding: Math.max(0, prev.outstanding - amount)
    }));

    addTelemetryEvent('payment.received', project.id, {
      amountSar: amount,
      paymentMethod: 'MADA',
      contractId: 'ct_101',
      description: 'دفعة سداد من العميل تم استلامها بالربط مع المحاسبة'
    });

    toast.success('تم استقبال إشعار مالي webhook بنجاح من المحاسبة! تم تحديث إجمالي المبالغ المحصلة بقيمة ٥٠٠,٠٠٠ ر.س.');
  };

  return (
    <div className="space-y-6">
      {/* Return link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#8EB1D1] hover:text-[#A7C7E7] font-bold transition-colors cursor-pointer"
      >
        <ArrowRight size={14} />
        العودة لقائمة المشاريع العقارية
      </button>

      {/* Project Hero Details Panel */}
      <div className="bg-[#1C2B48] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white">{project?.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                project?.status === 'مكتمل'
                  ? 'bg-emerald-500/25 text-emerald-400'
                  : 'bg-amber-500/25 text-amber-400'
              }`}>
                {project?.status}
              </span>
            </div>
            <p className="text-xs text-[#C4D8E5] font-medium mt-1.5">الموقع: {project?.location} | الرقم التعريفي: PRJ-00{project?.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon={Plus}
              onClick={() => {
                if (!isAllowed('CREATE_BOOKING')) {
                  toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
                  return;
                }
                setActiveModal('new_booking');
              }}
            >
              إنشاء حجز
            </Button>
            <Button
              variant="secondary"
              icon={CloudUpload}
              onClick={() => {
                if (!isAllowed('UPLOAD_DOC')) {
                  toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لرفع مستندات.');
                  return;
                }
                setActiveModal('upload_doc');
              }}
            >
              رفع مخطط هندسي
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-[#1C2B48] border border-white/5 rounded-3xl p-6 shadow-xl">
        {/* Tabs Bar */}
        <div className="flex flex-wrap gap-2 border-b border-[#A7C7E7]/20 pb-3 mb-6">
          {[
            { id: 'overview', name: 'نظرة عامة' },
            { id: 'phases', name: 'المراحل والتخطيط' },
            { id: 'units', name: 'إدارة الوحدات' },
            { id: 'construction', name: 'تقدّم الإنشاء' },
            { id: 'handover', name: 'التسليم والاستلام' },
            { id: 'sales', name: 'المبيعات والحجوزات' },
            { id: 'documents', name: 'المستندات والوسائط' },
            { id: 'reports', name: 'التقارير ولوحات الأداء' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#8EB1D1] text-white shadow-sm'
                  : 'bg-[#1C2B48]/50 text-[#C4D8E5] font-medium hover:text-white border border-white/5'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#8EB1D1] border-t-transparent animate-spin"></div>
            <span className="text-xs text-[#C4D8E5] font-medium">جاري تحميل بيانات التبويب...</span>
          </div>
        ) : (
          <div className="tab-view-pane">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">نبذة تفصيلية عن المشروع</h3>
                  <p className="text-xs text-[#C4D8E5] font-medium leading-relaxed bg-[#1C2B48]/45 p-4 rounded-xl border border-white/5">{project?.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-[#1C2B48]/50 border border-white/5 p-4 rounded-2xl">
                    <span className="text-[11px] text-[#C4D8E5] font-medium">إجمالي الوحدات السكنية</span>
                    <h2 className="text-2xl font-black text-white mt-1">{project?.unitsTotal} وحدة</h2>
                  </Card>
                  <Card className="bg-[#1C2B48]/50 border border-white/5 p-4 rounded-2xl">
                    <span className="text-[11px] text-[#C4D8E5] font-medium">الوحدات المحجوزة والمباعة</span>
                    <h2 className="text-2xl font-black text-[#8EB1D1] mt-1">{project?.unitsSold} وحدة</h2>
                  </Card>
                  <Card className="bg-[#1C2B48]/50 border border-white/5 p-4 rounded-2xl">
                    <span className="text-[11px] text-[#C4D8E5] font-medium">نسبة تقدم التشييد المالي والخرساني</span>
                    <h2 className="text-2xl font-black text-cyan-400 mt-1">{project?.progressPercent}%</h2>
                  </Card>
                </div>

                <div className="flex items-start gap-3 bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-2xl text-xs text-cyan-100">
                  <Bot size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">رؤى AI منصور:</span>
                    <p className="text-[11px] text-cyan-300/80 mt-1 leading-relaxed">
                      يسير هذا المشروع بمعدل بيع متناسق (تبلغ نسبة الإشغال حالياً {Math.round((project?.unitsSold || 0) / (project?.unitsTotal || 1) * 100)}%).
                      يوصى بالبدء في التخطيط لإطلاق المرحلة الثانية من تشطيبات الواجهات الخارجية للتأكد من مواكبة تسليم الوحدات.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Phases & Planning */}
            {activeTab === 'phases' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">مراحل التنفيذ والتخطيط الهندسي</h3>
                  <button
                    onClick={() => {
                      if (!isAllowed('ADD_PHASE')) {
                        toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإضافة مراحل تخطيطية.');
                        return;
                      }
                      setActiveModal('new_phase');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8EB1D1]/10 hover:bg-[#8EB1D1]/20 border border-[#8EB1D1]/30 text-[#8EB1D1] text-xs font-bold rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    إضافة مرحلة تنفيذية
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-[#A7C7E7]/20 text-[#C4D8E5] font-medium text-xs font-bold">
                        <th className="pb-3">المرحلة</th>
                        <th className="pb-3">تاريخ البداية</th>
                        <th className="pb-3">تاريخ النهاية المتوقع</th>
                        <th className="pb-3 text-left">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localPhases.map((ph, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-xs">
                          <td className="py-3 text-white font-bold">{ph.name}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{ph.startAt}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{ph.endAt}</td>
                          <td className="py-3 text-left">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ph.status === 'مكتملة'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : ph.status === 'قيد التنفيذ'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-[#1C2B48] text-[#C4D8E5] font-medium'
                            }`}>
                              {ph.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {localPhases.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#C4D8E5] font-medium">لا توجد مراحل تخطيطية مسجلة بعد.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Unit Management */}
            {activeTab === 'units' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">سجل الوحدات (Inventory)</h3>
                  <p className="text-xs text-[#C4D8E5] font-medium">إجمالي الوحدات المدرجة: {localUnits.length} وحدات</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-[#A7C7E7]/20 text-[#C4D8E5] font-medium text-xs font-bold">
                        <th className="pb-3">رقم الوحدة</th>
                        <th className="pb-3">نوع الوحدة</th>
                        <th className="pb-3">المساحة الإجمالية</th>
                        <th className="pb-3">السعر الافتراضي</th>
                        <th className="pb-3">الحالة البيعية</th>
                        <th className="pb-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localUnits.map((u, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-xs hover:bg-white/5 transition-colors">
                          <td className="py-3 text-white font-bold">{u.no}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{u.type}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{u.area}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium font-bold">{u.price.toLocaleString()} ر.س</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status === 'Available'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : u.status === 'Hold'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {u.status === 'Available' ? 'متاحة' : u.status === 'Hold' ? 'محجوزة مؤقتاً' : 'مباعة'}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {u.status !== 'Sold' && (
                              <button
                                onClick={async () => {
                                  if (!isAllowed('UPDATE_UNIT')) {
                                    toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لتغيير حالة الوحدة.');
                                    return;
                                  }
                                  try {
                                    const res = await toggleUnitStatusAction(u.id, u.status);
                                    if (res.success && res.status) {
                                      setLocalUnits(prev => prev.map(item => item.id === u.id ? { ...item, status: res.status } : item));
                                      addTelemetryEvent('unit.status_changed', project.id, { unitId: u.id, unitNo: u.no, previousStatus: u.status, newStatus: res.status });
                                    } else {
                                      toast.error('فشل تعديل حالة الوحدة في قاعدة البيانات: ' + (res.error || 'خطأ غير معروف'));
                                    }
                                  } catch (err: any) {
                                    toast.error('خطأ أثناء تعديل حالة الوحدة: ' + err.message);
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#1C2B48] border border-white/10 hover:border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded text-[10px] font-bold transition-all"
                              >
                                {u.status === 'Available' ? 'حجز مؤقت' : 'إلغاء الحجز'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {localUnits.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-[#C4D8E5] font-medium">لا توجد وحدات عقارية مدخلة لهذا المشروع.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Construction Progress */}
            {activeTab === 'construction' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">تقارير الإنجاز الإنشائي الموقعية</h3>
                  <button
                    onClick={() => {
                      if (!isAllowed('POST_PROGRESS')) {
                        toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لرفع تقارير إنشائية.');
                        return;
                      }
                      setActiveModal('new_report');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8EB1D1]/10 hover:bg-[#8EB1D1]/20 border border-[#8EB1D1]/30 text-[#8EB1D1] text-xs font-bold rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    تسجيل تقرير موقعي
                  </button>
                </div>

                <div className="space-y-4">
                  {localReports.map((rep, idx) => (
                    <div key={idx} className="bg-[#1C2B48]/40 border border-white/5 p-4 rounded-2xl text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#8EB1D1]">{rep.phaseName}</span>
                        <span className="text-[10px] text-[#C4D8E5] font-medium">{rep.date}</span>
                      </div>
                      <p className="text-[#C4D8E5] font-medium leading-relaxed">{rep.note}</p>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[#C4D8E5] font-medium">
                          <Activity size={13} className="text-cyan-400" />
                          <span>نسبة الإنجاز:</span>
                          <span className="font-bold text-white">{rep.progressPercent}%</span>
                        </div>
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                          صورة موثقة سحابياً
                        </span>
                      </div>
                    </div>
                  ))}
                  {localReports.length === 0 && (
                    <div className="py-6 text-center text-[#C4D8E5] font-medium text-xs">لا توجد تقارير موثقة للإنجاز الموقعي حالياً.</div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Delivery & Handover */}
            {activeTab === 'handover' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white mb-2">مواعيد تسليم الوحدات وجداول العيوب (Handover)</h3>
                <div className="bg-[#1C2B48]/45 p-4 rounded-xl border border-white/5 text-xs text-[#C4D8E5] font-medium space-y-3">
                  <p>يتم هنا إدراج الوحدات التي اقترب موعد تسليمها للعميل ومراجعة العيوب وتسوية الاستلام النهائي.</p>
                  <div className="border-t border-[#A7C7E7]/20 pt-3">
                    <h4 className="font-bold text-white mb-2">جدول التسليم الحالي:</h4>
                    <div className="p-3 bg-[#1C2B48]/60 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-200">موعد معاينة الوحدة B-201 للعميل عبد الرحمن الشمري</p>
                        <span className="text-[10px] text-[#C4D8E5] font-medium">التاريخ: 2026-07-01 · الوقت: 10:00 ص</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold">
                        مجدول ومعتمد
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Sales & Bookings */}
            {activeTab === 'sales' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">سجل المبيعات والعقود والملخصات</h3>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/20">
                    مؤمن بالكامل عبر خدمة المحاسبة (Accounting proxy)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-[#A7C7E7]/20 text-[#C4D8E5] font-medium text-xs font-bold">
                        <th className="pb-3">رقم الوحدة</th>
                        <th className="pb-3">اسم المشتري (Lead)</th>
                        <th className="pb-3">قيمة التعاقد</th>
                        <th className="pb-3">تاريخ الحجز</th>
                        <th className="pb-3 text-center">مرجع العقد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localBookings.map((bk, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-xs">
                          <td className="py-3 text-white font-bold">{bk.unitNo}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{bk.leadName}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium font-bold">{bk.price.toLocaleString()} ر.س</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{bk.date}</td>
                          <td className="py-3 text-center text-cyan-400 font-mono text-[10px]">
                            {bk.contractId}
                          </td>
                        </tr>
                      ))}
                      {localBookings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#C4D8E5] font-medium text-xs">لا توجد عمليات بيع أو حجز مسجلة لهذا المشروع.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 7: Documents & Media */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white mb-2">مستندات وتراخيص المشروع المعتمدة</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-[#A7C7E7]/20 text-[#C4D8E5] font-medium text-xs font-bold">
                        <th className="pb-3">اسم الملف</th>
                        <th className="pb-3">التصنيف</th>
                        <th className="pb-3 text-center">الرقم المرجعي (documentId)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localDocs.map((doc, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-xs">
                          <td className="py-3 text-white font-bold">{doc.name}</td>
                          <td className="py-3 text-[#C4D8E5] font-medium">{doc.category}</td>
                          <td className="py-3 text-center text-[#8EB1D1] font-mono text-[10px]">
                            {doc.documentId}
                          </td>
                        </tr>
                      ))}
                      {localDocs.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-[#C4D8E5] font-medium text-xs">لا توجد مستندات مرفوعة بعد.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 8: Reports & Performance */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-white">لوحة قياس الأداء المالي والتشغيلي (KPIs)</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-[#1C2B48]/40 border border-white/5 p-5 rounded-2xl text-xs space-y-4">
                    <h4 className="font-bold text-[#C4D8E5] font-medium border-b border-[#A7C7E7]/20 pb-2">معدل الإشغال البيعي للمشروع</h4>
                    <div className="flex items-center justify-between">
                      <span>الوحدات المباعة:</span>
                      <span className="font-bold text-[#8EB1D1]">{project?.unitsSold} وحدة</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>الوحدات المتاحة:</span>
                      <span className="font-bold text-white">{(project?.unitsTotal || 0) - (project?.unitsSold || 0)} وحدة</span>
                    </div>
                    <div className="w-full bg-[#1C2B48] rounded-full h-2 border border-white/5">
                      <div
                        className="bg-[#8EB1D1] h-2 rounded-full"
                        style={{ width: `${Math.round((project?.unitsSold || 0) / (project?.unitsTotal || 1) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-[#C4D8E5] font-medium">تم بيع ما يقارب {Math.round((project?.unitsSold || 0) / (project?.unitsTotal || 1) * 100)}% من مخزون الوحدات الكلي للمشروع.</p>
                  </Card>

                  <Card className="bg-[#1C2B48]/40 border border-white/5 p-5 rounded-2xl text-xs space-y-4">
                    <h4 className="font-bold text-[#C4D8E5] font-medium border-b border-[#A7C7E7]/20 pb-2">إجمالي التدفق المالي الافتراضي</h4>
                    <div className="flex items-center justify-between">
                      <span>إجمالي حجم التعاقدات:</span>
                      <span className="font-bold text-white">{localAccounting.contractsTotal.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>التدفق المحصل (Collected):</span>
                      <span className="font-bold text-emerald-400">{localAccounting.collected.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>المبالغ المعلقة (Outstanding):</span>
                      <span className="font-bold text-amber-500">{localAccounting.outstanding.toLocaleString()} ر.س</span>
                    </div>
                    <button
                      disabled={true}
                      className="w-full py-2 mt-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400/50 text-xs font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <DollarSign size={14} />
                      محاكاة استلام دفعة مالية (قريباً)
                    </button>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal 1: New Booking Form ── */}
      {activeModal === 'new_booking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form
            onSubmit={handleCreateBooking}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              حجز وحدة سكنية جديدة
            </h3>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اختر الوحدة المتاحة:</label>
              <select
                required
                value={bookingUnitId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setBookingUnitId(uid);
                  const unitObj = localUnits.find(u => u.id === uid);
                  if (unitObj) setBookingPrice(String(unitObj.price));
                }}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              >
                <option value="">-- اختر الوحدة --</option>
                {localUnits
                  .filter(u => u.status === 'Available')
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.no} ({u.type} - {u.area})</option>
                  ))
                }
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اسم المشتري (Lead):</label>
              <input
                type="text"
                required
                value={bookingLeadName}
                onChange={(e) => setBookingLeadName(e.target.value)}
                placeholder="اسم العميل الرباعي..."
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">القيمة التعاقدية (ر.س):</label>
              <input
                type="number"
                required
                value={bookingPrice}
                onChange={(e) => setBookingPrice(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={true}
                className="flex-1 py-2.5 bg-[#8EB1D1]/40 text-white/50 font-bold rounded-xl cursor-not-allowed"
              >
                حفظ الحجز وإصدار العقد (قريباً)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 2: New Phase Form ── */}
      {activeModal === 'new_phase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form
            onSubmit={handleAddPhase}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Calendar size={18} />
              إضافة مرحلة تنفيذية للمشروع
            </h3>

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
              <button
                type="submit"
                disabled={true}
                className="flex-1 py-2.5 bg-[#8EB1D1]/40 text-white/50 font-bold rounded-xl cursor-not-allowed"
              >
                حفظ المرحلة التنفيذية (قريباً)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 3: New Construction Progress Report ── */}
      {activeModal === 'new_report' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form
            onSubmit={handlePostReport}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Activity size={18} />
              تسجيل تقرير إنجاز موقعي
            </h3>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اختر المرحلة الجاري تنفيذها:</label>
              <select
                required
                value={reportPhaseId}
                onChange={(e) => setReportPhaseId(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              >
                <option value="">-- اختر المرحلة --</option>
                {localPhases
                  .filter(ph => ph.status !== 'مكتملة')
                  .map(ph => (
                    <option key={ph.id} value={ph.id}>{ph.name} ({ph.status})</option>
                  ))
                }
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">نسبة تقدم الإنجاز (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={reportPercent}
                onChange={(e) => setReportPercent(Number(e.target.value))}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">ملاحظات التقرير والمطابقة:</label>
              <textarea
                rows={3}
                required
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="ملاحظات مهندس الموقع العقاري والتوريد..."
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={true}
                className="flex-1 py-2.5 bg-[#8EB1D1]/40 text-white/50 font-bold rounded-xl cursor-not-allowed"
              >
                تسجيل التقرير (قريباً)
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 4: Upload Document Form ── */}
      {activeModal === 'upload_doc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs">
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <CloudUpload size={18} />
              رفع مخطط / رخصة سحابية
            </h3>

            <p className="text-[#C4D8E5] font-medium">سيتم رفع الملف المختار مباشرة لمستودع المستندات المركزي للشركة وإصدار رقم مرجعي (documentId) فريد لربطه بالمشروع الحالي.</p>

            <div className="p-6 bg-[#1C2B48] border-2 border-dashed border-white/10 hover:border-[#8EB1D1]/40 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
              <CloudUpload size={24} className="text-[#8EB1D1]" />
              <span className="text-[10px] text-[#C4D8E5] font-medium">اختر ملفاً بصيغة PDF, JPG, PNG أو ZIP لسحبه هنا</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={true}
                className="flex-1 py-2.5 bg-[#8EB1D1]/40 text-white/50 font-bold rounded-xl cursor-not-allowed"
              >
                محاكاة رفع ملف (قريباً)
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-[var(--nc-surface)] text-[#C4D8E5] font-medium rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
