import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  X,
  History,
} from 'lucide-react';
import { Student, User, ClassItem, PromotionLog } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';

interface StudentPromotionScreenProps {
  onBack: () => void;
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const StudentPromotionScreen: React.FC<StudentPromotionScreenProps> = ({
  onBack,
  currentUser,
  onRefreshData,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const settings = StorageService.getSettings();

  const [activeTab, setActiveTab] = useState<'promosi' | 'kelulusan' | 'riwayat'>('promosi');
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [classes, setClasses] = useState<ClassItem[]>(() => StorageService.getClasses());
  const [promotionLogs, setPromotionLogs] = useState<PromotionLog[]>(() =>
    StorageService.getPromotionLogs()
  );

  // Promotion Form State
  const [sourceYear, setSourceYear] = useState('2025/2026');
  const [targetYear, setTargetYear] = useState(settings.tahunAjaranAktif || '2026/2027');
  const [sourceClass, setSourceClass] = useState('VII A');
  const [targetClass, setTargetClass] = useState('VIII A');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promotionNote, setPromotionNote] = useState('Kenaikan kelas reguler');

  // Graduation Form State
  const [gradClass, setGradClass] = useState('IX A');
  const [selectedGradStudentIds, setSelectedGradStudentIds] = useState<string[]>([]);
  const [gradYear, setGradYear] = useState(settings.tahunAjaranAktif || '2026/2027');
  const [gradDate, setGradDate] = useState(new Date().toISOString().split('T')[0]);
  const [gradNote, setGradNote] = useState('Kelulusan peserta didik SMP Islam At-Toyib 45');

  // Preview & Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'KENAIKAN' | 'KELULUSAN'>('KENAIKAN');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshAll = () => {
    setStudents(StorageService.getStudents());
    setClasses(StorageService.getClasses());
    setPromotionLogs(StorageService.getPromotionLogs());
    if (onRefreshData) onRefreshData();
  };

  // Filter students in source class for promotion
  const promotionSourceStudents = useMemo(() => {
    return students.filter(
      (s) => s.kelas === sourceClass && s.statusAkademik !== 'lulus'
    );
  }, [students, sourceClass]);

  // Filter students in source class for graduation (grade IX)
  const gradSourceStudents = useMemo(() => {
    return students.filter(
      (s) => s.kelas === gradClass && s.statusAkademik !== 'lulus'
    );
  }, [students, gradClass]);

  // Toggle selection for promotion
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPromotion = () => {
    if (selectedStudentIds.length === promotionSourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(promotionSourceStudents.map((s) => s.id));
    }
  };

  // Toggle selection for graduation
  const toggleSelectGradStudent = (id: string) => {
    setSelectedGradStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllGrad = () => {
    if (selectedGradStudentIds.length === gradSourceStudents.length) {
      setSelectedGradStudentIds([]);
    } else {
      setSelectedGradStudentIds(gradSourceStudents.map((s) => s.id));
    }
  };

  // Execute promotion after confirmation
  const handleExecutePromotion = () => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Hanya administrator yang berwenang.' });
      return;
    }

    const res = StorageService.promoteStudents({
      studentIds: selectedStudentIds,
      sourceYear,
      targetYear,
      sourceClass,
      targetClass,
      catatan: promotionNote,
      actor: currentUser,
    });

    setIsConfirmModalOpen(false);

    if (res.success) {
      refreshAll();
      setSelectedStudentIds([]);
      setFeedback({
        type: 'success',
        message: `Berhasil menaikkan ${res.promotedCount} siswa dari ${sourceClass} ke ${targetClass}!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal memproses kenaikan kelas.' });
    }
  };

  // Execute graduation after confirmation
  const handleExecuteGraduation = () => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Hanya administrator yang berwenang.' });
      return;
    }

    const res = StorageService.graduateStudents({
      studentIds: selectedGradStudentIds,
      tahunLulus: gradYear,
      tanggalLulus: gradDate,
      catatan: gradNote,
      actor: currentUser,
    });

    setIsConfirmModalOpen(false);

    if (res.success) {
      refreshAll();
      setSelectedGradStudentIds([]);
      setFeedback({
        type: 'success',
        message: `Berhasil meluluskan ${res.graduatedCount} siswa dari ${gradClass}! Status diperbarui menjadi Alumni.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal memproses kelulusan.' });
    }
  };

  // Undo promotion log
  const handleUndoPromotion = (logId: string) => {
    if (!isAdmin) {
      alert('Akses ditolak: Hanya administrator yang berwenang membatalkan riwayat.');
      return;
    }

    if (window.confirm('Batalkan riwayat proses ini dan kembalikan seluruh siswa ke kelas semula?')) {
      const res = StorageService.undoPromotion(logId, currentUser);
      if (res.success) {
        refreshAll();
        setFeedback({
          type: 'success',
          message: 'Riwayat proses berhasil dibatalkan dan status siswa dikembalikan!',
        });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert(res.error || 'Gagal membatalkan riwayat.');
      }
    }
  };

  // Intercept confirmation modal with Back button
  useBackHandler(
    'student-promotion-confirm-modal',
    20,
    () => {
      setIsConfirmModalOpen(false);
      return true;
    },
    isConfirmModalOpen
  );

  const handleInAppBack = () => {
    if (isConfirmModalOpen) {
      setIsConfirmModalOpen(false);
      return;
    }
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-full pb-16">
      {/* Header */}
      <div className="bg-[#075B36] text-white px-4 pt-10 pb-6 rounded-b-3xl shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleInAppBack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-wide">Kenaikan & Kelulusan</h1>
            <p className="text-[11px] text-emerald-200">Manajemen Promosi & Riwayat Siswa</p>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs shadow-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('promosi')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'promosi'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Kenaikan Kelas
          </button>
          <button
            onClick={() => setActiveTab('kelulusan')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'kelulusan'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Kelulusan (Alumni)
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'riwayat'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat & Undo
          </button>
        </div>

        {/* ================= TAB 1: PROMOSI / KENAIKAN KELAS ================= */}
        {activeTab === 'promosi' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Layers className="w-4 h-4 text-[#075B36]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Konfigurasi Kenaikan Kelas
                </h3>
              </div>

              {/* Source Class & Target Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kelas Asal
                  </label>
                  <select
                    value={sourceClass}
                    onChange={(e) => {
                      setSourceClass(e.target.value);
                      setSelectedStudentIds([]);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama} ({c.tahunAjaran})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kelas Tujuan
                  </label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-[#075B36]"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama} ({c.tahunAjaran})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Years */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tahun Ajaran Asal
                  </label>
                  <input
                    type="text"
                    value={sourceYear}
                    onChange={(e) => setSourceYear(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tahun Ajaran Tujuan
                  </label>
                  <input
                    type="text"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Catatan Kenaikan Kelas
                </label>
                <input
                  type="text"
                  value={promotionNote}
                  onChange={(e) => setPromotionNote(e.target.value)}
                  placeholder="Misal: Kenaikan ke Kelas VIII A Tahun Ajaran 2026/2027"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Student Checklist Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#075B36]" />
                  <h3 className="text-xs font-bold text-slate-800">
                    Pilih Siswa Kelas {sourceClass} ({promotionSourceStudents.length} siswa)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAllPromotion}
                  className="text-xs text-[#075B36] font-semibold hover:underline flex items-center gap-1"
                >
                  {selectedStudentIds.length === promotionSourceStudents.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Batal Semua
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" /> Pilih Semua
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {promotionSourceStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Tidak ada siswa aktif di kelas {sourceClass}.
                  </p>
                ) : (
                  promotionSourceStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleSelectStudent(st.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.foto}
                            alt={st.nama}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{st.nama}</p>
                            <p className="text-[10px] text-slate-400">
                              NIS: {st.nis} • NISN: {st.nisn || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="text-emerald-700">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#075B36]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0 || !isAdmin}
                  onClick={() => {
                    setConfirmType('KENAIKAN');
                    setIsConfirmModalOpen(true);
                  }}
                  className="w-full py-3 bg-[#075B36] hover:bg-[#064e2e] active:scale-[0.98] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition-all disabled:opacity-40"
                >
                  <TrendingUp className="w-4 h-4" />
                  Proses Kenaikan ({selectedStudentIds.length} Siswa Terpilih)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: KELULUSAN SISWA (ALUMNI) ================= */}
        {activeTab === 'kelulusan' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <GraduationCap className="w-4 h-4 text-[#075B36]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pengaturan Kelulusan Siswa Tingkat IX
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pilih Kelas IX
                  </label>
                  <select
                    value={gradClass}
                    onChange={(e) => {
                      setGradClass(e.target.value);
                      setSelectedGradStudentIds([]);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {classes
                      .filter((c) => c.tingkat === 'IX' || c.nama.includes('IX'))
                      .map((c) => (
                        <option key={c.id} value={c.nama}>
                          {c.nama}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tahun Kelulusan
                  </label>
                  <input
                    type="text"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tanggal Kelulusan
                  </label>
                  <input
                    type="date"
                    value={gradDate}
                    onChange={(e) => setGradDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Baru
                  </label>
                  <div className="px-3 py-2 text-xs bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200">
                    LULUS / ALUMNI
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Students Grade IX */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#075B36]" />
                  <h3 className="text-xs font-bold text-slate-800">
                    Siswa Calon Lulusan ({gradSourceStudents.length} siswa)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAllGrad}
                  className="text-xs text-[#075B36] font-semibold hover:underline flex items-center gap-1"
                >
                  {selectedGradStudentIds.length === gradSourceStudents.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Batal Semua
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" /> Pilih Semua
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {gradSourceStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Tidak ada siswa aktif di kelas {gradClass}.
                  </p>
                ) : (
                  gradSourceStudents.map((st) => {
                    const isSelected = selectedGradStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleSelectGradStudent(st.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.foto}
                            alt={st.nama}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{st.nama}</p>
                            <p className="text-[10px] text-slate-400">
                              NIS: {st.nis} • NISN: {st.nisn || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="text-amber-700">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={selectedGradStudentIds.length === 0 || !isAdmin}
                  onClick={() => {
                    setConfirmType('KELULUSAN');
                    setIsConfirmModalOpen(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-[0.98] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-40"
                >
                  <GraduationCap className="w-4 h-4" />
                  Proses Kelulusan ({selectedGradStudentIds.length} Siswa Terpilih)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RIWAYAT & UNDO LOG ================= */}
        {activeTab === 'riwayat' && (
          <div className="space-y-3">
            {promotionLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Kenaikan/Kelulusan</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Seluruh pemrosesan promosi akan tercatat di sini dan dapat dibatalkan (undo) jika ada kekeliruan.
                </p>
              </div>
            ) : (
              promotionLogs.map((log) => {
                const isReverted = log.isReverted;
                return (
                  <div
                    key={log.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                      isReverted ? 'border-slate-200 bg-slate-50/60 opacity-75' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            log.tipe === 'KENAIKAN'
                              ? 'bg-emerald-100 text-[#075B36]'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.tipe}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            isReverted ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isReverted ? 'DIBATALKAN (UNDO)' : 'SUKSES'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{log.tanggal}</span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-0.5">
                      <p className="font-semibold text-slate-900">
                        {log.kelasAsal} → {log.kelasTujuan}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tahun: {log.tahunAjaranAsal} → {log.tahunAjaranTujuan} •{' '}
                        <strong>{log.jumlahSiswa} Siswa</strong>
                      </p>
                      <p className="text-[10px] text-slate-400">Operator: {log.dilakukanOleh}</p>
                    </div>

                    {/* Preview Names */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                        {log.siswaList.map((s) => s.nama).slice(0, 3).join(', ')}
                        {log.siswaList.length > 3 && ` +${log.siswaList.length - 3} lainnya`}
                      </div>

                      {isAdmin && !isReverted && (
                        <button
                          type="button"
                          onClick={() => handleUndoPromotion(log.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Batalkan (Undo)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Confirmation & Preview Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Konfirmasi {confirmType === 'KENAIKAN' ? 'Kenaikan Kelas' : 'Kelulusan Siswa'}
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 mb-4">
              <p>Pastikan rincian data di bawah ini sudah benar sebelum memproses:</p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-[11px]">
                {confirmType === 'KENAIKAN' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kelas Asal:</span>
                      <strong className="text-slate-800">{sourceClass} ({sourceYear})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kelas Tujuan:</span>
                      <strong className="text-[#075B36]">{targetClass} ({targetYear})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jumlah Siswa:</span>
                      <strong className="text-slate-900">{selectedStudentIds.length} Siswa</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kelas Kelulusan:</span>
                      <strong className="text-slate-800">{gradClass}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tahun Lulus:</span>
                      <strong className="text-amber-700">{gradYear}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jumlah Siswa:</span>
                      <strong className="text-slate-900">{selectedGradStudentIds.length} Siswa</strong>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Riwayat kelas siswa akan otomatis diperbarui dan dapat dibatalkan (undo) sewaktu-waktu oleh administrator.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={confirmType === 'KENAIKAN' ? handleExecutePromotion : handleExecuteGraduation}
                className="flex-1 py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20"
              >
                Ya, Proses Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
