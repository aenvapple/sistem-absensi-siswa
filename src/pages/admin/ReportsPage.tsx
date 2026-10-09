import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../../api/client.ts';
import { ClassItem, AttendanceRecord } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Badge } from '../../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  RotateCw,
  Printer
} from 'lucide-react';

interface ReportsPageProps {
  navigate: (path: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ navigate }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default past 7 days
    return d.toLocaleDateString('en-CA');
  });
  const [dateTo, setDateTo] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Report Data
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    sick: 0,
    excused: 0,
    absent: 0
  });

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/reports/summary?from=${dateFrom}&to=${dateTo}&`;
      if (classFilter) url += `class_id=${classFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const [repRes, clsRes] = await Promise.all([
        apiRequest<{ success: boolean; summary: any; data: AttendanceRecord[] }>(url),
        apiRequest<{ success: boolean; data: ClassItem[] }>('/classes')
      ]);

      if (repRes.success) {
        setReportData(repRes.data);
        setSummary(repRes.summary);
      }
      if (clsRes.success) {
        setClasses(clsRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat rekapitulasi laporan presensi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo, classFilter, statusFilter]);

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      alert('Tidak ada data yang dapat diekspor.');
      return;
    }

    const rows = reportData.map((r, i) => ({
      No: i + 1,
      Tanggal: r.attendance_date,
      Waktu: r.check_in_time,
      NIS: r.nis,
      'Kode Siswa': r.student_code,
      'Nama Siswa': r.student_name,
      Kelas: r.class_name,
      Status: r.status === 'present' ? 'Hadir (Tepat Waktu)' :
              r.status === 'late' ? 'Terlambat' :
              r.status === 'excused' ? 'Izin' :
              r.status === 'sick' ? 'Sakit' : 'Alpa',
      Catatan: r.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Presensi');

    XLSX.writeFile(workbook, `Laporan_Absensi_SMP_${dateFrom}_sd_${dateTo}.xlsx`);
  };

  const handleExportPdf = () => {
    if (reportData.length === 0) {
      alert('Tidak ada data yang dapat diekspor.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('SMP NEGERI 1 HARAPAN BANGSA', 14, 15);
    doc.setFontSize(12);
    doc.text('Laporan Rekapitulasi Presensi Siswa Berbasis QR Code', 14, 22);
    doc.setFontSize(10);
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 28);
    doc.text(`Total Kehadiran: ${summary.total} (Hadir: ${summary.present}, Terlambat: ${summary.late}, Izin: ${summary.excused}, Sakit: ${summary.sick}, Alpa: ${summary.absent})`, 14, 34);

    let y = 42;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('No', 14, y);
    doc.text('Tanggal', 22, y);
    doc.text('Waktu', 44, y);
    doc.text('NIS', 62, y);
    doc.text('Nama Siswa', 80, y);
    doc.text('Kelas', 140, y);
    doc.text('Status', 160, y);

    doc.setLineWidth(0.3);
    doc.line(14, y + 2, 196, y + 2);

    y += 7;
    doc.setFont('helvetica', 'normal');

    reportData.slice(0, 35).forEach((item, index) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
      }
      doc.text(String(index + 1), 14, y);
      doc.text(item.attendance_date, 22, y);
      doc.text(item.check_in_time.slice(0, 5), 44, y);
      doc.text(item.nis, 62, y);
      doc.text(item.student_name.slice(0, 26), 80, y);
      doc.text(item.class_name, 140, y);
      doc.text(item.status.toUpperCase(), 160, y);
      y += 6;
    });

    doc.save(`Laporan_Absensi_SMP_${dateFrom}_sd_${dateTo}.pdf`);
  };

  return (
    <AdminLayout
      currentPath="/admin/reports"
      navigate={navigate}
      title="Laporan Presensi & Ekspor Data"
      subtitle="Unduh rekapitulasi data kehadiran siswa dalam format file Excel dan dokumen cetak PDF"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT EXCEL</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <FileText className="w-4 h-4" />
            <span>EXPORT PDF</span>
          </button>
        </div>
      }
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadReport} /></div>}

      {/* Summary metric bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Record</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.total}</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-700 block">Hadir Tepat</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{summary.present}</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-amber-700 block">Terlambat</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{summary.late}</span>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-blue-700 block">Izin</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">{summary.excused}</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-purple-700 block">Sakit</span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">{summary.sick}</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center shadow-xs">
          <span className="text-[11px] font-bold uppercase text-rose-700 block">Alpa</span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{summary.absent}</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Periode & Kriteria Laporan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rombongan Belajar (Kelas)</label>
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
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Rincian Rekapitulasi Presensi ({reportData.length} baris)
            </h3>
          </div>
          <button
            onClick={loadReport}
            title="Muat Ulang"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Menghitung rekapitulasi data presensi..." />
        ) : reportData.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Pada Periode Ini"
            description="Ubah rentang tanggal atau filter kelas untuk menampilkan data presensi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-800">
                      {item.attendance_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800">
                      {item.check_in_time} WIB
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {item.nis}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.student_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                        {item.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
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
