import React from 'react';
import { CheckCircle2, Clock, AlertCircle, HelpCircle, XCircle } from 'lucide-react';
import { AttendanceStatus } from '../types/index.ts';

interface BadgeProps {
  status: AttendanceStatus | 'active' | 'inactive' | 'revoked';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  };

  switch (status) {
    case 'present':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses[size]}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Hadir (Tepat Waktu)</span>
        </span>
      );
    case 'late':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses[size]}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Terlambat</span>
        </span>
      );
    case 'excused':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses[size]}`}>
          <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Izin</span>
        </span>
      );
    case 'sick':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses[size]}`}>
          <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Sakit</span>
        </span>
      );
    case 'absent':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses[size]}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Alpa</span>
        </span>
      );
    case 'active':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses[size]}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-0.5"></span>
          <span>Aktif</span>
        </span>
      );
    case 'inactive':
      return (
        <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-300 ${sizeClasses[size]}`}>
          <span className="w-2 h-2 rounded-full bg-gray-400 mr-0.5"></span>
          <span>Nonaktif</span>
        </span>
      );
    case 'revoked':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses[size]}`}>
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>Dicabut (Revoked)</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-200 ${sizeClasses[size]}`}>
          {status}
        </span>
      );
  }
};
