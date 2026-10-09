import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { School, LogIn, Lock, User as UserIcon, AlertCircle, Sparkles } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Harap masukkan username dan kata sandi.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username, password);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/20">
            <School className="w-9 h-9" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-white tracking-tight">
          SMP Negeri 1 Harapan Bangsa
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Sistem Presensi Siswa Terintegrasi Berbasis QR Code
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative rounded-xl shadow-inner">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative rounded-xl shadow-inner">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box - Section 36 */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Akun Uji Coba (Development Seed Only):</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="px-2.5 py-2 text-left bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition"
              >
                <span className="block text-[11px] font-bold text-white">Admin</span>
                <span className="block text-[10px] text-slate-400">admin123</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher', 'teacher123')}
                className="px-2.5 py-2 text-left bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition"
              >
                <span className="block text-[11px] font-bold text-white">Guru</span>
                <span className="block text-[10px] text-slate-400">teacher123</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('operator', 'operator123')}
                className="px-2.5 py-2 text-left bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition"
              >
                <span className="block text-[11px] font-bold text-white">Operator</span>
                <span className="block text-[10px] text-slate-400">operator123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
