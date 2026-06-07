'use client';

import { useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[var(--nc-surface-solid)] border border-white/10 p-6 rounded-2xl ${maxWidth} w-full shadow-2xl text-right text-xs`}>
        {title && (
          <h3 className="text-base font-extrabold text-[var(--nc-text-secondary)] border-b border-[var(--nc-glass-border)] pb-2 mb-4 flex items-center justify-between">
            <span>{title}</span>
            <button onClick={onClose} className="text-[var(--nc-text-dim)] font-medium hover:text-white transition-colors text-lg leading-none">&times;</button>
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
