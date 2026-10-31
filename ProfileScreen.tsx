import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  User,
  Lock,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Upload,
  BookOpen,
  Layers,
  GraduationCap,
  ShieldAlert,
  CreditCard,
  School,
  UserCheck,
} from 'lucide-react';
import { User as UserType, AppSettings } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface ProfileScreenProps {
  onBack: () => void;
  currentUser: UserType;
  onUpdateUser: (user: UserType) => void;
  onLogout: () => void;
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onOpenGuide: () => void;
  pendingSyncCount: number;
  onSyncNow: () => void;
  onNavigate?: (screen: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  currentUser,
  onUpdateUser,
  onLogout,
  appSettings,
  onUpdateSettings,
  onOpenGuide,
  pendingSyncCount,
  onSyncNow,
  onNavigate,
}) => {
  const [activeModal, setActiveModal] = useState<
    'editProfile' | 'changePassword' | 'settings' | 'about' | 'logoutConfirm' | null
  >(null);

  // Edit profile form
  const [nameInput, setNameInput] = useState(currentUser.nama);
  const [emailInput, setEmailInput] = useState(currentUser.email || '');
  const [previewPhoto, setPreviewPhoto] = useState<string>(currentUser.foto);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Settings form
  const [schoolNameInput, setSchoolNameInput] = useState(appSettings.namaSekolah);
  const [sloganInput, setSloganInput] = useState(appSettings.slogan);

  // Process chosen photo file
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Format file harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    // Validate size (max 2.5 MB)
    if (file.size > 2.5 * 1024 * 1024) {
      setPhotoError('Ukuran gambar terlalu besar (maksimal 2.5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    // Default avatar
    const defaultAvatar = currentUser.role === 'guru'
      ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
      : currentUser.role === 'admin'
      ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80';
    setPreviewPhoto(defaultAvatar);
    setPhotoError(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setPhotoError('Nama pengguna tidak boleh kosong.');
      return;
    }

    const updatedUser: UserType = {
      ...currentUser,
      nama: nameInput.trim(),
      email: emailInput.trim(),
      foto: previewPhoto,
    };

    onUpdateUser(updatedUser);
    setProfileSuccessMsg('Foto dan profil berhasil diperbarui!');
    setTimeout(() => {
      setProfileSuccessMsg(null);
      setActiveModal(null);
    }, 1200);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...appSettings,
      namaSekolah: schoolNameInput,
      slogan: sloganInput,
    });
    setActiveModal(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Konfirmasi password tidak cocok!');
      return;
    }
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setActiveModal(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header Bar */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">
            Profil & Pengaturan
          </h1>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Identity & Profile Card (Matching Reference Item 9) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden text-center">
          {/* Green banner with school crest */}
          <div className="bg-gradient-to-r from-[#075B36] to-[#078749] text-white py-4 px-4 flex items-center justify-center gap-2.5">
            <SchoolLogo size={32} />
            <h2 className="text-sm font-bold tracking-tight text-white">
              {appSettings.namaSekolah}
            </h2>
          </div>

          {/* User Photo & Info */}
          <div className="p-4 pt-3 flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-emerald-50 shadow-sm bg-slate-100">
                <img
                  src={currentUser.foto}
                  alt={currentUser.nama}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button
                onClick={() => {
                  setPreviewPhoto(currentUser.foto);
                  setNameInput(currentUser.nama);
                  setEmailInput(currentUser.email || '');
                  setActiveModal('editProfile');
                }}
                className="absolute bottom-0 right-0 p-1 bg-[#078749] hover:bg-[#075B36] text-white rounded-full shadow-md cursor-pointer transition-transform active:scale-90"
                title="Ganti Foto Profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-800 leading-tight">
              {currentUser.nama}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser.kelas ? `Kelas ${currentUser.kelas}` : currentUser.jabatan || 'Pengguna'}
            </p>

            <span className="mt-2 inline-block bg-[#E5F5EC] text-[#075B36] font-semibold text-[10px] px-3 py-0.5 rounded-full capitalize">
              Role: {currentUser.role}
            </span>
          </div>
        </div>

        {/* Menu Items List (Matching Reference Item 9 Exactly) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          {/* 1. Ubah Profil */}
          <button
            onClick={() => {
              setPreviewPhoto(currentUser.foto);
              setNameInput(currentUser.nama);
              setEmailInput(currentUser.email || '');
              setActiveModal('editProfile');
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#078749]" />
              <span className="text-xs font-semibold text-slate-800">Ubah Profil & Foto</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 1b. Mata Pelajaran Saya / Pengaturan Mata Pelajaran Guru (Guru & Admin) */}
          {currentUser.role !== 'siswa' && onNavigate && (
            <button
              onClick={() => onNavigate('mapel-guru')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#078749]" />
                <span className="text-xs font-semibold text-slate-800">
                  {currentUser.role === 'admin' ? 'Pengaturan Mata Pelajaran Guru' : 'Mata Pelajaran Saya'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1c. Pengaturan Identitas Sekolah (Admin Only) */}
          {currentUser.role === 'admin' && onNavigate && (
            <button
              onClick={() => onNavigate('pengaturan-sekolah')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <School className="w-4 h-4 text-[#078749]" />
                <span className="text-xs font-semibold text-slate-800">Pengaturan Identitas Sekolah</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1d. Pengelolaan Kelas (Admin & Guru) */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('kelola-kelas')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-[#078749]" />
                <span className="text-xs font-semibold text-slate-800">Pengelolaan Rombongan Belajar (Kelas)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1e. Kenaikan Kelas dan Kelulusan (Admin Only) */}
          {currentUser.role === 'admin' && onNavigate && (
            <button
              onClick={() => onNavigate('kenaikan-kelas')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-[#078749]" />
                <span className="text-xs font-semibold text-slate-800">Kenaikan Kelas dan Kelulusan</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1e-2. Pengelolaan Akun Google (Admin Only) */}
          {currentUser.role === 'admin' && onNavigate && (
            <button
              onClick={() => onNavigate('kelola-akun')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-blue-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Pengelolaan Akun Google (Admin)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1f. Teguran dan Peringatan Siswa (All roles) */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('teguran-siswa')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-semibold text-slate-800">
                  {currentUser.role === 'siswa' ? 'Catatan Disiplin & Bimbingan Saya' : 'Teguran dan Peringatan Siswa'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 1g. Cetak Kartu Pelajar (PDF) (All roles) */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('kartu-pelajar')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-[#078749]" />
                <span className="text-xs font-semibold text-slate-800">Kartu Pelajar & Cetak PDF</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* 2. Ganti Password */}
          <button
            onClick={() => setActiveModal('changePassword')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-[#078749]" />
              <span className="text-xs font-semibold text-slate-800">Ganti Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 3. Pengaturan Aplikasi */}
          <button
            onClick={() => setActiveModal('settings')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-[#078749]" />
              <span className="text-xs font-semibold text-slate-800">Pengaturan Aplikasi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 4. Bantuan & Panduan */}
          <button
            onClick={onOpenGuide}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-[#078749]" />
              <span className="text-xs font-semibold text-slate-800">Bantuan & Panduan</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 5. Tentang Aplikasi */}
          <button
            onClick={() => setActiveModal('about')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-[#078749]" />
              <span className="text-xs font-semibold text-slate-800">Tentang Aplikasi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Offline Sync Status Row */}
        {pendingSyncCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800">
                {pendingSyncCount} Data Absensi Menunggu Sinkronisasi
              </p>
              <p className="text-[10px] text-amber-600">
                Tersimpan di perangkat lokal
              </p>
            </div>
            <button
              onClick={onSyncNow}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Sinkron Sekarang
            </button>
          </div>
        )}

        {/* Logout Button (Matching Reference Item 9: Red Salmon Card) */}
        <button
          onClick={() => setActiveModal('logoutConfirm')}
          className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Ubah Profil & Unggah Foto Modal (Section 6 Requirement) */}
      {activeModal === 'editProfile' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-left">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Ubah Profil & Foto</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Perbarui foto profil dan data identitas akun Anda secara permanen.
            </p>

            {profileSuccessMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {photoError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoFileChange}
            />

            {/* Photo Avatar Preview & Actions */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
              <div className="relative mb-3">
                <img
                  src={previewPhoto}
                  alt="Pratinjau Foto"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-100 shadow-md border border-slate-200"
                />
              </div>

              {/* Photo Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-[#078749] hover:text-[#078749] rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Galeri HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-[#078749] hover:text-[#078749] rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-[11px] font-semibold text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hapus foto profil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-600 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#078749] text-white rounded-xl font-bold hover:bg-[#075B36] cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {activeModal === 'changePassword' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Ganti Password Akun</h3>

            {passwordSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#078749]" />
                <span>Password berhasil diperbarui dengan aman!</span>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-slate-600 font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#078749] text-white rounded-xl font-bold hover:bg-[#075B36] cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* App Settings Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-left">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Pengaturan Aplikasi Sekolah</h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Kustomisasi nama sekolah, slogan, dan konfigurasi sinkronisasi data.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slogan</label>
                <input
                  type="text"
                  value={sloganInput}
                  onChange={(e) => setSloganInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Database Lokal</span>
                <p className="text-[10px] text-slate-500">
                  Penyimpanan offline aktif dengan IndexedDB & Web Storage API.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-slate-600 font-medium cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078749] text-white rounded-xl font-bold hover:bg-[#075B36] cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About App Modal */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-center">
            <SchoolLogo size={52} className="mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#075B36]">{appSettings.namaLengkapAplikasi}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{appSettings.slogan}</p>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl text-left text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Versi:</span>
                <span className="font-semibold text-slate-800">v2.4.0 (Build 45)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Desain:</span>
                <span className="font-semibold text-slate-800">Material 3 Modern</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fitur:</span>
                <span className="font-semibold text-slate-800">QR Scan, Offline, PDF, Excel, Foto</span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-[#078749] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {activeModal === 'logoutConfirm' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Konfirmasi Logout</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Apakah Anda yakin ingin keluar dari akun {currentUser.nama}?
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onLogout();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
