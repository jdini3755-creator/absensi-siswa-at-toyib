import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  School,
  MapPin,
  Phone,
  Mail,
  Globe,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AppSettings, User } from '../types';
import { StorageService } from '../services/storageService';
import { SchoolLogo } from './SchoolLogo';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface SchoolSettingsScreenProps {
  onBack: () => void;
  currentUser: User | null;
  onSettingsUpdated?: (newSettings: AppSettings) => void;
}

export const SchoolSettingsScreen: React.FC<SchoolSettingsScreenProps> = ({
  onBack,
  currentUser,
  onSettingsUpdated,
}) => {
  const currentSettings = StorageService.getSettings();

  const [namaSekolah, setNamaSekolah] = useState(currentSettings.namaSekolah || 'SMP Islam At-Toyib 45');
  const [slogan, setSlogan] = useState(currentSettings.slogan || 'Disiplin • Berilmu • Berakhlak Mulia');
  const [alamat, setAlamat] = useState(currentSettings.alamat || 'Jl. Raya Pesantren No. 45, Cirebon, Jawa Barat 45153');
  const [noWhatsapp, setNoWhatsapp] = useState(currentSettings.noWhatsapp || '0812-3456-7890');
  const [emailSekolah, setEmailSekolah] = useState(currentSettings.emailSekolah || 'info@attoyib45.sch.id');
  const [websiteSekolah, setWebsiteSekolah] = useState(currentSettings.websiteSekolah || 'https://smpislamattoyib45.sch.id');
  const [tahunAjaranAktif, setTahunAjaranAktif] = useState(currentSettings.tahunAjaranAktif || '2026/2027');
  const [semesterAktif, setSemesterAktif] = useState<'Ganjil' | 'Genap'>(currentSettings.semesterAktif || 'Ganjil');
  const [jamMasuk, setJamMasuk] = useState(currentSettings.jamMasuk || '07:00');
  const [jamPulang, setJamPulang] = useState(currentSettings.jamPulang || '14:30');

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(
    currentSettings.logoBase64 || currentSettings.logoUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permission check
  const isAdmin = currentUser?.role === 'admin';

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Format logo tidak didukung. Harap unggah berkas PNG, JPG, atau JPEG.' });
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Ukuran logo terlalu besar (maksimal 2MB).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setLogoPreview(base64);
      setFeedback({ type: 'success', message: 'Logo berhasil dimuat. Klik Simpan Perubahan untuk menerapkan.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFeedback({ type: 'success', message: 'Logo khusus dihapus. Sistem akan menggunakan emblem resmi standar.' });
  };

  const handleSave = () => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Hanya administrator yang dapat mengubah pengaturan sekolah.' });
      return;
    }

    if (!namaSekolah.trim()) {
      setFeedback({ type: 'error', message: 'Nama sekolah tidak boleh kosong.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const updates: Partial<AppSettings> = {
      namaSekolah: namaSekolah.trim(),
      slogan: slogan.trim(),
      alamat: alamat.trim(),
      noWhatsapp: noWhatsapp.trim(),
      emailSekolah: emailSekolah.trim(),
      websiteSekolah: websiteSekolah.trim(),
      tahunAjaranAktif,
      semesterAktif,
      jamMasuk,
      jamPulang,
      logoBase64: logoPreview || undefined,
      logoUrl: logoPreview || undefined,
    };

    const res = StorageService.updateSchoolSettings(updates, currentUser);

    setTimeout(() => {
      setIsSubmitting(false);
      if (res.success && res.settings) {
        setFeedback({
          type: 'success',
          message: 'Identitas dan pengaturan sekolah berhasil diperbarui secara permanen!',
        });
        if (onSettingsUpdated) {
          onSettingsUpdated(res.settings);
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal menyimpan pengaturan sekolah.',
        });
      }
    }, 300);
  };

  const isFormDirty =
    namaSekolah !== (currentSettings.namaSekolah || 'SMP Islam At-Toyib 45') ||
    slogan !== (currentSettings.slogan || 'Disiplin • Berilmu • Berakhlak Mulia') ||
    alamat !== (currentSettings.alamat || 'Jl. Raya Pesantren No. 45, Cirebon, Jawa Barat 45153') ||
    noWhatsapp !== (currentSettings.noWhatsapp || '0812-3456-7890') ||
    emailSekolah !== (currentSettings.emailSekolah || 'info@attoyib45.sch.id') ||
    websiteSekolah !== (currentSettings.websiteSekolah || 'https://smpislamattoyib45.sch.id') ||
    tahunAjaranAktif !== (currentSettings.tahunAjaranAktif || '2026/2027') ||
    semesterAktif !== (currentSettings.semesterAktif || 'Ganjil') ||
    jamMasuk !== (currentSettings.jamMasuk || '07:00') ||
    jamPulang !== (currentSettings.jamPulang || '14:30') ||
    logoPreview !== (currentSettings.logoBase64 || currentSettings.logoUrl || null);

  // Intercept Android hardware Back button when form has unsaved modifications
  useBackHandler(
    'school-settings-dirty',
    15,
    () => {
      NavigationManager.promptUnsavedChanges({
        title: 'Batalkan Perubahan Pengaturan?',
        message:
          'Pengaturan identitas sekolah yang Anda ubah belum disimpan. Apakah Anda yakin ingin membatalkan perubahan dan kembali?',
        onDiscard: () => {
          onBack();
        },
      });
      return true;
    },
    isFormDirty
  );

  const handleInAppBack = () => {
    if (isFormDirty) {
      NavigationManager.promptUnsavedChanges({
        title: 'Batalkan Perubahan Pengaturan?',
        message:
          'Pengaturan identitas sekolah yang Anda ubah belum disimpan. Apakah Anda yakin ingin membatalkan perubahan dan kembali?',
        onDiscard: () => {
          onBack();
        },
      });
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
            <h1 className="text-lg font-bold text-white tracking-wide">Pengaturan Sekolah</h1>
            <p className="text-[11px] text-emerald-200">Identitas Resmi & Konfigurasi Sistem</p>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Role Notice */}
        {!isAdmin && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800 text-xs shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Anda login sebagai guru/siswa. Halaman ini hanya dapat diubah oleh <strong>Administrator / Kepala Sekolah</strong>.
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Logo Sekolah Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-[#075B36]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Logo Resmi Lembaga</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-emerald-50/70 border-2 border-dashed border-emerald-200 flex items-center justify-center p-2 shrink-0 relative overflow-hidden group">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="w-full h-full object-contain drop-shadow"
                />
              ) : (
                <SchoolLogo size={58} />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 w-full">
              <p className="text-xs text-slate-600">
                Logo ini akan otomatis disematkan pada seluruh dokumen cetak resmi, Kartu Pelajar, dan kop surat absensi.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  disabled={!isAdmin}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin}
                  className="px-3 py-1.5 bg-[#075B36] hover:bg-[#064e2e] active:scale-95 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Logo Baru
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={!isAdmin}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Format: PNG, JPG, JPEG (Maks. 2MB)</p>
            </div>
          </div>
        </div>

        {/* Informasi Utama Sekolah */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <School className="w-4 h-4 text-[#075B36]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identitas Sekolah</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Sekolah <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaSekolah}
              onChange={(e) => setNamaSekolah(e.target.value)}
              disabled={!isAdmin}
              placeholder="Contoh: SMP Islam At-Toyib 45"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Slogan / Motto Sekolah
            </label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              disabled={!isAdmin}
              placeholder="Contoh: Disiplin • Berilmu • Berakhlak Mulia"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Alamat Lengkap Sekolah <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              disabled={!isAdmin}
              placeholder="Contoh: Jl. Raya Pesantren No. 45, Cirebon, Jawa Barat 45153"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-400 mt-1">Dicetak pada kartu pelajar dan kop surat PDF resmi.</p>
          </div>
        </div>

        {/* Kontak & Media Sekolah */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="w-4 h-4 text-[#075B36]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Kontak & Layanan</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Nomor WhatsApp Resmi
            </label>
            <input
              type="text"
              value={noWhatsapp}
              onChange={(e) => setNoWhatsapp(e.target.value)}
              disabled={!isAdmin}
              placeholder="Contoh: 0812-3456-7890"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Email Sekolah
              </label>
              <input
                type="email"
                value={emailSekolah}
                onChange={(e) => setEmailSekolah(e.target.value)}
                disabled={!isAdmin}
                placeholder="info@attoyib45.sch.id"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Website Resmi
              </label>
              <input
                type="text"
                value={websiteSekolah}
                onChange={(e) => setWebsiteSekolah(e.target.value)}
                disabled={!isAdmin}
                placeholder="https://smpislamattoyib45.sch.id"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Tahun Ajaran & Jam Operasional */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-[#075B36]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tahun Akademik & Jam KBM</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran Aktif</label>
              <input
                type="text"
                value={tahunAjaranAktif}
                onChange={(e) => setTahunAjaranAktif(e.target.value)}
                disabled={!isAdmin}
                placeholder="2026/2027"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Aktif</label>
              <select
                value={semesterAktif}
                onChange={(e) => setSemesterAktif(e.target.value as 'Ganjil' | 'Genap')}
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Jam Masuk (Batas Hadir)
              </label>
              <input
                type="time"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Jam Pulang
              </label>
              <input
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full py-3 bg-[#075B36] hover:bg-[#064e2e] active:scale-[0.98] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Identitas Sekolah'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
