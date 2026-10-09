import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { LoadingSpinner, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  GraduationCap,
  Users,
  QrCode,
  CalendarCheck,
  UserCheck,
  Settings,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  History
} from 'lucide-react';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    activeQRsCount: 0,
    usersCount: 0,
    todayAttendance: 0
  });
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsRes, classesRes, usersRes, dashRes, auditsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>('/students'),
        apiRequest<{ success: boolean; data: any[] }>('/classes'),
        apiRequest<{ success: boolean; data: any[] }>('/users'),
        apiRequest<any>('/dashboard/today'),
        apiRequest<{ success: boolean; data: any[] }>('/settings/audit-logs')
      ]);

      const activeQRs = studentsRes.data.filter((s: any) => s.qr_id && s.qr_status === 'active').length;

      setStats({
        studentsCount: studentsRes.data.length,
        classesCount: classesRes.data.length,
        activeQRsCount: activeQRs,
        usersCount: usersRes.data.length,
        todayAttendance: dashRes.stats.present + dashRes.stats.late
      });

      setRecentAudits(auditsRes.data.slice(0, 8));
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data ringkasan panel admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const adminModules = [
    {
      title: 'Manajemen Siswa',
      desc: 'Kelola data NIS, kelas, status siswa, dan pencetakan kartu.',
      path: '/admin/students',
      icon: GraduationCap,
      color: 'bg-blue-600',
      stat: `${stats.studentsCount} Siswa`
    },
    {
      title: 'Manajemen Kelas',
      desc: 'Pengaturan rombongan belajar tingkat 7, 8, dan 9.',
      path: '/admin/classes',
      icon: Users,
      color: 'bg-emerald-600',
      stat: `${stats.classesCount} Kelas`
    },
    {
      title: 'Manajemen QR Code',
      desc: 'Generate token acak kriptografi, cetak kartu, dan cabut token.',
      path: '/admin/qr',
      icon: QrCode,
      color: 'bg-indigo-600',
      stat: `${stats.activeQRsCount} QR Aktif`
    },
    {
      title: 'Koreksi & Data Absensi',
      desc: 'Verifikasi dan koreksi status kehadiran siswa disertai audit log.',
      path: '/admin/attendance',
      icon: CalendarCheck,
      color: 'bg-amber-600',
      stat: `${stats.todayAttendance} Hadir Hari Ini`
    },
    {
      title: 'Kelola Pengguna Sistem',
      desc: 'Manajemen akun Admin, Guru, dan Operator presensi.',
      path: '/admin/users',
      icon: UserCheck,
      color: 'bg-purple-600',
      stat: `${stats.usersCount} Akun`
    },
    {
      title: 'Pengaturan & Audit Trail',
      desc: 'Aturan jam mulai, tepat waktu, terlambat, dan log aktivitas.',
      path: '/admin/settings',
      icon: Settings,
      color: 'bg-slate-700',
      stat: 'WIB (Asia/Jakarta)'
    },
    {
      title: 'Laporan & Ekspor',
      desc: 'Rekapitulasi presensi berkala dengan ekspor format Excel & PDF.',
      path: '/admin/reports',
      icon: FileSpreadsheet,
      color: 'bg-teal-600',
      stat: 'Excel & PDF'
    }
  ];

  return (
    <AdminLayout
      currentPath="/admin/dashboard"
      navigate={navigate}
      title="Panel Kontrol Administrator"
      subtitle="Pusat manajemen dan administrasi sistem absensi QR Code sekolah"
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadData} /></div>}

      {loading ? (
        <LoadingSpinner message="Menyiapkan data administrasi..." />
      ) : (
        <div className="space-y-8">
          {/* Welcome Admin Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-md border border-indigo-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                  Status: Terotentikasi Penuh
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight">
                  Selamat Datang di Panel Manajemen
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Semua tindakan administratif penting akan dicatat secara otomatis ke dalam sistem Audit Log.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/scan')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition shrink-0"
            >
              Buka Scanner Presensi
            </button>
          </div>

          {/* Module Cards Grid */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">Modul Manajemen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.path}
                    onClick={() => navigate(mod.path)}
                    className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl text-white ${mod.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {mod.stat}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-4 group-hover:text-indigo-600 transition">
                        {mod.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{mod.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                      <span>Buka Modul</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Audit Logs Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Aktivitas Audit Log Terbaru</h3>
              </div>
              <button
                onClick={() => navigate('/admin/settings')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Lihat Semua Log
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentAudits.map((audit) => (
                <div key={audit.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{audit.action}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{audit.description}</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] shrink-0">
                    {new Date(audit.created_at).toLocaleTimeString('id-ID')} • {new Date(audit.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
