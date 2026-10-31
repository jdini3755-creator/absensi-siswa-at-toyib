import React, { useState } from 'react';
import {
  X,
  Database,
  Smartphone,
  PlayCircle,
  CheckCircle2,
  FileCode,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'database' | 'run' | 'customize' | 'testing'>('apk');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-left">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#075B36] to-[#078749] text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size={32} />
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Panduan Pengembang & Panduan APK Android
              </h2>
              <p className="text-xs text-emerald-100">
                Dokumentasi Resmi SMP Islam At-Toyib 45
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#078749]" />
            <span>Cara Buat File APK</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#078749]" />
            <span>Konfigurasi Database & Offline</span>
          </button>

          <button
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'run'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-[#078749]" />
            <span>Menjalankan Proyek</span>
          </button>

          <button
            onClick={() => setActiveTab('customize')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'customize'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[#078749]" />
            <span>Ganti Logo & Identitas</span>
          </button>

          <button
            onClick={() => setActiveTab('testing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'testing'
                ? 'bg-white text-[#075B36] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#078749]" />
            <span>Panduan Pengujian</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4">
          {/* TAB 1: APK ANDROID */}
          {activeTab === 'apk' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#078749]" />
                Panduan Membuat File APK Android (.apk)
              </h3>
              <p className="text-slate-600">
                Aplikasi ini dirancang dengan standar Progressive Web App (PWA) & arsitektur hybrid modern. Anda dapat mengekspornya menjadi file APK siap instal menggunakan <strong>Capacitor</strong>:
              </p>

              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] space-y-1.5">
                <p className="text-emerald-400"># 1. Pasang Capacitor Android tooling</p>
                <p>npm install @capacitor/core @capacitor/cli @capacitor/android</p>
                <p className="text-emerald-400 mt-2"># 2. Inisialisasi proyek Capacitor</p>
                <p>npx cap init "SMP Islam At-Toyib 45" id.sch.attoyib45.absensi --web-dir=dist</p>
                <p className="text-emerald-400 mt-2"># 3. Build aplikasi frontend</p>
                <p>npm run build</p>
                <p className="text-emerald-400 mt-2"># 4. Tambahkan platform Android</p>
                <p>npx cap add android</p>
                <p>npx cap sync</p>
                <p className="text-emerald-400 mt-2"># 5. Buka di Android Studio untuk Generate Signed APK</p>
                <p>npx cap open android</p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <h4 className="font-bold text-[#075B36] mb-1">Opsi Instal Langsung (PWA Android):</h4>
                <p className="text-slate-600 leading-relaxed">
                  Pada smartphone Android (Google Chrome), pengguna cukup membuka URL aplikasi lalu mengetuk menu titik tiga (⋮) &gt; <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong> atau <strong>"Instal Aplikasi"</strong>. Aplikasi akan terpasang di HP layaknya aplikasi APK native tanpa Google Play Store!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE & OFFLINE */}
          {activeTab === 'database' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#078749]" />
                Konfigurasi Database & Fitur Offline-Online
              </h3>
              <p className="text-slate-600">
                Aplikasi menerapkan pola <strong>Offline-First Architecture</strong>:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800">1. Penyimpanan Lokal (Local Storage / IndexedDB / Room)</h4>
                  <p className="text-slate-600 mt-0.5">
                    Data siswa, kelas, jadwal pelajaran, pengumuman, dan riwayat absensi tersimpan di penyimpanan persisten perangkat. Guru dapat melakukan absensi saat internet mati di dalam kelas.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800">2. Antrean Tertunda (Offline Pending Queue)</h4>
                  <p className="text-slate-600 mt-0.5">
                    Saat mode offline aktif, absensi ditandai dengan flag <code>isSynced: false</code>. Begitu koneksi internet kembali pulih, sistem otomatis menampilkan tombol sinkronisasi untuk mengirim data ke server pusat.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800">3. Backend Cloud (Cloud Firestore / REST API)</h4>
                  <p className="text-slate-600 mt-0.5">
                    Struktur collection sesuai skema spesifikasi: <code>users</code>, <code>students</code>, <code>classes</code>, <code>attendance</code>, <code>schedules</code>, <code>grades</code>, <code>announcements</code>, dan <code>notifications</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARA JALANKAN */}
          {activeTab === 'run' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-[#078749]" />
                Cara Menjalankan Aplikasi
              </h3>
              <p className="text-slate-600">
                Aplikasi dibangun dengan React 19, TypeScript, Vite, Tailwind CSS, jsPDF, dan SheetJS:
              </p>

              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] space-y-1">
                <p className="text-emerald-400"># Menjalankan Server Development</p>
                <p>npm run dev</p>
                <p className="text-emerald-400 mt-2"># Menjalankan Build Produksi</p>
                <p>npm run build</p>
                <p className="text-emerald-400 mt-2"># Preview Hasil Build</p>
                <p>npm run preview</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1">Akun Default untuk Login:</h4>
                <ul className="space-y-1 text-slate-600">
                  <li>• <strong>Guru:</strong> username <code>guru</code> | password <code>guru123</code> (Ibu Siti Rahmah, S.Pd.)</li>
                  <li>• <strong>Siswa:</strong> username <code>siswa</code> | password <code>siswa123</code> (Ahmad Fauzi)</li>
                  <li>• <strong>Admin:</strong> username <code>admin</code> | password <code>admin123</code> (Pak H. Bambang Sudrajat, M.M.)</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: GANTI LOGO & IDENTITAS */}
          {activeTab === 'customize' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#078749]" />
                Panduan Mengganti Logo, Nama Sekolah & Identitas
              </h3>
              <p className="text-slate-600">
                Anda dapat mengganti logo dan identitas sekolah melalui menu internal aplikasi atau langsung di kode sumber:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800">1. Melalui Antarmuka Aplikasi:</h4>
                  <p className="text-slate-600 mt-0.5">
                    Buka tab <strong>Profil</strong> &gt; pilih menu <strong>Pengaturan Aplikasi</strong> &gt; ketikkan Nama Sekolah atau Slogan baru &gt; ketuk <strong>Simpan Pengaturan</strong>. Data akan diperbarui di seluruh tampilan.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800">2. Melalui Kode Sumber Komponen Logo:</h4>
                  <p className="text-slate-600 mt-0.5">
                    Buka file <code>/src/components/SchoolLogo.tsx</code>. Anda dapat menyematkan file gambar logo sekolah Anda (PNG/SVG) atau memodifikasi ornamen perisai, bintang, dan buku terbuka sesuai kebutuhan institusi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TESTING */}
          {activeTab === 'testing' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#078749]" />
                Panduan Pengujian Seluruh Fitur (10 Halaman)
              </h3>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>1. Login & Logout:</strong> Coba logout dari menu Profil, lalu masuk kembali dengan tombol Demo Guru, Siswa, atau Admin.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>2. Absensi Harian:</strong> Ubah status siswa dari Hadir ke Izin/Sakit/Alpha, tambahkan catatan keterangan, lalu ketuk "Simpan Absensi".</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>3. Scan QR Code:</strong> Buka Scan QR, gunakan kamera atau ketuk salah satu tombol uji coba kartu siswa untuk mencatat absensi instan!</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>4. Data Siswa:</strong> Cari siswa, buka detail, buat dan cetak Kartu Pelajar dengan barcode QR yang siap dipindai.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>5. Laporan PDF & Excel:</strong> Buka Laporan, ketuk "Export PDF" untuk mengunduh laporan ber-kop surat resmi, atau "Export Excel" untuk file spreadsheet.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                  <span><strong>6. Uji Coba Offline:</strong> Tekan tombol "Mode Offline" di bilah atas, lakukan absensi, lalu perhatikan antrean tertunda tersimpan di lokal hingga Anda menekan "Sinkron".</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#078749] hover:bg-[#075B36] text-white text-xs font-bold rounded-xl transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
