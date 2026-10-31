import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Mail,
  UserCheck,
  UserX,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  X,
  User as UserIcon,
  RefreshCw,
  Info,
} from 'lucide-react';
import { User, Student, Role } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface GoogleAccountsScreenProps {
  onBack: () => void;
  currentUser: User | null;
}

export const GoogleAccountsScreen: React.FC<GoogleAccountsScreenProps> = ({
  onBack,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // 1. RBAC Guard: Only Admin can access account management
  if (!isAdmin) {
    return (
      <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between p-6 select-none">
        <header className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-slate-200 active:scale-95 transition-all text-slate-700 cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            Pengelolaan Akun Pengguna
          </h1>
        </header>

        <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 mb-4 ring-8 ring-rose-50">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-base font-bold text-slate-800 mb-2">Akses Khusus Administrator</h2>
          <p className="text-xs text-slate-600 max-w-xs leading-relaxed mb-6">
            Pendaftaran dan pengaturan akun Google siswa maupun dewan guru hanya dapat dikelola oleh pihak administrator sekolah demi menjaga keamanan data akademik.
          </p>

          <button
            onClick={onBack}
            className="py-2.5 px-6 rounded-xl bg-[#078749] hover:bg-[#075B36] text-white text-xs font-bold transition-all shadow-md shadow-emerald-800/20 cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          SMP Islam At-Toyib 45 • Sistem Administrasi Pengguna
        </div>
      </div>
    );
  }

  // Load Data
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [students] = useState<Student[]>(() => StorageService.getStudents());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'aktif' | 'nonaktif'>('ALL');

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingEmailUser, setEditingEmailUser] = useState<User | null>(null);
  const [newEmailValue, setNewEmailValue] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Registration Form State
  const [formName, setFormName] = useState('');
  const [formGmail, setFormGmail] = useState('');
  const [formRole, setFormRole] = useState<Role>('guru');
  const [formStatus, setFormStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [formSelectedStudentId, setFormSelectedStudentId] = useState('');
  const [formJabatan, setFormJabatan] = useState('Guru Mata Pelajaran');
  const [formNip, setFormNip] = useState('');
  const [formKelas, setFormKelas] = useState('VIII A');

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const refreshUsers = () => {
    setUsers(StorageService.getUsers());
  };

  // Back interceptors
  useBackHandler(
    'google-accounts-delete-modal',
    30,
    () => {
      setDeleteConfirmUser(null);
      return true;
    },
    deleteConfirmUser !== null
  );

  useBackHandler(
    'google-accounts-edit-modal',
    25,
    () => {
      setEditingEmailUser(null);
      return true;
    },
    editingEmailUser !== null
  );

  const isFormDirty =
    isRegisterModalOpen &&
    (formName.trim().length > 0 || formGmail.trim().length > 0);

  useBackHandler(
    'google-accounts-reg-modal',
    20,
    () => {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pendaftaran Akun?',
          message:
            'Data pendaftaran akun Google yang sedang diisi belum disimpan. Apakah Anda yakin ingin membatalkannya?',
          onDiscard: () => {
            setIsRegisterModalOpen(false);
            resetForm();
          },
        });
        return true;
      }
      setIsRegisterModalOpen(false);
      resetForm();
      return true;
    },
    isRegisterModalOpen
  );

  const resetForm = () => {
    setFormName('');
    setFormGmail('');
    setFormRole('guru');
    setFormStatus('aktif');
    setFormSelectedStudentId('');
    setFormJabatan('Guru Mata Pelajaran');
    setFormNip('');
    setFormKelas('VIII A');
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.nama.toLowerCase().includes(q);
        const matchEmail = (u.googleEmail || u.email || '').toLowerCase().includes(q);
        const matchUser = u.username.toLowerCase().includes(q);
        const matchNip = (u.nip || '').includes(q);
        if (!matchName && !matchEmail && !matchUser && !matchNip) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Statistics
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'aktif').length;
  const disabledCount = users.filter((u) => u.status === 'nonaktif').length;
  const guruCount = users.filter((u) => u.role === 'guru').length;
  const siswaCount = users.filter((u) => u.role === 'siswa').length;

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let studentData: Student | undefined;
    if (formRole === 'siswa' && formSelectedStudentId) {
      studentData = students.find((s) => s.id === formSelectedStudentId);
    }

    const payload = {
      nama: studentData ? studentData.nama : formName,
      googleEmail: formGmail,
      role: formRole,
      status: formStatus,
      studentId: studentData?.id,
      kelas: studentData ? studentData.kelas : (formRole === 'guru' ? formKelas : undefined),
      nip: studentData ? studentData.nis : (formNip || undefined),
      jabatan: formRole === 'siswa' ? `Siswa Kelas ${studentData?.kelas || formKelas}` : formJabatan,
    };

    const res = StorageService.registerGoogleUser(payload, currentUser);
    if (res.success && res.user) {
      refreshUsers();
      setIsRegisterModalOpen(false);
      resetForm();
      showToast('success', `Akun Google untuk "${res.user.nama}" (${res.user.googleEmail}) berhasil didaftarkan dan diaktifkan!`);
    } else {
      showToast('error', res.error || 'Gagal mendaftarkan akun.');
    }
  };

  // Toggle status
  const handleToggleStatus = (targetUser: User) => {
    const nextStatus = targetUser.status === 'aktif' ? 'nonaktif' : 'aktif';
    const actionLabel = nextStatus === 'aktif' ? 'mengaktifkan' : 'menonaktifkan';

    if (window.confirm(`Apakah Anda yakin ingin ${actionLabel} akun Google untuk ${targetUser.nama}?`)) {
      const res = StorageService.updateUserGoogleStatus(targetUser.id, nextStatus, currentUser);
      if (res.success) {
        refreshUsers();
        showToast('success', `Status akun ${targetUser.nama} berhasil diubah menjadi ${nextStatus.toUpperCase()}.`);
      } else {
        showToast('error', res.error || 'Gagal mengubah status.');
      }
    }
  };

  // Save new Gmail
  const handleSaveNewEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmailUser || !newEmailValue.trim()) return;

    const res = StorageService.updateUserGoogleEmail(editingEmailUser.id, newEmailValue, currentUser);
    if (res.success) {
      refreshUsers();
      setEditingEmailUser(null);
      showToast('success', `Alamat Google untuk ${editingEmailUser.nama} berhasil diperbarui.`);
    } else {
      showToast('error', res.error || 'Gagal memperbarui alamat email.');
    }
  };

  // Delete user
  const handleExecuteDelete = () => {
    if (!deleteConfirmUser) return;
    const res = StorageService.deleteUserAccount(deleteConfirmUser.id, currentUser);
    if (res.success) {
      refreshUsers();
      setDeleteConfirmUser(null);
      showToast('success', `Akun pengguna ${deleteConfirmUser.nama} berhasil dihapus.`);
    } else {
      showToast('error', res.error || 'Gagal menghapus akun.');
    }
  };

  const handleInAppBack = () => {
    if (deleteConfirmUser) {
      setDeleteConfirmUser(null);
      return;
    }
    if (editingEmailUser) {
      setEditingEmailUser(null);
      return;
    }
    if (isRegisterModalOpen) {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pendaftaran Akun?',
          message:
            'Data pendaftaran akun Google yang sedang diisi belum disimpan. Apakah Anda yakin ingin membatalkannya?',
          onDiscard: () => {
            setIsRegisterModalOpen(false);
            resetForm();
          },
        });
        return;
      }
      setIsRegisterModalOpen(false);
      resetForm();
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
              Pengelolaan Akun Google
            </h1>
            <span className="text-[10px] text-emerald-200">
              Otorisasi Akses Gmail • Administrator
            </span>
          </div>
        </div>

        {/* Register Button */}
        <button
          onClick={() => {
            resetForm();
            setIsRegisterModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 shadow-xs cursor-pointer active:scale-95 transition-all"
          title="Daftarkan Akun Google Baru"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Daftar Akun</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-20">
        {/* Toast Notification */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium leading-snug">{feedback.message}</span>
          </div>
        )}

        {/* Rule Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
          <div className="w-7 h-7 rounded-xl bg-[#075B36] text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-[#075B36]">
              Kebijakan Akses Google Terverifikasi
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Hanya akun Google yang telah didaftarkan dan berstatus <strong className="text-emerald-700">Aktif</strong> oleh admin yang diizinkan masuk ke sistem. Akun yang belum terdaftar atau dinonaktifkan akan ditolak secara otomatis.
            </p>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 block">Total Akun</span>
            <span className="text-base font-bold text-slate-800">{totalUsers}</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <span className="text-[10px] text-emerald-600 block">Aktif</span>
            <span className="text-base font-bold text-emerald-700">{activeCount}</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <span className="text-[10px] text-rose-600 block">Nonaktif</span>
            <span className="text-base font-bold text-rose-700">{disabledCount}</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <span className="text-[10px] text-amber-600 block">Siswa/Guru</span>
            <span className="text-base font-bold text-amber-700">{siswaCount}/{guruCount}</span>
          </div>
        </div>

        {/* Search & Role Filter Toolbar */}
        <div className="space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama atau Gmail..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
            />
          </div>

          {/* Role & Status Filter Badges */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1">
              {(['ALL', 'admin', 'guru', 'siswa'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                    roleFilter === r
                      ? 'bg-[#075B36] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {r === 'ALL' ? 'Semua Role' : r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {(['ALL', 'aktif', 'nonaktif'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === s
                      ? s === 'aktif'
                        ? 'bg-emerald-600 text-white'
                        : s === 'nonaktif'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s === 'ALL' ? 'Semua Status' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account Cards List */}
        <div className="space-y-2.5">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-200">
              Tidak ada akun yang sesuai dengan kriteria pencarian.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5 hover:border-emerald-300 transition-all text-left"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.foto}
                      alt={user.nama}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-800 truncate">
                          {user.nama}
                        </h3>
                        {/* Role Badge */}
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'guru'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {user.jabatan || (user.role === 'siswa' ? `Siswa Kelas ${user.kelas}` : 'Staf Sekolah')}
                      </p>
                    </div>
                  </div>

                  {/* Status Toggle Switch */}
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                      user.status === 'aktif'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                    title={user.status === 'aktif' ? 'Klik untuk menonaktifkan akun' : 'Klik untuk mengaktifkan akun'}
                  >
                    {user.status === 'aktif' ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>Aktif</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3 text-rose-600" />
                        <span>Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Email Info with Google Icon */}
                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-800 truncate block">
                        {user.googleEmail || user.email || 'Belum dihubungkan'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Username Login: {user.username}
                      </span>
                    </div>
                  </div>

                  {/* Edit Email button */}
                  <button
                    onClick={() => {
                      setEditingEmailUser(user);
                      setNewEmailValue(user.googleEmail || user.email || '');
                    }}
                    className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                    title="Ubah Alamat Gmail"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Footer details: ID, dates, and actions */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span>ID: {user.id}</span>
                    <span>•</span>
                    <span>Terdaftar: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : 'Awal Sistem'}</span>
                  </div>

                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => setDeleteConfirmUser(user)}
                      className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Pendaftaran Akun Google Baru */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 text-left flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#075B36] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Daftarkan Akun Google</h3>
                  <p className="text-[10px] text-slate-500">Kewenangan Administrator Sekolah</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRegisterModalOpen(false);
                  resetForm();
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-3 space-y-3">
              {/* Role Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Peran / Role Pengguna:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['guru', 'siswa', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        formRole === r
                          ? 'bg-[#075B36] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Siswa: Option to select existing student */}
              {formRole === 'siswa' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Hubungkan ke Data Siswa Terdaftar:
                  </label>
                  <select
                    value={formSelectedStudentId}
                    onChange={(e) => {
                      setFormSelectedStudentId(e.target.value);
                      const found = students.find((s) => s.id === e.target.value);
                      if (found) {
                        setFormName(found.nama);
                        setFormKelas(found.kelas);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">-- Pilih Siswa SMP Islam At-Toyib 45 --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nama} ({st.nis}) - Kelas {st.kelas}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Name input for Guru / Admin */
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Lengkap & Gelar:
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Ustadzah Nurul Hidayah, S.Pd."
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              )}

              {/* Google Email (Gmail) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <span>Alamat Gmail Terdaftar:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formGmail}
                    onChange={(e) => setFormGmail(e.target.value)}
                    placeholder="nama.pengguna@gmail.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Hanya email ini yang akan diizinkan masuk melalui tombol Google.
                </p>
              </div>

              {/* Additional Teacher fields */}
              {formRole === 'guru' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      NIP / NIY:
                    </label>
                    <input
                      type="text"
                      value={formNip}
                      onChange={(e) => setFormNip(e.target.value)}
                      placeholder="1987..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Wali Kelas:
                    </label>
                    <input
                      type="text"
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      placeholder="VIII A"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Initial Status */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Status Akun Awal:
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'aktif'}
                      onChange={() => setFormStatus('aktif')}
                      className="text-emerald-600"
                    />
                    <span>Aktif (Bisa Login)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'nonaktif'}
                      onChange={() => setFormStatus('nonaktif')}
                      className="text-emerald-600"
                    />
                    <span>Nonaktif (Akses Ditahan)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#075B36] hover:bg-[#064e2e] text-white shadow-sm transition-all cursor-pointer"
                >
                  Daftarkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah Alamat Gmail */}
      {editingEmailUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Ubah Alamat Gmail</h3>
              <button
                onClick={() => setEditingEmailUser(null)}
                className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Perbarui alamat Gmail resmi untuk pengguna <strong>{editingEmailUser.nama}</strong>:
            </p>

            <form onSubmit={handleSaveNewEmail} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={newEmailValue}
                  onChange={(e) => setNewEmailValue(e.target.value)}
                  placeholder="email.baru@gmail.com"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmailUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#078749] text-white hover:bg-[#075B36]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Akun */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Hapus Akun Pengguna?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun untuk <strong>{deleteConfirmUser.nama}</strong> ({deleteConfirmUser.googleEmail || deleteConfirmUser.email})? Pengguna tidak akan dapat login kembali.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
