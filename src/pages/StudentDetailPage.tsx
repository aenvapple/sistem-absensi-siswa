import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { apiRequest } from '../api/client.ts';
import { StudentDetail } from '../types/index.ts';
import { Badge } from '../components/Badge.tsx';
import { LoadingSpinner, ErrorAlert } from '../components/LoadingSpinner.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ArrowLeft,
  QrCode as QrIcon,
  Download,
  Printer,
  Ban,
  GraduationCap,
  Calendar,
  Clock,
  School,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';

interface StudentDetailPageProps {
  id: string;
  navigate: (path: string) => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({ id, navigate }) => {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ success: boolean; data: StudentDetail }>(`/students/${id}`);
      if (res.success) {
        setStudent(res.data);
        if (res.data.active_qr?.token) {
          generateQrImage(res.data.active_qr.token);
        } else {
          setQrDataUrl('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail siswa.');
    } finally {
      setLoading(false);
    }
  };

  const generateQrImage = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR code generation failed', err);
    }
  };

  useEffect(() => {
    fetchStudentDetail();
  }, [id]);

  const handleDownloadQr = () => {
    if (!qrDataUrl || !student) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${student.student_code}_${student.name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const handleRevokeQr = async () => {
    if (!student?.active_qr?.id) return;
    if (!window.confirm(`Yakin ingin mencabut (revoke) QR Code untuk ${student.name}? Siswa tidak akan dapat melakukan absensi dengan kartu ini sampai dibuatkan kartu baru.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await apiRequest(`/qr/${student.active_qr.id}/revoke`, { method: 'POST' });
      await fetchStudentDetail();
    } catch (err: any) {
      alert(err.message || 'Gagal mencabut QR Code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateNewQr = async () => {
    if (!student) return;
    try {
      setActionLoading(true);
      await apiRequest(`/students/${student.id}/qr`, { method: 'POST' });
      await fetchStudentDetail();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat QR Code baru.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <LoadingSpinner message="Memuat profil dan riwayat siswa..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ErrorAlert message={error || 'Siswa tidak ditemukan.'} onRetry={fetchStudentDetail} />
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 font-medium transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Dashboard</span>
      </button>

      {/* Student Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{student.name}</h1>
                <Badge status={student.status} size="sm" />
              </div>
              <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-mono font-medium text-slate-700">Kode: {student.student_code}</span>
                <span>•</span>
                <span>NIS: {student.nis}</span>
                <span>•</span>
                <span className="font-semibold text-blue-600">Kelas {student.class_name}</span>
                <span>•</span>
                <span>Jenis Kelamin: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCardModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Lihat & Cetak Kartu</span>
            </button>
            {user?.role === 'admin' && !student.active_qr && (
              <button
                onClick={handleGenerateNewQr}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Buat QR Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Presensi</span>
            <span className="text-xl font-black text-slate-800 mt-1 block">{student.stats.total}</span>
          </div>
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-[11px] font-bold uppercase text-emerald-700 block">Tepat Waktu</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">{student.stats.present}</span>
          </div>
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-center">
            <span className="text-[11px] font-bold uppercase text-amber-700 block">Terlambat</span>
            <span className="text-xl font-black text-amber-700 mt-1 block">{student.stats.late}</span>
          </div>
          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-center">
            <span className="text-[11px] font-bold uppercase text-blue-700 block">Izin</span>
            <span className="text-xl font-black text-blue-700 mt-1 block">{student.stats.excused}</span>
          </div>
          <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-center">
            <span className="text-[11px] font-bold uppercase text-purple-700 block">Sakit</span>
            <span className="text-xl font-black text-purple-700 mt-1 block">{student.stats.sick}</span>
          </div>
          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
            <span className="text-[11px] font-bold uppercase text-rose-700 block">Alpa</span>
            <span className="text-xl font-black text-rose-700 mt-1 block">{student.stats.absent}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: QR Card Info */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <QrIcon className="w-5 h-5 text-blue-600" />
                <span>Kartu QR Aktif</span>
              </h3>
              {student.active_qr ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                  Aktif
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200">
                  Belum Ada QR
                </span>
              )}
            </div>

            {student.active_qr && qrDataUrl ? (
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${student.name}`}
                  className="w-48 h-48 bg-white p-2 rounded-xl shadow-xs border border-slate-200"
                />
                <p className="mt-3 font-mono text-[11px] text-slate-500 text-center break-all">
                  Token: {student.active_qr.token}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Digenerate: {new Date(student.active_qr.generated_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <QrIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Siswa tidak memiliki QR Code aktif saat ini.</p>
              </div>
            )}
          </div>

          {/* Action Buttons for QR */}
          {student.active_qr && (
            <div className="mt-6 space-y-2">
              <button
                onClick={handleDownloadQr}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD GAMBAR QR</span>
              </button>

              <button
                onClick={() => setShowCardModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>PRINT KARTU SISWA</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={handleRevokeQr}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>REVOKE (CABUT) QR</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Attendance History Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Riwayat Presensi Siswa</span>
            </h3>
            <span className="text-xs text-slate-400">
              {student.attendances.length} catatan terakhir
            </span>
          </div>

          {student.attendances.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">Belum ada catatan presensi untuk siswa ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Waktu Presensi</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.attendances.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {rec.attendance_date}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {rec.check_in_time} WIB
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={rec.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {rec.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Printable Card Modal as specified in Section 20 */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
              Pratinjau Kartu Fisik Absensi
            </h3>

            {/* Physical Card Mockup / Print Area (Section 20) */}
            <div
              id="printable-card"
              className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border-2 border-blue-400/40 relative overflow-hidden"
            >
              {/* Card Header */}
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

              {/* Card Body: QR + Details */}
              <div className="mt-4 flex flex-col items-center">
                {qrDataUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-md border-2 border-blue-300">
                    <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    QR Belum Dibuat
                  </div>
                )}

                <div className="mt-4 text-center w-full">
                  <h5 className="text-lg font-black tracking-tight text-white">
                    {student.name}
                  </h5>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs text-blue-200">
                    <span className="font-semibold">Kelas {student.class_name}</span>
                    <span>•</span>
                    <span>NIS: {student.nis}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-slate-400">
                    {student.student_code}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-blue-500/30 flex justify-between items-center text-[9px] text-blue-300/80">
                <span>Tahun Ajaran 2025/2026</span>
                <span>Pindai pada mesin absensi</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrintCard}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
