'use client';

import React, { useEffect, useState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, useTheme } from '@/app/context/AppContext';

interface LoginClientProps {
  tenantName?: string;
  host?: string;
}

function GlobeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.3 3.3 5.3 3.3 9S14.2 18.7 12 21c-2.2-2.3-3.3-5.3-3.3-9S9.8 5.3 12 3Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 3 21 21M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.4A10.8 10.8 0 0 1 12 4c5.8 0 9 8 9 8a17.7 17.7 0 0 1-2.5 3.7M6.4 6.4C4.2 8 3 12 3 12s3.2 8 9 8c1.4 0 2.7-.5 3.8-1.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 12s3.2-8 9-8 9 8 9 8-3.2 8-9 8-9-8-9-8Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3 4.5 6v5.2c0 4.6 3 8.1 7.5 9.8 4.5-1.7 7.5-5.2 7.5-9.8V6L12 3Z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.7 2.7 0 1 1 4.7 1.8c-.9.8-2.3 1.3-2.3 2.8M12 17h.01" />
    </svg>
  );
}

function OrcaMark() {
  return (
    <div className="flex items-center gap-4" aria-label="ORCA Real Estate Platform">
      <svg viewBox="0 0 64 76" className="h-[56px] w-[44px] shrink-0" fill="none" aria-hidden="true">
        <path d="M31.7 4 48 16.4V55l-7.7 4.5V21L31.7 14 23 20.5V65l-8.8-5V29.5L6 35.8V67l25.7 5 26-5V42.5l-8.4-6.2V62L31.7 66.2V4Z" fill="url(#orcaGold)" />
        <path d="M31.7 19.5v39.7M14.2 55.2l9-5.2M49.3 54.7l8.4-5" stroke="#FFF" strokeOpacity=".28" strokeWidth="1.4" />
        <defs>
          <linearGradient id="orcaGold" x1="5" y1="4" x2="55" y2="69" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C85E" />
            <stop offset=".52" stopColor="#D49D25" />
            <stop offset="1" stopColor="#F0C35D" />
          </linearGradient>
        </defs>
      </svg>
      <div className="leading-none">
        <div className="text-[38px] font-light tracking-[0.16em] text-white">ORCA</div>
        <div className="mt-1.5 text-[9px] font-semibold tracking-[0.26em] text-[#D8A83B]">REAL ESTATE PLATFORM</div>
      </div>
    </div>
  );
}

export default function LoginClient({
  tenantName = 'منصة ORCA العقارية',
  host = '',
}: LoginClientProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { lang, toggleLang } = useLanguage();

  const isArabic = lang === 'AR';
  const isDarkMode = theme === 'dark';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) {
      setRetryAfter(null);
      return;
    }

    const timer = window.setInterval(() => {
      setRetryAfter((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer);
          return null;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || (retryAfter !== null && retryAfter > 0)) return;

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.append('clientHost', host || window.location.host);
      formData.append('clientProto', window.location.protocol.replace(':', ''));

      const result = await loginAction(formData);

      if (!result) {
        setError(
          isArabic
            ? 'لم يتم تلقي استجابة من الخادم. حدّث الصفحة وحاول مرة أخرى.'
            : 'No response was received from the server. Refresh the page and try again.',
        );
        return;
      }

      if (result.success) {
        if (result.redirectUrl?.startsWith('http')) {
          window.location.assign(result.redirectUrl);
        } else {
          router.push(result.redirectUrl || '/operations');
        }
        return;
      }

      if (result.retryAfterSeconds) {
        setRetryAfter(result.retryAfterSeconds);
        setError(
          isArabic
            ? `محاولات دخول كثيرة. حاول مجددًا بعد ${result.retryAfterSeconds} ثانية.`
            : `Too many login attempts. Try again in ${result.retryAfterSeconds} seconds.`,
        );
      } else {
        setError(
          result.error ||
            (isArabic
              ? 'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.'
              : 'Unable to sign in. Check your email and password.'),
        );
      }
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : isArabic
            ? 'حدث خطأ غير متوقع أثناء تسجيل الدخول.'
            : 'An unexpected error occurred while signing in.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      className={`relative min-h-screen overflow-hidden font-sans text-white ${
        isDarkMode ? 'bg-[#071427]' : 'bg-[#102541]'
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .orca-login-shell {
          background:
            radial-gradient(circle at 18% 34%, rgba(30, 66, 109, .14), transparent 28%),
            #081A31;
        }
        .orca-login-backdrop {
          object-position: right bottom;
          filter: saturate(.98) contrast(1.03) brightness(.98);
        }
        .orca-login-overlay {
          background:
            linear-gradient(90deg, #081A31 0%, rgba(8,26,49,.98) 30%, rgba(8,26,49,.62) 49%, rgba(8,26,49,.12) 72%, rgba(8,26,49,.02) 100%),
            linear-gradient(180deg, rgba(8,26,49,.10) 0%, rgba(8,26,49,.02) 54%, rgba(8,26,49,.22) 100%);
        }
        @media (min-width: 1024px) {
          .orca-login-backdrop {
            position: fixed;
            inset: auto 0 0 auto;
            width: 72%;
            height: calc(100vh - 1px);
            object-fit: contain;
            object-position: right bottom;
            transform: none;
          }
        }
        @media (max-width: 1023px) {
          .orca-login-backdrop {
            object-fit: cover;
            object-position: 70% center;
            opacity: .46;
          }
          .orca-login-overlay {
            background: linear-gradient(180deg, rgba(5,16,31,.88), rgba(5,16,31,.96));
          }
        }
        .orca-login-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.014) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.014) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.4), transparent 82%);
        }
        .orca-login-card {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.018),
            0 14px 34px rgba(0,0,0,.14);
        }
        .orca-field:-webkit-autofill,
        .orca-field:-webkit-autofill:hover,
        .orca-field:-webkit-autofill:focus {
          -webkit-text-fill-color: #f8fafc;
          -webkit-box-shadow: 0 0 0 1000px rgba(10,28,51,.96) inset;
          transition: background-color 9999s ease-out;
        }
        @media (max-width: 1023px) {
          .orca-login-stage { min-height: auto !important; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .orca-hero-image { animation: orcaHeroReveal .8s ease-out both; }
          .orca-login-card { animation: orcaCardReveal .65s ease-out both; }
          @keyframes orcaHeroReveal {
            from { opacity: 0; transform: translateY(14px) scale(.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes orcaCardReveal {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}} />

      <div className="orca-login-shell absolute inset-0" aria-hidden="true" />
      <img
        src="/orca-login-hero.png"
        alt=""
        className="orca-login-backdrop pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
        draggable={false}
      />
      <div className="orca-login-overlay pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="orca-login-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex h-[96px] shrink-0 items-center justify-between px-6 sm:px-10 lg:px-[50px]">
          <button
            type="button"
            onClick={toggleLang}
            aria-label={isArabic ? 'تغيير اللغة إلى الإنجليزية' : 'Change language to Arabic'}
            className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] font-medium text-slate-200 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A83B]"
          >
            <GlobeIcon />
            <span dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'العربية' : 'English'}</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>

          <OrcaMark />
        </header>

        <main className="orca-login-stage flex min-h-0 flex-1 items-start px-6 pb-3 pt-2 sm:px-10 lg:px-[50px] lg:pt-0">
          <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 items-center lg:grid-cols-[minmax(390px,480px)_1fr] lg:gap-12 xl:gap-16">
            <section
              aria-labelledby="login-heading"
              dir={isArabic ? 'rtl' : 'ltr'}
              className="orca-login-card order-2 rounded-[22px] border border-white/[0.045] bg-[#081A31]/96 px-6 py-5 backdrop-blur-[4px] sm:px-8 sm:py-6 lg:order-1 lg:-translate-y-5 lg:px-[32px] lg:py-[24px]"
            >
              <div className="mx-auto max-w-[540px]">
                <h1 id="login-heading" className="mb-5 text-center text-[28px] font-bold leading-tight tracking-[-0.01em] text-white sm:text-[34px]">
                  {isArabic ? 'تسجيل الدخول' : 'Sign in'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="rounded-2xl border border-red-300/35 bg-red-950/35 px-4 py-3 text-center text-sm font-semibold text-red-100"
                    >
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="mb-2 block text-[15px] font-medium text-slate-300">
                      {isArabic ? 'البريد الإلكتروني' : 'Email address'}
                    </label>
                    <div className="relative">
                      <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-5' : 'left-5'}`}>
                        <MailIcon />
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        dir="ltr"
                        placeholder={isArabic ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                        className={`orca-field h-[54px] w-full rounded-[13px] border border-white/12 bg-[#07182D]/66 text-[15px] text-white outline-none transition placeholder:text-slate-400/75 hover:border-white/24 focus:border-[#E2B548] focus:ring-2 focus:ring-[#E2B548]/20 ${
                          isArabic ? 'pr-[58px] pl-5 text-right' : 'pl-[58px] pr-5 text-left'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-[15px] font-medium text-slate-300">
                      {isArabic ? 'كلمة المرور' : 'Password'}
                    </label>
                    <div className="relative">
                      <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-5' : 'left-5'}`}>
                        <LockIcon />
                      </span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        dir="ltr"
                        placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'}
                        className={`orca-field h-[54px] w-full rounded-[13px] border border-white/12 bg-[#07182D]/66 text-[15px] text-white outline-none transition placeholder:text-slate-400/75 hover:border-white/24 focus:border-[#E2B548] focus:ring-2 focus:ring-[#E2B548]/20 ${
                          isArabic ? 'pr-[58px] pl-[58px] text-right' : 'pl-[58px] pr-[58px] text-left'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword
                            ? isArabic
                              ? 'إخفاء كلمة المرور'
                              : 'Hide password'
                            : isArabic
                              ? 'إظهار كلمة المرور'
                              : 'Show password'
                        }
                        className={`absolute top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B548] ${
                          isArabic ? 'left-4' : 'right-4'
                        }`}
                      >
                        <EyeIcon hidden={!showPassword} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1 text-[14px]">
                    <label className="flex cursor-pointer items-center gap-3 text-slate-300">
                      <input
                        type="checkbox"
                        name="remember"
                        className="h-[18px] w-[18px] rounded border-white/40 bg-transparent accent-[#D8A83B]"
                      />
                      <span>{isArabic ? 'تذكرني' : 'Remember me'}</span>
                    </label>
                    <button
                      type="button"
                      className="font-medium text-[#E0B44B] transition hover:text-[#F2CB6C] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B548]"
                    >
                      {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (retryAfter !== null && retryAfter > 0)}
                    className="mt-1 h-[56px] w-full rounded-[13px] bg-gradient-to-r from-[#DDA72D] via-[#FFC54A] to-[#E8AE2A] text-[17px] font-bold text-[#142238] shadow-[0_10px_24px_rgba(209,153,34,.18)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE093] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1C34]"
                  >
                    {loading
                      ? isArabic
                        ? 'جاري التحقق...'
                        : 'Verifying...'
                      : retryAfter !== null && retryAfter > 0
                        ? isArabic
                          ? `حاول بعد ${retryAfter} ثانية`
                          : `Try again in ${retryAfter}s`
                        : isArabic
                          ? 'تسجيل دخول'
                          : 'Sign in'}
                  </button>

                  <div className="flex items-center gap-5 py-1 text-slate-400" aria-hidden="true">
                    <span className="h-px flex-1 bg-white/20" />
                    <span className="text-[14px]">{isArabic ? 'أو' : 'or'}</span>
                    <span className="h-px flex-1 bg-white/20" />
                  </div>

                  <p className="text-center text-[14px] text-slate-400">
                    {isArabic ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                    <span className="font-semibold text-[#E0B44B]">
                      {isArabic ? 'تواصل مع إدارة المنصة' : 'Contact platform administration'}
                    </span>
                  </p>

                  <p className="sr-only">{tenantName}</p>
                </form>
              </div>
            </section>

            <div className="order-1 hidden min-h-[560px] lg:block" aria-hidden="true" />
          </div>
        </main>

        <footer className="relative z-20 mt-auto border-t border-white/10 bg-[#081A31] px-6 py-3 backdrop-blur-none sm:px-10 lg:px-[46px]">
          <div className="mx-auto flex max-w-[1480px] flex-col-reverse items-center justify-between gap-4 text-[12px] text-slate-300 lg:flex-row">
            <nav aria-label={isArabic ? 'روابط السياسات والمساعدة' : 'Policy and help links'} className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <Link href="/terms-and-conditions" prefetch={false} className="flex items-center gap-2 transition hover:text-white">
                <ShieldIcon />
                <span>{isArabic ? 'الشروط والأحكام' : 'Terms and conditions'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-white/20 sm:block" aria-hidden="true" />
              <Link href="/privacy-policy" prefetch={false} className="flex items-center gap-2 transition hover:text-white">
                <LockIcon />
                <span>{isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-white/20 sm:block" aria-hidden="true" />
              <Link href="/disclaimer" prefetch={false} className="flex items-center gap-2 transition hover:text-white">
                <HelpIcon />
                <span>{isArabic ? 'الأسئلة الشائعة' : 'Frequently asked questions'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-white/20 sm:block" aria-hidden="true" />
              <span className="flex items-center gap-2">
                <MailIcon />
                <span>{isArabic ? 'تواصل معنا' : 'Contact us'}</span>
              </span>
            </nav>

            <p className="text-center text-slate-400 lg:text-start">
              © {new Date().getFullYear()}{' '}
              <span className="font-semibold text-[#D8A83B]">ORCA Real Estate</span>.{' '}
              {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
