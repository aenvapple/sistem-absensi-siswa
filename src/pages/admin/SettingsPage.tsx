import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { AttendanceRule, AuditLogItem } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { LoadingSpinner, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  Settings as SettingsIcon,
  History,
  Save,
  Clock,
  School,
  Globe,
  RotateCw,
  CheckCircle2
} from 'lucide-react';

interface SettingsPageProps {
  navigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ navigate }) => {
  const [rule, setRule] = useState<AttendanceRule | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [schoolName, setSchoolName] = useState('');
  const [checkInStart, setCheckInStart] = useState('06:30');
  const [onTimeUntil, setOnTimeUntil] = useState('07:00');
  const [lateUntil, setLateUntil] = useState('07:45');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ruleRes, logRes] = await Promise.all([
        apiRequest<{ success: boolean; data: AttendanceRule }>('/settings/attendance'),
        apiRequest<{ success: boolean; data: AuditLogItem[] }>('/settings/audit-logs')
      ]);

      if (ruleRes.success && ruleRes.data) {
        setRule(ruleRes.data);
        setSchoolName(ruleRes.data.school_name);
        setCheckInStart(ruleRes.data.check_in_start);
        setOnTimeUntil(ruleRes.data.on_time_until);
        setLateUntil(ruleRes.data.late_until);
        setTimezone(ruleRes.data.timezone || 'Asia/Jakarta');
      }

      if (logRes.success) {
        setAuditLogs(logRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await apiRequest<{ success: boolean; message: string }>('/settings/attendance', {
        method: 'PUT',
        body: JSON.stringify({
          school_name: schoolName,
          check_in_start: checkInStart,
          on_time_until: onTimeUntil,
          late_until: lateUntil,
          timezone
        })
      });

      setSuccessMsg(res.message || 'Pengaturan berhasil disimpan.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/settings"
      navigate={navigate}
      title="Pengaturan Aturan Presensi & Audit Log"
      subtitle="Konfigurasi parameter waktu absensi server dan pengawasan riwayat aktivitas audit trail"
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadData} /></div>}

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Memuat pengaturan dan audit log..." />
      ) : (
        <div className="space-y-8">
          {/* Settings Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <SettingsIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Aturan Batas Waktu Presensi (Server Rules)
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Nama Resmi Sekolah *
                </label>
                <div className="relative">
                  <School className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Contoh: SMP Negeri 1 Harapan Bangsa"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Jam Mulai Presensi (Check-in) *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="time"
                      required
                      value={checkInStart}
                      onChange={(e) => setCheckInStart(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Contoh: 06:30 WIB</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Batas Tepat Waktu (Hadir) *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3 text-emerald-500" />
                    <input
                      type="time"
                      required
                      value={onTimeUntil}
                      onChange={(e) => setOnTimeUntil(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block">S.d jam ini: Status HADIR</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Batas Akhir Terlambat *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3 text-amber-500" />
                    <input
                      type="time"
                      required
                      value={lateUntil}
                      onChange={(e) => setLateUntil(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-amber-600 mt-1 block">Setelah batas hadir: TERLAMBAT</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Zona Waktu Server *
                </label>
                <div className="relative max-w-sm">
                  <Globe className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB - UTC+7)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA - UTC+8)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT - UTC+9)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Aturan'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs Inspector Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Audit Trail & Rekaman Log Sistem
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mencatat seluruh aksi penting (generate QR, revoke QR, koreksi status, pembuatan user/siswa)
                  </p>
                </div>
              </div>
              <button
                onClick={loadData}
                title="Muat Ulang Log"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Waktu</th>
                    <th className="py-2.5 px-4">Aktor / Pengguna</th>
                    <th className="py-2.5 px-4">Aksi</th>
                    <th className="py-2.5 px-4">Tabel</th>
                    <th className="py-2.5 px-4">Deskripsi Aktivitas</th>
                    <th className="py-2.5 px-4">Alamat IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <span className="font-semibold text-slate-900">{log.user_name || 'System'}</span>
                        {log.role && <span className="ml-1 text-[10px] text-slate-400">({log.role})</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{log.table_name}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-800 max-w-md">
                        {log.description}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
