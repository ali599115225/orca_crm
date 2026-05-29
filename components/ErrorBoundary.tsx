// components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/operations';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0f19] transition-colors duration-300">
          <div className="max-w-md w-full p-8 rounded-2xl border border-rose-200 dark:border-rose-950/40 bg-white dark:bg-slate-900/60 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h1 className="text-lg font-black text-rose-600 dark:text-rose-400">
                عذراً، حدث خطأ غير متوقع في النظام
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                رصدت دروع الحماية خطأً في معالجة هذه الصفحة. تم عزل الخطأ بأمان للحفاظ على سرية واستقرار البيانات.
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-550 font-mono mt-1 select-all overflow-hidden text-ellipsis whitespace-nowrap bg-slate-50 dark:bg-slate-950/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">
                {this.state.error?.message || "Unknown Runtime Error"}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset = () => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                تحديث واستعادة الاتصال ➔
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-[0.98] transition-all cursor-pointer"
              >
                العودة للوحة القيادة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
