import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { AttendanceRecord, ClassItem } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Badge } from '../../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  CalendarCheck,
  Search,
  Filter,
  Edit3,
  RotateCw,
  Clock,
  Calendar,
  AlertCircle,
  X
} from 'lucide-react';

interface AttendanceManagementPageProps {
  navigate: (path: string) => void;
}

export const AttendanceManagementPage: React.FC<AttendanceManagementPageProps> = ({ navigate }) => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  const [classFilter, setClassFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Edit / Correction Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('present');
  const [newTime, setNewTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/attendance?';
      if (dateFilter) url += `date=${dateFilter}&`;
      if (classFilter) url += `class_id=${classFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const [attRes, clsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: AttendanceRecord[] }>(url),
        apiRequest<{ success: boolean; data: ClassItem[] }>('/classes')
      ]);

      if (attRes.success) setAttendances(attRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat catatan absensi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, classFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setNewStatus(rec.status);
    setNewTime(rec.check_in_time);
    setReason('');
    setModalError(null);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!reason.trim()) {
      setModalError('Wajib mengisi alasan koreksi untuk pencatatan audit log.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      await apiRequest(`/attendance/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          check_in_time: newTime,
          notes: reason.trim()
        })
      });

      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal memperbarui catatan absensi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/attendance"
      navigate={navigate}
      title="Manajemen & Koreksi Absensi"
      subtitle="Lihat catatan presensi seluruh siswa dan lakukan koreksi status (izin, sakit, alpa) disertai audit log"
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadData} /></div>}

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Kelas</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status Kehadiran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="excused">Izin</option>
              <option value="sick">Sakit</option>
              <option value="absent">Alpa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Siswa / NIS</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Catatan Presensi ({attendances.length} baris)
            </h3>
          </div>
          <button
            onClick={loadData}
            title="Muat Ulang"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Memuat data absensi..." />
        ) : attendances.length === 0 ? (
          <EmptyState
            title="Tidak Ada Catatan"
            description="Tidak ditemukan data presensi pada tanggal dan filter yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan / Alasan</th>
                  <th className="py-3 px-4 text-right">Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{rec.student_name}</div>
                      <div className="text-xs text-slate-400 font-mono">NIS: {rec.nis}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                        {rec.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {rec.attendance_date}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono font-bold text-slate-800">
                      {rec.check_in_time} WIB
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={rec.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {rec.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(rec)}
                        title="Koreksi Status Absensi"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Koreksi</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Correction Modal - Section 24 */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Koreksi Status Presensi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perubahan status akan dicatat secara otomatis ke dalam audit log sekolah.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs border border-slate-200">
              <div className="font-bold text-slate-900">{editingRecord.student_name}</div>
              <div className="text-slate-500">Kelas {editingRecord.class_name} • Tanggal {editingRecord.attendance_date}</div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status Kehadiran Baru *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="present">Hadir (Tepat Waktu)</option>
                  <option value="late">Terlambat</option>
                  <option value="excused">Izin (Surat Keterangan)</option>
                  <option value="sick">Sakit (Surat Dokter)</option>
                  <option value="absent">Alpa (Tanpa Keterangan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Waktu Presensi (HH:MM:SS) *
                </label>
                <input
                  type="text"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Alasan Koreksi (Wajib untuk Audit Log) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Siswa membawa surat dokter dari Puskesmas..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
