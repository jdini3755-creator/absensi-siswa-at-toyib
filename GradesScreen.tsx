import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Award,
  FileSpreadsheet,
  Plus,
  Edit2,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Search,
  Filter,
  Layers,
  Calendar,
  BookOpen,
  GraduationCap,
  TrendingUp,
  X,
} from 'lucide-react';
import { GradeRecord, Student, User } from '../types';
import { StorageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface GradesScreenProps {
  onBack: () => void;
  grades: GradeRecord[];
  students: Student[];
  selectedClass: string;
  userRole: string;
  currentUser?: User | null;
  onUpdateGrade: (grade: GradeRecord) => void;
}

export const GradesScreen: React.FC<GradesScreenProps> = ({
  onBack,
  grades,
  students,
  selectedClass,
  userRole,
  currentUser,
  onUpdateGrade,
}) => {
  const isSiswa = currentUser?.role === 'siswa' || userRole === 'siswa';
  const isAdmin = currentUser?.role === 'admin' || userRole === 'admin';
  const isGuru = currentUser?.role === 'guru' || userRole === 'guru';

  // Allowed classes based on actor
  const allowedClassItems = useMemo(() => {
    return StorageService.getAllowedClassesForUser(currentUser || null);
  }, [currentUser]);

  const teacherAssignments = useMemo(() => {
    return StorageService.getTeacherAssignments();
  }, []);

  // Classes taught by this guru
  const myAssignedClassNames = useMemo(() => {
    if (isGuru && currentUser) {
      const set = new Set(
        teacherAssignments
          .filter((a) => a.guruId === currentUser.id)
          .map((a) => a.kelas)
      );
      return Array.from(set);
    }
    return allowedClassItems.map((c) => c.nama);
  }, [isGuru, currentUser, teacherAssignments, allowedClassItems]);

  // Subjects taught by this guru
  const myAssignedSubjects = useMemo(() => {
    if (isGuru && currentUser) {
      const set = new Set(
        teacherAssignments
          .filter((a) => a.guruId === currentUser.id)
          .map((a) => a.mataPelajaranNama)
      );
      return Array.from(set);
    }
    return [];
  }, [isGuru, currentUser, teacherAssignments]);

  const allSubjects = [
    'Pendidikan Agama Islam (PAI)',
    'Tahfidz Al-Qur\'an',
    'Bahasa Arab',
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA (Fisika & Biologi)',
    'IPS Terpadu',
    'Fiqih & Ibadah Amaliah',
    'Informatika & Komputer',
    'Pendidikan Jasmani (PJOK)',
    'Seni Budaya & Prakarya',
  ];

  // Filters State
  // Default class filter: if siswa -> their class; if guru/admin -> 'all' or selectedClass
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(() => {
    if (isSiswa) return currentUser?.kelas || 'VIII A';
    return selectedClass || 'all';
  });

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(() => {
    if (isGuru && myAssignedSubjects.length > 0) {
      return myAssignedSubjects[0];
    }
    return 'all';
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026/2027');
  const [selectedSemester, setSelectedSemester] = useState<string>('Ganjil');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Grade Form State
  const [newGradeData, setNewGradeData] = useState<{
    studentId: string;
    kelas: string;
    mataPelajaran: string;
    nilaiTugas: number;
    nilaiUlangan: number;
    nilaiUjian: number;
    catatanGuru: string;
  }>({
    studentId: '',
    kelas: allowedClassItems[0]?.nama || 'VIII A',
    mataPelajaran: myAssignedSubjects[0] || allSubjects[0],
    nilaiTugas: 80,
    nilaiUlangan: 80,
    nilaiUjian: 80,
    catatanGuru: '',
  });

  // 1. Back handler for editing grade modal
  useBackHandler('grades-edit-modal', 20, () => {
    if (editingGrade) {
      setEditingGrade(null);
      return true;
    }
    return false;
  }, Boolean(editingGrade));

  // 2. Back handler for add new grade modal with unsaved check
  useBackHandler('grades-add-modal', 10, () => {
    if (isAddModalOpen) {
      if (newGradeData.studentId) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Input Nilai?',
          message: 'Data nilai yang sedang Anda isi belum disimpan. Yakin ingin membatalkan dan menutup formulir?',
          onDiscard: () => setIsAddModalOpen(false),
        });
      } else {
        setIsAddModalOpen(false);
      }
      return true;
    }
    return false;
  }, isAddModalOpen);

  // Calculate filtered grades with strict role boundary
  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      // 1. Role-based scoping
      if (isSiswa && currentUser) {
        const isOwn =
          (currentUser.studentId && g.studentId === currentUser.studentId) ||
          g.studentName.toLowerCase() === currentUser.nama.toLowerCase() ||
          currentUser.username === 'siswa';
        if (!isOwn) return false;
      }

      if (isGuru && currentUser) {
        // Teacher can only see records belonging to their assigned classes/subjects
        const hasAssignment = teacherAssignments.some(
          (a) =>
            a.guruId === currentUser.id &&
            a.kelas === g.kelas &&
            (a.mataPelajaranNama.toLowerCase() === g.mataPelajaran.toLowerCase() ||
              selectedSubjectFilter === 'all')
        );
        // If not assigned to this class, teacher cannot view/edit
        if (!hasAssignment && !myAssignedClassNames.includes(g.kelas)) {
          return false;
        }
      }

      // 2. Class Filter: "all" vs specific
      if (selectedClassFilter !== 'all') {
        if (g.kelas !== selectedClassFilter) return false;
      } else {
        // If "all" and Guru: limit only to classes they teach
        if (isGuru && !myAssignedClassNames.includes(g.kelas)) {
          return false;
        }
      }

      // 3. Subject Filter: "all" vs specific
      if (selectedSubjectFilter !== 'all') {
        if (g.mataPelajaran.toLowerCase() !== selectedSubjectFilter.toLowerCase()) return false;
      }

      // 4. Semester Filter
      if (selectedSemester !== 'all') {
        if (g.semester !== selectedSemester) return false;
      }

      // 5. Search Filter (student name or NIS)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = g.studentName.toLowerCase().includes(q);
        const matchesSub = g.mataPelajaran.toLowerCase().includes(q);
        if (!matchesName && !matchesSub) return false;
      }

      return true;
    });
  }, [
    grades,
    isSiswa,
    isGuru,
    currentUser,
    teacherAssignments,
    myAssignedClassNames,
    selectedClassFilter,
    selectedSubjectFilter,
    selectedSemester,
    searchQuery,
  ]);

  // Summary statistics
  const totalRecords = filteredGrades.length;
  const averageFinalGrade = useMemo(() => {
    if (totalRecords === 0) return 0;
    const sum = filteredGrades.reduce((acc, curr) => acc + curr.nilaiAkhir, 0);
    return Math.round((sum / totalRecords) * 10) / 10;
  }, [filteredGrades, totalRecords]);

  const countPredikatA = filteredGrades.filter((g) => g.nilaiAkhir >= 90).length;
  const countRemedial = filteredGrades.filter((g) => g.nilaiAkhir < 75).length;

  // Check if current user can edit a specific grade
  const canEditGrade = (g: GradeRecord): boolean => {
    if (isSiswa) return false;
    if (isAdmin) return true;
    if (isGuru && currentUser) {
      return teacherAssignments.some(
        (a) =>
          a.guruId === currentUser.id &&
          a.kelas === g.kelas &&
          a.mataPelajaranNama.toLowerCase() === g.mataPelajaran.toLowerCase()
      );
    }
    return false;
  };

  // Export to Excel
  const exportGradesToExcel = () => {
    if (filteredGrades.length === 0) {
      alert('Tidak ada data nilai untuk diekspor pada filter yang dipilih.');
      return;
    }

    const dataRows = filteredGrades.map((g, i) => {
      const pred =
        g.nilaiAkhir >= 90 ? 'A' : g.nilaiAkhir >= 80 ? 'B' : g.nilaiAkhir >= 75 ? 'C' : 'D';
      const statusKetercapaian = g.nilaiAkhir >= 75 ? 'Tuntas' : 'Remedial';

      return {
        No: i + 1,
        'Nama Siswa': g.studentName,
        Kelas: g.kelas,
        'Mata Pelajaran': g.mataPelajaran,
        Semester: g.semester,
        'Tahun Ajaran': selectedAcademicYear,
        'Tugas (30%)': g.nilaiTugas,
        'Ulangan (30%)': g.nilaiUlangan,
        'Ujian (40%)': g.nilaiUjian,
        'Nilai Akhir': g.nilaiAkhir,
        Predikat: pred,
        Status: statusKetercapaian,
        'Catatan Guru': g.catatanGuru || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Nilai');
    const classLabel = selectedClassFilter === 'all' ? 'Semua_Kelas' : selectedClassFilter.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Rekap_Nilai_${classLabel}_${Date.now()}.xlsx`);
  };

  // Save edited grade
  const handleSaveGradeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    if (!canEditGrade(editingGrade)) {
      setFeedbackToast({
        type: 'error',
        message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah nilai mata pelajaran/kelas ini.',
      });
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    // Calculate final weighted score: 30% Tugas + 30% Ulangan + 40% Ujian
    const finalScore = Math.round(
      Number(editingGrade.nilaiTugas) * 0.3 +
      Number(editingGrade.nilaiUlangan) * 0.3 +
      Number(editingGrade.nilaiUjian) * 0.4
    );

    const updated: GradeRecord = {
      ...editingGrade,
      nilaiTugas: Number(editingGrade.nilaiTugas),
      nilaiUlangan: Number(editingGrade.nilaiUlangan),
      nilaiUjian: Number(editingGrade.nilaiUjian),
      nilaiAkhir: Math.min(100, Math.max(0, finalScore)),
      semester: selectedSemester === 'all' ? editingGrade.semester : (selectedSemester as 'Ganjil' | 'Genap'),
    };

    onUpdateGrade(updated);
    setEditingGrade(null);
    setFeedbackToast({
      type: 'success',
      message: `Nilai ${updated.studentName} berhasil diperbarui (Nilai Akhir: ${updated.nilaiAkhir})!`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Handle Create New Grade
  const handleCreateNewGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeData.studentId) {
      alert('Pilih siswa terlebih dahulu.');
      return;
    }

    const st = students.find((s) => s.id === newGradeData.studentId);
    if (!st) return;

    const finalScore = Math.round(
      Number(newGradeData.nilaiTugas) * 0.3 +
      Number(newGradeData.nilaiUlangan) * 0.3 +
      Number(newGradeData.nilaiUjian) * 0.4
    );

    const newRec: GradeRecord = {
      id: `grd-${Date.now()}`,
      studentId: st.id,
      studentName: st.nama,
      kelas: st.kelas,
      mataPelajaran: newGradeData.mataPelajaran,
      semester: selectedSemester === 'all' ? 'Ganjil' : (selectedSemester as 'Ganjil' | 'Genap'),
      tahunAjaran: selectedAcademicYear || '2026/2027',
      nilaiTugas: Number(newGradeData.nilaiTugas),
      nilaiUlangan: Number(newGradeData.nilaiUlangan),
      nilaiUjian: Number(newGradeData.nilaiUjian),
      nilaiAkhir: Math.min(100, Math.max(0, finalScore)),
      catatanGuru: newGradeData.catatanGuru.trim() || undefined,
    };

    onUpdateGrade(newRec);
    setIsAddModalOpen(false);
    setFeedbackToast({
      type: 'success',
      message: `Nilai baru untuk ${st.nama} (${newGradeData.mataPelajaran}) berhasil ditambahkan!`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative min-h-full pb-16">
      {/* Header */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              Nilai Siswa
            </h1>
            <span className="text-[10px] text-emerald-200">
              KBM TA {selectedAcademicYear} • Semester {selectedSemester}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isSiswa && (
            <button
              onClick={() => {
                const targetClass = selectedClassFilter === 'all' ? (allowedClassItems[0]?.nama || 'VIII A') : selectedClassFilter;
                const classStudentsList = students.filter((s) => s.kelas === targetClass);
                setNewGradeData({
                  studentId: classStudentsList[0]?.id || '',
                  kelas: targetClass,
                  mataPelajaran: myAssignedSubjects[0] || allSubjects[0],
                  nilaiTugas: 85,
                  nilaiUlangan: 85,
                  nilaiUjian: 85,
                  catatanGuru: 'Aktif dalam pembelajaran',
                });
                setIsAddModalOpen(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white shadow-xs transition-colors cursor-pointer"
              title="Input Nilai Baru"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={exportGradesToExcel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Ekspor Rekap Nilai ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className={`mx-4 mt-3 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-sm animate-in fade-in duration-200 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="bg-white border-b border-slate-200/80 p-4 space-y-3 shrink-0 shadow-xs">
        {/* Row 1: Class and Subject Filters */}
        <div className="grid grid-cols-2 gap-2">
          {/* Class Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Pilih Kelas
            </label>
            {isSiswa ? (
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Kelas {currentUser?.kelas || 'VIII A'}</span>
              </div>
            ) : (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#078749]"
              >
                <option value="all">
                  {isGuru ? 'Semua Kelas (Kelas Ajar)' : 'Semua Kelas'}
                </option>
                {allowedClassItems.map((c) => (
                  <option key={c.id} value={c.nama}>
                    Kelas {c.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#078749]"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {allSubjects.map((sub) => {
                const isTaughtByMe = isGuru && myAssignedSubjects.includes(sub);
                return (
                  <option key={sub} value={sub}>
                    {sub} {isTaughtByMe ? '★' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Row 2: Academic Year & Semester & Search */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 p-1.5 rounded-xl"
            >
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 p-1.5 rounded-xl"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
              <option value="all">Semua</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama / NIS..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2">
            <span className="text-[10px] text-slate-500 block">Total Data</span>
            <span className="text-sm font-extrabold text-[#075B36]">{totalRecords}</span>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2">
            <span className="text-[10px] text-slate-500 block">Rata-rata</span>
            <span className="text-sm font-extrabold text-[#078749]">{averageFinalGrade}</span>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2">
            <span className="text-[10px] text-slate-500 block">Predikat A</span>
            <span className="text-sm font-extrabold text-amber-700">{countPredikatA}</span>
          </div>
          <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2">
            <span className="text-[10px] text-slate-500 block">Remedial</span>
            <span className="text-sm font-extrabold text-rose-700">{countRemedial}</span>
          </div>
        </div>
      </div>

      {/* Grades List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredGrades.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-2">
            <Award className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-medium text-slate-600">Tidak ada data nilai yang sesuai dengan filter.</p>
            <p className="text-[11px] text-slate-400">
              Pilih kelas atau mata pelajaran lain, atau gunakan tombol Tambah (+) untuk memasukkan nilai baru.
            </p>
          </div>
        ) : (
          filteredGrades.map((g) => {
            const isAuthorized = canEditGrade(g);
            const predikat =
              g.nilaiAkhir >= 90 ? 'A' : g.nilaiAkhir >= 80 ? 'B' : g.nilaiAkhir >= 75 ? 'C' : 'D';
            const isTuntas = g.nilaiAkhir >= 75;

            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{g.studentName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-[#075B36]">
                        Kelas {g.kelas}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5 truncate">
                      {g.mataPelajaran}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Semester {g.semester} • TA {selectedAcademicYear}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-[#E5F5EC] text-[#078749] px-3 py-1.5 rounded-2xl text-center border border-emerald-200/60 shadow-2xs">
                      <span className="text-[9px] block text-slate-500 font-medium">Nilai Akhir</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-base font-black leading-none">{g.nilaiAkhir}</span>
                        <span className={`text-[10px] font-bold ${isTuntas ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ({predikat})
                        </span>
                      </div>
                    </div>

                    {/* Edit action */}
                    {!isSiswa && (
                      isAuthorized ? (
                        <button
                          onClick={() => setEditingGrade(g)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-[#078749] border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Nilai Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div
                          className="p-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          title="Hanya guru pengampu mata pelajaran di kelas ini yang dapat mengubah nilai"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Sub-scores: Tugas (30%), Ulangan (30%), Ujian (40%) */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Tugas (30%)</span>
                    <span className="font-bold text-slate-700">{g.nilaiTugas}</span>
                  </div>
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Ulangan (30%)</span>
                    <span className="font-bold text-slate-700">{g.nilaiUlangan}</span>
                  </div>
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Ujian (40%)</span>
                    <span className="font-bold text-slate-700">{g.nilaiUjian}</span>
                  </div>
                </div>

                {g.catatanGuru && (
                  <p className="text-[11px] text-slate-600 italic bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    Catatan Guru: "{g.catatanGuru}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Grade Modal */}
      {editingGrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Nilai: {editingGrade.studentName}
                </h3>
                <p className="text-[11px] text-emerald-800 font-semibold">{editingGrade.mataPelajaran} • Kelas {editingGrade.kelas}</p>
              </div>
              <button
                onClick={() => setEditingGrade(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGradeForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tugas (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingGrade.nilaiTugas}
                    onChange={(e) =>
                      setEditingGrade({ ...editingGrade, nilaiTugas: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#078749]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ulangan (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingGrade.nilaiUlangan}
                    onChange={(e) =>
                      setEditingGrade({ ...editingGrade, nilaiUlangan: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#078749]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ujian (40%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingGrade.nilaiUjian}
                    onChange={(e) =>
                      setEditingGrade({ ...editingGrade, nilaiUjian: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#078749]"
                  />
                </div>
              </div>

              {/* Live Preview of Nilai Akhir */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Kalkulasi Nilai Akhir:</span>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    (30% × {editingGrade.nilaiTugas}) + (30% × {editingGrade.nilaiUlangan}) + (40% × {editingGrade.nilaiUjian})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#075B36]">
                    {Math.round(
                      editingGrade.nilaiTugas * 0.3 +
                      editingGrade.nilaiUlangan * 0.3 +
                      editingGrade.nilaiUjian * 0.4
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Guru</label>
                <textarea
                  rows={2}
                  value={editingGrade.catatanGuru || ''}
                  onChange={(e) =>
                    setEditingGrade({ ...editingGrade, catatanGuru: e.target.value })
                  }
                  placeholder="Catatan perkembangan belajar siswa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#078749]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl font-bold shadow-md shadow-emerald-900/20"
                >
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Grade Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Input Nilai Baru</h3>
                <p className="text-[10px] text-slate-400">Tambahkan nilai siswa untuk rapor</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewGrade} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Siswa</label>
                <select
                  value={newGradeData.studentId}
                  onChange={(e) => {
                    const stId = e.target.value;
                    const st = students.find((s) => s.id === stId);
                    setNewGradeData({
                      ...newGradeData,
                      studentId: stId,
                      kelas: st?.kelas || newGradeData.kelas,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students
                    .filter((s) => selectedClassFilter === 'all' || s.kelas === selectedClassFilter)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.nis} - Kelas {s.kelas})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
                <select
                  value={newGradeData.mataPelajaran}
                  onChange={(e) =>
                    setNewGradeData({ ...newGradeData, mataPelajaran: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                >
                  {(isGuru && myAssignedSubjects.length > 0 ? myAssignedSubjects : allSubjects).map(
                    (sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tugas (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newGradeData.nilaiTugas}
                    onChange={(e) =>
                      setNewGradeData({ ...newGradeData, nilaiTugas: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ulangan (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newGradeData.nilaiUlangan}
                    onChange={(e) =>
                      setNewGradeData({ ...newGradeData, nilaiUlangan: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ujian (40%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newGradeData.nilaiUjian}
                    onChange={(e) =>
                      setNewGradeData({ ...newGradeData, nilaiUjian: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-center font-bold bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Guru (Opsional)</label>
                <textarea
                  rows={2}
                  value={newGradeData.catatanGuru}
                  onChange={(e) =>
                    setNewGradeData({ ...newGradeData, catatanGuru: e.target.value })
                  }
                  placeholder="Catatan prestasi / perbaikan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl font-bold shadow-md shadow-emerald-900/20"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
