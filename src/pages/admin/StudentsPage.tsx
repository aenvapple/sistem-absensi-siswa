import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { Student, ClassItem } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Badge } from '../../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  QrCode,
  CheckCircle,
  XCircle,
  RotateCw
} from 'lucide-react';

interface StudentsPageProps {
  navigate: (path: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ navigate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/students?';
      if (classFilter) url += `class_id=${classFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const [stuRes, clsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: Student[] }>(url),
        apiRequest<{ success: boolean; data: ClassItem[] }>('/classes')
      ]);

      if (stuRes.success) setStudents(stuRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar siswa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleToggleStatus = async (student: Student) => {
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = nextStatus === 'inactive'
      ? `Nonaktifkan siswa "${student.name}"? Data kehadiran historis akan tetap tersimpan.`
      : `Aktifkan kembali siswa "${student.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiRequest(`/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status siswa.');
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/students"
      navigate={navigate}
      title="Manajemen Data Siswa"
      subtitle="Kelola identitas siswa, kelas, status keaktifan, dan token kartu QR"
      action={
        <button
          onClick={() => navigate('/admin/students/create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa Baru</span>
        </button>
      }
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadData} /></div>}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau kode siswa..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif Saja</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Siswa ({students.length} orang)
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
          <LoadingSpinner message="Memuat data siswa..." />
        ) : students.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Siswa"
            description="Tidak ada data siswa yang cocok dengan pencarian atau filter yang ditentukan."
            actionText="Tambah Siswa Pertama"
            onAction={() => navigate('/admin/students/create')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">NIS / Kode</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Kartu QR</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      <div>NIS: {student.nis}</div>
                      <div className="text-slate-400">{student.student_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-800">
                        Kelas {student.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={student.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      {student.qr_id && student.qr_status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>QR Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>Belum Ada QR</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/dashboard/student/${student.id}`)}
                          title="Lihat Detail & Kartu QR"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                          title="Edit Siswa"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(student)}
                          title={student.status === 'active' ? 'Nonaktifkan Siswa' : 'Aktifkan Siswa'}
                          className={`p-1.5 rounded-lg transition ${
                            student.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {student.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
