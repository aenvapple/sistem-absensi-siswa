import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  School,
  QrCode,
  LayoutDashboard,
  Shield,
  LogOut,
  Calendar,
  Clock,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { user, logout } = useAuth();
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateFormatted(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        })
      );
      setCurrentTimeFormatted(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta'
        }) + ' WIB'
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminClick = () => {
    navigate('/admin/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadge = {
    admin: { label: 'Administrator', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    teacher: { label: 'Guru / Tenaga Pengajar', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    operator: { label: 'Operator Presensi', bg: 'bg-blue-100 text-blue-800 border-blue-200' }
  }[user?.role || 'operator'];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shrink-0 ring-4 ring-blue-500/20">
              <School className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                SMP Negeri 1 Harapan Bangsa
              </h1>
              <p className="text-sm sm:text-base text-blue-400 font-medium mt-0.5">
                Sistem Absensi Siswa Berbasis QR Code
              </p>
            </div>
          </div>

          {/* Date & Time pill */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-right shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 justify-center sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentDateFormatted}</span>
            </div>
            <div className="flex items-center gap-2 text-base font-mono font-bold text-white mt-1 justify-center sm:justify-end">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{currentTimeFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Hub */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full flex flex-col justify-center">
        {/* User Greeting Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Selamat Datang,
              </div>
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <div className="text-xs text-slate-500 font-mono">ID Pengguna: @{user?.username}</div>
            </div>
          </div>

          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${roleBadge.bg}`}>
            {roleBadge.label}
          </span>
        </div>

        {/* 4 Main Action Tiles as specified in Section 8 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* 1. SCAN ABSENSI */}
          <button
            onClick={() => navigate('/scan')}
            className="group relative flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition duration-200 text-left cursor-pointer overflow-hidden border border-blue-500"
          >
            <div className="flex items-start justify-between">
              <div className="p-3.5 bg-white/10 rounded-xl backdrop-blur-xs">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-blue-200 group-hover:translate-x-1 transition" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block mb-1">
                Kamera & Presensi
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white">SCAN ABSENSI</h3>
              <p className="text-sm text-blue-100/90 mt-1">
                Buka scanner kamera perangkat untuk memindai kartu QR Code siswa secara cepat.
              </p>
            </div>
          </button>

          {/* 2. DASHBOARD */}
          <button
            onClick={() => navigate('/dashboard')}
            className="group relative flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition duration-200 text-left cursor-pointer border border-slate-200/90 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Monitoring Real-Time
              </span>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">DASHBOARD</h3>
              <p className="text-sm text-slate-500 mt-1">
                Pantau rekapitulasi kehadiran harian, statistik hadir, terlambat, dan filter kelas.
              </p>
            </div>
          </button>

          {/* 3. ADMIN (Requires Admin Verification) */}
          <button
            onClick={handleAdminClick}
            className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition duration-200 text-left cursor-pointer border overflow-hidden ${
              user?.role === 'admin'
                ? 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/90'
                : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3.5 rounded-xl ${user?.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                <Shield className="w-8 h-8" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Akses Khusus Admin
              </span>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">ADMIN</h3>
              <p className="text-sm text-slate-500 mt-1">
                Kelola siswa, rombel kelas, generate kartu QR, aturan absensi, pengguna, dan laporan.
              </p>
            </div>
          </button>

          {/* 4. LOGOUT */}
          <button
            onClick={handleLogout}
            className="group relative flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-rose-50 text-slate-900 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition duration-200 text-left cursor-pointer border border-slate-200/90 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600">
                <LogOut className="w-8 h-8" />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 group-hover:text-rose-600 transition" />
            </div>
            <div className="mt-8">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block mb-1">
                Akhiri Sesi
              </span>
              <h3 className="text-2xl font-black tracking-tight text-rose-700">LOGOUT</h3>
              <p className="text-sm text-slate-500 mt-1">
                Keluar dengan aman dari sistem dan hapus sesi autentikasi pada perangkat ini.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400">
        Sistem Absensi Siswa Berbasis QR Code • SMP Negeri 1 Harapan Bangsa
      </footer>
    </div>
  );
};
