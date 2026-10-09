import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { apiRequest } from '../../api/client.ts';
import { ClassItem } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  QrCode,
  Search,
  RotateCw,
  RefreshCw,
  Download,
  Printer,
  Ban,
  CheckCircle2,
  XCircle,
  Eye,
  School,
  X
} from 'lucide-react';

interface QRManagementPageProps {
  navigate: (path: string) => void;
}

export const QRManagementPage: React.FC<QRManagementPageProps> = ({ navigate }) => {
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [qrStatusFilter, setQrStatusFilter] = useState('');

  // Selected QR preview / card print modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/qr/list?';
      if (classFilter) url += `class_id=${classFilter}&`;
      if (qrStatusFilter) url += `qr_status=${qrStatusFilter}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const [qrRes, clsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>(url),
        apiRequest<{ success: boolean; data: ClassItem[] }>('/classes')
      ]);

      if (qrRes.success) setItems(qrRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data manajemen QR.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter, qrStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handlePreview = async (student: any) => {
    setSelectedStudent(student);
    if (student.qr_token) {
      const url = await QRCode.toDataURL(student.qr_token, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setPreviewQrUrl(url);
    } else {
      setPreviewQrUrl('');
    }
  };

  const handleGenerateNew = async (studentId: number) => {
    try {
      setActionLoading(true);
      await apiRequest(`/students/${studentId}/qr`, { method: 'POST' });
      await loadData();
      if (selectedStudent && selectedStudent.student_id === studentId) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal generate QR baru.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (qrId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin mencabut (revoke) kartu QR ini? Token ini tidak akan dapat digunakan lagi.')) {
      return;
    }

    try {
      setActionLoading(true);
      await apiRequest(`/qr/${qrId}/revoke`, { method: 'POST' });
      await loadData();
      if (selectedStudent) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mencabut QR.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadQr = (student: any, qrUrl: string) => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${student.student_code}_${student.student_name}.png`;
    link.click();
  };

  return (
    <AdminLayout
      currentPath="/admin/qr"
      navigate={navigate}
      title="Manajemen Kartu & QR Code"
      subtitle="Generate token unik acak kriptografi, cabut (revoke), unduh gambar, dan cetak kartu fisik"
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadData} /></div>}

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa atau NIS..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
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
            <select
              value={qrStatusFilter}
              onChange={(e) => setQrStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status QR</option>
              <option value="active">Memiliki QR Aktif</option>
              <option value="none">Belum Ada QR</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Kartu QR Siswa ({items.length} data)
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
          <LoadingSpinner message="Memuat data kartu QR..." />
        ) : items.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data QR"
            description="Tidak ada data siswa atau status kartu QR yang cocok dengan filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status QR</th>
                  <th className="py-3 px-4">Token QR (Kriptografi)</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.student_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.student_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.student_code} • NIS: {item.nis}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                        Kelas {item.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.qr_id && item.qr_status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tidak Ada / Dicabut</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 max-w-xs truncate">
                      {item.qr_token || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {item.generated_at ? new Date(item.generated_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.qr_token && (
                          <button
                            onClick={() => handlePreview(item)}
                            title="Pratinjau & Cetak Kartu"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateNew(item.student_id)}
                          disabled={actionLoading}
                          title={item.qr_id ? 'Generate Token Baru (Otomatis Cabut Yang Lama)' : 'Generate Token Pertama'}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {item.qr_id && item.qr_status === 'active' && (
                          <button
                            onClick={() => handleRevoke(item.qr_id)}
                            disabled={actionLoading}
                            title="Cabut (Revoke) Kartu QR"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Preview & Print Card */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
              Kartu Absensi QR Siswa
            </h3>

            {/* Printable Card Area */}
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border-2 border-blue-400/40 relative">
              <div className="flex items-center gap-3 border-b border-blue-500/30 pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight text-white">
                    SMP NEGERI 1 HARAPAN BANGSA
                  </h4>
                  <p className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">
                    KARTU ABSENSI SISWA
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center">
                {previewQrUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-md border-2 border-blue-300">
                    <img src={previewQrUrl} alt="QR Code" className="w-40 h-40" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Tidak ada QR
                  </div>
                )}

                <div className="mt-4 text-center w-full">
                  <h5 className="text-lg font-black tracking-tight text-white">
                    {selectedStudent.student_name}
                  </h5>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs text-blue-200">
                    <span className="font-semibold">Kelas {selectedStudent.class_name}</span>
                    <span>•</span>
                    <span>NIS: {selectedStudent.nis}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-slate-400">
                    {selectedStudent.student_code}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-500/30 flex justify-between items-center text-[9px] text-blue-300/80">
                <span>Tahun Ajaran 2025/2026</span>
                <span>Pindai pada mesin absensi</span>
              </div>
            </div>

            {/* Actions inside modal */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDownloadQr(selectedStudent, previewQrUrl)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
