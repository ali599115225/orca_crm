'use client';

import AppErrorFallback from '@/components/errors/AppErrorFallback';

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps) {
  return <AppErrorFallback error={error} reset={reset} />;
}
