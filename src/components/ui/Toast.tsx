// ==============================================================================
// src/components/ui/Toast.tsx
// Global Notification Toast Primitive
// ==============================================================================

'use client';

import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (messageOrOptions: string | ToastOptions, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ title?: string; message: string; type: ToastType } | null>(null);

  const showToast = (messageOrOptions: string | ToastOptions, type: ToastType = 'success') => {
    if (typeof messageOrOptions === 'string') {
      setToast({ message: messageOrOptions, type });
    } else {
      setToast({
        title: messageOrOptions.title,
        message: messageOrOptions.message,
        type: messageOrOptions.type || 'success',
      });
    }
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div
            className={cn(
              'flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold backdrop-blur-md max-w-sm',
              toast.type === 'error' && 'bg-rose-50 text-rose-900 border-rose-200',
              toast.type === 'success' && 'bg-slate-900 text-white border-slate-800',
              toast.type === 'info' && 'bg-emerald-50 text-emerald-900 border-emerald-200',
              toast.type === 'warning' && 'bg-amber-50 text-amber-900 border-amber-200'
            )}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              {toast.title && <p className="font-extrabold text-xs mb-0.5">{toast.title}</p>}
              <p className="font-medium text-xs leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
