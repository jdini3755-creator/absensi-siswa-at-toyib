import React, { useState } from 'react';
import { ArrowLeft, Megaphone, Calendar, User, Plus, Trash2, X, Eye, Info } from 'lucide-react';
import { Announcement } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface AnnouncementsScreenProps {
  onBack: () => void;
  announcements: Announcement[];
  userRole: string;
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export const AnnouncementsScreen: React.FC<AnnouncementsScreenProps> = ({
  onBack,
  announcements,
  userRole,
  onAddAnnouncement,
  onDeleteAnnouncement,
}) => {
  const isSiswa = userRole === 'siswa';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [kategori, setKategori] = useState<'Akademik' | 'Kegiatan' | 'Umum' | 'Keagamaan'>('Akademik');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSiswa) {
      alert('Akses ditolak: Siswa tidak diizinkan membuat pengumuman.');
      return;
    }
    if (!judul.trim() || !isi.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      judul,
      isi,
      tanggal: new Date().toISOString().split('T')[0],
      pembuat: userRole === 'admin' ? 'Kepala Sekolah & TU' : 'Guru & Wali Kelas',
      kategori,
      penting: kategori === 'Akademik',
    };

    onAddAnnouncement(newAnn);
    setJudul('');
    setIsi('');
    setIsAddOpen(false);
  };

  const isFormDirty = isAddOpen && (judul.trim().length > 0 || isi.trim().length > 0);

  // 1. Intercept detail modal (Priority 20)
  useBackHandler(
    'announcement-detail-modal',
    20,
    () => {
      setSelectedAnnouncement(null);
      return true;
    },
    selectedAnnouncement !== null
  );

  // 2. Intercept add modal (Priority 10)
  useBackHandler(
    'announcement-add-modal',
    10,
    () => {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengumuman?',
          message:
            'Draft pengumuman yang sedang ditulis belum diterbitkan. Apakah Anda yakin ingin membatalkan?',
          onDiscard: () => {
            setIsAddOpen(false);
            setJudul('');
            setIsi('');
          },
        });
        return true;
      }
      setIsAddOpen(false);
      return true;
    },
    isAddOpen
  );

  const handleInAppBack = () => {
    if (selectedAnnouncement) {
      setSelectedAnnouncement(null);
      return;
    }
    if (isAddOpen) {
      if (isFormDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengumuman?',
          message:
            'Draft pengumuman yang sedang ditulis belum diterbitkan. Apakah Anda yakin ingin membatalkan?',
          onDiscard: () => {
            setIsAddOpen(false);
            setJudul('');
            setIsi('');
          },
        });
        return;
      }
      setIsAddOpen(false);
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
              Pengumuman Sekolah
            </h1>
            {isSiswa && (
              <span className="text-[10px] text-emerald-200">
                Papan Informasi Resmi Siswa
              </span>
            )}
          </div>
        </div>

        {/* Only Admin & Guru can create announcements */}
        {!isSiswa && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium border border-emerald-500/40 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        )}
      </header>

      {/* Announcements Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            onClick={() => setSelectedAnnouncement(ann)}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-emerald-300 transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  ann.kategori === 'Keagamaan'
                    ? 'bg-emerald-100 text-[#075B36]'
                    : ann.kategori === 'Akademik'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {ann.kategori}
              </span>

              {/* Only admin and author can delete */}
              {!isSiswa && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Hapus pengumuman "${ann.judul}"?`)) {
                      onDeleteAnnouncement(ann.id);
                    }
                  }}
                  className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <h3 className="text-xs font-bold text-slate-900 leading-snug">
              {ann.judul}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {ann.isi}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {ann.pembuat}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {ann.tanggal}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#078749] bg-emerald-50 px-2 py-0.5 rounded-full">
                {selectedAnnouncement.kategori}
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">
              {selectedAnnouncement.judul}
            </h3>

            <div className="flex items-center justify-between text-[10px] text-slate-400 my-2 pb-2 border-b border-slate-100">
              <span>Oleh: {selectedAnnouncement.pembuat}</span>
              <span>Dipublikasikan: {selectedAnnouncement.tanggal}</span>
            </div>

            <div className="py-2 text-xs text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
              {selectedAnnouncement.isi}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-1.5 bg-[#078749] text-white text-xs font-bold rounded-xl hover:bg-[#075B36] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal (Admin & Guru Only) */}
      {!isSiswa && isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Buat Pengumuman Baru</h3>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  required
                  placeholder="Contoh: Jadwal Libur Awal Ramadhan"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                >
                  <option value="Akademik">Akademik</option>
                  <option value="Keagamaan">Keagamaan</option>
                  <option value="Kegiatan">Kegiatan</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Isi Pengumuman</label>
                <textarea
                  rows={4}
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  required
                  placeholder="Tuliskan detail pengumuman..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078749] text-white rounded-lg font-bold hover:bg-[#075B36] cursor-pointer"
                >
                  Publikasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
