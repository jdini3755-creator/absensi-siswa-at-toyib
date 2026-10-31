import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User as UserIcon,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Calendar,
  BookOpen,
  Info,
} from 'lucide-react';
import { ScheduleItem, User } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface ScheduleScreenProps {
  onBack: () => void;
  scheduleList: ScheduleItem[];
  selectedClass: string;
  onSelectClass: (c: string) => void;
  currentUser: User;
  onSaveScheduleItem: (item: ScheduleItem) => { success: boolean; error?: string };
  onDeleteScheduleItem: (id: string) => { success: boolean; error?: string };
  onNavigateToTeacherSubjects?: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  onBack,
  scheduleList,
  selectedClass,
  onSelectClass,
  currentUser,
  onSaveScheduleItem,
  onDeleteScheduleItem,
  onNavigateToTeacherSubjects,
}) => {
  const isSiswa = currentUser.role === 'siswa';
  const isAdmin = currentUser.role === 'admin';
  const isGuru = currentUser.role === 'guru';

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
  const [activeDay, setActiveDay] = useState<typeof days[number]>('Rabu');
  const [filterMyTeaching, setFilterMyTeaching] = useState(false);

  // Modals & Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form Fields
  const [formKelas, setFormKelas] = useState(selectedClass);
  const [formMapel, setFormMapel] = useState('');
  const [formGuru, setFormGuru] = useState(isGuru ? currentUser.nama : '');
  const [formHari, setFormHari] = useState<typeof days[number]>('Senin');
  const [formJamMulai, setFormJamMulai] = useState('07:15');
  const [formJamSelesai, setFormJamSelesai] = useState('08:45');
  const [formRuangan, setFormRuangan] = useState('Ruang 8A');

  const allowedClasses = StorageService.getAllowedClassesForUser(currentUser);
  const classList = allowedClasses.map((c) => c.nama);

  const teachersList = [
    'Ibu Siti Rahmah, S.Pd.',
    'Pak H. Bambang Sudrajat, M.M.',
    'Ustadz Ahmad Zaki, M.Pd.',
    'Pak Drs. M. Yusuf',
    'Ibu Ratna Dewi, M.Si.',
    'Pak Hendra Kurnia, S.Pd.',
    'Ustadz H. Syarifudin',
    'Ms. Sarah Melati, M.Pd.',
    'Pak Bambang Setyo, S.Pd.',
    'Coach Arif Rahman, S.Pd.',
    'Pak Dani Pratama, S.Kom.',
    'Ibu Maya Larasati, S.Sn.',
  ];

  const subjectsList = [
    'Pendidikan Agama Islam (PAI)',
    'Tahfidz Al-Qur\'an',
    'Bahasa Arab',
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA (Fisika & Biologi)',
    'IPS Terpadu',
    'Informatika & Komputer',
    'Pendidikan Jasmani (PJOK)',
    'Fiqih & Ibadah Amaliah',
    'Seni Budaya & Prakarya',
  ];

  // Filter schedule
  const filteredSchedule = scheduleList.filter((item) => {
    if (item.hari !== activeDay) return false;

    if (filterMyTeaching && isGuru) {
      return item.guru.toLowerCase().includes(currentUser.nama.toLowerCase());
    }

    if (selectedClass === 'all' || selectedClass === 'Semua Kelas') {
      if (isAdmin) return true;
      if (isGuru) {
        return classList.includes(item.kelas) || item.guru.toLowerCase().includes(currentUser.nama.toLowerCase());
      }
      return item.kelas === (currentUser.kelas || 'VIII A');
    }

    return item.kelas === selectedClass;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormKelas(selectedClass === 'all' || selectedClass === 'Semua Kelas' ? (classList[0] || 'VIII A') : selectedClass);
    setFormMapel(subjectsList[0]);
    setFormGuru(isGuru ? currentUser.nama : teachersList[0]);
    setFormHari(activeDay);
    setFormJamMulai('07:15');
    setFormJamSelesai('08:45');
    setFormRuangan(`Ruang ${selectedClass.replace(/\s+/g, '')}`);
    setValidationError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormKelas(item.kelas);
    setFormMapel(item.mataPelajaran);
    setFormGuru(item.guru);
    setFormHari(item.hari);
    setFormJamMulai(item.jamMulai);
    setFormJamSelesai(item.jamSelesai);
    setFormRuangan(item.ruangan || '');
    setValidationError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const scheduleToSave: ScheduleItem = {
      id: editingItem ? editingItem.id : `sch-${Date.now()}`,
      kelas: formKelas,
      mataPelajaran: formMapel,
      guru: formGuru,
      hari: formHari,
      jamMulai: formJamMulai,
      jamSelesai: formJamSelesai,
      ruangan: formRuangan.trim() || undefined,
    };

    const result = onSaveScheduleItem(scheduleToSave);
    if (!result.success) {
      setValidationError(result.error || 'Gagal menyimpan jadwal.');
      return;
    }

    setIsFormOpen(false);
    setSuccessToast(editingItem ? 'Jadwal berhasil diperbarui!' : 'Jadwal baru berhasil ditambahkan!');
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleDelete = (id: string, mapel: string) => {
    if (confirm(`Yakin ingin menghapus jadwal "${mapel}"?`)) {
      const res = onDeleteScheduleItem(id);
      if (res.success) {
        setSuccessToast('Jadwal berhasil dihapus!');
        setTimeout(() => setSuccessToast(null), 2000);
      } else {
        alert(res.error || 'Gagal menghapus jadwal.');
      }
    }
  };

  const isFormDirty =
    isFormOpen &&
    (editingItem
      ? formMapel !== editingItem.mataPelajaran ||
        formKelas !== editingItem.kelas ||
        formGuru !== editingItem.guru ||
        formHari !== editingItem.hari ||
        formJamMulai !== editingItem.jamMulai ||
        formJamSelesai !== editingItem.jamSelesai
      : formMapel.trim().length > 0 || formRuangan.trim().length > 0);

  // Intercept Android hardware Back button when form is open
  useBackHandler(
    'schedule-form-modal',
    20,
    () => {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengaturan Jadwal?',
          message:
            'Data jadwal yang sedang diisi belum disimpan. Apakah Anda yakin ingin membatalkan perubahan?',
          onDiscard: () => {
            setIsFormOpen(false);
            setEditingItem(null);
          },
        });
        return true;
      }
      setIsFormOpen(false);
      setEditingItem(null);
      return true;
    },
    isFormOpen
  );

  const handleInAppBack = () => {
    if (isFormOpen) {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengaturan Jadwal?',
          message:
            'Data jadwal yang sedang diisi belum disimpan. Apakah Anda yakin ingin membatalkan perubahan?',
          onDiscard: () => {
            setIsFormOpen(false);
            setEditingItem(null);
          },
        });
        return;
      }
      setIsFormOpen(false);
      setEditingItem(null);
      return;
    }
    onBack();
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm">
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
              Jadwal Pelajaran
            </h1>
            <span className="text-[10px] text-emerald-200">
              Tahun Ajaran 2026/2027 • Semester Ganjil
            </span>
          </div>
        </div>

        {/* Header Action Buttons (Only Admin & Guru) */}
        {!isSiswa && (
          <div className="flex items-center gap-1.5">
            {onNavigateToTeacherSubjects && (
              <button
                onClick={onNavigateToTeacherSubjects}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/20 cursor-pointer active:scale-95 transition-all"
                title={isAdmin ? 'Pengaturan Mata Pelajaran Guru' : 'Mata Pelajaran Saya'}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">{isAdmin ? 'Atur Mapel' : 'Mapel Saya'}</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium border border-emerald-500/40 cursor-pointer active:scale-95 transition-all"
              title="Tambah Jadwal"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        )}
      </header>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-[#075B36] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Class & Filter Bar */}
      <div className="bg-white border-b border-slate-200/80 p-3.5 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-600">Pilih Kelas:</label>
            {isSiswa ? (
              <span className="text-xs font-bold text-[#075B36] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Kelas {selectedClass}
              </span>
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#078749]"
              >
                <option value="all">
                  {currentUser.role === 'guru' ? 'Semua Kelas (Kelas Ajar)' : 'Semua Kelas'}
                </option>
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.nama}>
                    Kelas {c.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Teacher quick toggle for teaching schedule */}
          {isGuru && (
            <button
              onClick={() => setFilterMyTeaching(!filterMyTeaching)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMyTeaching
                  ? 'bg-[#078749] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Jadwal Mengajar Saya
            </button>
          )}
        </div>

        {/* Days Tabs (Senin - Sabtu) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeDay === day
                  ? 'bg-[#078749] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSchedule.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
            Tidak ada jadwal pelajaran untuk hari {activeDay} ({filterMyTeaching ? 'Jadwal Mengajar Anda' : `Kelas ${selectedClass}`}).
          </div>
        ) : (
          filteredSchedule.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs hover:border-emerald-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5F5EC] text-[#075B36]">
                      Jam Ke-{index + 1}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Kelas {item.kelas}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.mataPelajaran}
                  </h3>
                </div>

                <div className="flex items-center gap-1 text-[#078749] bg-emerald-50 px-2 py-1 rounded-lg font-mono text-[11px] font-bold shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{item.jamMulai} - {item.jamSelesai}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  {item.guru}
                </span>

                <div className="flex items-center gap-2">
                  {item.ruangan && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {item.ruangan}
                    </span>
                  )}

                  {!isSiswa && (
                    <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        title="Edit Jadwal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(item.id, item.mataPelajaran)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Schedule Modal with Strict Validation */}
      {!isSiswa && isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-left border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {editingItem ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Pastikan tidak ada jam tumpang tindih pada kelas maupun guru yang sama.
            </p>

            {validationError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Kelas</label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                    required
                  >
                    {classList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Hari</label>
                  <select
                    value={formHari}
                    onChange={(e) => setFormHari(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                    required
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">Mata Pelajaran</label>
                <select
                  value={formMapel}
                  onChange={(e) => setFormMapel(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                  required
                >
                  {subjectsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">Guru Pengajar</label>
                <select
                  value={formGuru}
                  onChange={(e) => setFormGuru(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                  required
                >
                  {teachersList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Teacher Assignment check notice */}
                {(() => {
                  const assignments = StorageService.getTeacherAssignments();
                  const assigned = assignments.filter(
                    (a) =>
                      a.mataPelajaranNama.toLowerCase() === formMapel.toLowerCase() &&
                      a.kelas === formKelas
                  );
                  const assignedNames = assigned.map((a) => a.guruNama);
                  const isAssigned = assignedNames.some(
                    (n) => n.toLowerCase() === formGuru.toLowerCase()
                  );

                  if (assignedNames.length > 0 && !isAssigned) {
                    return (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5 mt-1">
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Perhatian:</strong> Berdasarkan data penugasan, guru resmi untuk{' '}
                          <strong>{formMapel}</strong> di Kelas <strong>{formKelas}</strong> adalah{' '}
                          <strong>{assignedNames.join(', ')}</strong>.
                        </span>
                      </div>
                    );
                  } else if (isAssigned) {
                    return (
                      <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#075B36] text-[10px] font-semibold flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#078749] shrink-0" />
                        <span>Sesuai Penugasan Resmi Guru ({formKelas})</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-[#078749]"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Jam Selesai</label>
                  <input
                    type="time"
                    value={formJamSelesai}
                    onChange={(e) => setFormJamSelesai(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-[#078749]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">Ruangan (Opsional)</label>
                <input
                  type="text"
                  value={formRuangan}
                  onChange={(e) => setFormRuangan(e.target.value)}
                  placeholder="Contoh: Ruang 8A, Lab Sains, Masjid"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#078749] text-white font-bold hover:bg-[#075B36] cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
