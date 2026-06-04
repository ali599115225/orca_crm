'use client';
import React, { useState } from 'react';
import { TrendingUp, Users, Building2, Wallet, Send, Bot, Target, FileText, Key } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('عام');
  const [showOutput, setShowOutput] = useState(false);

  const workspaceTabs = [
    { name: 'عام', icon: Bot },
    { name: 'المبيعات', icon: TrendingUp },
    { name: 'الإيجارات', icon: Key },
    { name: 'التسويق', icon: Target },
    { name: 'التقارير', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. صف الكروت الإحصائية العلوية (Snapshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* كرت الإيرادات */}
        <div className="bg-[#042A44] backdrop-blur-md border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-400/30 transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-bl-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-white/60 text-sm font-medium">إجمالي المبيعات</p>
              <h3 className="text-2xl font-bold text-[#FFFFFF] mt-1">2.4M ر.س</h3>
            </div>
            <div className="p-2 bg-[#032238] rounded-lg text-cyan-400 border border-white/5">
              <Wallet size={20} />
            </div>
          </div>
          <div className="flex items-center text-sm relative z-10">
            <TrendingUp size={16} className="text-emerald-400 mr-1" />
            <span className="text-emerald-400 font-medium">+12.5%</span>
            <span className="text-white/50 mr-2">عن الشهر الماضي</span>
          </div>
        </div>

        {/* كرت العملاء المحتملين */}
        <div className="bg-[#042A44] backdrop-blur-md border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-blue-400/30 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-white/60 text-sm font-medium">العملاء النشطين</p>
              <h3 className="text-2xl font-bold text-[#FFFFFF] mt-1">1,245</h3>
            </div>
            <div className="p-2 bg-[#032238] rounded-lg text-blue-400 border border-white/5">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-center text-sm relative z-10">
            <TrendingUp size={16} className="text-emerald-400 mr-1" />
            <span className="text-emerald-400 font-medium">+5.2%</span>
            <span className="text-white/50 mr-2">معدل تحويل فوري</span>
          </div>
        </div>

        {/* كرت الأصول */}
        <div className="bg-[#042A44] backdrop-blur-md border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-purple-400/30 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-white/60 text-sm font-medium">الوحدات المتاحة</p>
              <h3 className="text-2xl font-bold text-[#FFFFFF] mt-1">84</h3>
            </div>
            <div className="p-2 bg-[#032238] rounded-lg text-purple-400 border border-white/5">
              <Building2 size={20} />
            </div>
          </div>
          <div className="w-full bg-[#032238] rounded-full h-1.5 mt-2 border border-white/5">
            <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-1.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        {/* كرت المهام */}
        <div className="bg-[#042A44] backdrop-blur-md border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-white/60 text-sm font-medium">حالة العمليات</p>
              <h3 className="text-2xl font-bold text-[#FFFFFF] mt-1">مستقرة</h3>
            </div>
            <div className="p-2 bg-[#032238] rounded-lg text-emerald-400 border border-white/5">
              <Bot size={20} />
            </div>
          </div>
          <div className="flex items-center text-sm relative z-10">
            <span className="text-emerald-400">ساهر يراقب المهام الخلفية</span>
          </div>
        </div>
      </div>

      {/* 2. مركز الذكاء الاصطناعي التكتيكي */}
      <div className="bg-[#042A44] border border-white/5 rounded-2xl flex flex-col shadow-2xl overflow-hidden h-[500px]">
        
        {/* شريط بيئة العمل التخصصية */}
        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-[#032238]/50 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-xs font-semibold text-white/50 ml-2 whitespace-nowrap">بيئة العمل:</span>
          {workspaceTabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.name 
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon size={14} />
              {tab.name}
            </button>
          ))}
          
          {/* زر تجريبي لإظهار/إخفاء المخرجات للتبديل الديناميكي */}
          <button 
            onClick={() => setShowOutput(!showOutput)}
            className="mr-auto px-3 py-1.5 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors whitespace-nowrap"
          >
            {showOutput ? 'إخفاء المخرجات' : 'محاكاة ظهور مخرج'}
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* مساحة النقاشات والبرومبت */}
          <div className={`flex flex-col h-full transition-all duration-500 ${showOutput ? 'w-1/2 border-l border-white/5' : 'w-full'}`}>
            
            {/* منطقة الرسائل */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-end [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div 
                className="w-full h-full flex flex-col justify-end space-y-4"
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 100%)' }}
              >
                
                <div className="flex items-start gap-3 opacity-40 transform -translate-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#032238] flex items-center justify-center shrink-0 border border-white/5">
                    <Bot size={16} className="text-white/40" />
                  </div>
                  <div className="bg-[#032238] border border-white/5 rounded-2xl rounded-tr-none p-3 text-sm text-white/50">
                    تم تحليل تقرير مبيعات الأمس، وتحديث حالة 5 عقود إلى "مكتمل".
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-lg bg-cyan-900/40 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <span className="text-xs text-cyan-200">ع.ز</span>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-tl-none p-3 text-sm text-cyan-50">
                    أعطني ملخصاً للمهام المتأخرة لهذا الأسبوع في قسم الإيجارات.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#032238] flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                    <Bot size={16} className="text-cyan-400" />
                  </div>
                  <div className="bg-[#032238] border border-white/10 rounded-2xl rounded-tr-none p-4 text-sm text-[#FFFFFF] shadow-lg">
                    <p>هناك 3 مهام متأخرة في قسم الإيجارات:</p>
                    <ul className="mt-2 space-y-1 text-white/70 list-disc list-inside">
                      <li>تجديد عقد الوحدة A-101 (شركة التقنية).</li>
                      <li>تحصيل دفعة الإيجار للوحدة B-205.</li>
                      <li>صيانة دورية مسجلة في المجمع السكني.</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>

            {/* حقل الإدخال */}
            <div className="p-4 bg-[#032238]/40 border-t border-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={`اكتب أمرك ضمن بيئة "${activeTab}"...`}
                  className="w-full bg-[#042A44] border border-white/10 focus:border-cyan-400/50 rounded-xl py-3.5 px-4 pr-12 text-sm text-[#FFFFFF] outline-none transition-all placeholder:text-white/30 shadow-inner"
                />
                <button className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white text-[#001F33] hover:bg-cyan-100 rounded-lg transition-colors shadow-sm">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* كرت مخرجات البرومبت */}
          {showOutput && (
            <div className="w-1/2 h-full flex flex-col bg-[#032238]/20 animate-in slide-in-from-left duration-300">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#032238]/40">
                <h3 className="font-semibold text-[#FFFFFF] text-sm flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  مخرجات الأوامر
                </h3>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">منجَز</span>
                  <button onClick={() => setShowOutput(false)} className="text-white/40 hover:text-white text-xs">إغلاق</button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="w-full p-4 border border-white/10 rounded-xl bg-[#042A44] shadow-inner text-sm text-white/80">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                    <span className="text-cyan-300 font-mono text-xs">تقرير_الإيجارات.csv</span>
                    <button className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">تحميل</button>
                  </div>
                  <p className="font-mono text-xs text-white/60 leading-loose">
                    ID,Unit,Tenant,Amount,Status<br/>
                    1,A-101,Tech Co,50000,Overdue<br/>
                    2,B-205,Khalid,25000,Overdue<br/>
                    3,C-302,Sami,30000,Paid
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
