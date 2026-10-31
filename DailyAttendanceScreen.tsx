import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Check,
  Save,
  QrCode,
  ShieldAlert,
  Info,
  Lock,
  RotateCcw,
  Sparkles,
  UserX,
  CheckCheck,
} from 'lucide-react';
import { Student, AttendanceStatus, AttendanceRecord, User } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface DailyAttendanceScreenProps {
  onBack: () => void;
  onOpenClassSelect: () => void;
  onOpenScan: () => void;
  selectedClass: string;
  students: Student[];
  existingAttendance: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  isOffline: boolean;
  currentUser: User;
}

export const DailyAttendanceScreen: React.FC<DailyAttendanceScreenProps> = ({
  onBack,
  onOpenClassSelect,
  onOpenScan,
  selectedClass,
  students,
  existingAttendance,
  onSaveAttendance,
  isOffline,
  currentUser,
}) => {
  const isSiswa = currentUser.role === 'siswa';

  // Date state
  const [selectedDate, setSelectedDate] = useState('2026-10-28');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEditingStudent, setActiveEditingStudent] = useState<Student | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [selectedEditingStatus, setSelectedEditingStatus] = useState<AttendanceStatus>('hadir');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [permissionDeniedToast, setPermissionDeniedToast] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const allowedClasses = StorageService.getAllowedClassesForUser(currentUser);
  const allowedClassNames = allowedClasses.map((c) => c.nama);

  // Filter students by selected class (supports 'all' / 'Semua Kelas')
  const classStudents = students.filter((s) => {
    if (selectedClass === 'all' || selectedClass === 'Semua Kelas') {
      if (currentUser.role === 'admin') return true;
      return allowedClassNames.includes(s.kelas);
    }
    return s.kelas === selectedClass;
  });

  // Status map: maps studentId -> status details
  type StatusItem = {
    status: AttendanceStatus;
    catatan?: string;
    dicatatOleh: string;
    waktu: string;
    isExisting: boolean;
    sumber?: 'SCAN' | 'MANUAL';
  };

  const [statusMap, setStatusMap] = useState<Record<string, StatusItem>>({});

  // Helper to sync statusMap whenever selectedClass, selectedDate, or existingAttendance changes
  useEffect(() => {
    const map: Record<string, StatusItem> = {};
    const defaultTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

    classStudents.forEach((student) => {
      const found = existingAttendance.find(
        (a) => a.studentId === student.id && a.tanggal === selectedDate
      );
      if (found) {
        map[student.id] = {
          status: found.status,
          catatan: found.catatan,
          dicatatOleh: found.dicatatOleh || currentUser.nama,
          waktu: found.waktuPencatatan || defaultTime,
          isExisting: true,
          sumber: found.sumber || 'MANUAL',
        };
      } else {
        // Not yet attended on this date
        map[student.id] = {
          status: 'hadir',
          catatan: '',
          dicatatOleh: currentUser.nama,
          waktu: defaultTime,
          isExisting: false,
          sumber: 'MANUAL',
        };
      }
    });

    setStatusMap(map);
    setHasUnsavedChanges(false);
  }, [selectedClass, selectedDate, existingAttendance, students]);

  // Intercept Android hardware Back button and swipe gestures:
  // 1. If edit status modal is open, close the modal first (Priority 30)
  useBackHandler(
    'daily-attendance-edit-modal',
    30,
    () => {
      setActiveEditingStudent(null);
      return true;
    },
    activeEditingStudent !== null
  );

  // 2. If there are unsaved changes, prompt confirmation before leaving (Priority 15)
  useBackHandler(
    'daily-attendance-unsaved',
    15,
    () => {
      NavigationManager.promptUnsavedChanges({
        title: 'Perubahan Absensi Belum Disimpan',
        message:
          'Terdapat perubahan status absensi yang belum disimpan ke database. Apakah Anda yakin ingin membatalkan perubahan dan meninggalkan halaman ini?',
        onDiscard: () => {
          setHasUnsavedChanges(false);
          onBack();
        },
      });
      return true;
    },
    hasUnsavedChanges
  );

  const handleInAppBack = () => {
    if (activeEditingStudent) {
      setActiveEditingStudent(null);
      return;
    }
    if (hasUnsavedChanges) {
      NavigationManager.promptUnsavedChanges({
        title: 'Perubahan Absensi Belum Disimpan',
        message:
          'Terdapat perubahan status absensi yang belum disimpan ke database. Apakah Anda yakin ingin membatalkan perubahan dan meninggalkan halaman ini?',
        onDiscard: () => {
          setHasUnsavedChanges(false);
          onBack();
        },
      });
      return;
    }
    onBack();
  };

  // Quick stats
  const totalStudents = classStudents.length;
  let countHadir = 0;
  let countIzin = 0;
  let countSakit = 0;
  let countAlpha = 0;
  let countRecorded = 0;

  classStudents.forEach((s) => {
    const item = statusMap[s.id];
    if (item) {
      if (item.isExisting) countRecorded++;
      if (item.status === 'hadir') countHadir++;
      else if (item.status === 'izin') countIzin++;
      else if (item.status === 'sakit') countSakit++;
      else countAlpha++;
    }
  });

  const countUnrecorded = Math.max(0, totalStudents - countRecorded);

  // Interactive status edit modal trigger
  const handleOpenEditModal = (student: Student) => {
    if (isSiswa) {
      setPermissionDeniedToast('Akses ditolak: Siswa hanya dapat melihat status absensi dan tidak dapat mengubahnya.');
      setTimeout(() => setPermissionDeniedToast(null), 3500);
      return;
    }
    setActiveEditingStudent(student);
    const curr = statusMap[student.id];
    setSelectedEditingStatus(curr ? curr.status : 'hadir');
    setCustomNote(curr ? curr.catatan || '' : '');
  };

  // Update status for single student
  const handleApplySingleStatus = (newStatus: AttendanceStatus, note?: string) => {
    if (!activeEditingStudent || isSiswa) return;

    const studentId = activeEditingStudent.id;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

    setStatusMap((prev) => ({
      ...prev,
      [studentId]: {
        status: newStatus,
        catatan: note !== undefined ? note : prev[studentId]?.catatan,
        dicatatOleh: currentUser.nama,
        waktu: nowTime,
        isExisting: true,
        sumber: 'MANUAL',
      },
    }));

    setHasUnsavedChanges(true);
    setActiveEditingStudent(null);
  };

  // Mark all unrecorded as Hadir
  const handleMarkAllHadir = () => {
    if (isSiswa) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setStatusMap((prev) => {
      const updated = { ...prev };
      classStudents.forEach((s) => {
        // Only set to Hadir if not previously recorded as Izin or Sakit
        const current = updated[s.id];
        if (!current || (current.status !== 'izin' && current.status !== 'sakit')) {
          updated[s.id] = {
            status: 'hadir',
            catatan: 'Tercatat hadir kolektif',
            dicatatOleh: currentUser.nama,
            waktu: current?.waktu || nowTime,
            isExisting: true,
            sumber: 'MANUAL',
          };
        }
      });
      return updated;
    });

    setHasUnsavedChanges(true);
    setToastMessage('Semua siswa yang belum berstatus izin/sakit ditandai Hadir.');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Auto-apply Alpha for unrecorded students
  const handleApplyAutoAlpha = () => {
    if (isSiswa) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    let markedCount = 0;

    setStatusMap((prev) => {
      const updated = { ...prev };
      classStudents.forEach((s) => {
        const current = updated[s.id];
        // If student is unrecorded, mark as Alpha
        if (!current || !current.isExisting) {
          updated[s.id] = {
            status: 'alpha',
            catatan: 'Alpha otomatis (Batas waktu absensi berakhir)',
            dicatatOleh: 'Sistem Alpha Otomatis',
            waktu: nowTime,
            isExisting: true,
            sumber: 'MANUAL',
          };
          markedCount++;
        }
      });
      return updated;
    });

    if (markedCount > 0) {
      setHasUnsavedChanges(true);
      setToastMessage(`${markedCount} siswa yang belum hadir ditetapkan status Alpha.`);
    } else {
      setToastMessage('Semua siswa di kelas ini sudah memiliki catatan kehadiran.');
    }
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Save changes to database
  const handleSave = () => {
    if (isSiswa) {
      setPermissionDeniedToast('Akses ditolak: Akun siswa dilarang menyimpan data absensi.');
      setTimeout(() => setPermissionDeniedToast(null), 3000);
      return;
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const recordsToSave: AttendanceRecord[] = classStudents.map((s) => {
      const item = statusMap[s.id];
      return {
        id: `att-${selectedDate}-${s.nis}`,
        studentId: s.id,
        studentName: s.nama,
        nis: s.nis,
        kelas: s.kelas,
        tanggal: selectedDate,
        status: item?.status || 'hadir',
        catatan: item?.catatan || '',
        waktuPencatatan: item?.waktu || nowTime,
        dicatatOleh: item?.dicatatOleh || currentUser.nama,
        petugasId: currentUser.id,
        sumber: item?.sumber || 'MANUAL',
        sesi: 'Pagi',
        isSynced: !isOffline,
      };
    });

    onSaveAttendance(recordsToSave);
    setHasUnsavedChanges(false);
    setToastMessage(`Absensi Kelas ${selectedClass} berhasil disimpan ke database!`);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Filter students based on search query
  const filteredStudents = classStudents.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
  );

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Top Header - Islamic Green */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3 flex items-center justify-between z-20 shadow-sm">
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
              Absensi Harian
            </h1>
            {isSiswa ? (
              <span className="text-[10px] text-emerald-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Mode Siswa (Hanya Lihat)
              </span>
            ) : (
              <span className="text-[10px] text-emerald-200">
                Wali / Petugas: {currentUser.nama}
              </span>
            )}
          </div>
        </div>

        {/* Scan QR button only visible to Guru & Admin */}
        {!isSiswa && (
          <button
            onClick={onOpenScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Buka Scan QR Siswa"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00FF87]" />
            <span>Scan QR</span>
          </button>
        )}
      </header>

      {/* Selectors & Filters Bar */}
      <div className="p-4 space-y-2.5 bg-white border-b border-slate-200/80 shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Interactive Date Selector */}
          <div className="relative">
            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
              Tanggal Absensi
            </label>
            <div className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 transition-colors">
              <div className="flex items-center gap-1.5 w-full">
                <CalendarIcon className="w-3.5 h-3.5 text-[#078749] shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-full cursor-pointer"
                  title="Pilih tanggal absensi"
                />
              </div>
            </div>
          </div>

          {/* Class Selector */}
          <div className="relative">
            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
              Kelas Siswa
            </label>
            {isSiswa ? (
              <div
                className="flex items-center justify-between w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 cursor-not-allowed"
                title="Siswa hanya melihat kelasnya sendiri"
              >
                <span className="truncate">Kelas {selectedClass}</span>
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            ) : (
              <button
                onClick={onOpenClassSelect}
                className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-500 text-left cursor-pointer transition-colors"
                title="Pilih kelas"
              >
                <span className="truncate">
                  {selectedClass === 'all' || selectedClass === 'Semua Kelas'
                    ? 'Semua Kelas'
                    : `Kelas ${selectedClass}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa atau NIS..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
          />
        </div>

        {/* Quick Action Buttons (Hadir Semua & Alpha Otomatis) for Teachers/Admins */}
        {!isSiswa && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleMarkAllHadir}
              className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#075B36] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Tandai semua siswa hadir jika belum ada status izin/sakit"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#078749]" />
              <span>Semua Hadir</span>
            </button>

            <button
              onClick={handleApplyAutoAlpha}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Terapkan alpha otomatis pada siswa yang belum ada catatan"
            >
              <UserX className="w-3.5 h-3.5 text-slate-600" />
              <span>Alpha Otomatis</span>
            </button>
          </div>
        )}

        {/* Stats Pill Bar */}
        <div className="flex items-center justify-between text-[11px] px-1 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <span>Total: <strong>{totalStudents}</strong></span>
            {countUnrecorded > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-semibold">
                {countUnrecorded} belum diabsen
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#078749] font-bold" title="Hadir">H: {countHadir}</span>
            <span className="text-amber-600 font-bold" title="Izin">I: {countIzin}</span>
            <span className="text-rose-600 font-bold" title="Sakit">S: {countSakit}</span>
            <span className="text-slate-500 font-bold" title="Alpha">A: {countAlpha}</span>
          </div>
        </div>
      </div>

      {/* Student Attendance List Table (Matching Reference Exactly) */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-slate-50/90 text-slate-500 text-[11px] font-semibold py-2 px-3 border-b border-slate-200">
            <span className="col-span-2 text-center">No</span>
            <span className="col-span-6">Nama Siswa</span>
            <span className="col-span-4 text-center">Status</span>
          </div>

          {/* Student Rows */}
          <div className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Tidak ada siswa yang sesuai pencarian di Kelas {selectedClass}
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const item = statusMap[student.id];
                const currentStatus = item?.status || 'hadir';
                const note = item?.catatan;
                const recorder = item?.dicatatOleh || currentUser.nama;
                const recordedTime = item?.waktu || '07:05:00';
                const isSaved = item?.isExisting;

                return (
                  <div
                    key={student.id}
                    className="grid grid-cols-12 items-center py-2.5 px-3 text-xs hover:bg-slate-50/60 transition-colors"
                  >
                    {/* No */}
                    <span className="col-span-2 text-center font-medium text-slate-500 text-[11px]">
                      {idx + 1}
                    </span>

                    {/* Nama Siswa */}
                    <div className="col-span-6 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-800 leading-tight truncate">
                          {student.nama}
                        </p>
                        {item?.sumber === 'SCAN' && (
                          <span className="text-[9px] bg-emerald-100 text-[#075B36] font-bold px-1 rounded">
                            QR
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        NIS: {student.nis} {note ? `• ${note}` : ''}
                      </p>
                      <p className="text-[9px] text-slate-400/90 font-mono mt-0.5">
                        Dicatat: {recorder} ({recordedTime})
                      </p>
                    </div>

                    {/* Status Pill with interactive change for Teacher/Admin, or read-only indicator for Siswa */}
                    <div className="col-span-4 flex justify-center">
                      <button
                        onClick={() => handleOpenEditModal(student)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all shadow-xs ${
                          isSiswa ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'
                        } ${
                          currentStatus === 'hadir'
                            ? 'bg-[#E5F5EC] text-[#078749] border border-emerald-200'
                            : currentStatus === 'izin'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : currentStatus === 'sakit'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                        title={isSiswa ? 'Status absensi tercatat' : 'Klik untuk ubah status kehadiran'}
                      >
                        {currentStatus === 'hadir' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {currentStatus === 'izin' && <Clock className="w-3.5 h-3.5" />}
                        {currentStatus === 'sakit' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {currentStatus === 'alpha' && <XCircle className="w-3.5 h-3.5" />}
                        <span className="capitalize">{currentStatus}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions: Save button for Guru/Admin, or Informational Banner for Siswa */}
      <div className="p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 shrink-0">
        {isSiswa ? (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center text-xs text-[#075B36] flex items-center justify-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#078749]" />
            <span>Mode Siswa: Data absensi resmi dikelola dan dicatat oleh guru sekolah.</span>
          </div>
        ) : (
          <button
            onClick={handleSave}
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-[#078749] hover:bg-[#075B36] ring-2 ring-emerald-400 active:scale-[0.99] shadow-emerald-800/30'
                : 'bg-[#078749] hover:bg-[#075B36]'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {hasUnsavedChanges ? 'Simpan Perubahan Absensi' : 'Simpan Absensi'}
            </span>
          </button>
        )}
      </div>

      {/* Modal Quick Change Status for Selected Student (Only shown to Guru & Admin) */}
      {!isSiswa && activeEditingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-4 sm:hidden"></div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 leading-tight">
                Pilih Kehadiran: {activeEditingStudent.nama}
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Kelas {activeEditingStudent.kelas}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              NIS: {activeEditingStudent.nis} • Tanggal: {selectedDate}
            </p>

            {/* Status Options Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSelectedEditingStatus('hadir')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                  selectedEditingStatus === 'hadir'
                    ? 'bg-[#E5F5EC] border-[#078749] text-[#078749] shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749]" />
                  Hadir
                </span>
                {selectedEditingStatus === 'hadir' && <Check className="w-4 h-4 text-[#078749]" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedEditingStatus('izin')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                  selectedEditingStatus === 'izin'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Izin
                </span>
                {selectedEditingStatus === 'izin' && <Check className="w-4 h-4 text-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedEditingStatus('sakit')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                  selectedEditingStatus === 'sakit'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Sakit
                </span>
                {selectedEditingStatus === 'sakit' && <Check className="w-4 h-4 text-rose-600" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedEditingStatus('alpha')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                  selectedEditingStatus === 'alpha'
                    ? 'bg-slate-100 border-slate-500 text-slate-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  Alpha
                </span>
                {selectedEditingStatus === 'alpha' && <Check className="w-4 h-4 text-slate-700" />}
              </button>
            </div>

            {/* Note input for Izin / Sakit */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Keterangan / Alasan (Opsional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Contoh: Demam, Lomba Tahfidz, Keperluan keluarga"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveEditingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleApplySingleStatus(selectedEditingStatus, customNote)}
                className="px-5 py-2 bg-[#078749] text-white text-xs font-bold rounded-xl hover:bg-[#075B36] cursor-pointer shadow-md shadow-emerald-800/20"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Toast */}
      {permissionDeniedToast && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 max-w-[90%] animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-rose-200 shrink-0" />
          <span>{permissionDeniedToast}</span>
        </div>
      )}

      {/* Success Notification Toast */}
      {showSavedToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#075B36] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage || `Absensi berhasil disimpan (${selectedClass})!`}</span>
        </div>
      )}
    </div>
  );
};
