import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  ChevronRight,
  FileSpreadsheet,
  QrCode,
  Edit2,
  Trash2,
  X,
  Phone,
  MapPin,
  Calendar,
  Printer,
  ShieldAlert,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Student, User } from '../types';
import { ExportService } from '../services/exportService';
import { StorageService } from '../services/storageService';
import { SchoolLogo } from './SchoolLogo';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface StudentsScreenProps {
  onBack: () => void;
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  currentUser: User;
  onNavigateToCard?: (studentId: string) => void;
}

export const StudentsScreen: React.FC<StudentsScreenProps> = ({
  onBack,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  currentUser,
  onNavigateToCard,
}) => {
  const isSiswa = currentUser.role === 'siswa';
  const isAdmin = currentUser.role === 'admin';
  const isGuru = currentUser.role === 'guru';

  const allClasses = StorageService.getClasses();
  const allowedClasses = StorageService.getAllowedClassesForUser(currentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'Semua' | 'Kelas VII' | 'Kelas VIII' | 'Kelas IX'>(
    isSiswa ? 'Kelas VIII' : 'Semua'
  );
  const [selectedSpecificClass, setSelectedSpecificClass] = useState<string>('all');

  // Modals
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showIdCardModal, setShowIdCardModal] = useState<Student | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Form states
  const [formNis, setFormNis] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('VIII A');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formTanggalLahir, setFormTanggalLahir] = useState('2012-05-14');
  const [formAlamat, setFormAlamat] = useState('');
  const [formTelepon, setFormTelepon] = useState('');
  const [formStatusAkademik, setFormStatusAkademik] = useState<'aktif' | 'lulus' | 'pindah' | 'nonaktif'>('aktif');

  // If user is student, identify own student ID
  const ownStudentId = currentUser.studentId || 's-001';

  // 1. Back handler for ID card preview modal
  useBackHandler('students-idcard-modal', 30, () => {
    if (showIdCardModal) {
      setShowIdCardModal(null);
      return true;
    }
    return false;
  }, Boolean(showIdCardModal));

  // 2. Back handler for Student Detail modal
  useBackHandler('students-detail-modal', 20, () => {
    if (selectedStudentDetail) {
      setSelectedStudentDetail(null);
      return true;
    }
    return false;
  }, Boolean(selectedStudentDetail));

  // 3. Back handler for Add/Edit Form modal with unsaved check
  useBackHandler('students-form-modal', 10, () => {
    if (isFormOpen) {
      const isDirty = formNama.trim() !== '' || formNis.trim() !== '';
      if (isDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengisian Data Siswa?',
          message: 'Data siswa yang Anda ketikkan belum disimpan. Yakin ingin membatalkan dan menutup formulir?',
          onDiscard: () => {
            setIsFormOpen(false);
            setEditingStudent(null);
          },
        });
      } else {
        setIsFormOpen(false);
        setEditingStudent(null);
      }
      return true;
    }
    return false;
  }, isFormOpen);

  // Filter students
  const filteredStudents = students.filter((s) => {
    // If student role, they can only see their own profile in list or their own class
    if (isSiswa && s.id !== ownStudentId && s.kelas !== currentUser.kelas) {
      return false;
    }

    // If teacher, scoped to permitted classes
    if (isGuru) {
      const allowedNames = allowedClasses.map((c) => c.nama);
      if (!allowedNames.includes(s.kelas)) return false;
    }

    const matchesSearch =
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      (s.nisn && s.nisn.includes(searchQuery));

    if (!matchesSearch) return false;

    if (selectedSpecificClass !== 'all' && s.kelas !== selectedSpecificClass) {
      return false;
    }

    if (selectedFilter === 'Semua') return true;
    if (selectedFilter === 'Kelas VII') return s.kelas.startsWith('VII');
    if (selectedFilter === 'Kelas VIII') return s.kelas.startsWith('VIII');
    if (selectedFilter === 'Kelas IX') return s.kelas.startsWith('IX');
    return true;
  });

  const handleStudentCardClick = (student: Student) => {
    // Backend/Service layer permission check
    const check = StorageService.getStudentDetail(student.id, currentUser);
    if (!check.student) {
      setAccessDeniedMessage(check.error || 'Akses ditolak.');
      setTimeout(() => setAccessDeniedMessage(null), 3500);
      return;
    }
    setSelectedStudentDetail(check.student);
  };

  const openAddForm = () => {
    if (isSiswa) {
      alert('Akses ditolak: Akun siswa tidak diizinkan menambahkan siswa.');
      return;
    }
    setEditingStudent(null);
    setFormNis(`0${students.length + 1}`.slice(-3));
    setFormNama('');
    setFormKelas('VIII A');
    setFormGender('L');
    setFormTanggalLahir('2012-01-01');
    setFormAlamat('');
    setFormTelepon('');
    setIsFormOpen(true);
  };

  const openEditForm = (student: Student) => {
    if (isSiswa) {
      alert('Akses ditolak: Akun siswa tidak diizinkan mengubah data siswa.');
      return;
    }
    setEditingStudent(student);
    setFormNis(student.nis);
    setFormNama(student.nama);
    setFormKelas(student.kelas);
    setFormGender(student.jenisKelamin);
    setFormTanggalLahir(student.tanggalLahir || '');
    setFormAlamat(student.alamat || '');
    setFormTelepon(student.noTeleponOrtu || '');
    setIsFormOpen(true);
    setSelectedStudentDetail(null);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSiswa) return;
    if (!formNama.trim() || !formNis.trim()) return;

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        nis: formNis,
        nama: formNama,
        kelas: formKelas,
        jenisKelamin: formGender,
        tanggalLahir: formTanggalLahir,
        alamat: formAlamat,
        noTeleponOrtu: formTelepon,
      };
      onUpdateStudent(updated);
    } else {
      const newStudent: Student = {
        id: `s-${Date.now()}`,
        nis: formNis,
        nama: formNama,
        kelas: formKelas,
        jenisKelamin: formGender,
        tanggalLahir: formTanggalLahir,
        alamat: formAlamat,
        foto: formGender === 'L'
          ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        status: 'aktif',
        noTeleponOrtu: formTelepon,
      };
      onAddStudent(newStudent);
    }
    setIsFormOpen(false);
  };

  const handleGenerateIdCard = async (student: Student) => {
    try {
      const dataUrl = await QRCode.toDataURL(`ATTOYIB-${student.nis}`, {
        width: 200,
        margin: 1,
        color: {
          dark: '#075B36',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setShowIdCardModal(student);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header (Matching Reference Item 5) */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm">
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
              Data Siswa
            </h1>
            {isSiswa && (
              <span className="text-[10px] text-emerald-200">
                Profil & Detail Siswa Mandiri
              </span>
            )}
          </div>
        </div>

        {!isSiswa && (
          <button
            onClick={() => ExportService.exportStudentsExcel(students)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium border border-emerald-500/40 cursor-pointer"
            title="Ekspor Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        )}
      </header>

      {/* Access Denied Warning Toast */}
      {accessDeniedMessage && (
        <div className="m-3 p-3 rounded-2xl bg-rose-600 text-white text-xs flex items-center gap-2 shadow-lg animate-fadeIn z-30">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-200" />
          <span>{accessDeniedMessage}</span>
        </div>
      )}

      {/* Search & Filter Section (Matching Reference Item 5) */}
      <div className="p-4 bg-white border-b border-slate-200/80 shrink-0 space-y-2.5">
        {/* Search Bar & Class Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
            />
          </div>

          {!isSiswa && (
            <select
              value={selectedSpecificClass}
              onChange={(e) => setSelectedSpecificClass(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-[#078749]"
            >
              <option value="all">Semua Kelas</option>
              {allClasses.map((c) => (
                <option key={c.id} value={c.nama}>
                  Kelas {c.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Chips (Semua, Kelas VII, Kelas VIII, Kelas IX) */}
        {!isSiswa ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(['Semua', 'Kelas VII', 'Kelas VIII', 'Kelas IX'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === filter
                    ? 'bg-[#078749] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <UserIcon className="w-3.5 h-3.5 text-[#078749]" />
            <span>Menampilkan data Anda di Kelas {currentUser.kelas}</span>
          </div>
        )}
      </div>

      {/* Student List Cards (Matching Reference Item 5 Exactly) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Tidak ada data siswa yang cocok
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isOwnCard = student.id === ownStudentId;

            return (
              <div
                key={student.id}
                onClick={() => handleStudentCardClick(student)}
                className={`bg-white rounded-2xl p-3 border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] shadow-xs ${
                  isOwnCard
                    ? 'border-[#078749] ring-1 ring-emerald-400/30 bg-emerald-50/20'
                    : 'border-slate-200/70 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img
                      src={student.foto}
                      alt={student.nama}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800 leading-tight">
                        {student.nama}
                      </h3>
                      {isOwnCard && (
                        <span className="text-[9px] font-bold bg-[#E5F5EC] text-[#078749] px-1.5 py-0.2 rounded-full">
                          Anda
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      NIS: {student.nis} <span className="text-slate-300">|</span> Kelas: {student.kelas}
                    </p>
                  </div>
                </div>

                {isSiswa && !isOwnCard ? (
                  <span title="Detail privat">
                    <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (+) (Only for Admin & Guru, Hidden for Siswa) */}
      {!isSiswa && (
        <button
          onClick={openAddForm}
          className="absolute right-5 bottom-5 w-12 h-12 rounded-full bg-[#078749] hover:bg-[#075B36] active:scale-95 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center transition-all z-20 cursor-pointer"
          title="Tambah Siswa"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Detail Siswa</h3>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 my-4">
              <img
                src={selectedStudentDetail.foto}
                alt={selectedStudentDetail.nama}
                className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedStudentDetail.nama}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  NIS: {selectedStudentDetail.nis} • NISN: {selectedStudentDetail.nisn || '-'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-emerald-50 text-[#078749] border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Kelas: {selectedStudentDetail.kelas}
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                    {selectedStudentDetail.statusAkademik || selectedStudentDetail.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Lahir: {selectedStudentDetail.tanggalLahir || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Alamat: {selectedStudentDetail.alamat || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>No. Ortu: {selectedStudentDetail.noTeleponOrtu || '-'}</span>
              </div>
            </div>

            {/* Riwayat Kelas (Class History Progression) */}
            <div className="mb-3 text-left">
              <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Riwayat Kenaikan Kelas:
              </h5>
              <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
                {selectedStudentDetail.riwayatKelas && selectedStudentDetail.riwayatKelas.length > 0 ? (
                  selectedStudentDetail.riwayatKelas.map((rw, rIdx) => (
                    <div key={rIdx} className="text-[10px] flex items-center justify-between text-slate-600 py-0.5 border-b border-slate-50 last:border-0">
                      <span className="font-semibold text-slate-800">{rw.tahunAjaran}: {rw.kelas}</span>
                      <span className="text-[9px] text-slate-400">{rw.tanggal}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400">Kelas saat ini: {selectedStudentDetail.kelas} (2026/2027)</p>
                )}
              </div>
            </div>

            {/* Catatan Pembinaan Siswa */}
            {(() => {
              const warnings = StorageService.getWarningsByStudent(selectedStudentDetail.id, currentUser);
              if (warnings.length === 0) return null;
              return (
                <div className="mb-3 text-left">
                  <h5 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Catatan Pembinaan ({warnings.length}):</span>
                  </h5>
                  <div className="space-y-1 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 max-h-24 overflow-y-auto">
                    {warnings.map((wn) => (
                      <div key={wn.id} className="text-[10px] space-y-0.5 border-b border-amber-100 last:border-0 pb-1">
                        <div className="flex justify-between font-bold text-amber-900">
                          <span>{wn.kategori} ({wn.tingkat})</span>
                          <span className="text-[9px] font-normal">{wn.statusTindakLanjut}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-1">{wn.kronologi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions: Kartu Siswa & Edit & Delete */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onNavigateToCard) {
                    onNavigateToCard(selectedStudentDetail.id);
                  } else {
                    handleGenerateIdCard(selectedStudentDetail);
                  }
                }}
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#078749] text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Cetak Kartu Pelajar (PDF)</span>
              </button>

              {!isSiswa && (
                <>
                  <button
                    onClick={() => openEditForm(selectedStudentDetail)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    title="Edit Data"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus data siswa ${selectedStudentDetail.nama}?`)) {
                          onDeleteStudent(selectedStudentDetail.id);
                          setSelectedStudentDetail(null);
                        }
                      }}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                      title="Hapus Siswa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Student ID Card Modal with Generated QR Code */}
      {showIdCardModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 text-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Kartu Pelajar SMP Islam At-Toyib 45
            </h3>

            {/* Authentic Student Card Layout */}
            <div className="bg-gradient-to-b from-[#075B36] to-[#054327] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400/40 relative overflow-hidden">
              <div className="flex items-center gap-2 border-b border-emerald-400/30 pb-2 mb-3">
                <SchoolLogo size={28} />
                <div className="text-left">
                  <p className="text-[11px] font-bold leading-tight">SMP ISLAM AT-TOYIB 45</p>
                  <p className="text-[9px] text-emerald-200">Kartu Tanda Siswa / Absensi</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left">
                <img
                  src={showIdCardModal.foto}
                  alt={showIdCardModal.nama}
                  className="w-16 h-20 rounded-xl object-cover border border-white/30 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{showIdCardModal.nama}</p>
                  <p className="text-[10px] text-emerald-200">NIS: {showIdCardModal.nis}</p>
                  <p className="text-[10px] text-emerald-200">Kelas: {showIdCardModal.kelas}</p>
                  <p className="text-[9px] text-amber-300 font-semibold mt-1">TA 2026/2027</p>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="p-1 bg-white rounded-lg shrink-0">
                    <img src={qrCodeDataUrl} alt="QR Code Siswa" className="w-14 h-14" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-[#078749] text-white text-xs font-bold rounded-xl hover:bg-[#075B36] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu</span>
              </button>
              <button
                onClick={() => setShowIdCardModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Form Modal (Only for Admin & Guru) */}
      {!isSiswa && isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">NIS Siswa</label>
                <input
                  type="text"
                  value={formNis}
                  onChange={(e) => setFormNis(e.target.value)}
                  required
                  placeholder="001"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  required
                  placeholder="Nama Siswa"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Kelas</label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                  >
                    <option value="VII A">VII A</option>
                    <option value="VII B">VII B</option>
                    <option value="VIII A">VIII A</option>
                    <option value="VIII B">VIII B</option>
                    <option value="IX A">IX A</option>
                    <option value="IX B">IX B</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">Jenis Kelamin</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">No. Telepon Orang Tua</label>
                <input
                  type="text"
                  value={formTelepon}
                  onChange={(e) => setFormTelepon(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
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
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
