import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Data sedang dimuat...',
  size = 'md'
}) => {
  const spinnerSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
      <Loader2 className={`${spinnerSize} animate-spin text-blue-600 mb-3`} />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({
  title = 'Belum ada data',
  description = 'Data tidak ditemukan atau belum ditambahkan.',
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
      <div className="p-3 bg-white rounded-full shadow-xs mb-3 text-slate-400">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const ErrorAlert: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry
}) => {
  return (
    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Terjadi kesalahan</p>
        <p className="text-red-700 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shrink-0 transition"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
};
