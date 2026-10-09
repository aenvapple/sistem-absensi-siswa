import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { ClassItem } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Badge } from '../../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import { Users, Plus, Edit2, RotateCw, CheckCircle, XCircle, X } from 'lucide-react';

interface ClassesPageProps {
  navigate: (path: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ navigate }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Add / Edit Class
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('7');
  const [formAcademicYear, setFormAcademicYear] = useState('2025/2026');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ success: boolean; data: ClassItem[] }>('/classes');
      if (res.success) setClasses(res.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar kelas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormGrade('7');
    setFormAcademicYear('2025/2026');
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormGrade(String(cls.grade));
    setFormAcademicYear(cls.academic_year);
    setModalError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Nama kelas wajib diisi.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payload = {
        name: formName.trim(),
        grade: Number(formGrade),
        academic_year: formAcademicYear.trim()
      };

      if (editingClass) {
        await apiRequest(`/classes/${editingClass.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/classes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      loadClasses();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan kelas.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (cls: ClassItem) => {
    const nextStatus = cls.is_active === 1 ? 0 : 1;
    try {
      await apiRequest(`/classes/${cls.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextStatus })
      });
      loadClasses();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kelas.');
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/classes"
      navigate={navigate}
      title="Manajemen Data Kelas"
      subtitle="Kelola rombongan belajar tingkat VII, VIII, dan IX serta tahun ajaran"
      action={
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      }
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadClasses} /></div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Rombongan Belajar ({classes.length} kelas)
            </h3>
          </div>
          <button
            onClick={loadClasses}
            title="Muat Ulang"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Memuat rombongan belajar..." />
        ) : classes.length === 0 ? (
          <EmptyState
            title="Belum Ada Kelas"
            description="Tambahkan rombongan belajar pertama untuk mulai mengelompokkan siswa."
            actionText="Tambah Kelas Baru"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4">Tingkat / Grade</th>
                  <th className="py-3 px-4">Tahun Ajaran</th>
                  <th className="py-3 px-4">Jumlah Siswa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Kelas {cls.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Tingkat {cls.grade} (SMP)
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {cls.academic_year}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        {cls.student_count || 0} siswa
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={cls.is_active === 1 ? 'active' : 'inactive'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(cls)}
                          title="Ubah Kelas"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(cls)}
                          title={cls.is_active === 1 ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'}
                          className={`p-1.5 rounded-lg transition ${
                            cls.is_active === 1
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {cls.is_active === 1 ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingClass ? 'Ubah Data Kelas' : 'Tambah Rombongan Belajar'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: VII-C, VIII-A, IX-B"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tingkat (Grade) *
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tahun Ajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
