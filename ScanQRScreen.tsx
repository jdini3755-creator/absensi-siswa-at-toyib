import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Keyboard,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Lock,
  Pause,
  Play,
  Upload,
  Clock,
  History,
  X,
  AlertTriangle,
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, AttendanceRecord, AttendanceStatus, User } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface ScanQRScreenProps {
  onBack: () => void;
  students: Student[];
  onAttendanceScanned: (record: AttendanceRecord) => void;
  existingAttendance: AttendanceRecord[];
  currentUser: User;
  isOffline: boolean;
}

export const ScanQRScreen: React.FC<ScanQRScreenProps> = ({
  onBack,
  students,
  onAttendanceScanned,
  existingAttendance,
  currentUser,
  isOffline,
}) => {
  const isSiswa = currentUser.role === 'siswa';

  // 1. RBAC Check: Block student access completely
  if (isSiswa) {
    return (
      <div className="flex-1 w-full bg-[#121816] text-white flex flex-col justify-between p-6 select-none">
        <header className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">
            Scan QR Code
          </h1>
        </header>

        <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 ring-8 ring-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-base font-bold text-white mb-2">Akses Ditolak</h2>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-6">
            Fitur scan absensi hanya dapat digunakan oleh guru dan admin/kepala sekolah. Siswa tidak diizinkan melakukan pemindaian absensi mandiri.
          </p>

          <button
            onClick={onBack}
            className="py-2.5 px-6 rounded-xl bg-[#078749] hover:bg-[#075B36] text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          SMP Islam At-Toyib 45 • Sistem Keamanan Absensi
        </div>
      </div>
    );
  }

  // Camera & Video States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Scanning Cooldown & Results
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const [scanStatusToast, setScanStatusToast] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    description: string;
    student?: Student;
  } | null>(null);

  // Recent Scans history (displayed below camera)
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>(() => {
    return existingAttendance
      .filter((a) => a.tanggal === '2026-10-28' && a.sumber === 'SCAN')
      .slice(-5)
      .reverse();
  });

  // Overwrite Confirmation Modal (e.g. if student was previously Izin/Sakit)
  const [overwriteConfirmModal, setOverwriteConfirmModal] = useState<{
    student: Student;
    existingRecord: AttendanceRecord;
    intendedStatus: AttendanceStatus;
  } | null>(null);

  // Manual Input Modal States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDate, setManualDate] = useState('2026-10-28');
  const [manualClass, setManualClass] = useState(currentUser.kelas || 'VIII A');
  const [manualSearch, setManualSearch] = useState('');
  const [manualSelectedStudent, setManualSelectedStudent] = useState<Student | null>(null);
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('hadir');
  const [manualNote, setManualNote] = useState('');
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(null);

  // Sound feedback
  const playAudioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio playback fails gracefully if muted by browser
    }
  };

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser atau lingkungan ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraLoading(false);
    } catch (err: unknown) {
      let msg = 'Izin kamera ditolak atau kamera tidak dapat diakses.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          msg = 'Izin kamera ditolak. Silakan izinkan akses kamera pada browser/perangkat Anda.';
        } else if (err.name === 'NotFoundError') {
          msg = 'Perangkat kamera tidak ditemukan.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Kamera sedang digunakan oleh aplikasi lain.';
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCameraError(msg);
      setCameraActive(false);
      setCameraLoading(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Main Attendance Processing Function
  const processAttendanceForStudent = (
    student: Student,
    statusToRecord: AttendanceStatus = 'hadir',
    noteText?: string,
    isManual: boolean = false,
    forceOverwrite: boolean = false
  ) => {
    const today = manualDate || '2026-10-28';

    // Call StorageService atomic method
    const res = StorageService.recordSingleAttendance({
      studentId: student.id,
      tanggal: today,
      status: statusToRecord,
      catatan: noteText || (isManual ? 'Input manual' : 'Hadir tepat waktu (Scan QR)'),
      sumber: isManual ? 'MANUAL' : 'SCAN',
      sesi: 'Pagi',
      actor: currentUser,
      isOffline,
      forceOverwrite,
    });

    if (!res.success) {
      // Overwrite confirmation needed
      if (res.alreadyHadStatus && (res.alreadyHadStatus === 'izin' || res.alreadyHadStatus === 'sakit')) {
        setOverwriteConfirmModal({
          student,
          existingRecord: res.record!,
          intendedStatus: statusToRecord,
        });
        return;
      }

      setScanStatusToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        description: res.error || 'Terjadi kesalahan sistem saat menyimpan absensi.',
      });
      return;
    }

    // Trigger visual and audio success indicators
    playAudioBeep();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);

    const record = res.record!;
    onAttendanceScanned(record);

    // Update recent scans list
    setRecentScans((prev) => {
      const filtered = prev.filter((r) => r.studentId !== record.studentId);
      return [record, ...filtered].slice(0, 5);
    });

    if (res.isDuplicate) {
      setScanStatusToast({
        type: 'info',
        title: 'Siswa Sudah Diabsen',
        description: `${student.nama} (${student.kelas}) sudah tercatat ${record.status.toUpperCase()} pukul ${record.waktuPencatatan} oleh ${record.dicatatOleh}.`,
        student,
      });
    } else {
      setScanStatusToast({
        type: 'success',
        title: 'Absensi Berhasil Disimpan!',
        description: `${student.nama} (${student.kelas}) • Status: ${statusToRecord.toUpperCase()}`,
        student,
      });
    }

    // Auto-dismiss toast after 3.5 seconds
    setTimeout(() => {
      setScanStatusToast((curr) => (curr?.student?.id === student.id ? null : curr));
    }, 3500);
  };

  // Handle scanned raw string
  const handleDecodedString = (rawCode: string) => {
    if (isScanningPaused) return;

    const now = Date.now();
    // 3 seconds cooldown for exact same code
    if (
      lastScannedCodeRef.current === rawCode &&
      now - lastScannedTimeRef.current < 3000
    ) {
      return;
    }

    lastScannedCodeRef.current = rawCode;
    lastScannedTimeRef.current = now;

    // Parse and validate student code
    const parseRes = StorageService.parseStudentCode(rawCode);

    if (!parseRes.student) {
      setScanStatusToast({
        type: 'error',
        title: 'Data Siswa Tidak Ditemukan',
        description: parseRes.error || `Kode "${rawCode}" tidak terdaftar di sistem.`,
      });
      return;
    }

    const student = parseRes.student;

    // Check if student is active
    if (parseRes.error) {
      setScanStatusToast({
        type: 'warning',
        title: 'Status Siswa Bermasalah',
        description: parseRes.error,
        student,
      });
      return;
    }

    // Check teacher class restriction (if applicable)
    if (
      currentUser.role === 'guru' &&
      currentUser.kelas &&
      currentUser.kelas !== student.kelas &&
      !currentUser.jabatan?.includes('Semua')
    ) {
      // Still allow but show notification notice
    }

    // Check existing attendance for today
    const today = '2026-10-28';
    const existing = existingAttendance.find(
      (a) => a.studentId === student.id && a.tanggal === today
    );

    if (existing) {
      if (existing.status === 'izin' || existing.status === 'sakit') {
        // Must confirm before changing from Izin/Sakit to Hadir
        setOverwriteConfirmModal({
          student,
          existingRecord: existing,
          intendedStatus: 'hadir',
        });
        return;
      }
      if (existing.status === 'hadir') {
        setScanStatusToast({
          type: 'info',
          title: 'Siswa Sudah Melakukan Absensi',
          description: `${student.nama} (${student.kelas}) sudah tercatat HADIR pukul ${existing.waktuPencatatan} oleh ${existing.dicatatOleh}.`,
          student,
        });
        return;
      }
    }

    // Default: normal scan registers 'hadir'
    processAttendanceForStudent(student, 'hadir', 'Tercatat via QR/Barcode scanner');
  };

  // Video Frame Scanning Loop
  useEffect(() => {
    if (!cameraActive || isScanningPaused) return;

    let isScanning = true;

    // Native BarcodeDetector if available
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'],
        });
      } catch {
        barcodeDetector = null;
      }
    }

    const scanFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // 1. Try Hardware-accelerated BarcodeDetector
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const detectedValue = barcodes[0].rawValue;
              if (detectedValue) {
                handleDecodedString(detectedValue);
              }
            }
          } catch {
            // fallback to jsQR
          }
        }

        // 2. Fallback to jsQR canvas processing
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            handleDecodedString(qrCode.data);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive, isScanningPaused]);

  // Decode from file/image upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleDecodedString(code.data);
          } else {
            setScanStatusToast({
              type: 'error',
              title: 'Barcode Tidak Terbaca',
              description: 'Gambar tidak memuat QR Code atau barcode siswa yang valid.',
            });
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Filter students for manual modal
  const manualFilteredStudents = students.filter(
    (s) =>
      s.kelas === manualClass &&
      (s.nama.toLowerCase().includes(manualSearch.toLowerCase()) ||
        s.nis.includes(manualSearch))
  );

  // Intercept overwrite modal (Priority 30)
  useBackHandler(
    'scan-overwrite-modal',
    30,
    () => {
      setOverwriteConfirmModal(null);
      return true;
    },
    overwriteConfirmModal !== null
  );

  // Intercept manual attendance modal (Priority 20)
  useBackHandler(
    'scan-manual-modal',
    20,
    () => {
      setShowManualModal(false);
      return true;
    },
    showManualModal
  );

  const handleInAppBack = () => {
    if (overwriteConfirmModal) {
      setOverwriteConfirmModal(null);
      return;
    }
    if (showManualModal) {
      setShowManualModal(false);
      return;
    }
    stopCamera();
    onBack();
  };

  return (
    <div className="flex-1 w-full bg-[#121816] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top Header - Dark Theme (Matching Reference Item 4) */}
      <header className="px-4 py-3.5 flex items-center justify-between z-20 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleInAppBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              Scan QR Code
            </h1>
            <span className="text-[10px] text-emerald-400">
              Petugas: {currentUser.nama} ({currentUser.role.toUpperCase()})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume Scanner */}
          <button
            onClick={() => setIsScanningPaused((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isScanningPaused
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title={isScanningPaused ? 'Lanjutkan Pemindaian' : 'Jeda Pemindaian'}
          >
            {isScanningPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Manual Input Trigger */}
          <button
            onClick={() => {
              setManualErrorMessage(null);
              setShowManualModal(true);
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Manual
          </button>
        </div>
      </header>

      {/* Main Viewfinder Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        {/* Flash pulse overlay on successful scan */}
        {flashActive && (
          <div className="absolute inset-0 bg-[#00FF87]/30 z-30 pointer-events-none animate-pulse"></div>
        )}

        {/* Status Notification Toast Banner */}
        {scanStatusToast && (
          <div
            className={`mb-3 w-full max-w-xs p-3 rounded-2xl shadow-xl flex items-start gap-2.5 border transition-all animate-fadeIn z-30 ${
              scanStatusToast.type === 'success'
                ? 'bg-[#075B36]/90 border-emerald-400 text-white'
                : scanStatusToast.type === 'info'
                ? 'bg-sky-950/90 border-sky-400 text-sky-100'
                : scanStatusToast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                : 'bg-rose-950/90 border-rose-500 text-rose-100'
            }`}
          >
            {scanStatusToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />}
            {scanStatusToast.type === 'info' && <Clock className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />}
            {scanStatusToast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />}
            {scanStatusToast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />}

            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold leading-tight truncate">
                {scanStatusToast.title}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                {scanStatusToast.description}
              </p>
            </div>

            <button
              onClick={() => setScanStatusToast(null)}
              className="text-white/60 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Viewfinder Frame (Matching Reference Item 4) */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-black/90 flex items-center justify-center border-2 border-emerald-500/30 shadow-[0_0_50px_rgba(7,135,73,0.3)] shrink-0">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            // Simulated / Camera Error State
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-center">
              {cameraLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-300">Menghubungkan kamera...</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-2xl shadow-lg border border-emerald-400 mb-2">
                    <svg
                      width="100"
                      height="100"
                      viewBox="0 0 100 100"
                      className="fill-slate-900"
                    >
                      <rect x="5" y="5" width="28" height="28" rx="4" />
                      <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                      <rect x="13" y="13" width="12" height="12" rx="2" />

                      <rect x="67" y="5" width="28" height="28" rx="4" />
                      <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                      <rect x="75" y="13" width="12" height="12" rx="2" />

                      <rect x="5" y="67" width="28" height="28" rx="4" />
                      <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                      <rect x="13" y="75" width="12" height="12" rx="2" />

                      <rect x="38" y="10" width="8" height="8" />
                      <rect x="50" y="15" width="6" height="6" />
                      <rect x="42" y="24" width="8" height="6" />
                      <rect x="12" y="38" width="6" height="8" />
                      <rect x="22" y="44" width="8" height="6" />
                      <rect x="36" y="36" width="14" height="14" rx="2" />
                      <rect x="54" y="38" width="8" height="8" />
                      <rect x="68" y="40" width="12" height="6" />
                      <rect x="84" y="44" width="8" height="8" />
                      <rect x="38" y="56" width="6" height="10" />
                      <rect x="48" y="54" width="12" height="6" />
                      <rect x="64" y="56" width="10" height="10" />
                      <rect x="80" y="60" width="8" height="6" />
                      <rect x="38" y="72" width="10" height="8" />
                      <rect x="52" y="76" width="8" height="12" />
                      <rect x="68" y="72" width="12" height="8" />
                      <rect x="84" y="76" width="8" height="8" />
                    </svg>
                  </div>

                  <p className="text-[11px] text-amber-300 max-w-[200px] leading-tight mb-2">
                    {cameraError || 'Kamera belum aktif'}
                  </p>

                  <button
                    onClick={startCamera}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Coba Lagi
                  </button>
                </>
              )}
            </div>
          )}

          {/* Glowing Green Scanning Bracket Corners (Matching Reference Item 4 Exactly) */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00FF87] rounded-tl-xl shadow-[0_0_15px_#00FF87]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00FF87] rounded-tr-xl shadow-[0_0_15px_#00FF87]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00FF87] rounded-bl-xl shadow-[0_0_15px_#00FF87]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00FF87] rounded-br-xl shadow-[0_0_15px_#00FF87]"></div>

            {/* Animated Laser Scanning Line */}
            {!isScanningPaused && (
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#00FF87] to-transparent shadow-[0_0_12px_#00FF87] animate-scan"></div>
            )}
          </div>
        </div>

        {/* Text Instruction (Matching Reference Item 4) */}
        <p className="mt-4 text-xs text-center text-slate-300 font-medium max-w-xs leading-relaxed">
          Arahkan kamera ke QR Code yang ada di kartu siswa
        </p>

        {/* Upload from Photo / File option */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            Pilih Foto Kartu
          </button>
        </div>

        {/* Quick Demo Simulator Buttons (Allows testing scan without printing card) */}
        <div className="mt-4 w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center shrink-0">
          <p className="text-[10px] text-emerald-400 font-semibold mb-1.5 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Simulasi Pindai Cepat Kartu Terdaftar:
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {students.slice(0, 5).map((st) => (
              <button
                key={st.id}
                onClick={() => handleDecodedString(st.nis)}
                className="px-2 py-1 bg-white/10 hover:bg-emerald-600 active:scale-95 text-white text-[10px] font-medium rounded-lg border border-white/15 transition-all cursor-pointer"
                title={`Pindai kartu ${st.nama}`}
              >
                {st.nama.split(' ')[0]} ({st.nis})
              </button>
            ))}
          </div>
        </div>

        {/* Recent Scanned Students Bar */}
        {recentScans.length > 0 && (
          <div className="mt-3 w-full max-w-xs bg-black/40 border border-white/10 rounded-2xl p-2.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 px-1 font-semibold">
              <span className="flex items-center gap-1">
                <History className="w-3 h-3 text-emerald-400" /> Hasil Scan Terakhir
              </span>
              <span>{recentScans.length} siswa</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {recentScans.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded-xl border border-white/10 text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-white truncate text-[11px] leading-tight">
                      {r.studentName}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      NIS: {r.nis} • Kelas {r.kelas} • {r.waktuPencatatan} WIB
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E5F5EC] text-[#078749] uppercase shrink-0">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button (Matching Reference Item 4: "Input Manual") */}
      <div className="p-4 bg-black/60 backdrop-blur-md border-t border-white/10 shrink-0">
        <button
          onClick={() => {
            setManualErrorMessage(null);
            setShowManualModal(true);
          }}
          className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.99] border border-white/20 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Keyboard className="w-4 h-4 text-[#00FF87]" />
          <span>Input Manual</span>
        </button>
      </div>

      {/* Overwrite Confirmation Modal (When student is previously Izin or Sakit) */}
      {overwriteConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-amber-300">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-800 text-center">
              Konfirmasi Perubahan Status
            </h3>
            <p className="text-xs text-slate-600 mt-1 text-center">
              Siswa <strong>{overwriteConfirmModal.student.nama}</strong> ({overwriteConfirmModal.student.kelas}) sebelumnya berstatus{' '}
              <strong className="text-amber-700 uppercase">{overwriteConfirmModal.existingRecord.status}</strong>.
            </p>
            <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-xl text-center">
              Alasan sebelumnya: &quot;{overwriteConfirmModal.existingRecord.catatan || 'Surat resmi'}&quot;
            </p>

            <p className="text-xs text-slate-700 font-semibold mt-3 text-center">
              Apakah Anda ingin mengoreksi status kehadiran siswa ini menjadi <strong>HADIR</strong>?
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setOverwriteConfirmModal(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Pertahankan Izin/Sakit
              </button>
              <button
                onClick={() => {
                  processAttendanceForStudent(
                    overwriteConfirmModal.student,
                    'hadir',
                    'Koreksi status dari ' + overwriteConfirmModal.existingRecord.status.toUpperCase() + ' via scan kartu',
                    false,
                    true // forceOverwrite
                  );
                  setOverwriteConfirmModal(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#078749] text-white text-xs font-bold hover:bg-[#075B36] cursor-pointer"
              >
                Ubah ke Hadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Manual Input Form Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white text-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-3 sm:hidden"></div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E5F5EC] flex items-center justify-center text-[#078749]">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                    Input Absensi Manual
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Formulir pencatatan absensi langsung
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manualErrorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualErrorMessage}</span>
              </div>
            )}

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {/* Tanggal & Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Tanggal Absensi
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Pilih Kelas
                  </label>
                  <select
                    value={manualClass}
                    onChange={(e) => {
                      setManualClass(e.target.value);
                      setManualSelectedStudent(null);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749] font-medium"
                  >
                    {['VII A', 'VII B', 'VIII A', 'VIII B', 'IX A', 'IX B'].map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pilih Siswa */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Cari & Pilih Siswa
                </label>
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Ketik nama atau NIS..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749] mb-1.5"
                />

                <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100">
                  {manualFilteredStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Tidak ada siswa di kelas {manualClass}
                    </div>
                  ) : (
                    manualFilteredStudents.map((st) => {
                      const isSelected = manualSelectedStudent?.id === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setManualSelectedStudent(st);
                            setManualErrorMessage(null);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-[#075B36] font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="block leading-tight">{st.nama}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              NIS: {st.nis} • Kelas {st.kelas}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#078749]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status Kehadiran */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['hadir', 'izin', 'sakit', 'alpha'] as AttendanceStatus[]).map((st) => {
                    const isPicked = manualStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setManualStatus(st)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                          isPicked
                            ? st === 'hadir'
                              ? 'bg-[#078749] text-white shadow-xs'
                              : st === 'izin'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : st === 'sakit'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-slate-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Keterangan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Contoh: Mengikuti lomba MTQ, Demam tinggi, dll."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!manualSelectedStudent) {
                    setManualErrorMessage('Silakan pilih salah satu siswa dari daftar terlebih dahulu.');
                    return;
                  }
                  processAttendanceForStudent(
                    manualSelectedStudent,
                    manualStatus,
                    manualNote || (manualStatus === 'hadir' ? 'Hadir manual' : manualStatus),
                    true, // isManual
                    true // forceOverwrite when intentionally submitted via form
                  );
                  setShowManualModal(false);
                  setManualSelectedStudent(null);
                  setManualNote('');
                }}
                className="px-5 py-2 rounded-xl bg-[#078749] text-white text-xs font-bold hover:bg-[#075B36] cursor-pointer shadow-md shadow-emerald-800/20"
              >
                Simpan Absensi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
