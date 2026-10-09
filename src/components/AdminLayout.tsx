import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  QrCode,
  CalendarCheck,
  UserCheck,
  Settings,
  FileSpreadsheet,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPath,
  navigate,
  title,
  subtitle,
  action,
  children
}) => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard Admin', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Data Siswa', path: '/admin/students', icon: GraduationCap },
    { label: 'Data Kelas', path: '/admin/classes', icon: Users },
    { label: 'Manajemen QR', path: '/admin/qr', icon: QrCode },
    { label: 'Data Absensi', path: '/admin/attendance', icon: CalendarCheck },
    { label: 'Kelola Pengguna', path: '/admin/users', icon: UserCheck },
    { label: 'Pengaturan & Audit', path: '/admin/settings', icon: Settings },
    { label: 'Laporan & Ekspor', path: '/admin/reports', icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 md:min-h-screen flex flex-col">
        {/* Admin Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Panel Admin</h2>
              <span className="text-[11px] text-indigo-400 font-medium">Terverifikasi</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/home')}
            title="Kembali ke Beranda"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="font-semibold text-slate-300">{user?.name}</p>
              <p className="text-slate-500 font-mono text-[10px]">@{user?.username}</p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Beranda
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
