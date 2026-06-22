"use client";

import React, { useState } from "react";
import { createLeadAction } from "@/app/actions/leads";
import Link from "next/link";
import { useLanguage } from "@/app/context/AppContext";

export default function DemoForm() {
  const { lang, toggleLang } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = lang === "AR" ? AR : EN;
  const dir = lang === "AR" ? "rtl" : "ltr";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const name = (fd.get("name") as string).trim();
    const company = (fd.get("company") as string).trim();
    const email = (fd.get("email") as string).trim();
    const phone = (fd.get("phone") as string).trim();
    const units = (fd.get("units") as string).trim();
    const employees = (fd.get("employees") as string).trim();
    const city = (fd.get("city") as string).trim();
    const message = (fd.get("message") as string).trim();

    const sourceParts = ["Demo Request"];
    if (company) sourceParts.push(`Company: ${company}`);
    if (units) sourceParts.push(`Units: ${units}`);
    if (employees) sourceParts.push(`Employees: ${employees}`);
    if (message) sourceParts.push(`Message: ${message}`);

    fd.set("investorName", name);
    fd.set("firstName", name.split(" ")[0]);
    fd.set("lastName", name.split(" ").slice(1).join(" "));
    fd.set("phone", phone);
    fd.set("email", email);
    fd.set("city", city);
    fd.set("source", sourceParts.join(" | "));
    fd.set("clientHost", window.location.host);

    const res = await createLeadAction(fd);
    setLoading(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.error || (lang === "AR" ? "حدث خطأ، حاول مرة أخرى." : "An error occurred. Please try again."));
    }
  };

  if (submitted) {
    return (
      <>
        <style>{STYLES}</style>
        <div dir={dir} className="demo-card demo-success">
          <div className="demo-icon">✓</div>
          <h1 className="demo-title">{t.successTitle}</h1>
          <p className="demo-desc">{t.successDesc}</p>
          <div className="demo-steps">
            <div className="demo-step"><span>1</span> {t.step1}</div>
            <div className="demo-step"><span>2</span> {t.step2}</div>
            <div className="demo-step"><span>3</span> {t.step3}</div>
          </div>
          <Link href="/" className="demo-btn-primary">{t.backHome}</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div dir={dir} className="demo-card">
        <div className="demo-header">
          <div className="demo-logo">
            <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
              <rect x="2" y="2" width="36" height="36" rx="8" stroke="#C9A96E" strokeWidth="2" />
              <path d="M12 28V14l8-6 8 6v14H12z" stroke="#C9A96E" strokeWidth="1.5" fill="rgba(201,169,110,0.08)" />
            </svg>
            <span className="demo-brand">ORCA</span>
          </div>
          <button onClick={toggleLang} className="demo-lang">
            {lang === "AR" ? "EN" : "عربي"}
          </button>
        </div>

        <h1 className="demo-title">{t.title}</h1>
        <p className="demo-desc">{t.desc}</p>

        {error && <div className="demo-error">{error}</div>}

        <form onSubmit={handleSubmit} className="demo-form">
          <div className="demo-row">
            <div className="demo-field">
              <label className="demo-label">{t.name}</label>
              <input name="name" type="text" required className="demo-input" placeholder={t.namePH} />
            </div>
            <div className="demo-field">
              <label className="demo-label">{t.company}</label>
              <input name="company" type="text" className="demo-input" placeholder={t.companyPH} />
            </div>
          </div>
          <div className="demo-row">
            <div className="demo-field">
              <label className="demo-label">{t.email}</label>
              <input name="email" type="email" required className="demo-input" placeholder={t.emailPH} />
            </div>
            <div className="demo-field">
              <label className="demo-label">{t.phone}</label>
              <input name="phone" type="tel" required className="demo-input" placeholder={t.phonePH} />
            </div>
          </div>
          <div className="demo-row">
            <div className="demo-field">
              <label className="demo-label">{t.units}</label>
              <input name="units" type="number" className="demo-input" placeholder="0" />
            </div>
            <div className="demo-field">
              <label className="demo-label">{t.employees}</label>
              <input name="employees" type="number" className="demo-input" placeholder="0" />
            </div>
          </div>
          <div className="demo-field">
            <label className="demo-label">{t.city}</label>
            <input name="city" type="text" className="demo-input" placeholder={t.cityPH} />
          </div>
          <div className="demo-field">
            <label className="demo-label">{t.message}</label>
            <textarea name="message" rows={3} className="demo-input demo-textarea" placeholder={t.messagePH} />
          </div>
          <button type="submit" disabled={loading} className="demo-btn-primary demo-btn-full">
            {loading ? (lang === "AR" ? "جارٍ الإرسال..." : "Submitting...") : t.submit}
          </button>
          <div className="demo-footer">
            <span>{t.trust}</span>
          </div>
        </form>
      </div>
    </>
  );
}

const AR = {
  title: "احجز عرضاً توضيحياً تنفيذياً",
  desc: "املأ بياناتك وسيتواصل معك أحد مستشاري ORCA خلال ساعتي عمل لمناقشة احتياجات محفظتك العقارية.",
  name: "الاسم الكامل *",
  namePH: "الاسم الأول والاسم الأخير",
  company: "اسم الشركة",
  companyPH: "اسم المنشأة العقارية",
  email: "البريد الإلكتروني *",
  emailPH: "example@domain.com",
  phone: "رقم الجوال *",
  phonePH: "05xxxxxxxx",
  units: "عدد الوحدات العقارية",
  employees: "عدد الموظفين",
  city: "المدينة",
  cityPH: "الرياض، جدة، الدمام...",
  message: "رسالتك (اختياري)",
  messagePH: "اكتب أي استفسار أو متطلب خاص...",
  submit: "احجز عرضاً توضيحياً",
  trust: "🔒 بياناتك محمية ومشفرة بالكامل | سيتم التواصل خلال ساعتي عمل",
  successTitle: "تم استلام طلبك بنجاح!",
  successDesc: "شكراً لاهتمامك بـ ORCA. سيتواصل معك أحد مستشارينا خلال ساعتي عمل لمناقشة احتياجات محفظتك العقارية.",
  step1: "مراجعة بياناتك من قبل فريق المبيعات",
  step2: "التواصل معك لتحديد موعد العرض التوضيحي",
  step3: "عرض توضيحي مخصص لاحتياجات محفظتك",
  backHome: "العودة للصفحة الرئيسية",
};

const EN = {
  title: "Book an Executive Demo",
  desc: "Fill in your details and an ORCA consultant will contact you within 2 business hours to discuss your portfolio needs.",
  name: "Full Name *",
  namePH: "First and Last Name",
  company: "Company Name",
  companyPH: "Your real estate company",
  email: "Email Address *",
  emailPH: "example@domain.com",
  phone: "Mobile Number *",
  phonePH: "+966 5xxxxxxxx",
  units: "Number of Units",
  employees: "Number of Employees",
  city: "City",
  cityPH: "Riyadh, Jeddah, Dammam...",
  message: "Your Message (optional)",
  messagePH: "Write any questions or specific requirements...",
  submit: "Book Executive Demo",
  trust: "🔒 Your data is fully encrypted | We will contact you within 2 business hours",
  successTitle: "Request Received Successfully!",
  successDesc: "Thank you for your interest in ORCA. One of our consultants will contact you within 2 business hours to discuss your portfolio needs.",
  step1: "Your information will be reviewed by our sales team",
  step2: "We will contact you to schedule the demo",
  step3: "A tailored demo for your portfolio needs",
  backHome: "Back to Homepage",
};

const STYLES = `
  .demo-card {
    width: 100%; max-width: 600px; margin: 0 auto;
    background: #0F172A; border: 1px solid #1E293B;
    border-radius: 16px; padding: 40px;
  }
  .demo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
  .demo-logo { display: flex; align-items: center; gap: 8px; }
  .demo-brand { font-size: 16px; font-weight: 800; letter-spacing: 3px; color: #FFFFFF; }
  .demo-lang {
    height: 30px; padding: 0 12px; border-radius: 6px;
    background: rgba(201, 169, 110, 0.06); border: 1px solid rgba(201, 169, 110, 0.12);
    color: #94A3B8; font-size: 10px; font-weight: 700; cursor: pointer;
    font-family: 'Inter', 'Cairo', sans-serif;
  }
  .demo-lang:hover { border-color: rgba(201, 169, 110, 0.3); color: #C9A96E; }
  .demo-title { font-size: 24px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px; }
  .demo-desc { font-size: 13px; color: #94A3B8; line-height: 1.7; margin-bottom: 28px; }
  .demo-error {
    padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;
    background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.12);
    color: #EF4444; font-size: 12px; font-weight: 600;
  }
  .demo-form { display: flex; flex-direction: column; gap: 16px; }
  .demo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 500px) { .demo-row { grid-template-columns: 1fr; } }
  .demo-field { display: flex; flex-direction: column; gap: 6px; }
  .demo-label { font-size: 11px; font-weight: 700; color: #CBD5E1; }
  .demo-input {
    width: 100%; padding: 11px 14px; border-radius: 8px;
    background: rgba(5, 8, 22, 0.6); border: 1px solid rgba(36, 50, 72, 0.5);
    color: #FFFFFF; font-size: 13px; font-family: 'Inter', 'Cairo', sans-serif;
    outline: none; transition: border-color 0.2s;
  }
  .demo-input:focus { border-color: rgba(201, 169, 110, 0.4); }
  .demo-input::placeholder { color: #475569; }
  .demo-textarea { resize: vertical; min-height: 80px; }
  .demo-btn-primary {
    height: 46px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #C9A96E, #D8B77C);
    color: #050816; font-size: 13px; font-weight: 800; cursor: pointer;
    transition: all 0.25s; font-family: 'Inter', 'Cairo', sans-serif;
  }
  .demo-btn-primary:hover { box-shadow: 0 0 24px rgba(201, 169, 110, 0.35); transform: translateY(-1px); }
  .demo-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .demo-btn-full { width: 100%; }
  .demo-footer { text-align: center; font-size: 10px; color: #64748B; font-weight: 500; margin-top: 8px; }
  .demo-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #22C55E; margin: 0 auto 24px; }
  .demo-success { text-align: center; }
  .demo-steps { margin: 28px 0; display: flex; flex-direction: column; gap: 14px; }
  .demo-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #CBD5E1; font-weight: 500; }
  .demo-step span { width: 26px; height: 26px; border-radius: 50%; background: rgba(201, 169, 110, 0.08); border: 1px solid rgba(201, 169, 110, 0.15); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #C9A96E; flex-shrink: 0; }
`;
