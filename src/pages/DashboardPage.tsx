import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.ts';
import { DashboardData, ClassItem, AttendanceRecord } from '../types/index.ts';
import { Badge } from '../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../components/LoadingSpinner.tsx';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Calendar,
  Filter,
  Search,
  RotateCw,
  Percent,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface DashboardPageProps {
  navigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/dashboard/today?date=${selectedDate}`;
      if (selectedClassId) {
        url += `&class_id=${selectedClassId}`;
      }

      const res = await apiRequest<DashboardData>(url);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: ClassItem[] }>('/classes');
      if (res.success) {
        setClasses(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, selectedClassId]);

  // Client-side filtering for search & status on loaded attendances
  const filteredAttendances = (data?.attendances || []).filter((item: AttendanceRecord) => {
    if (selectedStatus && item.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.student_name.toLowerCase().includes(q);
      const matchCode = item.student_code.toLowerCase().includes(q);
      const matchNis = item.nis.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchNis) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Kehadiran Siswa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Data presensi harian berbasis server database real-time • {data?.rule?.schoolName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl shadow-xs transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Perbarui Data</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchDashboardData} /></div>}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{data?.stats.totalStudents ?? 0}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Siswa Terdaftar</span>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Hadir Tepat</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-600">{data?.stats.present ?? 0}</span>
            <span className="text-xs text-emerald-700/80 block mt-0.5">
              Sebelum {data?.rule?.onTimeUntil || '07:00'}
            </span>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Terlambat</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600">{data?.stats.late ?? 0}</span>
            <span className="text-xs text-amber-700/80 block mt-0.5">
              Setelah {data?.rule?.onTimeUntil || '07:00'}
            </span>
          </div>
        </div>

        {/* Belum Hadir / Belum Absen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Belum Hadir</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-700">{data?.stats.notYetPresent ?? 0}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Belum Scan Hari Ini</span>
          </div>
        </div>

        {/* Persentase Kehadiran */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold uppercase tracking-wider">Tingkat Kehadiran</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-blue-600">{data?.stats.attendanceRate ?? 0}%</span>
            <span className="text-xs text-blue-600/80 block mt-0.5">Hadir & Terlambat</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Kehadiran</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Absensi</label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} ({c.student_count || 0} siswa)
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status Kehadiran</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir (Tepat Waktu)</option>
              <option value="late">Terlambat</option>
              <option value="excused">Izin</option>
              <option value="sick">Sakit</option>
              <option value="absent">Alpa</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cari Nama / NIS</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Presensi ({filteredAttendances.length} catatan)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Tanggal: {selectedDate}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Memuat catatan presensi..." />
        ) : filteredAttendances.length === 0 ? (
          <EmptyState
            title="Belum Ada Catatan Presensi"
            description="Tidak ada data presensi yang sesuai dengan filter atau tanggal yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Waktu Absen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendances.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.student_name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.student_code} • NIS: {item.nis}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2.5 py-0.5 bg-slate-100 rounded-md font-medium text-xs text-slate-700">
                        {item.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800">
                      {item.check_in_time} WIB
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/dashboard/student/${item.student_id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
