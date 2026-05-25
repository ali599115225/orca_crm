// app/operations/calculator/page.tsx
'use client';

import React, { useState } from 'react';

// البنوك السعودية ونسب الأرباح الرسمية وعروضها الحصرية لعام 2026
const BANK_DATA: Record<string, { name: string; apr: number; promo: string }> = {
  alrajhi: { name: 'مصرف الراجحي', apr: 3.90, promo: 'عرض التمويل المرن بهامش ربح تنافسي مع دعم الإسكان' },
  snb: { name: 'البنك الأهلي السعودي (SNB)', apr: 4.10, promo: 'خصم خاص 0.25% لموظفي القطاع الحكومي المعتمد' },
  riyad: { name: 'بنك الرياض', apr: 4.20, promo: 'برنامج الإعفاء المبتدئ وإمكانية دمج الدعم السكني بالكامل' },
  alinma: { name: 'مصرف الإنماء', apr: 3.85, promo: 'منتج الإجارة المرنة والاعتماد الفوري لفلل الخارطة' },
  sab: { name: 'البنك السعودي الأول (SAB)', apr: 4.30, promo: 'بدون رسوم إدارية وعروض حصرية على الفلل الصديقة للبيئة' },
  albilad: { name: 'بنك البلاد', apr: 4.05, promo: 'التمويل العقاري بدون دفعة أولى للمستفيدين المؤهلين لسكني' },
  bsf: { name: 'البنك السعودي الفرنسي (BSF)', apr: 4.45, promo: 'الحصول على تمويل إضافي شخصي وعقاري بالتزامن' },
  anb: { name: 'البنك العربي الوطني (ANB)', apr: 4.50, promo: 'تأمين تعاوني كامل ضد العجز أو الأضرار الهيكلية مجاناً' },
  aljazira: { name: 'بنك الجزيرة', apr: 4.15, promo: 'تمويل ملاك الصف الثاني لشراء الوحدات السكنية الجاهزة' },
  saib: { name: 'البنك السعودي للاستثمار (SAIB)', apr: 4.35, promo: 'عروض حصرية للعملاء المحولين مع إسقاط الدفعة الأولى' },
};

// جهات العمل والحد الأقصى للاستقطاع المتوافق معها SAMA DSR
const EMPLOYER_TYPES: Record<string, { label: string; maxDsr: number }> = {
  gov_civil: { label: 'حكومي - مدني', maxDsr: 55 },
  gov_military: { label: 'حكومي - عسكري', maxDsr: 55 },
  private: { label: 'قطاع خاص معتمد', maxDsr: 50 },
  retired: { label: 'متقاعد', maxDsr: 60 },
  freelance: { label: 'أعمال حرة / مستقل (وثيقة العمل الحر)', maxDsr: 45 },
};

export default function MortgageCalculatorPage() {
  const [propertyPrice, setPropertyPrice] = useState<number>(1200000); // 1.2 مليون ر.س
  const [salary, setSalary] = useState<number>(15000); // 15 ألف ر.س
  const [downPayment, setDownPayment] = useState<number>(120000); // 10% دفعة أولى
  const [years, setYears] = useState<number>(20); // مدة التمويل
  const [selectedBank, setSelectedBank] = useState<string>('alrajhi');
  const [employer, setEmployer] = useState<string>('gov_civil');
  const [hasSakani, setHasSakani] = useState<boolean>(true);

  // خيارات متقدمة جديدة
  const [existingCommitments, setExistingCommitments] = useState<number>(0); // التزامات شهرية قائمة
  const [salaryTransfer, setSalaryTransfer] = useState<boolean>(true); // تحويل الراتب للبنك
  const [developerOffer, setDeveloperOffer] = useState<boolean>(false); // تفعيل العرض الخاص لشركتكم

  // تاريخ الميلاد
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(1995);

  // حساب العمر
  const calculateAgeDetails = () => {
    const today = new Date();
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    let ageMonths = today.getMonth() - birthDate.getMonth();
    let ageDays = today.getDate() - birthDate.getDate();

    if (ageMonths < 0 || (ageMonths === 0 && ageDays < 0)) {
      ageYears--;
      ageMonths += 12;
    }
    if (ageDays < 0) {
      const prevMonthLastDate = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      ageDays += prevMonthLastDate;
      ageMonths--;
    }
    return { years: ageYears, months: ageMonths, days: ageDays };
  };

  const ageDetails = calculateAgeDetails();

  // حساب ضوابط التمويل والاستقطاع لجهة العمل والبنك المختار
  const bank = BANK_DATA[selectedBank] || BANK_DATA.alrajhi;
  const employerConfig = EMPLOYER_TYPES[employer] || EMPLOYER_TYPES.gov_civil;
  const maxDsrLimit = employerConfig.maxDsr;
  const monthlySalaryLimit = salary * (maxDsrLimit / 100); // القسط الأقصى المسموح به

  // حساب نسبة الربح الفعلية بناءً على الخيارات المتقدمة
  let finalApr = bank.apr;
  if (!salaryTransfer) finalApr += 0.75; // زيادة 0.75% في حال عدم تحويل الراتب
  if (developerOffer) finalApr -= 0.50; // خصم خاص 0.50% كشراكة مع المطور (شركتكم)

  // حساب مبلغ التمويل المطلوب
  const loanRequired = Math.max(0, propertyPrice - downPayment);

  // حساب القسط الشهري (المرابحة)
  const totalProfitPercentage = (finalApr / 100) * years;
  const totalProfit = loanRequired * totalProfitPercentage;
  const totalLoanWithProfit = loanRequired + totalProfit;
  const totalMonths = years * 12;
  const monthlyInstallmentRaw = totalMonths > 0 ? totalLoanWithProfit / totalMonths : 0;

  // الدعم السكني المقدر
  const monthlySakaniSupport = hasSakani && salary <= 15000 ? 500 : hasSakani ? 350 : 0;
  const netMonthlyInstallment = Math.max(0, monthlyInstallmentRaw - monthlySakaniSupport);

  // إجمالي الالتزامات الشهرية بعد التمويل (قسط التمويل الجديد + الالتزامات القديمة)
  const totalMonthlyCommitments = monthlyInstallmentRaw + existingCommitments;
  const actualDsrPercentage = salary > 0 ? (totalMonthlyCommitments / salary) * 100 : 0;

  // إجمالي تكلفة العقار
  const totalPropertyCost = totalLoanWithProfit + downPayment;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full border border-amber-500/20">
          محاكاة التمويل المتقدمة للبنوك السعودية لعام 2026 🇸🇦
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">حاسبة التمويل العقاري الشاملة (الخيارات المتقدمة)</h1>
        <p className="text-gray-500 text-sm mt-1">
          لوحة استشارية تفصيلية لحساب الالتزامات القائمة، عروض الخصومات الحصرية للمطور، وفحص متطلبات الـ DSR الموحدة [1, 2]
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* مدخلات الحسبة المالية بالتفصيل */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">بيانات الحسبة والخيارات المتقدمة</h3>
          
          <div className="space-y-4">
            {/* سعر العقار والدفعة الأولى */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">سعر العقار (ر.س) *</label>
                <input 
                  type="number" 
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">الدفعة الأولى (ر.س) *</label>
                <input 
                  type="number" 
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>
            </div>

            {/* تاريخ الميلاد تفصيلياً */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">تاريخ ميلاد العميل (بالتفصيل) *</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <select 
                    value={birthDay} 
                    onChange={(e) => setBirthDay(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs bg-slate-50 cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <select 
                    value={birthMonth} 
                    onChange={(e) => setBirthMonth(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs bg-slate-50 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={birthYear} 
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs bg-slate-50 cursor-pointer"
                  >
                    {Array.from({ length: 65 }, (_, i) => (
                      <option key={1950 + i} value={1950 + i}>{1950 + i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* الراتب السنوي وجهة العمل */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">الراتب الشهري (ر.س) *</label>
                <input 
                  type="number" 
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">جهة العمل *</label>
                <select 
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  {Object.entries(EMPLOYER_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* التزامات العميل الحالية (مثل السيارات أو القروض الشخصية) */}
            <div>
              <label className="block text-[10px] font-bold text-rose-600 mb-1">إجمالي التزامات العميل الحالية شهرياً (ر.س) ⚠️</label>
              <input 
                type="number" 
                value={existingCommitments}
                onChange={(e) => setExistingCommitments(Number(e.target.value))}
                className="w-full border border-rose-200 bg-rose-50/10 rounded-lg p-2 text-xs text-rose-700 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="قسط سيارة، قرض شخصي سابق..."
              />
            </div>

            {/* جهة التمويل (جميع البنوك السعودية) وعدد السنوات */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">البنك الممول *</label>
                <select 
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs font-semibold text-slate-800"
                >
                  {Object.entries(BANK_DATA).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">مدة التمويل *</label>
                <select 
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  <option value={10}>10 سنوات</option>
                  <option value={15}>15 سنة</option>
                  <option value={20}>20 سنة</option>
                  <option value={25}>25 سنة</option>
                </select>
              </div>
            </div>

            {/* خيارات حصرية ومتقدمة */}
            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={salaryTransfer}
                  onChange={(e) => setSalaryTransfer(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <span>تفعيل خيار (تحويل الراتب للبنك الممول)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={developerOffer}
                  onChange={(e) => setDeveloperOffer(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <span className="text-amber-600 font-black">تطبيق العرض الحصري لمشروعنا (-0.5%)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={hasSakani}
                  onChange={(e) => setHasSakani(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <span>العميل مستحق للدعم السكني المحدث</span>
              </label>
            </div>
          </div>
        </div>

        {/* مخرجات الحسبة والنتائج التفصيلية ومطابقة SAMA */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* كروت تفاصيل الأقساط والدعم والعمر المحسوب */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* العمر المحسوب تفصيلياً */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">عمر العميل الحالي</p>
                <p className="text-xl font-black text-slate-800 mt-2">
                  {ageDetails.years} سنة
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  و {ageDetails.months} شهر و {ageDetails.days} يوم
                </p>
              </div>
              <span className="text-[9px] text-slate-400 block mt-2 border-t pt-2">
                سنة الميلاد: {birthYear}
              </span>
            </div>

            {/* قسط التمويل الأصلي */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">القسط الشهري قبل الدعم</p>
                <p className="text-xl font-black text-slate-800 mt-2">
                  {Math.round(monthlyInstallmentRaw).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <span className="text-[9px] text-slate-400 block mt-2 border-t pt-2">
                معدل الأرباح الفعلي: <span className="font-bold text-emerald-600">{finalApr.toFixed(2)}%</span>
              </span>
            </div>

            {/* قسط بعد دعم سكني */}
            <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 font-bold text-[8px] px-3 py-1 rounded-br-lg">
                صافي بعد الدعم
              </span>
              <div>
                <p className="text-[10px] text-amber-800 font-bold">صافي القسط بعد الدعم السكني</p>
                <p className="text-xl font-black text-amber-600 mt-2">
                  {Math.round(netMonthlyInstallment).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <p className="text-[9px] text-amber-700 font-bold mt-2 border-t border-amber-500/10 pt-2">
                {hasSakani ? `خصم دعم شهري بقيمة ${monthlySakaniSupport} ر.س` : 'لا يوجد دعم'}
              </p>
            </div>

          </div>

          {/* العرض البنكي المختار بالتفصيل */}
          <div className="bg-amber-500/5 border border-amber-400/20 rounded-2xl p-5 space-y-2">
            <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5">
              <span>🎁 العرض والمزايا النشطة لـ {bank.name} حالياً:</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              {bank.promo}
            </p>
            {developerOffer && (
              <p className="text-[10px] text-emerald-700 font-bold">
                ✔ تم دمج وتطبيق الخصم الحصري الخاص بـ شركة دار الأعمار بمعدل (-0.50%) لمشروعكم السكني بنجاح!
              </p>
            )}
          </div>

          {/* تفاصيل المطابقة وفحص الضوابط SAMA DSR */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">فحص مطابقة لوائح مؤسسة النقد للبنوك السعودية (SAMA DSR)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>سعر العقار المستهدف:</span>
                  <span className="font-bold text-slate-800">{propertyPrice.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>الدفعة الأولى المدفوعة:</span>
                  <span className="font-bold text-slate-800">{downPayment.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>الالتزامات السابقة القائمة:</span>
                  <span className="font-bold text-rose-600">{existingCommitments.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between border-t pt-2.5">
                  <span>إجمالي تكلفة العقار بتمويل البنك:</span>
                  <span className="font-bold text-amber-600">{Math.round(totalPropertyCost).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>نسبة الاستقطاع الكلي (التمويل الجديد + الالتزامات):</span>
                    <span className={actualDsrPercentage > maxDsrLimit ? 'text-rose-600' : 'text-emerald-600'}>
                      {Math.round(actualDsrPercentage)}% 
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${actualDsrPercentage > maxDsrLimit ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(Math.round(actualDsrPercentage), 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    الحد الأقصى للاستقطاع الكلي لجهة العمل ({employerConfig.label}) هو {maxDsrLimit}% [2]
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  {actualDsrPercentage <= maxDsrLimit ? (
                    <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                      ✔ الحسبة متوافقة تماماً! إجمالي الاستقطاع بدمج التزامات العميل السابقة لا يتجاوز النسبة المقررة للبنك المركزي السعودي ({maxDsrLimit}%) [2].
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-800 font-bold leading-relaxed">
                      ⚠️ تعذر المطابقة! التزامات العميل السابقة مع القسط الجديد تتجاوز حد الاستقطاع SAMA ({maxDsrLimit}%). يجب تقليل مبلغ التمويل أو جدولة الالتزامات الأخرى لتمرير المعاملة [2].
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* لوحة مقارنة سريعة لأقساط البنوك (Live Banks Comparison) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm pb-4">مفارقة حية لأقساط أهم البنوك لشركتك</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(BANK_DATA).slice(0, 3).map(([key, value]) => {
                let tempApr = value.apr;
                if (!salaryTransfer) tempApr += 0.75;
                if (developerOffer) tempApr -= 0.50;
                
                const tempProfit = loanRequired * ((tempApr / 100) * years);
                const tempInstallment = (loanRequired + tempProfit) / totalMonths;
                const tempNet = Math.max(0, tempInstallment - monthlySakaniSupport);

                return (
                  <div key={key} className={`p-4 border rounded-xl flex flex-col justify-between ${selectedBank === key ? 'border-amber-400 bg-amber-500/5' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{value.name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">معدل الربح الفعلي: {tempApr.toFixed(2)}%</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-base font-black text-slate-800">{Math.round(tempNet).toLocaleString('ar-SA')} ر.س</p>
                      <p className="text-[8px] text-slate-500">صافي قسط شهري مقدر</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}