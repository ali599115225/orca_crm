'use client';

import AppErrorFallback from '@/components/errors/AppErrorFallback';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps) {
  return (
    <html lang='ar' dir='rtl'>
      <body style={{ margin: 0 }}>
        <AppErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
