// app/operations/calculator/page.tsx
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
    desc: 'لوحة استشارية تفصيلية لحساب الالتزامات القائمة، عروض الخصومات الحصرية للمطور، وفحص متطلبات الـ DSR الموحدة [١، ٢]',
    inputsTitle: 'بيانات الحسبة والخيارات المتقدمة',
    priceLabel: 'سعر العقار (ر.س) *',
    downpaymentLabel: 'الدفعة الأولى (ر.س) *',
    birthdayLabel: 'تاريخ ميلاد العميل (بالتفصيل) *',
    salaryLabel: 'الراتب الشهري (ر.س) *',
    employerLabel: 'جهة العمل *',
    commitmentsLabel: 'إجمالي الالتزامات الحالية شهرياً (ر.س) ⚠️',
    tenureLabel: 'مدة التمويل المطلوبة *',
    salaryTransferLabel: 'تفعيل خيار (تحويل الراتب للبنك الممول)',
    developerOfferLabel: 'تطبيق العرض الحصري للمطور (-٠.٥٠٪)',
    sakaniLabel: 'العميل مستحق للدعم السكني المحدث (سكني)',
    ageTitle: 'عمر العميل الحالي',
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
    compliantMsg: 'الحسبة متوافقة تماماً مع ضوابط البنك المركزي السعودي.',
    nonCompliantMsg: '⚠️ تعذر المطابقة! إجمالي الالتزامات يتجاوز حد الاستقطاع المسموح به (٥٥٪).',
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
    desc: 'Detailed advisory dashboard calculating outstanding liabilities, developer discounts, and unified SAMA DSR checks [1, 2]',
    inputsTitle: 'Calculation Data & Advanced Options',
    priceLabel: 'Property Price (SAR) *',
    downpaymentLabel: 'Down Payment (SAR) *',
    birthdayLabel: 'Customer Birth Date (Details) *',
    salaryLabel: 'Monthly Salary (SAR) *',
    employerLabel: 'Employer Type *',
    commitmentsLabel: 'Total Monthly Liabilities (SAR) ⚠️',
    tenureLabel: 'Requested Financing Tenure *',
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
    nonCompliantMsg: '⚠️ Out of Compliance! DSR exceeds the allowed central bank threshold (55%).',
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

export default function MortgageCalculatorPage() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

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

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str; // الأرقام الغربية لوضع اللغة الإنجليزية
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // تنسيق العملة ديناميكياً حسب اللغة النشطة
  const formatCurrency = (val: number): string => {
    const formatted = Math.round(val).toLocaleString('en-US');
    if (lang === 'EN') return formatted + " SAR";
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
  
  // الالتزام بالـ 55% كحد أقصى قياسي من البنك المركزي للتمويل السكني
  const maxDsrLimit = 55;

  // حساب نسبة الربح الفعلية بناءً على الخيارات المتقدمة
  let finalApr = bank.apr;
  if (!salaryTransfer) finalApr += 0.75; 
  if (developerOffer) finalApr -= 0.50; 

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

  // إجمالي الالتزامات الشهرية بعد التمويل
  const totalMonthlyCommitments = monthlyInstallmentRaw + existingCommitments;
  const actualDsrPercentage = salary > 0 ? (totalMonthlyCommitments / salary) * 100 : 0;

  // إجمالي تكلفة العقار
  const totalPropertyCost = totalLoanWithProfit + downPayment;

  const isDark = theme === 'dark';

  return (
    <div className={`calculator-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* تضمين خط كاليبري وخصائص التنسيق العام */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.cdnfonts.com/css/calibri');
        
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Calibri', 'Calibri-Regular', 'Arial', sans-serif !important;
        }
        
        /* تباين خاص بالمظهر الداكن والفاتح */
        .calculator-page-wrapper {
          min-height: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* تأثير الزجاج المتلألئ للمظهر الداكن */
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        /* المظهر الفاتح الراقي */
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
        
        .bronze-glow-dark {
          border: 1px solid #735334 !important;
          box-shadow: 0 0 20px rgba(115, 83, 52, 0.35) !important;
        }
        
        .bronze-glow-light {
          border: 1px solid #735334 !important;
          box-shadow: 0 4px 20px rgba(115, 83, 52, 0.12) !important;
        }
        
        .text-royal-bronze {
          color: #735334 !important;
        }
        .text-gold-accent {
          color: #E6C687 !important;
        }
      `}} />

      {/* الترويسة العليا للمحاكاة */}
      <div className={`mb-8 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full border ${
          isDark 
            ? 'bg-amber-500/10 text-[#E6C687] border-[#735334]/40' 
            : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20'
        }`}>
          {t.tag}
        </span>
        <h1 className={`text-3xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t.title}
        </h1>
        <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {t.desc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* مدخلات الحسبة المالية بالتفصيل */}
        <div className={`p-6 rounded-2xl h-fit space-y-5 transition-all ${isDark ? 'frosted-glass-dark' : 'milky-glass-light'}`}>
          <h3 className={`font-black text-sm pb-2 border-b ${isDark ? 'text-[#E6C687] border-slate-800' : 'text-[#735334] border-slate-200'}`}>
            {t.inputsTitle}
          </h3>
          
          <div className="space-y-4">
            
            {/* سعر العقار والدفعة الأولى */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.priceLabel}
                </label>
                <input 
                  type="number" 
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className={`w-full rounded-lg p-2.5 text-xs font-bold transition-all focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950/70 border border-[#735334]/50 text-white focus:ring-1 focus:ring-[#735334]' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:ring-1 focus:ring-[#735334]'
                  }`}
                />
                <span className={`block text-[9px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatCurrency(propertyPrice)}
                </span>
              </div>
              <div>
                <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.downpaymentLabel}
                </label>
                <input 
                  type="number" 
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className={`w-full rounded-lg p-2.5 text-xs font-bold transition-all focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950/70 border border-[#735334]/50 text-white focus:ring-1 focus:ring-[#735334]' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:ring-1 focus:ring-[#735334]'
                  }`}
                />
                <span className={`block text-[9px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatCurrency(downPayment)}
                </span>
              </div>
            </div>

            {/* تاريخ ميلاد العميل */}
            <div>
              <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.birthdayLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <select 
                    value={birthDay} 
                    onChange={(e) => setBirthDay(Number(e.target.value))}
                    className={`w-full rounded-lg p-2.5 text-xs cursor-pointer focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                        : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{toArabicNumerals(i + 1)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <select 
                    value={birthMonth} 
                    onChange={(e) => setBirthMonth(Number(e.target.value))}
                    className={`w-full rounded-lg p-2.5 text-xs cursor-pointer focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                        : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{toArabicNumerals(i + 1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={birthYear} 
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    className={`w-full rounded-lg p-2.5 text-xs cursor-pointer focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                        : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    {Array.from({ length: 65 }, (_, i) => {
                      const yr = 1960 + i;
                      return <option key={yr} value={yr}>{toArabicNumerals(yr)}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* الراتب الشهري وجهة العمل */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.salaryLabel}
                </label>
                <input 
                  type="number" 
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className={`w-full rounded-lg p-2.5 text-xs font-bold transition-all focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950/70 border border-[#735334]/50 text-white focus:ring-1 focus:ring-[#735334]' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:ring-1 focus:ring-[#735334]'
                  }`}
                />
                <span className={`block text-[9px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatCurrency(salary)}
                </span>
              </div>
              <div>
                <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.employerLabel}
                </label>
                <select 
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                      : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  {Object.entries(EMPLOYER_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{lang === 'AR' ? config.label : config.labelEn}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* التزامات العميل الحالية */}
            <div>
              <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                {t.commitmentsLabel}
              </label>
              <input 
                type="number" 
                value={existingCommitments}
                onChange={(e) => setExistingCommitments(Number(e.target.value))}
                className={`w-full rounded-lg p-2.5 text-xs font-bold transition-all focus:outline-none ${
                  isDark 
                    ? 'bg-rose-950/20 border border-rose-800/50 text-rose-300 focus:ring-1 focus:ring-rose-500' 
                    : 'bg-rose-50/50 border border-rose-200 text-rose-800 focus:ring-1 focus:ring-rose-500'
                }`}
                placeholder="مثال: قسط سيارة أو قرض شخصي..."
              />
              <span className={`block text-[9px] mt-1 ${isDark ? 'text-rose-400/80' : 'text-rose-600/80'}`}>
                {formatCurrency(existingCommitments)}
              </span>
            </div>

            {/* مدة التمويل */}
            <div>
              <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.tenureLabel}
              </label>
              <select 
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                    : 'bg-white border border-slate-300 text-slate-900'
                }`}
              >
                <option value={10}>{t.tenYears}</option>
                <option value={15}>{t.fifteenYears}</option>
                <option value={20}>{t.twentyYears}</option>
                <option value={25}>{t.twentyFiveYears}</option>
              </select>
            </div>

            {/* خيارات حصرية ومتقدمة */}
            <div className={`space-y-3.5 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
                <input 
                  type="checkbox" 
                  checked={salaryTransfer}
                  onChange={(e) => setSalaryTransfer(e.target.checked)}
                  className={`h-4.5 w-4.5 rounded transition-all ${
                    isDark ? 'accent-amber-500 bg-slate-950 border-[#735334]/50' : 'accent-[#735334]'
                  }`}
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {t.salaryTransferLabel}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
                <input 
                  type="checkbox" 
                  checked={developerOffer}
                  onChange={(e) => setDeveloperOffer(e.target.checked)}
                  className={`h-4.5 w-4.5 rounded transition-all ${
                    isDark ? 'accent-amber-500 bg-slate-950 border-[#735334]/50' : 'accent-[#735334]'
                  }`}
                />
                <span className="text-[#735334] dark:text-[#E6C687] font-black">
                  {t.developerOfferLabel}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
                <input 
                  type="checkbox" 
                  checked={hasSakani}
                  onChange={(e) => setHasSakani(e.target.checked)}
                  className={`h-4.5 w-4.5 rounded transition-all ${
                    isDark ? 'accent-amber-500 bg-slate-950 border-[#735334]/50' : 'accent-[#735334]'
                  }`}
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {t.sakaniLabel}
                </span>
              </label>
            </div>

          </div>
        </div>

        {/* مخرجات الحسبة والنتائج التفصيلية ومطابقة SAMA */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* كروت تفاصيل الأقساط والدعم والعمر المحسوب */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* العمر المحسوب تفصيلياً */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
              isDark ? 'frosted-glass-dark' : 'milky-glass-light'
            }`}>
              <div>
                <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.ageTitle}</p>
                <p className={`text-2xl font-black mt-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {toArabicNumerals(ageDetails.years)} {t.ageYears}
                </p>
                <p className={`text-[10px] mt-1 font-bold ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                  و {toArabicNumerals(ageDetails.months)} {t.ageMonths} و {toArabicNumerals(ageDetails.days)} {t.ageDays}
                </p>
              </div>
              <span className={`text-[9px] block mt-4 border-t pt-2.5 ${isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                {t.birthYearLabel} {toArabicNumerals(birthYear)}م
              </span>
            </div>

            {/* قسط التمويل الأصلي */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
              isDark ? 'frosted-glass-dark' : 'milky-glass-light'
            }`}>
              <div>
                <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.installmentBeforeSupport}</p>
                <p className={`text-2xl font-black mt-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(monthlyInstallmentRaw)}
                </p>
              </div>
              <span className={`text-[9px] block mt-4 border-t pt-2.5 ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                {t.effectiveApr} <span className="font-extrabold text-emerald-500">{toArabicNumerals(finalApr.toFixed(2))}%</span>
              </span>
            </div>

            {/* قسط بعد دعم سكني (Net Installment Block) */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all ${
              isDark ? 'bronze-glow-dark bg-slate-900/60' : 'bronze-glow-light bg-amber-500/5'
            }`}>
              <span className={`absolute top-0 left-0 font-extrabold text-[8px] px-3 py-1 rounded-br-lg ${
                isDark ? 'bg-[#735334] text-white' : 'bg-[#735334] text-[#E6C687]'
              }`}>
                {t.netInstallmentSub}
              </span>
              <div>
                <p className={`text-[10px] font-extrabold ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                  {t.netInstallmentTitle}
                </p>
                <p className="text-2xl font-black text-amber-500 mt-2.5">
                  {formatCurrency(netMonthlyInstallment)}
                </p>
              </div>
              
              {/* Dynamic Discount Tags */}
              <div className="space-y-1 mt-4 border-t border-[#735334]/25 pt-2.5">
                <p className={`text-[9px] font-bold ${isDark ? 'text-amber-300' : 'text-[#735334]'}`}>
                  {hasSakani ? `✔ ${t.sakaniSupportActive} ${toArabicNumerals(monthlySakaniSupport)} ر.س` : t.sakaniSupportInactive}
                </p>
                {developerOffer && (
                  <p className="text-[9px] font-bold text-emerald-500">
                    ✔ {t.developerDiscountActive}
                  </p>
                )}
                {salaryTransfer && (
                  <p className="text-[9px] font-bold text-sky-500">
                    ✔ {t.salaryTransferActive}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* العرض البنكي المختار بالتفصيل */}
          <div className={`border rounded-2xl p-5 space-y-2 transition-all ${
            isDark 
              ? 'bg-[#735334]/10 border-[#735334]/40 text-slate-200' 
              : 'bg-amber-500/5 border-[#735334]/20 text-slate-800'
          }`}>
            <h4 className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
              <span>🎁 {t.activePromoTitle} {bank.name} حالياً:</span>
            </h4>
            <p className="text-xs leading-relaxed font-bold">
              {lang === 'AR' ? bank.promo : bank.promoEn}
            </p>
            {developerOffer && (
              <p className="text-[10px] text-emerald-500 font-extrabold">
                ✔ {t.promoDeveloperIntegrated}
              </p>
            )}
          </div>

          {/* تفاصيل المطابقة وفحص الضوابط SAMA DSR (SAMA Compliance Tracker) */}
          <div className={`p-6 rounded-2xl transition-all space-y-6 ${isDark ? 'frosted-glass-dark' : 'milky-glass-light'}`}>
            <h3 className={`font-black text-sm pb-2 border-b ${isDark ? 'text-[#E6C687] border-slate-800' : 'text-[#735334] border-slate-200'}`}>
              {t.samaComplianceTitle}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.propertyPriceCol}</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(propertyPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.downpaymentCol}</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(downPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-450">{t.commitmentsCol}</span>
                  <span className="font-bold text-rose-500">{formatCurrency(existingCommitments)}</span>
                </div>
                <div className={`flex justify-between border-t pt-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className={isDark ? 'text-[#E6C687]' : 'text-[#735334]'}>{t.totalCostCol}</span>
                  <span className="font-black text-amber-500">{formatCurrency(totalPropertyCost)}</span>
                </div>
              </div>

              {/* SAMA Compliance Tracker Component */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-black mb-2">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{t.dsrLabel}</span>
                    <span className={actualDsrPercentage > maxDsrLimit ? 'text-rose-500' : 'text-emerald-500'}>
                      {toArabicNumerals(Math.round(actualDsrPercentage))}% 
                    </span>
                  </div>
                  
                  {/* Linear Horizontal Indicator with 55% Central Bank Ceiling */}
                  <div className="relative w-full bg-slate-800/85 rounded-full h-3.5 overflow-hidden border border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        actualDsrPercentage > maxDsrLimit ? 'bg-gradient-to-r from-red-600 to-rose-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`} 
                      style={{ width: `${Math.min(Math.round(actualDsrPercentage), 100)}%` }}
                    />
                    
                    {/* SAMA Limit Vertical line Indicator at 55% */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500" 
                      style={{ [lang === 'AR' ? 'right' : 'left']: `${maxDsrLimit}%` }}
                      title="سقف البنك المركزي 55%"
                    />
                  </div>
                  
                  <div className="flex justify-between text-[9px] text-slate-450 mt-1.5 font-bold">
                    <span>{toArabicNumerals(0)}%</span>
                    <span className="text-yellow-500">{t.samaCeiling} ({toArabicNumerals(maxDsrLimit)}%)</span>
                    <span>{toArabicNumerals(100)}%</span>
                  </div>
                </div>

                <div className={`p-3.5 border rounded-xl transition-all ${
                  actualDsrPercentage <= maxDsrLimit 
                    ? (isDark ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50/50 border-emerald-200 text-emerald-800')
                    : (isDark ? 'bg-rose-950/20 border-rose-800/50 text-rose-400' : 'bg-rose-50/50 border-rose-200 text-rose-800')
                }`}>
                  <p className="text-[10px] font-black leading-relaxed">
                    {lang === 'AR' 
                      ? `نسبة الاستقطاع الكلي: ${toArabicNumerals(Math.round(actualDsrPercentage))}٪ - ${actualDsrPercentage <= maxDsrLimit ? 'الحسبة متوافقة تماماً.' : '⚠️ تعذر المطابقة! تتجاوز حد الاستقطاع.'}`
                      : `DSR Ratio: ${toArabicNumerals(Math.round(actualDsrPercentage))}% - ${actualDsrPercentage <= maxDsrLimit ? t.compliantMsg : t.nonCompliantMsg}`
                    }
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* لوحة مقارنة سريعة لأقساط البنوك (Active Bank Offers Matrix) */}
          <div className={`p-6 rounded-2xl transition-all space-y-5 ${isDark ? 'frosted-glass-dark' : 'milky-glass-light'}`}>
            <div className="border-b pb-3 flex items-center justify-between">
              <h3 className={`font-black text-sm ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                {t.matrixTitle}
              </h3>
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
                {t.matrixSub}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {Object.entries(BANK_DATA).map(([key, value]) => {
                let tempApr = value.apr;
                if (!salaryTransfer) tempApr += 0.75;
                if (developerOffer) tempApr -= 0.50;
                
                const tempProfit = loanRequired * ((tempApr / 100) * years);
                const tempInstallment = (loanRequired + tempProfit) / totalMonths;
                const tempNet = Math.max(0, tempInstallment - monthlySakaniSupport);
                
                const isSelected = selectedBank === key;

                return (
                  <div 
                    key={key} 
                    onClick={() => setSelectedBank(key)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      isSelected 
                        ? (isDark 
                            ? 'border-[#735334] bg-[#735334]/15 shadow-[0_0_15px_rgba(115,83,52,0.3)] scale-[1.01]' 
                            : 'border-[#735334] bg-[#735334]/5 shadow-[0_4px_12px_rgba(115,83,52,0.15)] scale-[1.01]')
                        : (isDark 
                            ? 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700 text-slate-300' 
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700')
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-0 left-0 bg-[#735334] text-white font-extrabold text-[8px] px-2 py-0.5 rounded-br-lg">
                        {lang === 'AR' ? 'نشط' : 'Active'}
                      </span>
                    )}
                    
                    <div>
                      <p className={`text-xs font-black ${isSelected ? (isDark ? 'text-white' : 'text-[#735334]') : (isDark ? 'text-slate-200' : 'text-slate-850')}`}>
                        {value.name}
                      </p>
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t.effectiveApr} <span className="font-extrabold text-emerald-500">{toArabicNumerals(tempApr.toFixed(2))}%</span>
                      </p>
                      <p className="text-[9px] mt-2 leading-relaxed opacity-90 line-clamp-2">
                        {lang === 'AR' ? value.promo : value.promoEn}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-center justify-between">
                      <div>
                        <p className={`text-base font-black ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                          {formatCurrency(tempNet)}
                        </p>
                        <p className="text-[8px] text-slate-400">{t.netMonthlyInstallmentLabel}</p>
                      </div>
                      <span className={`text-[10px] font-black ${isSelected ? 'text-[#735334] dark:text-[#E6C687]' : 'text-slate-400'}`}>
                        {isSelected ? t.bankSelected : t.bankSelectDetails}
                      </span>
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