// app/operations/calculator/page.tsx
'use client';

import React, { useState } from 'react';

// نسب الأرباح التقريبية لجميع البنوك السعودية المرخصة APR
const BANK_RATES: Record<string, { name: string; apr: number }> = {
  alrajhi: { name: 'مصرف الراجحي', apr: 4.25 },
  snb: { name: 'البنك الأهلي السعودي (SNB)', apr: 4.50 },
  riyad: { name: 'بنك الرياض', apr: 4.60 },
  alinma: { name: 'مصرف الإنماء', apr: 4.35 },
  sab: { name: 'البنك السعودي الأول (SAB)', apr: 4.55 },
  albilad: { name: 'بنك البلاد', apr: 4.40 },
  bsf: { name: 'البنك السعودي الفرنسي (BSF)', apr: 4.65 },
  anb: { name: 'البنك العربي الوطني (ANB)', apr: 4.70 },
  aljazira: { name: 'بنك الجزيرة', apr: 4.50 },
  saib: { name: 'البنك السعودي للاستثمار (SAIB)', apr: 4.60 },
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

  // إدخال تاريخ الميلاد باليوم والشهر والسنة
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(1995); // العمر الافتراضي لـ 2026 هو 31 سنة

  // حساب دقيق لعمر العميل الحالي بالسنوات والأشهر والأيام
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
  const bank = BANK_RATES[selectedBank] || BANK_RATES.alrajhi;
  const employerConfig = EMPLOYER_TYPES[employer] || EMPLOYER_TYPES.gov_civil;
  const maxDsrLimit = employerConfig.maxDsr;
  const monthlySalaryLimit = salary * (maxDsrLimit / 100); // القسط الأقصى المسموح به

  // حساب مبلغ التمويل المطلوب
  const loanRequired = Math.max(0, propertyPrice - downPayment);

  // حساب القسط الشهري (طريقة التمويل بالمرابحة الإسلامية)
  const totalProfitPercentage = (bank.apr / 100) * years;
  const totalProfit = loanRequired * totalProfitPercentage;
  const totalLoanWithProfit = loanRequired + totalProfit;
  const totalMonths = years * 12;
  const monthlyInstallmentRaw = totalMonths > 0 ? totalLoanWithProfit / totalMonths : 0;

  // الدعم السكني المقدر (سكني)
  const monthlySakaniSupport = hasSakani && salary <= 15000 ? 500 : hasSakani ? 350 : 0;
  const netMonthlyInstallment = Math.max(0, monthlyInstallmentRaw - monthlySakaniSupport);

  // إجمالي تكلفة العقار
  const totalPropertyCost = totalLoanWithProfit + downPayment;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full border border-amber-500/20">
          محاكاة التمويل المعتمدة للبنوك السعودية 🇸🇦
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">حاسبة التمويل العقاري الشاملة</h1>
        <p className="text-gray-500 text-sm mt-1">
          حسبة تمويلية تفصيلية مطابقة لضوابط البنوك المحلية وقطاعات العمل والتحقق من تاريخ الميلاد والـ DSR [1, 2]
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* مدخلات الحسبة المالية بالتفصيل */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">بيانات الحسبة التمويلية</h3>
          
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

            {/* تاريخ الميلاد تفصيلياً (اليوم والشهر والسنة) */}
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
                  <span className="text-[8px] text-slate-400 block text-center mt-1">اليوم</span>
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
                  <span className="text-[8px] text-slate-400 block text-center mt-1">الشهر</span>
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
                  <span className="text-[8px] text-slate-400 block text-center mt-1">السنة</span>
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

            {/* جهة التمويل (جميع البنوك السعودية) وعدد السنوات */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">البنك الممول *</label>
                <select 
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  {Object.entries(BANK_RATES).map(([key, value]) => (
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

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={hasSakani}
                  onChange={(e) => setHasSakani(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span>العميل مؤهل للدعم السكني المحدث</span>
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
                <p className="text-[10px] text-slate-400 font-bold">عمر العميل (محسوب تفصيلياً)</p>
                <p className="text-xl font-black text-slate-800 mt-2">
                  {ageDetails.years} سنة
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  و {ageDetails.months} شهر و {ageDetails.days} يوم
                </p>
              </div>
              <span className="text-[9px] text-slate-400 block mt-2 border-t pt-2">
                تاريخ الميلاد: {birthYear}/{birthMonth}/{birthDay}
              </span>
            </div>

            {/* قسط التمويل الأصلي */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">القسط الشهري للتمويل</p>
                <p className="text-xl font-black text-slate-800 mt-2">
                  {Math.round(monthlyInstallmentRaw).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <span className="text-[9px] text-slate-400 block mt-2 border-t pt-2">
                نسبة أرباح {bank.name}: {bank.apr}% [1]
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
                  <span>مبلغ التمويل المطلوب:</span>
                  <span className="font-bold text-slate-800">{loanRequired.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between border-t pt-2.5">
                  <span>إجمالي تكلفة العقار بتمويل البنك:</span>
                  <span className="font-bold text-amber-600">{Math.round(totalPropertyCost).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>نسبة الاستقطاع الفعلي من راتب العميل:</span>
                    <span className={monthlyInstallmentRaw > monthlySalaryLimit ? 'text-rose-600' : 'text-emerald-600'}>
                      {Math.round((monthlyInstallmentRaw / salary) * 100)}% 
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${monthlyInstallmentRaw > monthlySalaryLimit ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(Math.round((monthlyInstallmentRaw / salary) * 100), 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    الحد الأقصى المسموح به لجهة العمل ({employerConfig.label}) هو {maxDsrLimit}% [2]
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  {monthlyInstallmentRaw <= monthlySalaryLimit ? (
                    <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                      ✔ الحسبة المالية متوافقة مع ضوابط الـ DSR المعتمدة لجهة عمل العميل لدى {bank.name}؛ حيث لا يتجاوز القسط النسبة المحددة ({maxDsrLimit}%) [2].
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-800 font-bold leading-relaxed">
                      ⚠️ تعذر المطابقة! القسط يتجاوز الحد الأقصى للاستقطاع لجهة العمل ({maxDsrLimit}%). يُنصح برفع الدفعة الأولى أو اختيار بنك بنسبة أرباح أقل لتمرير الحسبة [2].
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}