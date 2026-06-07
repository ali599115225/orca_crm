'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

// Global Event Target for Toasts
class ToastEmitter extends EventTarget {
  emit(message: string, type: ToastType) {
    this.dispatchEvent(new CustomEvent('add_toast', { detail: { message, type } }));
  }
}

const toastEmitter = new ToastEmitter();

export const toast = {
  success: (message: string) => toastEmitter.emit(message, 'success'),
  error: (message: string) => toastEmitter.emit(message, 'error'),
  info: (message: string) => toastEmitter.emit(message, 'info'),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      const id = Math.random().toString(36).substring(2, 9);
      
      setToasts((prev) => [...prev, { id, ...customEvent.detail }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    toastEmitter.addEventListener('add_toast', handleAddToast);
    return () => {
      toastEmitter.removeEventListener('add_toast', handleAddToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl 
              backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5
              ${t.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
              ${t.type === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : ''}
              ${t.type === 'info' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
              bg-[var(--nc-surface-strong)]
            `}
            style={{ minWidth: '320px', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {t.type === 'success' && <CheckCircle2 size={20} />}
            {t.type === 'error' && <XCircle size={20} />}
            {t.type === 'info' && <Info size={20} />}
            
            <span className="text-sm font-semibold text-white flex-1">{t.message}</span>
            
            <button 
              onClick={() => removeToast(t.id)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
