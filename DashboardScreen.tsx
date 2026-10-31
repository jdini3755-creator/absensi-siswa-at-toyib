import React, { useState, useEffect } from 'react';
import {
  Bell,
  CalendarCheck,
  Calendar,
  FileSpreadsheet,
  Megaphone,
  QrCode,
  Users,
  BarChart3,
  FileText,
  Clock,
  ArrowRight,
  ChevronDown,
  Lock,
  Loader2,
  CalendarDays,
  Info,
  BookOpen,
  GraduationCap,
  Layers,
  ShieldAlert,
  CreditCard,
  Settings,
  UserCheck,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { User, AttendanceRecord } from '../types';
import { StorageService } from '../services/storageService';

interface DashboardScreenProps {
  currentUser: User;
  onNavigate: (screen: string) => void;
  unreadCount: number;
  todayAttendance?: AttendanceRecord[];
  allAttendance?: AttendanceRecord[];
  currentSelectedClass?: string;
  onClassChange?: (cls: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  currentUser,
  onNavigate,
  unreadCount,
  allAttendance,
  currentSelectedClass,
  onClassChange,
}) => {
  const isSiswa = currentUser.role === 'siswa';
  const isAdmin = currentUser.role === 'admin';
  const isGuru = currentUser.role === 'guru';

  // Dynamic Allowed Classes list based on Role
  const allowedClasses = StorageService.getAllowedClassesForUser(currentUser);
  const classOptions = allowedClasses.map((c) => c.nama);

  // State for selected class on Dashboard
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (isSiswa && currentUser.kelas) return currentUser.kelas;
    if (currentSelectedClass && classOptions.includes(currentSelectedClass)) return currentSelectedClass;
    return classOptions[0] || currentUser.kelas || 'VIII A';
  });

  // State for selected date
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-28');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync if parent class changes
  useEffect(() => {
    if (currentSelectedClass && !isSiswa) {
      setSelectedClass(currentSelectedClass);
    }
  }, [currentSelectedClass, isSiswa]);

  // Handle class change
  const handleSelectClass = (newClass: string) => {
    if (isSiswa && newClass !== currentUser.kelas) return;
    setIsLoading(true);
    setSelectedClass(newClass);
    if (onClassChange) {
      onClassChange(newClass);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 180);
  };

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setIsLoading(true);
    setSelectedDate(newDate);
    setTimeout(() => {
      setIsLoading(false);
    }, 180);
  };

  // Get attendance records from props or directly from database
  const records = allAttendance || StorageService.getAttendance();

  // Filter attendance dynamically from database for selected class & selected date
  const filteredAttendance = records.filter((a) => {
    if (a.tanggal !== selectedDate) return false;
    if (selectedClass === 'all' || selectedClass === 'Semua Kelas') {
      if (isAdmin) return true;
      if (isGuru) return classOptions.includes(a.kelas);
      return a.kelas === (currentUser.kelas || 'VIII A');
    }
    return a.kelas === selectedClass;
  });

  // Calculate actual counts from database
  const hadirCount = filteredAttendance.filter((a) => a.status === 'hadir').length;
  const izinCount = filteredAttendance.filter((a) => a.status === 'izin').length;
  const sakitCount = filteredAttendance.filter((a) => a.status === 'sakit').length;
  const alphaCount = filteredAttendance.filter((a) => a.status === 'alpha').length;
  const totalRecorded = filteredAttendance.length;

  // Format date display label
  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return 'Rabu, 28 Okt 2026';
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col pb-4">
      {/* Top Header - Islamic Green */}
      <header className="bg-gradient-to-b from-[#075B36] to-[#078749] text-white px-5 pt-3 pb-5 rounded-b-[28px] shadow-sm">
        <div className="flex items-center justify-between">
          {/* Logo & School Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center p-1 border border-white/20">
              <SchoolLogo size={28} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                SMP Islam At-Toyib 45
              </h1>
              <p className="text-[11px] text-emerald-100 font-medium">
                Aplikasi Absensi Siswa
              </p>
            </div>
          </div>

          {/* Right Actions: Notification Bell & Profile Avatar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('notifikasi')}
              className="relative p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#075B36]"></span>
              )}
            </button>

            <button
              onClick={() => onNavigate('profil')}
              className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-300 shadow-sm cursor-pointer"
              title="Profil Pengguna"
            >
              <img
                src={currentUser.foto}
                alt={currentUser.nama}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="px-4 -mt-3 space-y-3.5">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img
                src={currentUser.foto}
                alt={currentUser.nama}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-snug">
                {currentUser.nama}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentUser.kelas ? `Kelas ${currentUser.kelas}` : currentUser.jabatan || 'Akun Sekolah'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="bg-[#078749] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize shadow-xs">
              {currentUser.role === 'siswa' ? 'Siswa' : currentUser.role === 'guru' ? 'Guru' : 'Admin'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              07:00 - 14:30
            </span>
          </div>
        </div>

        {/* Quick QR Attendance Bar (For Quick Access) */}
        <div className="bg-gradient-to-r from-emerald-900 via-[#075B36] to-[#078749] text-white rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Absensi Cepat QR Siswa</p>
              <p className="text-[10px] text-emerald-200">
                Pindai kartu identitas tanpa sentuh
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('scan')}
            className="px-3 py-1.5 bg-white text-[#075B36] hover:bg-emerald-50 text-[11px] font-bold rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            Scan QR
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 2x2 Main Grid Menu (Direct Match with Reference) */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Absensi */}
            <button
              onClick={() => onNavigate('absensi')}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E5F5EC] flex items-center justify-center text-[#078749] mb-2.5 shadow-xs">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Absensi</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Lihat & lakukan absensi
              </p>
            </button>

            {/* 2. Jadwal Pelajaran */}
            <button
              onClick={() => onNavigate('jadwal')}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E5F5EC] flex items-center justify-center text-[#078749] mb-2.5 shadow-xs">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Jadwal Pelajaran</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Lihat jadwal harian
              </p>
            </button>

            {/* 3. Nilai */}
            <button
              onClick={() => onNavigate('nilai')}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E5F5EC] flex items-center justify-center text-[#078749] mb-2.5 shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Nilai</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Lihat nilai terbaru
              </p>
            </button>

            {/* 4. Pengumuman */}
            <button
              onClick={() => onNavigate('pengumuman')}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E5F5EC] flex items-center justify-center text-[#078749] mb-2.5 shadow-xs">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Pengumuman</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Informasi sekolah
              </p>
            </button>
          </div>
        </div>

        {/* Motivation Card with Mosque Silhouette */}
        <div className="relative bg-gradient-to-r from-[#075B36] to-[#078749] text-white rounded-2xl p-4 shadow-sm overflow-hidden">
          <div className="relative z-10 max-w-[75%]">
            <p className="text-xs font-semibold leading-relaxed text-emerald-50 italic">
              “Jadilah generasi yang beriman, berilmu, berakhlak, dan bermanfaat.”
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
              <span>SMP Islam At-Toyib 45</span>
            </div>
          </div>

          {/* Mosque illustration in bottom-right corner */}
          <div className="absolute right-2 -bottom-1 opacity-40 pointer-events-none">
            <svg width="86" height="74" viewBox="0 0 100 80" fill="currentColor">
              <path d="M50 15C50 6 56 0 60 0C64 0 70 6 70 15V80H50V15Z" />
              <path d="M25 35C25 24 30 18 35 18C40 18 45 24 45 35V80H25V35Z" />
              <path d="M75 40C75 32 80 27 85 27C90 27 95 32 95 40V80H75V40Z" />
              <circle cx="60" cy="5" r="3" fill="#FCD34D" />
            </svg>
          </div>
        </div>

        {/* Secondary Features Grid (Data Siswa, Rekap, Laporan) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h4 className="text-xs font-bold text-slate-700">Layanan & Rekap</h4>
            <span className="text-[10px] text-slate-400">Terintegrasi</span>
          </div>

          <div className={`grid ${currentUser.role === 'siswa' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
            <button
              onClick={() => onNavigate('siswa-list')}
              className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
            >
              <Users className="w-5 h-5 text-[#078749] mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Data Siswa</span>
              <span className="text-[9px] text-slate-400">Profil & QR</span>
            </button>

            {currentUser.role !== 'siswa' && (
              <button
                onClick={() => onNavigate('mapel-guru')}
                className="bg-white p-2.5 rounded-xl border border-emerald-100/80 bg-emerald-50/20 flex flex-col items-center text-center hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
              >
                <BookOpen className="w-5 h-5 text-[#078749] mb-1" />
                <span className="text-[11px] font-bold text-slate-800">
                  {currentUser.role === 'admin' ? 'Mapel Guru' : 'Mapel Saya'}
                </span>
                <span className="text-[9px] text-emerald-700 font-medium">
                  {currentUser.role === 'admin' ? 'Atur Dewan Guru' : 'SK Penugasan'}
                </span>
              </button>
            )}

            <button
              onClick={() => onNavigate('rekap')}
              className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
            >
              <BarChart3 className="w-5 h-5 text-[#078749] mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Rekap Bulanan</span>
              <span className="text-[9px] text-slate-400">Kalender</span>
            </button>

            <button
              onClick={() => onNavigate('laporan')}
              className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
            >
              <FileText className="w-5 h-5 text-[#078749] mb-1" />
              <span className="text-[11px] font-semibold text-slate-800">Laporan</span>
              <span className="text-[9px] text-slate-400">PDF & Excel</span>
            </button>
          </div>
        </div>

        {/* Administration & Coaching Section (New Modules 1, 3, 4, 7, 8) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h4 className="text-xs font-bold text-slate-700">Administrasi & Pembinaan</h4>
            <span className="text-[10px] text-emerald-700 font-medium">Lengkap & Resmi</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Kelola Kelas */}
            <button
              onClick={() => onNavigate('kelola-kelas')}
              className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
            >
              <Layers className="w-5 h-5 text-[#075B36] mb-1" />
              <span className="text-[11px] font-bold text-slate-800">Kelola Kelas</span>
              <span className="text-[9px] text-slate-400">Semua Rombel</span>
            </button>

            {/* Teguran & Pembinaan Siswa */}
            <button
              onClick={() => onNavigate('teguran-siswa')}
              className="bg-white p-2.5 rounded-xl border border-amber-100/80 bg-amber-50/20 flex flex-col items-center text-center hover:border-amber-300 transition-all cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-5 h-5 text-amber-700 mb-1" />
              <span className="text-[11px] font-bold text-slate-800">Teguran & Disiplin</span>
              <span className="text-[9px] text-amber-700 font-medium">Bimbingan Akhlak</span>
            </button>

            {/* Kartu Pelajar (CR80 & PDF) */}
            <button
              onClick={() => onNavigate('kartu-pelajar')}
              className="bg-white p-2.5 rounded-xl border border-emerald-100/80 bg-emerald-50/20 flex flex-col items-center text-center hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
            >
              <CreditCard className="w-5 h-5 text-[#075B36] mb-1" />
              <span className="text-[11px] font-bold text-slate-800">Kartu Pelajar</span>
              <span className="text-[9px] text-emerald-700 font-medium">Cetak PDF</span>
            </button>

            {/* Admin Exclusive: Kenaikan Kelas or Pengaturan Sekolah */}
            {isAdmin ? (
              <button
                onClick={() => onNavigate('kenaikan-kelas')}
                className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
              >
                <GraduationCap className="w-5 h-5 text-[#075B36] mb-1" />
                <span className="text-[11px] font-bold text-slate-800">Kenaikan & Lulus</span>
                <span className="text-[9px] text-slate-400">Promosi Massal</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('siswa-list')}
                className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:border-emerald-200 transition-all cursor-pointer"
              >
                <Users className="w-5 h-5 text-[#075B36] mb-1" />
                <span className="text-[11px] font-semibold text-slate-800">Riwayat Kelas</span>
                <span className="text-[9px] text-slate-400">Data Akademik</span>
              </button>
            )}
          </div>

          {/* Admin only: Pengaturan Akun Google & Sekolah banner buttons */}
          {isAdmin && (
            <div className="mt-2 space-y-1.5">
              <button
                onClick={() => onNavigate('kelola-akun')}
                className="w-full p-2 bg-gradient-to-r from-blue-50/80 to-emerald-50/80 hover:from-blue-100/90 hover:to-emerald-100/90 border border-emerald-200/80 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Kelola Akun Google (Admin)</span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                        Otorisasi Gmail
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Daftarkan & Aktifkan Akun Google Guru dan Siswa
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>

              <button
                onClick={() => onNavigate('pengaturan-sekolah')}
                className="w-full p-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#075B36] text-white flex items-center justify-center shadow-xs">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#075B36]">Pengaturan Sekolah (Admin)</p>
                    <p className="text-[10px] text-slate-500">Ubah Nama, Alamat, WhatsApp & Upload Logo Resmi</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#075B36]" />
              </button>
            </div>
          )}
        </div>

        {/* ENHANCED SECTION: Kehadiran Hari Ini dengan Pilihan Kelas & Tanggal */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 space-y-3">
          {/* Header Controls: Title, Class Selector, and Date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-xs">Kehadiran Hari Ini</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/60">
                  {selectedClass === 'all' || selectedClass === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${selectedClass}`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Statistik kehadiran aktual dari database sekolah
              </p>
            </div>

            {/* Selectors for Class and Date */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Class Selector Dropdown */}
              <div className="relative">
                {isSiswa ? (
                  <div
                    className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-xl text-[11px] font-semibold cursor-not-allowed"
                    title="Akun siswa hanya dapat melihat kehadiran kelasnya sendiri"
                  >
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Kelas: {selectedClass}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedClass}
                      onChange={(e) => handleSelectClass(e.target.value)}
                      className="appearance-none bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 text-[#075B36] font-bold text-[11px] pl-2.5 pr-6 py-1 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#078749] cursor-pointer transition-colors"
                      title="Pilih kelas untuk melihat kehadiran"
                    >
                      <option value="all" className="bg-white text-slate-800 font-medium">
                        {isGuru ? 'Semua Kelas (Kelas Ajar)' : 'Semua Kelas'}
                      </option>
                      {classOptions.map((c) => (
                        <option key={c} value={c} className="bg-white text-slate-800 font-medium">
                          Kelas {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#075B36] absolute right-2 top-2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Date Selector */}
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] text-slate-600">
                <CalendarDays className="w-3 h-3 text-[#078749] mr-1 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none cursor-pointer"
                  title="Pilih tanggal absensi"
                />
              </div>
            </div>
          </div>

          {/* Loading State or Stat Cards */}
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 text-[#078749] animate-spin mb-1" />
              <span>Memuat data absensi Kelas {selectedClass}...</span>
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100 hover:border-emerald-300 transition-colors shadow-xs">
                  <span className="text-base font-extrabold text-[#078749] block leading-tight">
                    {hadirCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Hadir
                  </span>
                </div>

                <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 hover:border-amber-300 transition-colors shadow-xs">
                  <span className="text-base font-extrabold text-amber-600 block leading-tight">
                    {izinCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Izin
                  </span>
                </div>

                <div className="bg-rose-50 rounded-xl p-2.5 border border-rose-100 hover:border-rose-300 transition-colors shadow-xs">
                  <span className="text-base font-extrabold text-rose-600 block leading-tight">
                    {sakitCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Sakit
                  </span>
                </div>

                <div className="bg-slate-100 rounded-xl p-2.5 border border-slate-200 hover:border-slate-300 transition-colors shadow-xs">
                  <span className="text-base font-extrabold text-slate-600 block leading-tight">
                    {alphaCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Alpha
                  </span>
                </div>
              </div>

              {/* Informative Footer / Empty state message if total is 0 */}
              {totalRecorded === 0 ? (
                <div className="p-2 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Belum ada data absensi tercatat untuk Kelas {selectedClass} pada tanggal {formatDateLabel(selectedDate)}.
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                  <span>Total Siswa Tercatat: {totalRecorded} siswa</span>
                  <button
                    onClick={() => onNavigate('absensi')}
                    className="text-[#078749] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Buka Rincian Absensi</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
