import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { ClassItem, StudentDetail } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { LoadingSpinner, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface StudentFormPageProps {
  id?: string; // If provided, edit mode
  navigate: (path: string) => void;
}

export const StudentFormPage: React.FC<StudentFormPageProps> = ({ id, navigate }) => {
  const isEdit = Boolean(id);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [studentCode, setStudentCode] = useState('');
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');

  useEffect(() => {
    const init = async () => {
      try {
        const clsRes = await apiRequest<{ success: boolean; data: ClassItem[] }>('/classes');
        if (clsRes.success) setClasses(clsRes.data);

        if (isEdit && id) {
          const stuRes = await apiRequest<{ success: boolean; data: StudentDetail }>(`/students/${id}`);
          if (stuRes.success) {
            const s = stuRes.data;
            setStudentCode(s.student_code);
            setNis(s.nis);
            setName(s.name);
            setClassId(String(s.class_id));
            setGender(s.gender);
          }
        } else {
          // Suggest auto-generated student code
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          setStudentCode(`STD-2025${randomSuffix}`);
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data formulir siswa.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim() || !nis.trim() || !name.trim() || !classId) {
      setError('Harap lengkapi semua kolom formulir.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        student_code: studentCode.trim(),
        nis: nis.trim(),
        name: name.trim(),
        class_id: Number(classId),
        gender
      };

      if (isEdit && id) {
        await apiRequest(`/students/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/students', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      navigate('/admin/students');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data siswa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/students"
      navigate={navigate}
      title={isEdit ? 'Ubah Data Siswa' : 'Pendaftaran Siswa Baru'}
      subtitle={isEdit ? `Mengubah data profil siswa ID ${id}` : 'Mendaftarkan siswa dan secara otomatis membuatkan token QR Code unik'}
    >
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Siswa</span>
        </button>

        {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

        {loading ? (
          <LoadingSpinner message="Menyiapkan data siswa..." />
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* NIS and Student Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Nomor Induk Siswa (NIS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Contoh: 8411"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Harus unik di sekolah</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Kode Siswa (ID Sistem) *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="Contoh: STD-2025012"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Identifier unik untuk kartu</span>
                </div>
              </div>

              {/* Kelas & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Rombongan Belajar (Kelas) *
                  </label>
                  <select
                    required
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} (Tingkat {c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Jenis Kelamin *
                  </label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                      <input
                        type="radio"
                        name="gender"
                        value="L"
                        checked={gender === 'L'}
                        onChange={() => setGender('L')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Laki-laki (L)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                      <input
                        type="radio"
                        name="gender"
                        value="P"
                        checked={gender === 'P'}
                        onChange={() => setGender('P')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Perempuan (P)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Information callout */}
              {!isEdit && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-800 leading-relaxed">
                  <span className="font-bold">Informasi:</span> Setelah pendaftaran berhasil disimpan, sistem akan secara otomatis men-generate token acak kriptografi dan membuatkan kartu QR Code siap cetak untuk siswa ini.
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate('/admin/students')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Data Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
