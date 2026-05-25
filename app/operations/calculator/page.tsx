// app/operations/calculator/page.tsx
'use client';

import React, { useState } from 'react';

// نسب الأرباح التقريبية للبنوك السعودية APR
const BANK_RATES: Record<string, { name: string; apr: number }> = {
  alrajhi: { name: 'مصرف الراجحي', apr: 4.25 },
  snb: { name: 'البنك الأهلي السعودي (SNB)', apr: 4.50 },
  riyad: { name: 'بنك الرياض', apr: 4.60 },
  alinma: { name: 'مصرف الإنماء', apr: 4.35 },
};

export default function MortgageCalculatorPage() {
  const [propertyPrice, setPropertyPrice] = useState<number>(1200000); // سعر العقار الافتراضي 1.2 مليون ر.س
  const [salary, setSalary] = useState<number>(15000); // الراتب الشهري الافتراضي 15 ألف ر.س
  const [age, setAge] = useState<number>(30); // العمر
  const [downPayment, setDownPayment] = useState<number>(120000); // الدفعة الأولى (10% افتراضياً)
  const [years, setYears] = useState<number>(20); // مدة التمويل بالسنوات
  const [selectedBank, setSelectedBank] = useState<string>('alrajhi');
  const [hasSakani, setHasSakani] = useState<boolean>(true); // مستحق للدعم السكني

  // حسابات التمويل العقاري بناءً على ضوابط SAMA وسكني
  const bank = BANK_RATES[selectedBank] || BANK_RATES.alrajhi;
  const monthlySalaryLimit = salary * 0.55; // الحد الأقصى للقسط الشهري وفق ضوابط مؤسسة النقد (55% للراتب)

  // حساب مبلغ التمويل المطلوب
  const loanRequired = Math.max(0, propertyPrice - downPayment);

  // حساب القسط الشهري التقريبي (طريقة المرابحة الإسلامية)
  const totalProfitPercentage = (bank.apr / 100) * years;
  const totalProfit = loanRequired * totalProfitPercentage;
  const totalLoanWithProfit = loanRequired + totalProfit;
  const totalMonths = years * 12;
  const monthlyInstallmentRaw = totalMonths > 0 ? totalLoanWithProfit / totalMonths : 0;

  // حساب الدعم السكني المقدر (برنامج الدعم المحدث للإسكان)
  // الدعم الشهري التقريبي للمستحقين بمتوسط راتب أقل من 15 ألف هو 100-150 ألف ر.س إجمالي، نوزعها كدعم شهري
  const monthlySakaniSupport = hasSakani && salary <= 15000 ? 500 : hasSakani ? 350 : 0;
  const netMonthlyInstallment = Math.max(0, monthlyInstallmentRaw - monthlySakaniSupport);

  // إجمالي تكلفة العقار النهائية بالتمويل والأقساط والدفعة الأولى
  const totalPropertyCost = totalLoanWithProfit + downPayment;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full border border-amber-500/20">
          حاسبة التمويل العقاري السكني المحدثة 🇸🇦
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2">حاسبة التمويل والدعم السكني</h1>
        <p className="text-gray-500 text-sm mt-1">
          احسب الحسبة التمويلية للعميل، الدفعة الأولى، وأقساط البنوك السعودية مباشرة لتأكيد قرار الحجز [1, 2]
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* مدخلات الحسبة المالية (Inputs Panel) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">بيانات الحسبة التمويلية</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">سعر العقار المستهدف (ر.س) *</label>
              <input 
                type="number" 
                value={propertyPrice}
                onChange={(e) => setPropertyPrice(Number(e.target.value))}
                className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الدفعة الأولى المتوفرة للعميل (ر.س)</label>
              <input 
                type="number" 
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <span className="text-[9px] text-slate-400 block mt-1">يفضل أن لا تقل عن 10% من سعر العقار</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">الراتب الشهري للعميل (ر.س) *</label>
                <input 
                  type="number" 
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">عمر العميل (بالسنوات) *</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">مدة التمويل (سنوات) *</label>
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
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">جهة التمويل المستهدفة *</label>
                <select 
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  <option value="alrajhi">مصرف الراجحي</option>
                  <option value="snb">البنك الأهلي SNB</option>
                  <option value="riyad">بنك الرياض</option>
                  <option value="alinma">مصرف الإنماء</option>
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
                <span>العميل مستحق للدعم السكني (وزارة الإسكان)</span>
              </label>
            </div>
          </div>
        </div>

        {/* مخرجات الحسبة والنتائج التفصيلية (Results Panel) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* كروت تلخيص الحسبة الفورية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* قسط التمويل الأصلي */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">القسط الشهري التقريبي (قبل الدعم)</p>
                <p className="text-2xl font-black text-slate-800 mt-2">
                  {Math.round(monthlyInstallmentRaw).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <span className="text-[9px] text-slate-400 block mt-2 border-t pt-2">
                محسوب على نسبة أرباح {bank.name} البالغة {bank.apr}%
              </span>
            </div>

            {/* قسط بعد دعم سكني */}
            <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 font-bold text-[8px] px-3 py-1 rounded-br-lg">
                صافي بعد الدعم
              </span>
              <div>
                <p className="text-[10px] text-amber-800 font-bold">صافي القسط الشهري (بعد الدعم السكني)</p>
                <p className="text-2xl font-black text-amber-600 mt-2">
                  {Math.round(netMonthlyInstallment).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <p className="text-[9px] text-amber-700 font-bold mt-2 border-t border-amber-500/10 pt-2">
                {hasSakani ? `تم خصم دعم سكني شهري مقدر بـ ${monthlySakaniSupport} ر.س` : 'لم يتم تفعيل الدعم السكني'}
              </p>
            </div>

          </div>

          {/* تفاصيل التوافق مع أنظمة مؤسسة النقد SAMA والـ DSR */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">فحص ومطابقة أنظمة التمويل السعودية (SAMA & DSR)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* تفاصيل التمويل */}
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>سعر العقار:</span>
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
                  <span>إجمالي تكلفة العقار بالتمويل:</span>
                  <span className="font-bold text-amber-600">{Math.round(totalPropertyCost).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>

              {/* مؤشرات التوافق */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>نسبة الاستقطاع من راتب العميل (DSR):</span>
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
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  {monthlyInstallmentRaw <= monthlySalaryLimit ? (
                    <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                      ✔ العميل مؤهل وحسبته متوافقة تماماً مع أنظمة الـ DSR للبنك المركزي السعودي؛ حيث لا يتجاوز القسط نسبة الـ 55% من الراتب المحددة [2].
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-800 font-bold leading-relaxed">
                      ⚠️ قسط العميل يتجاوز النسبة القصوى المسموحة للاستقطاع (DSR) للبنك المركزي! يرجى رفع مبلغ الدفعة الأولى أو تمديد سنوات التمويل لتقليل القسط الشهري وتفادي رفض البنك [2].
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