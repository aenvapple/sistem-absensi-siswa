import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { School, QrCode, LayoutDashboard, Shield, LogOut, Menu, X, User } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta'
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    admin: 'Administrator',
    teacher: 'Guru',
    operator: 'Operator'
  }[user?.role || 'operator'];

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Name */}
          <div
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-inner group-hover:bg-blue-500 transition">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight block leading-tight text-white">
                SMP Negeri 1 Harapan Bangsa
              </span>
              <span className="text-xs text-blue-400 font-medium block">
                Sistem Presensi Siswa QR Code
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/scan')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  currentPath === '/scan'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Scan Absensi</span>
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  currentPath.startsWith('/dashboard')
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Dashboard</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentPath.startsWith('/admin')
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Panel Admin</span>
                </button>
              )}
            </div>
          )}

          {/* Right Section: Time & User / Logout */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">{currentTime}</div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-blue-900/80 text-blue-300 border border-blue-700/50">
                  {roleLabel}
                </span>
              </div>
            </div>

            {user && (
              <button
                onClick={handleLogout}
                title="Keluar dari sistem"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-hidden"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <div className="p-3 bg-slate-800/80 rounded-lg mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-full text-white">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{roleLabel} • {currentTime}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              navigate('/scan');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800 text-sm font-medium"
          >
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>Scan Absensi</span>
          </button>

          <button
            onClick={() => {
              navigate('/dashboard');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800 text-sm font-medium"
          >
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            <span>Dashboard Kehadiran</span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => {
                navigate('/admin/dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800 text-sm font-medium"
            >
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>Panel Admin</span>
            </button>
          )}

          <div className="border-t border-slate-800 pt-2">
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
