// components/views/CalculatorView.tsx
'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';

// البنوك السعودية ونسب الأرباح الرسمية وعروضها الحصرية لعام 2026
const BANK_DATA: Record<string, { name: string; apr: number; promo: string; promoEn: string }> = {
  alrajhi: { 
    name: 'مصرف الراجحي', 
    apr: 3.90, 
    promo: 'عرض التمويل المرن بهامش ربح تنافسي مع دعم الإسكان',
    promoEn: 'Flexible financing program with competitive profit rates and housing support.'
  },
  snb: { 
    name: 'البنك الأهلي السعودي (SNB)', 
    apr: 4.10, 
    promo: 'خصم خاص 0.25% لموظفي القطاع الحكومي المعتمد',
    promoEn: 'Special 0.25% discount for approved government sector employees.'
  },
  riyad: { 
    name: 'بنك الرياض', 
    apr: 4.20, 
    promo: 'برنامج الإعفاء المبتدئ وإمكانية دمج الدعم السكني بالكامل',
    promoEn: 'Exemption program with options to fully integrate Sakani support.'
  },
  alinma: { 
    name: 'مصرف الإنماء', 
    apr: 3.85, 
    promo: 'منتج الإجارة المرنة والاعتماد الفوري لفلل الخارطة',
    promoEn: 'Flexible Ijarah product with immediate approvals for off-plan villas.'
  },
  sab: { 
    name: 'البنك السعودي الأول (SAB)', 
    apr: 4.30, 
    promo: 'بدون رسوم إدارية وعروض حصرية على الفلل الصديقة للبيئة',
    promoEn: 'Zero admin fees and exclusive rates on eco-friendly green villas.'
  },
  albilad: { 
    name: 'بنك البلاد', 
    apr: 4.05, 
    promo: 'التمويل العقاري بدون دفعة أولى للمستفيدين المؤهلين لسكني',
    promoEn: 'Zero down payment mortgage options for qualified Sakani beneficiaries.'
  },
  bsf: { 
    name: 'البنك السعودي الفرنسي (BSF)', 
    apr: 4.45, 
    promo: 'الحصول على تمويل إضافي شخصي وعقاري بالتزامن',
    promoEn: 'Combined personal and home finance offerings with quick processing.'
  },
  anb: { 
    name: 'البنك العربي الوطني (ANB)', 
    apr: 4.50, 
    promo: 'تأمين تعاوني كامل ضد العجز أو الأضرار الهيكلية مجاناً',
    promoEn: 'Comprehensive cooperative insurance against structural damages free of charge.'
  },
  aljazira: { 
    name: 'بنك الجزيرة', 
    apr: 4.15, 
    promo: 'تمويل ملاك الصف الثاني لشراء الوحدات السكنية الجاهزة',
    promoEn: 'Second-tier home financing for ready-to-move-in residential units.'
  },
  saib: { 
    name: 'البنك السعودي للاستثمار (SAIB)', 
    apr: 4.35, 
    promo: 'عروض حصرية للعملاء المحولين مع إسقاط الدفعة الأولى',
    promoEn: 'Exclusive salary transfer options with zero downpayment waivers.'
  },
};

// جهات العمل والحد الأقصى للاستقطاع المتوافق معها SAMA DSR
const EMPLOYER_TYPES: Record<string, { label: string; labelEn: string; maxDsr: number }> = {
  gov_civil: { label: 'حكومي - مدني', labelEn: 'Government - Civil', maxDsr: 55 },
  gov_military: { label: 'حكومي - عسكري', labelEn: 'Government - Military', maxDsr: 55 },
  private: { label: 'قطاع خاص معتمد', labelEn: 'Approved Private Sector', maxDsr: 50 },
  retired: { label: 'متقاعد', labelEn: 'Retiree', maxDsr: 60 },
  freelance: { label: 'أعمال حرة / مستقل (وثيقة العمل الحر)', labelEn: 'Freelance / Self-Employed', maxDsr: 45 },
};

const TRANSLATIONS = {
  AR: {
    tag: 'محاكاة التمويل المتقدمة للبنوك السعودية لعام 2026 🇸🇦',
    title: 'حاسبة التمويل العقاري الشاملة (الخيارات المتقدمة)',
    desc: 'لوحة استشارية تفصيلية لحساب الالتزامات القائمة، عروض الخصومات الحصرية للمطور، وفحص متطلبات الـ DSR الموحدة لحوكمة الائتمان ومطابقة لوائح SAMA',
    inputsTitle: 'بيانات الحسبة والخيارات المتقدمة',
    priceLabel: 'سعر العقار العقدي (ر.س) *',
    downpaymentLabel: 'الدفعة الأولى المقدمة (ر.س) *',
    birthdayLabel: 'تاريخ ميلاد العميل (بالتفصيل) *',
    salaryLabel: 'الراتب الشهري الموثق (ر.س) *',
    employerLabel: 'جهة العمل والقطاع الوظيفي *',
    commitmentsLabel: 'التزامات شخصية / بطاقات ائتمانية شهرياً (ر.س) ⚠️',
    tenureLabel: 'مدة التمويل المطلوبة (سنوات) *',
    salaryTransferLabel: 'تفعيل خيار (تحويل الراتب للبنك الممول)',
    developerOfferLabel: 'تطبيق العرض الحصري للمطور (-٠.٥٠٪)',
    sakaniLabel: 'العميل مستحق للدعم السكني المحدث (سكني)',
    ageTitle: 'عمر العميل الحالي المقدر',
    ageYears: 'سنة',
    ageMonths: 'شهر',
    ageDays: 'يوم',
    birthYearLabel: 'سنة الميلاد:',
    installmentBeforeSupport: 'القسط الشهري قبل الدعم',
    effectiveApr: 'هامش الربح الفعلي:',
    netInstallmentTitle: 'صافي القسط بعد الدعم السكني',
    netInstallmentSub: 'صافي بعد الدعم',
    sakaniSupportActive: 'خصم دعم سكني شهري بقيمة',
    sakaniSupportInactive: 'لا يوجد دعم سكني نشط',
    developerDiscountActive: 'خصم الشراكة المطور الحصري (-٠.٥٠٪) مفعل',
    salaryTransferActive: 'معدل تفضيلي لتحويل الراتب مطبق',
    activePromoTitle: 'العرض والمزايا النشطة لـ',
    promoDeveloperIntegrated: 'تم دمج وتطبيق الخصم الحصري الخاص بمشروعكم السكني بمعدل (-٠.٥٠٪) لمشروعكم السكني بنجاح!',
    samaComplianceTitle: 'فحص مطابقة لوائح مؤسسة النقد للبنوك السعودية (SAMA DSR)',
    propertyPriceCol: 'سعر العقار المستهدف:',
    downpaymentCol: 'الدفعة الأولى المدفوعة:',
    commitmentsCol: 'الالتزامات السابقة القائمة:',
    totalCostCol: 'إجمالي تكلفة العقار بتمويل البنك:',
    dsrLabel: 'نسبة الاستقطاع الكلي (DSR):',
    samaCeiling: 'سقف ساما',
    compliantMsg: 'الحسبة متوافقة تماماً مع ضوابط البنك المركزي السعودي (SAMA).',
    nonCompliantMsg: '⚠️ تعذر المطابقة! إجمالي الالتزامات يتجاوز حد الاستقطاع المسموح به لهذا القطاع.',
    matrixTitle: 'مفارقة حية لأقساط البنوك السعودية وعروضها الحصرية',
    matrixSub: 'اختر البنك لتطبيق الحسبة فوراً',
    bankSelected: '✔ تم الاختيار',
    bankSelectDetails: 'عرض التفاصيل ←',
    netMonthlyInstallmentLabel: 'صافي قسط شهري مقدر',
    tenYears: '١٠ سنوات',
    fifteenYears: '١٥ سنة',
    twentyYears: '٢٠ سنة',
    twentyFiveYears: '٢٥ سنة'
  },
  EN: {
    tag: 'Advanced Mortgage Simulation for Saudi Banks 2026 🇸🇦',
    title: 'Comprehensive Housing Finance Calculator (Advanced Options)',
    desc: 'Detailed advisory dashboard calculating outstanding liabilities, developer discounts, and unified SAMA DSR checks for credit governance',
    inputsTitle: 'Calculation Data & Advanced Options',
    priceLabel: 'Contractual Property Price (SAR) *',
    downpaymentLabel: 'Down Payment Paid (SAR) *',
    birthdayLabel: 'Customer Birth Date (Details) *',
    salaryLabel: 'Verified Monthly Salary (SAR) *',
    employerLabel: 'Employer Type & Job Sector *',
    commitmentsLabel: 'Total Monthly Pre-existing Liabilities (SAR) ⚠️',
    tenureLabel: 'Requested Financing Tenure (Years) *',
    salaryTransferLabel: 'Enable Salary Transfer to Financer',
    developerOfferLabel: 'Apply Developer Exclusive Discount (-0.50%)',
    sakaniLabel: 'Customer Eligible for Sakani Support',
    ageTitle: 'Current Customer Age',
    ageYears: 'years',
    ageMonths: 'months',
    ageDays: 'days',
    birthYearLabel: 'Birth Year:',
    installmentBeforeSupport: 'Monthly Installment Before Support',
    effectiveApr: 'Effective Profit Rate:',
    netInstallmentTitle: 'Net Monthly Installment after Sakani Support',
    netInstallmentSub: 'Net After Support',
    sakaniSupportActive: 'Sakani support discount of',
    sakaniSupportInactive: 'No active Sakani support',
    developerDiscountActive: 'Developer partner discount (-0.50%) active',
    salaryTransferActive: 'Preferential salary transfer rate applied',
    activePromoTitle: 'Active Promo & Benefits for',
    promoDeveloperIntegrated: 'Exclusive developer discount (-0.50%) has been successfully integrated for your project!',
    samaComplianceTitle: 'SAMA DSR Central Bank Compliance Audit',
    propertyPriceCol: 'Target Property Price:',
    downpaymentCol: 'Down Payment Paid:',
    commitmentsCol: 'Outstanding Liabilities:',
    totalCostCol: 'Total Property Cost with Financing:',
    dsrLabel: 'Debt Service Ratio (DSR):',
    samaCeiling: 'SAMA Limit',
    compliantMsg: 'Calculations fully compliant with SAMA central bank rules.',
    nonCompliantMsg: '⚠️ Out of Compliance! DSR exceeds the allowed central bank threshold for this sector.',
    matrixTitle: 'Live Saudi Banks Comparison Matrix',
    matrixSub: 'Select a bank to recalculate instantly',
    bankSelected: '✔ Selected',
    bankSelectDetails: 'Recalculate →',
    netMonthlyInstallmentLabel: 'Est. Net Monthly Installment',
    tenYears: '10 Years',
    fifteenYears: '15 Years',
    twentyYears: '20 Years',
    twentyFiveYears: '25 Years'
  }
};

export default function CalculatorView() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [propertyPrice, setPropertyPrice] = useState<number>(1200000); // 1.2 مليون ر.س
  const [salary, setSalary] = useState<number>(15000); // 15 ألف ر.س
  const [downPayment, setDownPayment] = useState<number>(120000); // 10% دفعة أولى
  const [years, setYears] = useState<number>(20); // مدة التمويل
  const [selectedBank, setSelectedBank] = useState<string>('alrajhi');
  const [employer, setEmployer] = useState<string>('gov_civil');
  const [hasSakani, setHasSakani] = useState<boolean>(true);

  // خيارات متقدمة
  const [existingCommitments, setExistingCommitments] = useState<number>(0); // التزامات شهرية قائمة
  const [salaryTransfer, setSalaryTransfer] = useState<boolean>(true); // تحويل الراتب للبنك
  const [developerOffer, setDeveloperOffer] = useState<boolean>(false); // تفعيل العرض الخاص لشركتكم

  // تاريخ الميلاد
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(1995);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // تنسيق العملة ديناميكياً حسب اللغة النشطة
  const formatCurrency = (val: number): string => {
    const formatted = Math.round(val).toLocaleString('en-US');
    if (!isArabic) return formatted + " SAR";
    return toArabicNumerals(formatted) + " ر.س";
  };

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
  
  // الالتزام بالـ DSR كحد أقصى متوافق مع لوائح ساما
  const maxDsrLimit = employerConfig.maxDsr;

  // حساب نسبة الربح الفعلية بناءً على الخيارات المتقدمة
  let finalApr = bank.apr;
  if (!salaryTransfer) finalApr += 0.75; 
  if (developerOffer) finalApr -= 0.50; 

  // حساب قسط التمويل للبنك المختار
  const loanRequired = Math.max(0, propertyPrice - downPayment);
  const totalProfitPercentage = (finalApr / 100) * years;
  const totalProfit = loanRequired * totalProfitPercentage;
  const totalLoanWithProfit = loanRequired + totalProfit;
  const totalMonths = years * 12;
  const monthlyInstallmentRaw = totalMonths > 0 ? totalLoanWithProfit / totalMonths : 0;

  // الدعم السكني المقدر
  const monthlySakaniSupport = hasSakani && salary <= 15000 ? 500 : hasSakani ? 350 : 0;
  const netMonthlyInstallment = Math.max(0, monthlyInstallmentRaw - monthlySakaniSupport);

  // إجمالي الاستقطاع الكلي DSR شهرياً
  const totalMonthlyCommitments = monthlyInstallmentRaw + existingCommitments;
  const actualDsrPercentage = salary > 0 ? (totalMonthlyCommitments / salary) * 100 : 0;
  const isCompliant = actualDsrPercentage <= maxDsrLimit;

  // إجمالي تكلفة العقار
  const totalPropertyCost = totalLoanWithProfit + downPayment;

  return (
    <div className="orca-page orca-stack" dir={dir}>
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
          <i className="ph-bold ph-calculator"></i> {t.tag}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400">
          {t.desc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Side: Inputs Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            {t.inputsTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.priceLabel}</label>
              <input 
                type="number" 
                value={propertyPrice} 
                onChange={(e) => setPropertyPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.downpaymentLabel}</label>
              <input 
                type="number" 
                value={downPayment} 
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.salaryLabel}</label>
              <input 
                type="number" 
                value={salary} 
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.employerLabel}</label>
              <select 
                value={employer} 
                onChange={(e) => setEmployer(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              >
                {Object.entries(EMPLOYER_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{isArabic ? v.label : v.labelEn}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.commitmentsLabel}</label>
              <input 
                type="number" 
                value={existingCommitments} 
                onChange={(e) => setExistingCommitments(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.tenureLabel}</label>
              <select 
                value={years} 
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
              >
                <option value={10}>{t.tenYears}</option>
                <option value={15}>{t.fifteenYears}</option>
                <option value={20}>{t.twentyYears}</option>
                <option value={25}>{t.twentyFiveYears}</option>
              </select>
            </div>
          </div>

          {/* Birthday inputs */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-3">{t.birthdayLabel}</label>
            <div className="grid grid-cols-3 gap-3">
              <select 
                value={birthDay} 
                onChange={(e) => setBirthDay(Number(e.target.value))}
                className="rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{toArabicNumerals(d)}</option>
                ))}
              </select>
              <select 
                value={birthMonth} 
                onChange={(e) => setBirthMonth(Number(e.target.value))}
                className="rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{toArabicNumerals(m)}</option>
                ))}
              </select>
              <select 
                value={birthYear} 
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {Array.from({ length: 50 }, (_, i) => 2006 - i).map(y => (
                  <option key={y} value={y}>{toArabicNumerals(y)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Checklist Switches */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 dark:text-slate-350 select-none">
              <input 
                type="checkbox" 
                checked={salaryTransfer}
                onChange={(e) => setSalaryTransfer(e.target.checked)}
                className="w-4 h-4 rounded text-[#df7b62] focus:ring-[#df7b62] border-slate-300 bg-transparent"
              />
              <span>{t.salaryTransferLabel}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 dark:text-slate-350 select-none">
              <input 
                type="checkbox" 
                checked={developerOffer}
                onChange={(e) => setDeveloperOffer(e.target.checked)}
                className="w-4 h-4 rounded text-[#df7b62] focus:ring-[#df7b62] border-slate-300 bg-transparent"
              />
              <span>{t.developerOfferLabel}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 dark:text-slate-350 select-none">
              <input 
                type="checkbox" 
                checked={hasSakani}
                onChange={(e) => setHasSakani(e.target.checked)}
                className="w-4 h-4 rounded text-[#df7b62] focus:ring-[#df7b62] border-slate-300 bg-transparent"
              />
              <span>{t.sakaniLabel}</span>
            </label>
          </div>
        </div>

        {/* Right Side: Results & SAMA Check Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Main installment results */}
          <div className="bg-[#151f32] border border-slate-800 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden flex flex-col gap-5">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#df7b62]/10 rounded-full blur-[50px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-1">{t.installmentBeforeSupport}</p>
                <h4 className="text-lg font-bold text-slate-300 line-through opacity-70 font-en">
                  {formatCurrency(monthlyInstallmentRaw)}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] font-semibold">{t.effectiveApr}</p>
                <span className="bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-bold px-2 py-0.5 rounded-md font-en">
                  {toArabicNumerals(finalApr.toFixed(2))}%
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-slate-300 text-xs font-bold mb-1">{t.netInstallmentTitle}</p>
              <h2 className="text-3xl font-black text-[#df7b62] font-en">
                {formatCurrency(netMonthlyInstallment)}
                <span className="text-xs text-slate-400 font-semibold block mt-1 font-sans">{t.netInstallmentSub}</span>
              </h2>
            </div>

            <div className="relative z-10 border-t border-slate-800/80 pt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-350">
                <span>{t.ageTitle}:</span>
                <span className="font-bold text-white font-en">
                  {toArabicNumerals(ageDetails.years)} {t.ageYears}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-350">
                <span>{isArabic ? "الدعم السكني المقدر:" : "Est. Sakani Support:"}:</span>
                <span className={`font-bold font-en ${hasSakani ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasSakani ? `${t.sakaniSupportActive} ${formatCurrency(monthlySakaniSupport)}` : t.sakaniSupportInactive}
                </span>
              </div>
              {developerOffer && (
                <div className="flex items-center gap-1.5 text-[#df7b62] font-semibold">
                  <i className="ph-fill ph-sparkle text-sm"></i>
                  <span>{t.developerDiscountActive}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: SAMA DSR limits compliance audit box */}
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center gap-2">
              <i className="ph-bold ph-shield-check text-[#df7b62]"></i>
              {t.samaComplianceTitle}
            </h4>

            <div className="space-y-2.5 text-xs text-slate-655 dark:text-slate-400">
              <div className="flex justify-between">
                <span>{t.propertyPriceCol}</span>
                <span className="font-bold text-slate-900 dark:text-white font-en">{formatCurrency(propertyPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.downpaymentCol}</span>
                <span className="font-bold text-slate-900 dark:text-white font-en">{formatCurrency(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.commitmentsCol}</span>
                <span className="font-bold text-slate-900 dark:text-white font-en">{formatCurrency(existingCommitments)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
                <span>{t.totalCostCol}</span>
                <span className="font-bold text-slate-900 dark:text-white font-en">{formatCurrency(totalPropertyCost)}</span>
              </div>

              {/* DSR Indicator progress bar */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">{t.dsrLabel}</span>
                  <span className={`font-bold font-en text-sm ${isCompliant ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {toArabicNumerals(actualDsrPercentage.toFixed(1))}% / {toArabicNumerals(maxDsrLimit)}% ({t.samaCeiling})
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-[#0b1120] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      actualDsrPercentage > maxDsrLimit 
                        ? 'bg-rose-500' 
                        : actualDsrPercentage > 45 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, actualDsrPercentage)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Compliance message badge */}
            <div className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-2 ${
              isCompliant 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              <i className={`ph-bold ${isCompliant ? 'ph-check-circle' : 'ph-warning-octagon'} text-base shrink-0`}></i>
              <span>{isCompliant ? t.compliantMsg : t.nonCompliantMsg}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.matrixTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.matrixSub}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30">
                <th className="p-4 font-semibold">{isArabic ? 'البنك السعودي' : 'Saudi Bank'}</th>
                <th className="p-4 font-semibold">{isArabic ? 'النسبة الإرشادية (APR)' : 'Base APR'}</th>
                <th className="p-4 font-semibold">{isArabic ? 'العرض والمميزات' : 'Promo Offer'}</th>
                <th className="p-4 font-semibold">{t.netMonthlyInstallmentLabel}</th>
                <th className="p-4 font-semibold">{isArabic ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
              {Object.entries(BANK_DATA).map(([key, data]) => {
                const isActive = selectedBank === key;
                
                // Recalculating dynamically for matrix view
                let bankApr = data.apr;
                if (!salaryTransfer) bankApr += 0.75; 
                if (developerOffer) bankApr -= 0.50; 
                
                const bProfit = loanRequired * ((bankApr / 100) * years);
                const bInstallment = totalMonths > 0 ? (loanRequired + bProfit) / totalMonths : 0;
                const bNetInstallment = Math.max(0, bInstallment - monthlySakaniSupport);

                return (
                  <tr 
                    key={key} 
                    onClick={() => setSelectedBank(key)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${
                      isActive ? 'bg-[#df7b62]/5 dark:bg-[#df7b62]/5' : ''
                    }`}
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#df7b62]' : 'bg-transparent'}`}></div>
                      {data.name}
                    </td>
                    <td className="p-4 font-en font-semibold">{toArabicNumerals(bankApr.toFixed(2))}%</td>
                    <td className="p-4 text-xs max-w-xs truncate" title={isArabic ? data.promo : data.promoEn}>
                      {isArabic ? data.promo : data.promoEn}
                    </td>
                    <td className="p-4 font-en font-black text-sm text-[#df7b62]">{formatCurrency(bNetInstallment)}</td>
                    <td className="p-4">
                      <span className={`text-xs font-bold transition-all px-3 py-1.5 rounded-lg border ${
                        isActive 
                          ? 'bg-[#df7b62] text-white border-transparent' 
                          : 'bg-[#df7b62]/10 text-[#df7b62] border-[#df7b62]/20 hover:bg-[#df7b62] hover:text-white'
                      }`}>
                        {isActive ? t.bankSelected : t.bankSelectDetails}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
