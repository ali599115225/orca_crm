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

type LoginErrorMessage = {
  ar: string;
  en: string;
};

function GlobeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.3 3.3 5.3 3.3 9S14.2 18.7 12 21c-2.2-2.3-3.3-5.3-3.3-9S9.8 5.3 12 3Z" />
    </svg>
  );
}

function SunIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M20.2 15.2A8.2 8.2 0 0 1 8.8 3.8 8.3 8.3 0 1 0 20.2 15.2Z" />
    </svg>
  );
}

function MailIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
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
    <div className="orca-brand flex items-center gap-3.5" aria-label="ORCA Real Estate Platform">
      <svg viewBox="0 0 64 76" className="orca-brand-mark h-[56px] w-[44px] shrink-0" fill="none" aria-hidden="true">
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
        <div className="orca-brand-word text-[38px] font-light tracking-[0.16em] text-white">ORCA</div>
        <div className="orca-brand-tagline mt-1.5 text-[9px] font-semibold tracking-[0.26em] text-[var(--orca-brand-gold)]">REAL ESTATE PLATFORM</div>
      </div>
    </div>
  );
}

export default function LoginClient({
  tenantName = 'منصة ORCA العقارية',
  host = '',
}: LoginClientProps) {
  const router = useRouter();
  const { lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isArabic = lang === 'AR';
  const themeToggleLabel =
    theme === 'dark'
      ? isArabic
        ? 'التبديل إلى الوضع الفاتح'
        : 'Switch to light mode'
      : isArabic
        ? 'التبديل إلى الوضع الداكن'
        : 'Switch to dark mode';

  const [error, setError] = useState<LoginErrorMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const localizedError = error ? (isArabic ? error.ar : error.en) : null;

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
        setError({
          ar: 'لم يتم تلقي استجابة من الخادم. حدّث الصفحة وحاول مرة أخرى.',
          en: 'No response was received from the server. Refresh the page and try again.',
        });
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
        setError({
          ar: `محاولات دخول كثيرة. حاول مجددًا بعد ${result.retryAfterSeconds} ثانية.`,
          en: `Too many login attempts. Try again in ${result.retryAfterSeconds} seconds.`,
        });
      } else {
        setError({
          ar:
            result.error ||
            'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.',
          en:
            result.errorEn ||
            'Unable to sign in. Check your email and password.',
        });
      }
    } catch {
      setError({
        ar: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
        en: 'An unexpected error occurred while signing in.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      className="orca-login-root relative min-h-[100svh] overflow-x-hidden bg-[var(--orca-ui-bg)] font-sans text-[var(--orca-ui-text-primary)]"
    >
      <style>{`
        .orca-login-root {
          --login-shell: #ffffff;
          --login-card: rgba(255, 255, 255, .94);
          --login-card-border: rgba(202, 151, 51, .68);
          --login-card-shadow: inset 0 1px 0 rgba(255, 255, 255, .96), 0 20px 56px rgba(15, 38, 68, .12);
          --login-field-bg: rgba(255, 255, 255, .9);
          --login-field-border: rgba(93, 116, 146, .28);
          --login-field-hover: rgba(65, 89, 121, .48);
          --login-field-autofill: #ffffff;
          --login-field-inset: inset 0 1px 0 rgba(15, 38, 68, .035);
          --login-control-hover: rgba(15, 38, 68, .06);
          --login-checkbox-bg: rgba(255, 255, 255, .92);
          --login-checkbox-border: rgba(73, 94, 122, .58);
          --login-footer-bg: rgba(255, 255, 255, .96);
          --login-footer-border: rgba(15, 38, 68, .12);
          --login-brand-text: #0a1f3a;
          --login-focus-offset: #ffffff;
          --login-alert-bg: rgba(254, 242, 242, .96);
          --login-alert-border: rgba(220, 38, 38, .24);
          --login-alert-text: #991b1b;
          isolation: isolate;
          color-scheme: light;
        }

        .dark .orca-login-root {
          --login-shell: #07182d;
          --login-card: rgba(7, 20, 39, .94);
          --login-card-border: rgba(220, 174, 82, .76);
          --login-card-shadow: inset 0 1px 0 rgba(255, 255, 255, .035), 0 24px 64px rgba(0, 0, 0, .24);
          --login-field-bg: rgba(20, 37, 61, .78);
          --login-field-border: rgba(122, 146, 176, .34);
          --login-field-hover: rgba(177, 196, 220, .52);
          --login-field-autofill: #14253d;
          --login-field-inset: inset 0 1px 0 rgba(255, 255, 255, .018);
          --login-control-hover: rgba(255, 255, 255, .05);
          --login-checkbox-bg: rgba(255, 255, 255, .035);
          --login-checkbox-border: rgba(166, 185, 209, .62);
          --login-footer-bg: rgba(5, 18, 35, .96);
          --login-footer-border: rgba(177, 195, 218, .18);
          --login-brand-text: #ffffff;
          --login-focus-offset: #07182d;
          --login-alert-bg: rgba(69, 10, 10, .4);
          --login-alert-border: rgba(252, 165, 165, .3);
          --login-alert-text: #fee2e2;
          color-scheme: dark;
        }

        .orca-login-shell {
          position: absolute;
          inset: 0;
          z-index: -2;
          background: var(--login-shell);
        }

        .orca-login-visual {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .orca-login-scene {
          position: absolute;
          inset: 0 0 0 auto;
          width: auto;
          height: 100%;
          max-width: none;
          object-fit: contain;
          object-position: right center;
        }

        .orca-login-scene-light {
          display: block;
        }

        .orca-login-scene-dark {
          display: none;
        }

        .dark .orca-login-scene-light {
          display: none;
        }

        .dark .orca-login-scene-dark {
          display: block;
        }

        @media (min-width: 1024px) {
          .orca-header-controls,
          .orca-brand {
            transform: translateY(16px);
          }
        }

        .orca-login-card {
          border-color: var(--login-card-border);
          background: var(--login-card);
          box-shadow: var(--login-card-shadow);
        }

        .orca-login-feedback {
          height: 44px;
        }

        .orca-login-alert {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          border-color: var(--login-alert-border);
          background: var(--login-alert-bg);
          color: var(--login-alert-text);
        }

        .orca-field {
          height: 62px;
          border-color: var(--login-field-border);
          background: var(--login-field-bg);
          box-shadow: var(--login-field-inset);
        }

        .orca-field:hover {
          border-color: var(--login-field-hover);
        }

        .orca-field:focus {
          border-color: #d9ad55;
          box-shadow: 0 0 0 3px rgba(217, 173, 85, .16);
        }

        .orca-field:-webkit-autofill,
        .orca-field:-webkit-autofill:hover,
        .orca-field:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--orca-ui-text-primary);
          -webkit-box-shadow: 0 0 0 1000px var(--login-field-autofill) inset;
          caret-color: var(--orca-ui-text-primary);
          transition: background-color 9999s ease-out;
        }

        .orca-remember-control {
          display: grid;
          height: 20px;
          width: 20px;
          flex: 0 0 20px;
          place-items: center;
          border: 1px solid var(--login-checkbox-border);
          border-radius: 4px;
          background: var(--login-checkbox-bg);
          transition: border-color .18s ease, background-color .18s ease, box-shadow .18s ease;
        }

        .orca-remember-control svg {
          opacity: 0;
          transform: scale(.72);
          transition: opacity .16s ease, transform .16s ease;
        }

        .orca-remember-input:checked + .orca-remember-control {
          border-color: #d9ad55;
          background: #d9ad55;
          color: #07182d;
        }

        .orca-remember-input:checked + .orca-remember-control svg {
          opacity: 1;
          transform: scale(1);
        }

        .orca-remember-input:focus-visible + .orca-remember-control {
          box-shadow: 0 0 0 3px rgba(217, 173, 85, .22);
        }

        .orca-submit {
          height: 64px;
          background: linear-gradient(90deg, #edc66d 0%, #d9ad55 48%, #e4ba61 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .26);
        }

        .orca-submit:not(:disabled):hover {
          filter: brightness(1.055);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, .3),
            0 10px 24px rgba(213, 164, 69, .14);
        }

        .orca-submit:not(:disabled):active {
          transform: translateY(1px);
        }

        .orca-language-switch,
        .orca-theme-switch {
          color: var(--login-brand-text);
          --tw-ring-offset-color: var(--login-focus-offset);
        }

        .orca-language-switch:hover,
        .orca-theme-switch:hover {
          background: var(--login-control-hover);
          color: var(--login-brand-text);
        }

        .orca-brand-word {
          color: var(--login-brand-text);
        }

        .orca-password-toggle:hover {
          background: var(--login-control-hover);
        }

        .orca-submit {
          --tw-ring-offset-color: var(--login-focus-offset);
        }

        .orca-login-footer {
          min-height: 82px;
          border-color: var(--login-footer-border);
          background: var(--login-footer-bg);
        }

        @media (min-width: 1024px) and (max-height: 760px) {
          .orca-login-header {
            height: 86px;
          }

          .orca-login-stage {
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .orca-login-card {
            padding-top: 24px;
            padding-bottom: 24px;
          }

          .orca-login-feedback {
            height: 40px;
          }

          .orca-field {
            height: 58px;
          }

          .orca-submit {
            height: 60px;
          }

          .orca-login-footer {
            min-height: 68px;
          }

        }

        @media (max-width: 1023px) {
          .orca-login-scene {
            inset: auto 0 0;
            width: 100%;
            height: auto;
            object-position: right bottom;
          }

          .orca-login-card {
            background: var(--login-card);
          }
        }

        @media (max-width: 639px) {
          .orca-brand {
            gap: 9px;
          }

          .orca-brand-mark {
            height: 42px;
            width: 34px;
          }

          .orca-brand-word {
            font-size: 28px;
          }

          .orca-brand-tagline {
            margin-top: 5px;
            font-size: 6px;
            letter-spacing: .22em;
          }

          .orca-login-feedback {
            height: 58px;
          }

          .orca-field {
            height: 58px;
          }

          .orca-submit {
            height: 58px;
          }

          .orca-login-footer {
            min-height: 0;
          }
        }
      `}</style>

      <div className="orca-login-shell" aria-hidden="true" />
      <div className="orca-login-visual" aria-hidden="true">
        <img
          src="/orca-login-background-light.png"
          alt=""
          className="orca-login-scene orca-login-scene-light"
          draggable={false}
        />
        <img
          src="/orca-login-background-original.png"
          alt=""
          className="orca-login-scene orca-login-scene-dark"
          draggable={false}
        />
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <header className="orca-login-header flex h-[112px] shrink-0 items-center justify-between px-5 sm:px-10 lg:px-[64px] xl:px-[78px]">
          <div className="orca-header-controls flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={isArabic ? 'تغيير اللغة إلى الإنجليزية' : 'Change language to Arabic'}
              className="orca-language-switch group flex h-10 items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)] focus-visible:ring-offset-2"
            >
              <GlobeIcon />
              <span dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'العربية' : 'English'}</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
              className="orca-theme-switch inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)] focus-visible:ring-offset-2"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <OrcaMark />
        </header>

        <main className="orca-login-stage flex min-h-0 flex-1 items-center px-5 py-5 sm:px-10 lg:px-[64px] xl:px-[78px]">
          <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 items-center lg:grid-cols-[minmax(450px,525px)_minmax(0,1fr)] lg:gap-[clamp(48px,7vw,120px)]">
            <section
              aria-labelledby="login-heading"
              dir={isArabic ? 'rtl' : 'ltr'}
              className="orca-login-card w-full max-w-[525px] justify-self-center rounded-[28px] border px-6 py-8 sm:px-9 sm:py-8 lg:-translate-y-[18px] lg:justify-self-start"
            >
              <div className="mx-auto w-full max-w-[445px]">
                <h1
                  id="login-heading"
                  className="text-center text-[32px] font-bold leading-tight tracking-[-0.015em] text-[var(--orca-ui-text-primary)] sm:text-[36px]"
                >
                  {isArabic ? 'تسجيل الدخول' : 'Sign in'}
                </h1>

                <div className="orca-login-feedback mt-2" aria-live="polite" aria-atomic="true">
                  {localizedError ? (
                    <div
                      id="login-error"
                      role="alert"
                      className="orca-login-alert rounded-[14px] border border-red-300/30 bg-red-950/40 px-4 text-center text-[13px] font-semibold leading-[1.45] text-red-100"
                    >
                      {localizedError}
                    </div>
                  ) : null}
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-[18px]">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-[15px] font-medium text-[var(--orca-ui-text-secondary)]">
                        {isArabic ? 'البريد الإلكتروني' : 'Email address'}
                      </label>
                      <div className="relative">
                        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--orca-ui-icon)] ${isArabic ? 'right-5' : 'left-5'}`}>
                          <MailIcon />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          required
                          dir="ltr"
                          aria-describedby={localizedError ? 'login-error' : undefined}
                          placeholder={isArabic ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                          className={`orca-field w-full rounded-[14px] border text-[15px] text-[var(--orca-ui-text-primary)] outline-none transition-colors placeholder:text-[var(--orca-ui-text-muted)] ${
                            isArabic ? 'pr-[58px] pl-5 text-left' : 'pl-[58px] pr-5 text-left'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="mb-2 block text-[15px] font-medium text-[var(--orca-ui-text-secondary)]">
                        {isArabic ? 'كلمة المرور' : 'Password'}
                      </label>
                      <div className="relative">
                        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--orca-ui-icon)] ${isArabic ? 'right-5' : 'left-5'}`}>
                          <LockIcon />
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          dir="ltr"
                          aria-describedby={localizedError ? 'login-error' : undefined}
                          placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'}
                          className={`orca-field w-full rounded-[14px] border text-[15px] text-[var(--orca-ui-text-primary)] outline-none transition-colors placeholder:text-[var(--orca-ui-text-muted)] ${
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
                          className={`orca-password-toggle absolute top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--orca-ui-icon)] transition-colors hover:text-[var(--orca-action-gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)] ${
                            isArabic ? 'left-4' : 'right-4'
                          }`}
                        >
                          <EyeIcon hidden={!showPassword} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-6 items-center">
                    <label className="inline-flex cursor-pointer items-center gap-3 text-[14px] text-[var(--orca-ui-text-secondary)] transition-colors hover:text-[var(--orca-ui-text-primary)]">
                      <input
                        type="checkbox"
                        name="remember"
                        className="orca-remember-input sr-only"
                      />
                      <span className="orca-remember-control" aria-hidden="true">
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.3">
                          <path d="m3.2 8.1 3 3.1 6.5-6.6" />
                        </svg>
                      </span>
                      <span>{isArabic ? 'تذكرني' : 'Remember me'}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (retryAfter !== null && retryAfter > 0)}
                    aria-busy={loading}
                    className="orca-submit mt-5 w-full rounded-[14px] text-[17px] font-bold text-[#07182d] transition-[filter,box-shadow,transform,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
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

                  <p className="sr-only">{tenantName}</p>
                </form>
              </div>
            </section>

            <div className="hidden min-h-[440px] lg:block" aria-hidden="true" />
          </div>
        </main>

        <footer className="orca-login-footer relative z-20 mt-auto shrink-0 border-t px-5 py-4 sm:px-10 lg:px-[64px] xl:px-[78px]">
          <div className="mx-auto flex h-full max-w-[1560px] flex-col-reverse items-center justify-between gap-4 text-[12px] text-[var(--orca-ui-text-secondary)] lg:flex-row">
            <nav aria-label={isArabic ? 'روابط السياسات والمساعدة' : 'Policy and help links'} className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <Link href="/terms-and-conditions" prefetch={false} className="flex items-center gap-2 transition-colors hover:text-[var(--orca-ui-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)]">
                <ShieldIcon />
                <span>{isArabic ? 'الشروط والأحكام' : 'Terms and conditions'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-[var(--orca-ui-divider)] sm:block" aria-hidden="true" />
              <Link href="/privacy-policy" prefetch={false} className="flex items-center gap-2 transition-colors hover:text-[var(--orca-ui-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)]">
                <LockIcon className="h-5 w-5" />
                <span>{isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-[var(--orca-ui-divider)] sm:block" aria-hidden="true" />
              <Link href="/disclaimer" prefetch={false} className="flex items-center gap-2 transition-colors hover:text-[var(--orca-ui-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)]">
                <HelpIcon />
                <span>{isArabic ? 'الأسئلة الشائعة' : 'Frequently asked questions'}</span>
              </Link>
              <span className="hidden h-5 w-px bg-[var(--orca-ui-divider)] sm:block" aria-hidden="true" />
              <span className="flex items-center gap-2">
                <MailIcon className="h-5 w-5" />
                <span>{isArabic ? 'تواصل معنا' : 'Contact us'}</span>
              </span>
            </nav>

            <p className="text-center text-[var(--orca-ui-text-muted)] lg:text-start">
              © {new Date().getFullYear()}{' '}
              <span className="font-semibold text-[var(--orca-ui-link)]">ORCA Real Estate</span>.{' '}
              {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
