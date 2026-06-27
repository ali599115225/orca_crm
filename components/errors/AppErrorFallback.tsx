'use client';

import { useEffect, useRef, useState } from 'react';

type BoundaryError = Error & {
  digest?: string;
};

type AppErrorFallbackProps = {
  error: BoundaryError;
  reset: () => void;
};

const COPY = {
  ar: {
    eyebrow: 'تعذر إكمال الطلب',
    title: 'حدث خطأ غير متوقع',
    description:
      'لم يتم عرض أي تفاصيل تقنية حفاظًا على أمان بياناتك. أعد المحاولة، وإن استمر الخطأ فارجع إلى صفحة العمليات.',
    retry: 'إعادة المحاولة',
    home: 'العودة إلى العمليات',
    language: 'English',
    languageLabel: 'Switch to English',
  },
  en: {
    eyebrow: 'Request could not be completed',
    title: 'An unexpected error occurred',
    description:
      'Technical details are hidden to protect your data. Try again, or return to the operations page if the issue continues.',
    retry: 'Try again',
    home: 'Return to operations',
    language: 'العربية',
    languageLabel: 'التبديل إلى العربية',
  },
} as const;

export default function AppErrorFallback({
  error,
  reset,
}: AppErrorFallbackProps) {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const documentLanguage = document.documentElement.lang.toLowerCase();
    if (documentLanguage.startsWith('en')) {
      setLanguage('en');
    }

    headingRef.current?.focus();

    const digest = error.digest?.trim();
    console.error('[ORCA-UI-ERROR]', {
      digest: digest || 'unavailable',
    });
  }, [error.digest]);

  const copy = COPY[language];
  const isArabic = language === 'ar';

  return (
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at top, #172554 0%, #0f172a 42%, #020617 100%)',
        color: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section
        role='alert'
        aria-live='assertive'
        style={{
          width: 'min(100%, 640px)',
          border: '1px solid rgba(148, 163, 184, 0.28)',
          borderRadius: '24px',
          padding: '32px',
          background: 'rgba(15, 23, 42, 0.92)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.38)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#93c5fd',
            }}
          >
            ORCA CRM
          </span>

          <button
            type='button'
            aria-label={copy.languageLabel}
            onClick={() =>
              setLanguage((current) => (current === 'ar' ? 'en' : 'ar'))
            }
            style={{
              border: '1px solid rgba(148, 163, 184, 0.4)',
              borderRadius: '999px',
              padding: '8px 14px',
              background: 'transparent',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            {copy.language}
          </button>
        </div>

        <p
          style={{
            margin: '0 0 10px',
            color: '#fbbf24',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          {copy.eyebrow}
        </p>

        <h1
          ref={headingRef}
          tabIndex={-1}
          style={{
            margin: '0 0 16px',
            fontSize: 'clamp(28px, 5vw, 42px)',
            lineHeight: 1.2,
            outline: 'none',
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            margin: 0,
            color: '#cbd5e1',
            fontSize: '16px',
            lineHeight: 1.8,
          }}
        >
          {copy.description}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '28px',
          }}
        >
          <button
            type='button'
            onClick={reset}
            style={{
              border: 0,
              borderRadius: '12px',
              padding: '12px 20px',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copy.retry}
          </button>

          <button
            type='button'
            onClick={() => window.location.assign('/operations')}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.45)',
              borderRadius: '12px',
              padding: '12px 20px',
              background: 'transparent',
              color: '#f8fafc',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copy.home}
          </button>
        </div>
      </section>
    </main>
  );
}
