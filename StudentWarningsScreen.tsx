import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { StudentWarning, User, Student } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface StudentWarningsScreenProps {
  onBack: () => void;
  currentUser: User | null;
}

export const StudentWarningsScreen: React.FC<StudentWarningsScreenProps> = ({
  onBack,
  currentUser,
}) => {
  const isSiswa = currentUser?.role === 'siswa';
  const isAdmin = currentUser?.role === 'admin';
  const isGuru = currentUser?.role === 'guru';

  const [warnings, setWarnings] = useState<StudentWarning[]>(() =>
    StorageService.getWarnings(currentUser)
  );
  const [students] = useState<Student[]>(() => StorageService.getStudents());

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarning, setEditingWarning] = useState<StudentWarning | null>(null);

  // Form State
  const [formStudentId, setFormStudentId] = useState('');
  const [formKategori, setFormKategori] = useState<StudentWarning['kategori']>('Kedisiplinan');
  const [formTingkat, setFormTingkat] = useState<StudentWarning['tingkat']>('Ringan');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formWaktu, setFormWaktu] = useState(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
  const [formKronologi, setFormKronologi] = useState('');
  const [formTindakan, setFormTindakan] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formStatus, setFormStatus] = useState<StudentWarning['statusTindakLanjut']>('Baru');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshWarnings = () => {
    setWarnings(StorageService.getWarnings(currentUser));
  };

  const allowedClasses = useMemo(() => {
    return StorageService.getAllowedClassesForUser(currentUser);
  }, [currentUser]);

  // Filter students allowed for this actor
  const allowedStudents = useMemo(() => {
    if (isAdmin) return students;
    if (isGuru) {
      const allowedClassNames = allowedClasses.map((c) => c.nama);
      return students.filter((s) => allowedClassNames.includes(s.kelas));
    }
    return [];
  }, [students, isAdmin, isGuru, allowedClasses]);

  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchSearch =
        w.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.nis.includes(searchQuery) ||
        w.kronologi.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = filterClass === 'all' || w.kelas === filterClass;
      const matchCat = filterCategory === 'all' || w.kategori === filterCategory;
      const matchLvl = filterLevel === 'all' || w.tingkat === filterLevel;
      const matchStat = filterStatus === 'all' || w.statusTindakLanjut === filterStatus;

      return matchSearch && matchClass && matchCat && matchLvl && matchStat;
    });
  }, [warnings, searchQuery, filterClass, filterCategory, filterLevel, filterStatus]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingWarning(null);
    setFormStudentId(allowedStudents[0]?.id || '');
    setFormKategori('Kedisiplinan');
    setFormTingkat('Ringan');
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormWaktu(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    setFormKronologi('');
    setFormTindakan('');
    setFormCatatan('');
    setFormStatus('Baru');
    setFeedback(null);
    setIsAddModalOpen(true);
  };

  // Open Edit / Follow-up Modal
  const openEditModal = (w: StudentWarning) => {
    setEditingWarning(w);
    setFormStudentId(w.studentId);
    setFormKategori(w.kategori);
    setFormTingkat(w.tingkat);
    setFormTanggal(w.tanggal);
    setFormWaktu(w.waktu);
    setFormKronologi(w.kronologi);
    setFormTindakan(w.tindakanPembinaan);
    setFormCatatan(w.catatan || '');
    setFormStatus(w.statusTindakLanjut);
    setFeedback(null);
    setIsAddModalOpen(true);
  };

  const handleSaveWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSiswa) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Siswa dilarang mencatat pembinaan.' });
      return;
    }

    const targetStudent = students.find((s) => s.id === formStudentId);
    if (!targetStudent && !editingWarning) {
      setFeedback({ type: 'error', message: 'Pilih siswa terlebih dahulu.' });
      return;
    }

    if (!formKronologi.trim() || !formTindakan.trim()) {
      setFeedback({ type: 'error', message: 'Kronologi kejadian dan tindakan pembinaan wajib diisi.' });
      return;
    }

    const payload: StudentWarning = {
      id: editingWarning ? editingWarning.id : `wrn-${Date.now()}`,
      studentId: editingWarning ? editingWarning.studentId : (targetStudent?.id || ''),
      studentName: editingWarning ? editingWarning.studentName : (targetStudent?.nama || ''),
      nis: editingWarning ? editingWarning.nis : (targetStudent?.nis || ''),
      kelas: editingWarning ? editingWarning.kelas : (targetStudent?.kelas || ''),
      tanggal: formTanggal,
      waktu: formWaktu,
      kategori: formKategori,
      tingkat: formTingkat,
      kronologi: formKronologi.trim(),
      tindakanPembinaan: formTindakan.trim(),
      catatan: formCatatan.trim(),
      dicatatOleh: editingWarning ? editingWarning.dicatatOleh : (currentUser?.nama || 'Guru'),
      petugasId: editingWarning ? editingWarning.petugasId : (currentUser?.id || 'u-guru'),
      statusTindakLanjut: formStatus,
      createdAt: editingWarning ? editingWarning.createdAt : new Date().toISOString(),
    };

    const res = StorageService.saveWarning(payload, currentUser);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan catatan teguran.' });
      return;
    }

    refreshWarnings();
    setIsAddModalOpen(false);
    setFeedback({
      type: 'success',
      message: editingWarning
        ? `Catatan pembinaan untuk ${payload.studentName} berhasil diperbarui.`
        : `Teguran & pembinaan baru untuk ${payload.studentName} berhasil dicatat.`,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteWarning = (w: StudentWarning) => {
    if (!isAdmin) {
      alert('Akses ditolak: Hanya administrator yang dapat menghapus catatan peringatan.');
      return;
    }

    if (window.confirm(`Hapus catatan teguran untuk ${w.studentName}?`)) {
      const res = StorageService.deleteWarning(w.id, currentUser);
      if (res.success) {
        refreshWarnings();
        setFeedback({ type: 'success', message: 'Catatan teguran berhasil dihapus.' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        alert(res.error || 'Gagal menghapus.');
      }
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: StudentWarning['statusTindakLanjut']) => {
    switch (status) {
      case 'Baru':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Dalam pembinaan':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Selesai':
        return 'bg-emerald-100 text-[#075B36] border-emerald-200';
      case 'Perlu tindak lanjut':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper for level badge
  const getLevelBadge = (level: StudentWarning['tingkat']) => {
    switch (level) {
      case 'Ringan':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'Sedang':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Berat':
        return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  const isFormDirty =
    isAddModalOpen &&
    (editingWarning
      ? formKronologi !== editingWarning.kronologi ||
        formTindakan !== editingWarning.tindakanPembinaan ||
        formStatus !== editingWarning.statusTindakLanjut
      : formKronologi.trim().length > 0 || formTindakan.trim().length > 0);

  // Intercept Android hardware Back button when modal is open
  useBackHandler(
    'student-warnings-modal',
    20,
    () => {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Formulir Pembinaan?',
          message:
            'Data pembinaan yang diisi belum disimpan. Apakah Anda yakin ingin membatalkan perubahan?',
          onDiscard: () => {
            setIsAddModalOpen(false);
            setEditingWarning(null);
          },
        });
        return true;
      }
      setIsAddModalOpen(false);
      setEditingWarning(null);
      return true;
    },
    isAddModalOpen
  );

  const handleInAppBack = () => {
    if (isAddModalOpen) {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Formulir Pembinaan?',
          message:
            'Data pembinaan yang diisi belum disimpan. Apakah Anda yakin ingin membatalkan perubahan?',
          onDiscard: () => {
            setIsAddModalOpen(false);
            setEditingWarning(null);
          },
        });
        return;
      }
      setIsAddModalOpen(false);
      setEditingWarning(null);
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
            <h1 className="text-lg font-bold text-white tracking-wide">Teguran & Pembinaan</h1>
            <p className="text-[11px] text-emerald-200">
              {isSiswa ? 'Catatan Disiplin Pribadi' : 'Bimbingan Konseling & Kedisiplinan'}
            </p>
          </div>
          {!isSiswa ? (
            <button
              onClick={openAddModal}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 flex items-center justify-center shadow-md transition-all text-white"
              title="Catat Teguran / Pembinaan Baru"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Notice for Siswa */}
        {isSiswa && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#075B36] shrink-0 mt-0.5" />
            <span>
              Catatan pembinaan akhlak & kedisiplinan Anda. Jadikan evaluasi untuk menjadi pribadi yang lebih berilmu dan berakhlak mulia.
            </span>
          </div>
        )}

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

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs text-center">
            <p className="text-[10px] text-slate-400 font-medium">Total</p>
            <p className="text-sm font-extrabold text-slate-800">{warnings.length}</p>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs text-center">
            <p className="text-[10px] text-blue-500 font-medium">Baru</p>
            <p className="text-sm font-extrabold text-blue-700">
              {warnings.filter((w) => w.statusTindakLanjut === 'Baru').length}
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs text-center">
            <p className="text-[10px] text-amber-500 font-medium">Proses</p>
            <p className="text-sm font-extrabold text-amber-700">
              {warnings.filter((w) => w.statusTindakLanjut === 'Dalam pembinaan').length}
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs text-center">
            <p className="text-[10px] text-emerald-600 font-medium">Selesai</p>
            <p className="text-sm font-extrabold text-[#075B36]">
              {warnings.filter((w) => w.statusTindakLanjut === 'Selesai').length}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar (Teacher/Admin) */}
        {!isSiswa && (
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa, NIS, atau kronologi..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value="all">Semua Kelas</option>
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.nama}>
                    Kelas {c.nama}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">Semua Kategori</option>
                <option value="Kedisiplinan">Kedisiplinan</option>
                <option value="Kerapian">Kerapian</option>
                <option value="Ibadah/Keagamaan">Ibadah/Agama</option>
                <option value="Akademik">Akademik</option>
                <option value="Perilaku/Sosial">Perilaku</option>
                <option value="Lainnya">Lainnya</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">Semua Tingkat</option>
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">Semua Status</option>
                <option value="Baru">Baru</option>
                <option value="Dalam pembinaan">Dalam Pembinaan</option>
                <option value="Selesai">Selesai</option>
                <option value="Perlu tindak lanjut">Tindak Lanjut</option>
              </select>
            </div>
          </div>
        )}

        {/* Warnings List */}
        <div className="space-y-3">
          {filteredWarnings.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs">
              <ShieldAlert className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Tidak Ada Catatan Teguran</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isSiswa
                  ? 'Alhamdulillah, Anda tidak memiliki catatan pelanggaran atau teguran kedisiplinan.'
                  : 'Belum ada catatan teguran siswa pada kriteria filter ini.'}
              </p>
              {!isSiswa && (
                <button
                  onClick={openAddModal}
                  className="mt-3 px-3 py-1.5 bg-[#075B36] text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Catat Pembinaan Baru
                </button>
              )}
            </div>
          ) : (
            filteredWarnings.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-extrabold text-slate-900">{w.studentName}</h3>
                      <span className="text-[10px] text-[#075B36] font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {w.kelas}
                      </span>
                      <span className="text-[10px] text-slate-400">NIS: {w.nis}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span>{w.tanggal} • {w.waktu}</span>
                      <span>• Petugas: {w.dicatatOleh}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(
                        w.statusTindakLanjut
                      )}`}
                    >
                      {w.statusTindakLanjut}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-semibold border ${getLevelBadge(
                        w.tingkat
                      )}`}
                    >
                      {w.tingkat} • {w.kategori}
                    </span>
                  </div>
                </div>

                {/* Kronologi */}
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                  <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                    Kronologi Kejadian:
                  </p>
                  <p className="text-slate-800 leading-relaxed">{w.kronologi}</p>
                </div>

                {/* Tindakan Pembinaan */}
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/70 text-[11px] space-y-1">
                  <p className="text-[#075B36] font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Tindakan Bimbingan & Pembinaan:
                  </p>
                  <p className="text-slate-700 leading-relaxed">{w.tindakanPembinaan}</p>
                  {w.catatan && (
                    <p className="text-[10px] text-slate-500 italic pt-1 border-t border-emerald-100/50">
                      Catatan Tambahan: {w.catatan}
                    </p>
                  )}
                </div>

                {/* Actions for Guru / Admin */}
                {!isSiswa && (
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[10px] text-slate-400">
                      {w.updatedAt && `Diperbarui: ${w.updatedAt}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(w)}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg font-medium flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Update Tindak Lanjut
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWarning(w)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Tambah / Update Catatan Pembinaan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingWarning
                    ? `Update Pembinaan: ${editingWarning.studentName}`
                    : 'Catat Teguran & Pembinaan Siswa'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {editingWarning
                    ? 'Perbarui progres bimbingan konseling dan tindak lanjut siswa'
                    : 'Catat insiden pelanggaran atau kebutuhan pembinaan akhlak siswa'}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWarning} className="space-y-3">
              {/* Select Student (if creating new) */}
              {!editingWarning ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Siswa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {allowedStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nama} ({st.kelas}) - NIS: {st.nis}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800">{editingWarning.studentName}</p>
                  <p className="text-[10px] text-slate-500">
                    Kelas: {editingWarning.kelas} • NIS: {editingWarning.nis}
                  </p>
                </div>
              )}

              {/* Kategori & Tingkat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as StudentWarning['kategori'])}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Kedisiplinan">Kedisiplinan</option>
                    <option value="Kerapian">Kerapian & Atribut</option>
                    <option value="Ibadah/Keagamaan">Ibadah / Shalat</option>
                    <option value="Akademik">Akademik / Tugas</option>
                    <option value="Perilaku/Sosial">Perilaku & Adab</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Teguran</label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value as StudentWarning['tingkat'])}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Ringan">Ringan (Teguran Lisan)</option>
                    <option value="Sedang">Sedang (Bimbingan Tertulis)</option>
                    <option value="Berat">Berat (Panggilan Ortu)</option>
                  </select>
                </div>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Kejadian</label>
                  <input
                    type="time"
                    required
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Kronologi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kronologi Kejadian / Pelanggaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formKronologi}
                  onChange={(e) => setFormKronologi(e.target.value)}
                  placeholder="Jelaskan secara objektif apa yang terjadi..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Tindakan Pembinaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tindakan Pembinaan & Bimbingan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formTindakan}
                  onChange={(e) => setFormTindakan(e.target.value)}
                  placeholder="Misal: Diberikan nasehat, hafalan surat pendek, atau kesepakatan tertulis..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Tindak Lanjut */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Tindak Lanjut
                </label>
                <select
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as StudentWarning['statusTindakLanjut'])
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="Baru">Baru Tercatat</option>
                  <option value="Dalam pembinaan">Dalam Pembinaan Aktif</option>
                  <option value="Selesai">Selesai (Sudah Tertib Kembali)</option>
                  <option value="Perlu tindak lanjut">Perlu Tindak Lanjut Lanjutan (BK / Ortu)</option>
                </select>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Misal: Komitmen siswa tidak mengulangi perbuatannya"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20"
                >
                  {editingWarning ? 'Simpan Pembaruan' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
