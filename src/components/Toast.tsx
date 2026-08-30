import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-auto">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

        return (
          <div
            key={toast.id}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-[slideIn_0.2s_ease-out] ${
              isSuccess
                ? 'bg-[#0d131f]/95 border-emerald-500/40 text-emerald-300'
                : isError
                ? 'bg-[#0d131f]/95 border-red-500/40 text-red-300'
                : 'bg-[#0d131f]/95 border-slate-700 text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isSuccess ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-teal-400'}`} />
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
