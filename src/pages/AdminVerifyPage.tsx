import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldAlert, Lock, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AdminVerifyPageProps {
  navigate: (path: string) => void;
  targetPath?: string;
}

export const AdminVerifyPage: React.FC<AdminVerifyPageProps> = ({
  navigate,
  targetPath = '/admin/dashboard'
}) => {
  const { user, verifyAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl p-6 text-center text-white">
          <div className="w-12 h-12 rounded-full bg-rose-600/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Akses Ditolak</h2>
          <p className="text-sm text-slate-400 mt-2">
            Akun Anda terdaftar sebagai <span className="font-semibold text-white">{user?.role}</span>. Halaman administrasi hanya dapat diakses oleh Administrator sekolah.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="mt-6 w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Masukkan kata sandi admin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyAdmin(password);
      navigate(targetPath);
    } catch (err: any) {
      setError(err.message || 'Verifikasi gagal. Kata sandi admin salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 sm:px-10 rounded-2xl shadow-2xl border border-slate-700">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center mb-3 ring-4 ring-indigo-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">VERIFIKASI AKSES ADMIN</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sebagai lapisan keamanan ganda, konfirmasi kata sandi administrator Anda untuk mengakses panel manajemen.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="flex-1 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi Admin
              </label>
              <div className="relative rounded-xl shadow-inner">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun admin"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-700/80 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Batal</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition"
              >
                {loading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
