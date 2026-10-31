import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  X,
  ChevronDown,
  User as UserIcon,
  HelpCircle,
} from 'lucide-react';
import { TeacherAssignment, User, Subject, AssignmentAuditLog, ClassItem } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface TeacherSubjectsScreenProps {
  onBack: () => void;
  currentUser: User;
  onNavigateToSchedule?: () => void;
}

export const TeacherSubjectsScreen: React.FC<TeacherSubjectsScreenProps> = ({
  onBack,
  currentUser,
  onNavigateToSchedule,
}) => {
  const isSiswa = currentUser.role === 'siswa';
  const isAdmin = currentUser.role === 'admin';
  const isGuru = currentUser.role === 'guru';

  // 1. RBAC Check: Student blocked from managing teacher subjects
  if (isSiswa) {
    return (
      <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between p-6 select-none">
        <header className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-slate-200 active:scale-95 transition-all text-slate-700"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            Mata Pelajaran Sekolah
          </h1>
        </header>

        <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mb-4 ring-8 ring-amber-50">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-base font-bold text-slate-800 mb-2">Akses Khusus Guru & Admin</h2>
          <p className="text-xs text-slate-600 max-w-xs leading-relaxed mb-6">
            Pengaturan penugasan mata pelajaran hanya dapat diakses oleh dewan guru dan pihak manajemen sekolah. Siswa dapat melihat mata pelajaran melalui menu Jadwal Pelajaran.
          </p>

          <button
            onClick={onBack}
            className="py-2.5 px-6 rounded-xl bg-[#078749] hover:bg-[#075B36] text-white text-xs font-bold transition-all shadow-md shadow-emerald-800/20 cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          SMP Islam At-Toyib 45 • Sistem Administrasi Akademik
        </div>
      </div>
    );
  }

  // Active Tab for Admin (Penugasan vs Audit Log)
  const [activeTab, setActiveTab] = useState<'assignments' | 'audit'>('assignments');

  // Load Data
  const [assignments, setAssignments] = useState<TeacherAssignment[]>(() =>
    StorageService.getTeacherAssignments()
  );
  const [subjects, setSubjects] = useState<Subject[]>(() => StorageService.getSubjects());
  const [auditLogs, setAuditLogs] = useState<AssignmentAuditLog[]>(() =>
    StorageService.getAssignmentAuditLogs()
  );
  const users = useMemo(() => StorageService.getUsers(), []);
  const teacherList = useMemo(() => users.filter((u) => u.role === 'guru'), [users]);
  const classList = ['VII A', 'VII B', 'VIII A', 'VIII B', 'IX A', 'IX B'];

  // Search & Filter States (Mainly for Admin or multi-view)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterTeacher, setFilterTeacher] = useState(isGuru ? currentUser.id : 'ALL');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formTeacherId, setFormTeacherId] = useState(currentUser.id);
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formCustomSubject, setFormCustomSubject] = useState('');
  const [formClass, setFormClass] = useState('VIII A');
  const [formYear, setFormYear] = useState('2026/2027');
  const [formSemester, setFormSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [formNote, setFormNote] = useState('');

  // Toast / Alert Feedback
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reload local state
  const refreshData = () => {
    setAssignments(StorageService.getTeacherAssignments());
    setSubjects(StorageService.getSubjects());
    setAuditLogs(StorageService.getAssignmentAuditLogs());
  };

  // Open Form to Add New Assignment
  const handleOpenAddModal = (targetTeacherId?: string) => {
    const selectedTId = isGuru ? currentUser.id : targetTeacherId || teacherList[0]?.id || currentUser.id;
    setEditingAssignment(null);
    setFormTeacherId(selectedTId);
    setFormSubjectName(subjects[0]?.nama || 'Pendidikan Agama Islam (PAI)');
    setFormCustomSubject('');
    setFormClass(currentUser.kelas || 'VIII A');
    setFormYear('2026/2027');
    setFormSemester('Ganjil');
    setFormNote('');
    setIsFormOpen(true);
  };

  // Open Form to Edit Existing Assignment
  const handleOpenEditModal = (item: TeacherAssignment) => {
    // RBAC Security Check: Guru cannot edit another teacher's assignment
    if (isGuru && item.guruId !== currentUser.id) {
      showToast('error', 'Anda tidak memiliki izin untuk mengubah mata pelajaran guru lain.');
      return;
    }

    setEditingAssignment(item);
    setFormTeacherId(item.guruId);
    setFormSubjectName(item.mataPelajaranNama);
    setFormCustomSubject('');
    setFormClass(item.kelas);
    setFormYear(item.tahunAjaran);
    setFormSemester(item.semester);
    setFormNote(item.keterangan || '');
    setIsFormOpen(true);
  };

  // Submit Add or Edit Assignment Form
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Determine Subject Name
    let finalSubjectName = formSubjectName;
    if (formSubjectName === 'CUSTOM') {
      if (!formCustomSubject.trim()) {
        showToast('error', 'Silakan ketikkan nama mata pelajaran baru.');
        return;
      }
      finalSubjectName = formCustomSubject.trim();
    }

    // 2. Identify Teacher
    let assignedTeacher = isGuru
      ? currentUser
      : users.find((u) => u.id === formTeacherId) || currentUser;

    // RBAC Security Check: Guru cannot assign to another teacher
    if (isGuru && assignedTeacher.id !== currentUser.id) {
      showToast('error', 'Anda tidak memiliki izin untuk mengubah mata pelajaran guru lain.');
      return;
    }

    // 3. Prepare Assignment Payload
    const payload: TeacherAssignment = {
      id: editingAssignment ? editingAssignment.id : `asg-${Date.now()}`,
      guruId: assignedTeacher.id,
      guruNama: assignedTeacher.nama,
      mataPelajaranId: `sub-${finalSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      mataPelajaranNama: finalSubjectName,
      kelas: formClass,
      tahunAjaran: formYear,
      semester: formSemester,
      keterangan: formNote,
      createdAt: editingAssignment ? editingAssignment.createdAt : '',
      updatedAt: '',
      updatedBy: currentUser.nama,
      updatedById: currentUser.id,
    };

    // 4. Save via StorageService with RBAC & Duplicate Enforcement
    const res = StorageService.saveTeacherAssignment(payload, currentUser);
    if (!res.success) {
      showToast('error', res.error || 'Gagal menyimpan penugasan mata pelajaran.');
      return;
    }

    refreshData();
    setIsFormOpen(false);
    showToast(
      'success',
      editingAssignment
        ? `Berhasil memperbarui penugasan ${finalSubjectName} (${formClass})!`
        : `Berhasil menambahkan mata pelajaran ${finalSubjectName} (${formClass})!`
    );
  };

  // Delete Assignment
  const handleDeleteAssignment = (id: string) => {
    const res = StorageService.deleteTeacherAssignment(id, currentUser);
    if (!res.success) {
      showToast('error', res.error || 'Gagal menghapus penugasan.');
      return;
    }

    refreshData();
    setDeleteConfirmId(null);
    showToast('success', 'Penugasan mata pelajaran berhasil dihapus dari sistem.');
  };

  // Filtered Assignments List
  const displayedAssignments = useMemo(() => {
    return assignments.filter((item) => {
      // Guru can ONLY view their own assignments if on Teacher mode, or can view all if permitted
      if (isGuru) {
        if (item.guruId !== currentUser.id) return false;
      } else if (isAdmin) {
        if (filterTeacher !== 'ALL' && item.guruId !== filterTeacher) return false;
      }

      if (filterSubject !== 'ALL' && item.mataPelajaranNama !== filterSubject) return false;
      if (filterClass !== 'ALL' && item.kelas !== filterClass) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.guruNama.toLowerCase().includes(q);
        const matchSubject = item.mataPelajaranNama.toLowerCase().includes(q);
        const matchClass = item.kelas.toLowerCase().includes(q);
        if (!matchName && !matchSubject && !matchClass) return false;
      }

      return true;
    });
  }, [assignments, currentUser, isGuru, isAdmin, filterTeacher, filterSubject, filterClass, searchQuery]);

  // Statistics for Current User
  const myAssignmentsCount = assignments.filter((a) => a.guruId === currentUser.id).length;
  const myDistinctClasses = Array.from(
    new Set(assignments.filter((a) => a.guruId === currentUser.id).map((a) => a.kelas))
  );

  // Check unsaved changes in form modal
  const isFormDirty =
    isFormOpen &&
    (editingAssignment
      ? formTeacherId !== editingAssignment.guruId ||
        formSubjectName !== editingAssignment.mataPelajaranNama ||
        formClass !== editingAssignment.kelas ||
        formYear !== editingAssignment.tahunAjaran ||
        formSemester !== editingAssignment.semester
      : formCustomSubject.trim().length > 0 || formNote.trim().length > 0);

  // Intercept delete confirmation modal (Priority 30)
  useBackHandler(
    'teacher-subjects-delete-modal',
    30,
    () => {
      setDeleteConfirmId(null);
      return true;
    },
    deleteConfirmId !== null
  );

  // Intercept form modal (Priority 20)
  useBackHandler(
    'teacher-subjects-form-modal',
    20,
    () => {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengaturan Mapel?',
          message:
            'Data penugasan mata pelajaran yang Anda ubah belum disimpan. Apakah Anda yakin ingin membatalkan?',
          onDiscard: () => {
            setIsFormOpen(false);
            setEditingAssignment(null);
          },
        });
        return true;
      }
      setIsFormOpen(false);
      setEditingAssignment(null);
      return true;
    },
    isFormOpen
  );

  const handleInAppBack = () => {
    if (deleteConfirmId) {
      setDeleteConfirmId(null);
      return;
    }
    if (isFormOpen) {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengaturan Mapel?',
          message:
            'Data penugasan mata pelajaran yang Anda ubah belum disimpan. Apakah Anda yakin ingin membatalkan?',
          onDiscard: () => {
            setIsFormOpen(false);
            setEditingAssignment(null);
          },
        });
        return;
      }
      setIsFormOpen(false);
      setEditingAssignment(null);
      return;
    }
    onBack();
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top Header - Islamic Green Gradient */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm shrink-0">
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
              {isAdmin ? 'Pengaturan Mata Pelajaran Guru' : 'Mata Pelajaran Saya'}
            </h1>
            <span className="text-[10px] text-emerald-200">
              {isAdmin ? 'Kewenangan Administrator' : `${currentUser.nama} (Guru)`}
            </span>
          </div>
        </div>

        {/* Header Action Button */}
        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 shadow-xs cursor-pointer active:scale-95 transition-all"
          title="Tambah Mata Pelajaran"
        >
          <Plus className="w-3.5 h-3.5 text-[#00FF87]" />
          <span>Tambah</span>
        </button>
      </header>

      {/* Floating Status Toast */}
      {statusMessage && (
        <div
          className={`fixed top-14 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 max-w-[90%] animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-[#075B36] text-white border border-emerald-400'
              : 'bg-rose-700 text-white border border-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Guru Banner Card */}
        {isGuru && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src={currentUser.foto}
                  alt={currentUser.nama}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-800 leading-snug">
                  {currentUser.nama}
                </h2>
                <p className="text-[10px] text-slate-500">
                  NIP: {currentUser.nip || '198403152009032004'} • {currentUser.jabatan || 'Dewan Guru'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] bg-emerald-50 text-[#075B36] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    {myAssignmentsCount} Penugasan Aktif
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {myDistinctClasses.length} Kelas Diajar
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="bg-[#078749] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                Guru
              </span>
              <span className="text-[9px] text-slate-400">2026/2027 Ganjil</span>
            </div>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        {isAdmin && (
          <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'assignments'
                  ? 'bg-white text-[#075B36] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Daftar Penugasan Guru ({assignments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-[#075B36] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Perubahan ({auditLogs.length})</span>
            </button>
          </div>
        )}

        {/* Tab 1: Assignments Management */}
        {activeTab === 'assignments' && (
          <>
            {/* Search and Filters Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isAdmin
                      ? 'Cari nama guru, mata pelajaran, atau kelas...'
                      : 'Cari mata pelajaran atau kelas saya...'
                  }
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
                />
              </div>

              {/* Filters for Admin */}
              {isAdmin && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold block mb-0.5">
                      Pilih Guru:
                    </label>
                    <select
                      value={filterTeacher}
                      onChange={(e) => setFilterTeacher(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 p-1.5 rounded-lg focus:outline-none"
                    >
                      <option value="ALL">Semua Guru</option>
                      {teacherList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold block mb-0.5">
                      Kelas:
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 p-1.5 rounded-lg focus:outline-none"
                    >
                      <option value="ALL">Semua Kelas</option>
                      {classList.map((c) => (
                        <option key={c} value={c}>
                          Kelas {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold block mb-0.5">
                      Mapel:
                    </label>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 p-1.5 rounded-lg focus:outline-none truncate"
                    >
                      <option value="ALL">Semua Mapel</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.nama}>
                          {s.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Assignments List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-800">
                  {isAdmin ? 'Penugasan Mata Pelajaran' : 'Daftar Mata Pelajaran yang Saya Ajar'}
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  {displayedAssignments.length} Data Ditemukan
                </span>
              </div>

              {displayedAssignments.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Penugasan Mata Pelajaran</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                    {isAdmin
                      ? 'Klik tombol Tambah di atas untuk menugaskan mata pelajaran pada dewan guru.'
                      : 'Klik tombol Tambah di atas untuk menambahkan mata pelajaran dan kelas yang Anda ajar.'}
                  </p>
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="mt-4 px-4 py-2 bg-[#078749] text-white text-xs font-bold rounded-xl hover:bg-[#075B36] cursor-pointer"
                  >
                    + Tambah Mata Pelajaran
                  </button>
                </div>
              ) : (
                displayedAssignments.map((asg) => {
                  const isOwner = asg.guruId === currentUser.id;
                  const canEdit = isAdmin || isOwner;

                  return (
                    <div
                      key={asg.id}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {asg.mataPelajaranNama}
                            </span>
                            <span className="text-[10px] bg-[#E5F5EC] text-[#078749] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              Kelas {asg.kelas}
                            </span>
                          </div>

                          {/* Teacher Name (especially visible for Admin) */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                            <UserCheck className="w-3.5 h-3.5 text-[#078749] shrink-0" />
                            <span className="font-semibold text-slate-700 truncate">
                              {asg.guruNama}
                            </span>
                          </div>

                          {asg.keterangan && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              {asg.keterangan}
                            </p>
                          )}
                        </div>

                        {/* Action buttons (Edit & Delete) */}
                        <div className="flex items-center gap-1 shrink-0">
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(asg)}
                                className="p-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-[#078749] border border-slate-200 transition-colors cursor-pointer"
                                title="Edit Penugasan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(asg.id)}
                                className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                                title="Hapus Penugasan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="p-1.5 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"
                              title="Anda tidak memiliki izin mengubah mata pelajaran guru lain"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Info: Year, Semester & Last Update */}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-100 font-mono">
                        <span className="flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {asg.tahunAjaran} ({asg.semester})
                        </span>
                        <span>Diperbarui: {asg.updatedBy || asg.guruNama}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tab 2: Audit Logs (For Admin) */}
        {activeTab === 'audit' && isAdmin && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-800">
                Log Riwayat Perubahan Mata Pelajaran
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Catatan resmi sistem
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                Belum ada catatan riwayat perubahan.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          log.tindakan === 'TAMBAH'
                            ? 'bg-emerald-100 text-[#075B36]'
                            : log.tindakan === 'EDIT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.tindakan}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.waktu}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800 leading-snug">
                      {log.mataPelajaranNama} (Kelas {log.kelas}) • Guru: {log.guruNama}
                    </p>

                    {log.detailSebelum && (
                      <p className="text-[10px] text-slate-400">
                        Sebelum: <span className="line-through">{log.detailSebelum}</span>
                      </p>
                    )}
                    {log.detailSesudah && (
                      <p className="text-[10px] text-emerald-700">
                        Sesudah: {log.detailSesudah}
                      </p>
                    )}

                    <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                      Oleh: <strong>{log.dilakukanOleh}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-rose-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-800">
              Konfirmasi Hapus Penugasan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus penugasan mata pelajaran ini? Tindakan ini akan dicatat dalam riwayat audit.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAssignment(deleteConfirmId)}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-900/20 cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal: Add / Edit Assignment */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-3 sm:hidden"></div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E5F5EC] flex items-center justify-center text-[#078749]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                    {editingAssignment ? 'Edit Penugasan Mapel' : 'Tambah Penugasan Mapel'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isAdmin ? 'Pengaturan Mata Pelajaran Guru' : 'Atur Mata Pelajaran Anda'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Teacher Selector (Admin only; Locked for Teacher) */}
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                  Guru yang Ditugaskan
                </label>
                {isAdmin ? (
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-[#078749]"
                  >
                    {teacherList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} ({t.jabatan || 'Guru'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-slate-700 font-semibold cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.nama} (Akun Anda Sendiri)</span>
                  </div>
                )}
              </div>

              {/* Subject Selector */}
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={formSubjectName}
                  onChange={(e) => setFormSubjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-[#078749] mb-1.5"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.nama}>
                      {s.nama}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ketikkan Mata Pelajaran Baru...</option>
                </select>

                {formSubjectName === 'CUSTOM' && (
                  <input
                    type="text"
                    value={formCustomSubject}
                    onChange={(e) => setFormCustomSubject(e.target.value)}
                    placeholder="Masukkan nama mata pelajaran baru..."
                    className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl focus:outline-none text-xs"
                    autoFocus
                  />
                )}
              </div>

              {/* Class Selector */}
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                  Kelas yang Diajar
                </label>
                <select
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-[#078749]"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year & Semester */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Semester
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                  Keterangan / Silabus (Opsional)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Contoh: Fokus hafalan surat pendek & fiqih ibadah"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#078749] text-white text-xs font-bold hover:bg-[#075B36] cursor-pointer shadow-md shadow-emerald-800/20"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
