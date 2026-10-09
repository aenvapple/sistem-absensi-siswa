import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { apiRequest } from '../api/client.ts';
import { ScanResult } from '../types/index.ts';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCw,
  Flashlight,
  ArrowLeft,
  Keyboard,
  Sparkles,
  UserCheck,
  Calendar,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ScanPageProps {
  navigate: (path: string) => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({ navigate }) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Play audio chime on success / warning / error
  const playFeedbackSound = (type: string) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'present') {
        // High double-beep for success
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'late') {
        // Single lower warning tone
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Low error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext might be restricted until user gesture
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanResult(null);

      // Clean up previous instance if any
      if (html5QrCodeRef.current && isScanningRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const qrScanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qrScanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await qrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleTokenScanned(decodedText);
        },
        () => {
          // Frame callback without detection - keep waiting
        }
      );

      isScanningRef.current = true;
      setScannerActive(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = qrScanner.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('[CAMERA_INIT_WARN]', err);
      setScannerActive(false);
      isScanningRef.current = false;
      const msg = err.message || err.toString();
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Izin akses kamera tidak diberikan. Harap izinkan akses kamera pada browser Anda.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setCameraError('Kamera tidak ditemukan pada perangkat ini. Anda dapat menggunakan mode input kode manual di bawah.');
        setShowManualInput(true);
      } else {
        setCameraError('Tidak dapat membuka kamera. Pastikan browser mendukung akses video atau gunakan input manual.');
        setShowManualInput(true);
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {
        // ignore
      }
      isScanningRef.current = false;
      setScannerActive(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as any
      });
      setTorchOn(nextState);
    } catch (err) {
      console.error('Torch toggle failed', err);
    }
  };

  const handleTokenScanned = async (token: string) => {
    if (processing || !token) return;

    // Immediately pause scanning while processing
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        isScanningRef.current = false;
        setScannerActive(false);
      } catch {
        // ignore
      }
    }

    setProcessing(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        code: string;
        message: string;
        data?: any;
      }>('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      if (res.success) {
        const isLate = res.data?.status === 'late';
        playFeedbackSound(isLate ? 'late' : 'present');
        setScanResult({
          type: isLate ? 'late' : 'success',
          title: isLate ? 'TERCATAT TERLAMBAT' : 'HADIR TEPAT WAKTU',
          message: res.message,
          data: res.data
        });
      }
    } catch (err: any) {
      const code = err.code || 'UNKNOWN_ERROR';
      if (code === 'ALREADY_ATTENDED') {
        playFeedbackSound('warning');
        setScanResult({
          type: 'already_attended',
          title: 'SUDAH MELAKUKAN ABSENSI',
          message: err.message,
          data: err.data
        });
      } else if (code === 'REVOKED_QR') {
        playFeedbackSound('error');
        setScanResult({
          type: 'revoked_qr',
          title: 'QR CODE TELAH DICABUT',
          message: err.message
        });
      } else if (code === 'INVALID_QR') {
        playFeedbackSound('error');
        setScanResult({
          type: 'invalid_qr',
          title: 'QR CODE TIDAK VALID',
          message: err.message
        });
      } else if (code === 'STUDENT_INACTIVE') {
        playFeedbackSound('error');
        setScanResult({
          type: 'error',
          title: 'SISWA NONAKTIF',
          message: err.message
        });
      } else {
        playFeedbackSound('error');
        setScanResult({
          type: 'error',
          title: 'GAGAL MEMPROSES ABSENSI',
          message: err.message || 'Terjadi kesalahan sistem atau jaringan.'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleNextScan = () => {
    setScanResult(null);
    setManualToken('');
    startCamera();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleTokenScanned(manualToken.trim());
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Header */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={() => {
            stopCamera();
            navigate('/home');
          }}
          className="flex items-center gap-2 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span>Scan Kartu Siswa</span>
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-lg transition ${torchOn ? 'text-amber-300 bg-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl mx-auto w-full">
        {/* State 1: Processing Scanner */}
        {processing && (
          <div className="w-full bg-slate-900 border border-blue-500/40 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center justify-center animate-pulse">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-4 animate-spin">
              <RotateCw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Memproses Absensi...</h3>
            <p className="text-sm text-slate-400 mt-1">
              Memverifikasi token QR Code siswa dengan data server
            </p>
          </div>
        )}

        {/* State 2: Display Scan Result (Success, Late, Duplicate, Invalid, Revoked) */}
        {!processing && scanResult && (
          <div className="w-full animate-in fade-in zoom-in-95 duration-200">
            {/* SUCCESS (PRESENT) */}
            {scanResult.type === 'success' && (
              <div className="bg-gradient-to-b from-emerald-950/80 to-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-emerald-900/20">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 px-3 py-1 bg-emerald-900/60 rounded-full border border-emerald-600">
                  HADIR TEPAT WAKTU
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-4 tracking-tight">
                  {scanResult.data?.student_name}
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-200/90 font-medium">
                  <span>Kelas {scanResult.data?.class_name}</span>
                  <span>•</span>
                  <span>NIS: {scanResult.data?.nis}</span>
                </div>

                <div className="mt-6 bg-slate-950/60 rounded-2xl p-4 border border-emerald-900/40 grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Jam Presensi</span>
                    <div className="flex items-center gap-1.5 text-base font-bold font-mono text-emerald-400 mt-0.5">
                      <Clock className="w-4 h-4" />
                      <span>{scanResult.data?.check_in_time} WIB</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Tanggal</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mt-0.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{scanResult.data?.attendance_date}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNextScan}
                  autoFocus
                  className="mt-8 w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/25 transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>SCAN BERIKUTNYA</span>
                </button>
              </div>
            )}

            {/* LATE (TERLAMBAT) */}
            {scanResult.type === 'late' && (
              <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-900/20">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-amber-500/10">
                  <Clock className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 px-3 py-1 bg-amber-900/60 rounded-full border border-amber-600">
                  TERCATAT TERLAMBAT
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-4 tracking-tight">
                  {scanResult.data?.student_name}
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-amber-200/90 font-medium">
                  <span>Kelas {scanResult.data?.class_name}</span>
                  <span>•</span>
                  <span>NIS: {scanResult.data?.nis}</span>
                </div>

                <div className="mt-6 bg-slate-950/60 rounded-2xl p-4 border border-amber-900/40 grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Jam Presensi</span>
                    <div className="flex items-center gap-1.5 text-base font-bold font-mono text-amber-400 mt-0.5">
                      <Clock className="w-4 h-4" />
                      <span>{scanResult.data?.check_in_time} WIB</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Catatan Sistem</span>
                    <span className="text-xs text-amber-300 font-medium mt-0.5 block">
                      Melewati batas tepat waktu
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleNextScan}
                  autoFocus
                  className="mt-8 w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>SCAN BERIKUTNYA</span>
                </button>
              </div>
            )}

            {/* ALREADY ATTENDED (DUPLICATE) */}
            {scanResult.type === 'already_attended' && (
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-blue-500/10">
                  <UserCheck className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400 px-3 py-1 bg-blue-900/60 rounded-full border border-blue-600">
                  SUDAH ABSEN HARI INI
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-4 tracking-tight">
                  {scanResult.data?.student_name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Siswa ini sudah melakukan presensi sebelumnya pada hari ini.
                </p>

                {scanResult.data && (
                  <div className="mt-6 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-left space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Kelas:</span>
                      <span className="text-white font-semibold">{scanResult.data.class_name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Waktu Absen:</span>
                      <span className="text-blue-400 font-mono font-bold">{scanResult.data.check_in_time} WIB</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Status Awal:</span>
                      <span className="text-white font-semibold capitalize">{scanResult.data.status_label || scanResult.data.status}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleNextScan}
                  autoFocus
                  className="mt-8 w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>OK • SCAN BERIKUTNYA</span>
                </button>
              </div>
            )}

            {/* REVOKED QR */}
            {scanResult.type === 'revoked_qr' && (
              <div className="bg-gradient-to-b from-rose-950/80 to-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-rose-500/10">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-rose-400 px-3 py-1 bg-rose-900/60 rounded-full border border-rose-600">
                  KARTU DICABUT (REVOKED)
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-4">
                  Kartu QR Tidak Berlaku
                </h2>
                <p className="text-sm text-rose-200/80 mt-2 max-w-sm mx-auto">
                  {scanResult.message}
                </p>

                <button
                  onClick={handleNextScan}
                  autoFocus
                  className="mt-8 w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>Scan Kartu Lain</span>
                </button>
              </div>
            )}

            {/* INVALID QR OR OTHER ERROR */}
            {(scanResult.type === 'invalid_qr' || scanResult.type === 'error') && (
              <div className="bg-gradient-to-b from-red-950/80 to-slate-900 border-2 border-red-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-red-500/10">
                  <XCircle className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-red-400 px-3 py-1 bg-red-900/60 rounded-full border border-red-600">
                  {scanResult.title}
                </span>
                <p className="text-sm text-red-200/90 mt-4 max-w-sm mx-auto">
                  {scanResult.message}
                </p>

                <button
                  onClick={handleNextScan}
                  autoFocus
                  className="mt-8 w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  <span>Coba Scan Lagi</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 3: Active Camera Scanner */}
        {!processing && !scanResult && (
          <div className="w-full flex flex-col items-center">
            {cameraError && (
              <div className="w-full mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-300">Pemberitahuan Kamera</p>
                  <p className="mt-0.5 text-xs text-amber-200/80">{cameraError}</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-2.5 py-1 bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shrink-0"
                >
                  Ulangi
                </button>
              </div>
            )}

            {/* Video Viewport Container */}
            <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700">
              <div id="qr-reader" className="w-full h-full"></div>

              {/* Target Aim Reticle */}
              {scannerActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-blue-400/80 rounded-2xl relative">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>
                    {/* Scanning laser line animation */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Arahkan kamera ke QR Code pada kartu fisik absensi siswa.
            </p>
          </div>
        )}

        {/* Manual Test Token Input Section (Crucial for desktop & testing scenarios) */}
        <div className="w-full mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <Keyboard className="w-4 h-4 text-blue-400" />
              <span>{showManualInput ? 'Sembunyikan Input Manual' : 'Input Kode / Uji Coba Cepat (Test Scenarios)'}</span>
            </button>
          </div>

          {showManualInput && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Ketik atau tempel token QR..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!manualToken.trim() || processing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                >
                  Proses
                </button>
              </form>

              {/* Quick test buttons for Section 37 attendance scenarios */}
              <div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Skenario Pengujian Sesuai Spesifikasi (Section 37):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTokenScanned('QR-AHMAD-FAUZI-2501')}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                  >
                    Ahmad Fauzi (Hadir)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTokenScanned('QR-BUDI-SANTOSO-2502')}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                  >
                    Budi Santoso (Hadir)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTokenScanned('QR-REVOKED-TEST-TOKEN-0007')}
                    className="px-2.5 py-1 text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800"
                  >
                    Kartu Revoked (Gita)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTokenScanned('QR-INVALID-RANDOM-TOKEN-9999')}
                    className="px-2.5 py-1 text-xs bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg border border-red-800"
                  >
                    Token Palsu / Invalid
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3 text-center text-[11px] text-slate-500 border-t border-slate-900">
        Waktu absensi otomatis dicatat berdasarkan waktu server sekolah.
      </div>
    </div>
  );
};
