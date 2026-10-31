import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  X,
  UserCheck,
} from 'lucide-react';
import { ClassItem, User } from '../types';
import { StorageService } from '../services/storageService';
import { useBackHandler } from '../hooks/useBackHandler';
import { NavigationManager } from '../services/navigationManager';

interface ClassesScreenProps {
  onBack: () => void;
  currentUser: User | null;
  onSelectClassForAttendance?: (className: string) => void;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = ({
  onBack,
  currentUser,
  onSelectClassForAttendance,
}) => {
  const [classes, setClasses] = useState<ClassItem[]>(() => StorageService.getClasses());
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>(() =>
    StorageService.getClassStudentCounts()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    id?: string;
    nama: string;
    tingkat: string;
    waliKelas: string;
    tahunAjaran: string;
    status: 'aktif' | 'nonaktif';
    kapasitas: number;
    keterangan: string;
  }>({
    nama: '',
    tingkat: 'VII',
    waliKelas: '',
    tahunAjaran: '2026/2027',
    status: 'aktif',
    kapasitas: 32,
    keterangan: '',
  });

  // Safety Delete & Archive Modal states
  const [deleteTargetClass, setDeleteTargetClass] = useState<ClassItem | null>(null);
  const [deleteStats, setDeleteStats] = useState<{
    studentCount: number;
    attendanceCount: number;
    gradesCount: number;
    scheduleCount: number;
    warningsCount: number;
    hasHistoricalData: boolean;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Back handler for delete/archive safety modal
  useBackHandler('classes-delete-modal', 20, () => {
    if (deleteTargetClass) {
      setDeleteTargetClass(null);
      setDeleteStats(null);
      return true;
    }
    return false;
  }, Boolean(deleteTargetClass));

  // 2. Back handler for Add/Edit Class modal with unsaved check
  useBackHandler('classes-form-modal', 10, () => {
    if (isModalOpen) {
      const isDirty = formData.nama.trim() !== '';
      if (isDirty) {
        NavigationManager.promptUnsavedChanges({
          title: 'Batalkan Pengisian Data Kelas?',
          message: 'Data kelas yang Anda masukkan belum disimpan. Yakin ingin membatalkan dan menutup formulir?',
          onDiscard: () => {
            setIsModalOpen(false);
            setEditingClass(null);
          },
        });
      } else {
        setIsModalOpen(false);
        setEditingClass(null);
      }
      return true;
    }
    return false;
  }, isModalOpen);

  const isAdmin = currentUser?.role === 'admin';
  const allUsers = StorageService.getUsers();
  const teachers = allUsers.filter((u) => u.role === 'guru' || u.role === 'admin');

  const refreshData = () => {
    setClasses(StorageService.getClasses());
    setStudentCounts(StorageService.getClassStudentCounts());
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.waliKelas.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLevel =
        filterLevel === 'all' ||
        c.tingkat.toLowerCase() === filterLevel.toLowerCase();

      const matchStatus =
        filterStatus === 'all' || (c.status || 'aktif') === filterStatus;

      return matchSearch && matchLevel && matchStatus;
    });
  }, [classes, searchQuery, filterLevel, filterStatus]);

  const totalStudents = useMemo(() => {
    return Object.values(studentCounts).reduce((acc, curr) => acc + curr, 0);
  }, [studentCounts]);

  const openAddModal = () => {
    const settings = StorageService.getSettings();
    setEditingClass(null);
    setFormData({
      nama: '',
      tingkat: 'VII',
      waliKelas: teachers[0]?.nama || 'Ibu Siti Rahmah, S.Pd.',
      tahunAjaran: settings.tahunAjaranAktif || '2026/2027',
      status: 'aktif',
      kapasitas: 32,
      keterangan: '',
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setFormData({
      id: c.id,
      nama: c.nama,
      tingkat: c.tingkat,
      waliKelas: c.waliKelas,
      tahunAjaran: c.tahunAjaran,
      status: c.status || 'aktif',
      kapasitas: c.kapasitas || 32,
      keterangan: c.keterangan || '',
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Hanya administrator yang dapat mengelola kelas.' });
      return;
    }

    if (!formData.nama.trim()) {
      setFeedback({ type: 'error', message: 'Nama kelas wajib diisi.' });
      return;
    }

    const payload: ClassItem = {
      id: editingClass ? editingClass.id : `c-${Date.now()}`,
      nama: formData.nama.trim(),
      tingkat: formData.tingkat,
      waliKelas: formData.waliKelas.trim() || '-',
      tahunAjaran: formData.tahunAjaran.trim() || '2026/2027',
      status: formData.status,
      kapasitas: Number(formData.kapasitas) || 32,
      keterangan: formData.keterangan,
    };

    const res = StorageService.saveClass(payload, currentUser);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan data kelas.' });
      return;
    }

    refreshData();
    setIsModalOpen(false);
    setFeedback({
      type: 'success',
      message: editingClass
        ? `Kelas ${payload.nama} berhasil diperbarui dan sinkron dengan seluruh siswa/jadwal!`
        : `Kelas ${payload.nama} berhasil ditambahkan!`,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRequestDelete = (c: ClassItem) => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Hanya administrator yang dapat menghapus kelas.' });
      return;
    }
    const stats = StorageService.getClassStats(c.nama);
    setDeleteStats(stats);
    setDeleteTargetClass(c);
  };

  const handleConfirmArchive = (c: ClassItem) => {
    const res = StorageService.archiveClass(c.id, currentUser);
    if (res.success) {
      refreshData();
      setDeleteTargetClass(null);
      setDeleteStats(null);
      setFeedback({
        type: 'success',
        message: `Kelas "${c.nama}" berhasil dinonaktifkan/diarsipkan. Seluruh data nilai, absensi, dan siswa tetap aman!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      alert(res.error || 'Gagal mengarsipkan kelas.');
    }
  };

  const handleConfirmPermanentDelete = (c: ClassItem) => {
    const res = StorageService.deleteClass(c.id, currentUser);
    if (res.success) {
      refreshData();
      setDeleteTargetClass(null);
      setDeleteStats(null);
      setFeedback({ type: 'success', message: `Kelas "${c.nama}" berhasil dihapus permanen.` });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      alert(res.error || 'Gagal menghapus kelas.');
    }
  };

  const handleToggleStatus = (c: ClassItem) => {
    if (!isAdmin) return;
    const nextStatus = (c.status || 'aktif') === 'aktif' ? 'nonaktif' : 'aktif';
    const res = StorageService.setClassStatus(c.id, nextStatus, currentUser);
    if (res.success) {
      refreshData();
      setFeedback({
        type: 'success',
        message: `Status kelas "${c.nama}" diubah menjadi ${nextStatus.toUpperCase()}.`,
      });
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-full pb-16">
      {/* Header */}
      <div className="bg-[#075B36] text-white px-4 pt-10 pb-6 rounded-b-3xl shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-wide">Pengelolaan Kelas</h1>
            <p className="text-[11px] text-emerald-200">Daftar Semua Rombongan Belajar</p>
          </div>
          {isAdmin ? (
            <button
              onClick={openAddModal}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 flex items-center justify-center shadow-md transition-all text-white"
              title="Tambah Kelas Baru"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="w-9" />
          )}
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-1.5">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Total Kelas</p>
            <p className="text-base font-bold text-slate-800">{classes.length}</p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs text-center">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-1.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Kelas Aktif</p>
            <p className="text-base font-bold text-teal-700">
              {classes.filter((c) => (c.status || 'aktif') === 'aktif').length}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-1.5">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Siswa Terdata</p>
            <p className="text-base font-bold text-blue-700">{totalStudents}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kelas atau wali kelas..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-400 text-[10px] shrink-0 font-medium">Tingkat:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'VII', label: 'Kelas VII' },
              { id: 'VIII', label: 'Kelas VIII' },
              { id: 'IX', label: 'Kelas IX' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilterLevel(chip.id)}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                  filterLevel === chip.id
                    ? 'bg-[#075B36] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            <span className="text-slate-400 text-[10px] shrink-0 font-medium">Status:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'aktif', label: 'Aktif Saja' },
              { id: 'nonaktif', label: 'Nonaktif' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilterStatus(chip.id)}
                className={`px-2 py-0.5 rounded-lg shrink-0 text-[10px] font-medium transition-all ${
                  filterStatus === chip.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Class List */}
        <div className="space-y-2.5">
          {filteredClasses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Tidak ada kelas yang sesuai</p>
              <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
              {isAdmin && (
                <button
                  onClick={openAddModal}
                  className="mt-3 px-3 py-1.5 bg-[#075B36] text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                </button>
              )}
            </div>
          ) : (
            filteredClasses.map((item) => {
              const count = studentCounts[item.nama] || 0;
              const isAktif = (item.status || 'aktif') === 'aktif';
              const capacity = item.kapasitas || 32;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    isAktif ? 'border-slate-100' : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                          isAktif
                            ? 'bg-gradient-to-br from-[#075B36] to-[#078749] text-white'
                            : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {item.nama}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{item.nama}</h3>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase transition-transform active:scale-95 cursor-pointer ${
                              isAktif ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="Klik untuk ubah status Aktif / Nonaktif"
                          >
                            {isAktif ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-slate-400" />
                          Wali: <span className="font-medium text-slate-700">{item.waliKelas}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Tahun Ajaran: {item.tahunAjaran} • Tingkat {item.tingkat}
                        </p>
                      </div>
                    </div>

                    {/* Student count & Admin actions */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="px-2.5 py-1 bg-emerald-50 rounded-xl border border-emerald-100 text-right">
                        <span className="text-xs font-bold text-[#075B36]">{count}</span>
                        <span className="text-[10px] text-emerald-700"> / {capacity} Siswa</span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Kelas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus / Arsipkan Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {onSelectClassForAttendance && isAktif && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => onSelectClassForAttendance(item.nama)}
                        className="text-[11px] font-semibold text-[#075B36] hover:text-[#064e2e] flex items-center gap-1"
                      >
                        Buka Absensi Kelas Ini →
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Tambah / Edit Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingClass ? `Edit Kelas: ${editingClass.nama}` : 'Tambah Kelas Baru'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {editingClass
                    ? 'Perubahan nama akan otomatis sinkron ke seluruh siswa dan jadwal'
                    : 'Ketik nama kelas secara bebas sesuai kebutuhan sekolah'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: VII A, VIII Unggulan, Tahfidz 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Bebas ketik manual nama kelas (misal: VII A, VIII B, atau kelas minat khusus).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                  <select
                    value={formData.tingkat}
                    onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="VII">Tingkat VII (Tujuh)</option>
                    <option value="VIII">Tingkat VIII (Delapan)</option>
                    <option value="IX">Tingkat IX (Sembilan)</option>
                    <option value="Khusus">Tingkat Khusus / Matrikulasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    value={formData.tahunAjaran}
                    onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                    placeholder="2026/2027"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wali Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={formData.waliKelas}
                    onChange={(e) => setFormData({ ...formData, waliKelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih dari Daftar Guru Sekolah --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.nama}>
                        {t.nama} ({t.jabatan || 'Guru'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.waliKelas}
                    onChange={(e) => setFormData({ ...formData, waliKelas: e.target.value })}
                    placeholder="Atau ketik nama wali kelas secara manual..."
                    className="w-full px-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Maksimal</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.kapasitas}
                    onChange={(e) => setFormData({ ...formData, kapasitas: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Rombel</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="aktif">Aktif (KBM Berjalan)</option>
                    <option value="nonaktif">Nonaktif (Arsip / Ditutup)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Ruangan</label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Misal: Gedung B Lantai 2, Ruang 204"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Buat Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus & Proteksi Data Kelas */}
      {deleteTargetClass && deleteStats && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Konfirmasi Hapus / Arsip Kelas
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Kelas <strong className="text-slate-800">{deleteTargetClass.nama}</strong> ({deleteTargetClass.tahunAjaran})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeleteTargetClass(null);
                  setDeleteStats(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteStats.hasHistoricalData ? (
              <div className="space-y-3.5">
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Proteksi Keamanan Riwayat Akademik:
                  </span>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Kelas <strong>{deleteTargetClass.nama}</strong> masih terhubung dengan riwayat data sekolah berikut:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/70 p-2.5 rounded-xl border border-amber-200/60 font-medium">
                    <div>• Siswa terdaftar: <strong>{deleteStats.studentCount}</strong></div>
                    <div>• Riwayat absensi: <strong>{deleteStats.attendanceCount}</strong></div>
                    <div>• Data nilai rapor: <strong>{deleteStats.gradesCount}</strong></div>
                    <div>• Jadwal pelajaran: <strong>{deleteStats.scheduleCount}</strong></div>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    Menghapus kelas secara permanen dapat merusak keutuhan riwayat kehadiran dan rapor siswa. Disarankan untuk <strong>Mengarsipkan (Menonaktifkan)</strong> kelas ini.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleConfirmArchive(deleteTargetClass)}
                    className="w-full py-2.5 bg-[#075B36] hover:bg-[#064e2e] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Arsipkan / Nonaktifkan Kelas (Direkomendasikan)
                  </button>

                  {deleteStats.studentCount === 0 ? (
                    <button
                      onClick={() => {
                        if (confirm(`PERINGATAN TERAKHIR: Anda yakin ingin menghapus kelas "${deleteTargetClass.nama}" secara permanen beserta riwayatnya?`)) {
                          handleConfirmPermanentDelete(deleteTargetClass);
                        }
                      }}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Tetap Hapus Permanen
                    </button>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-center">
                      🔒 Hapus permanen terkunci karena masih ada <strong>{deleteStats.studentCount} siswa aktif</strong>. Pindahkan siswa terlebih dahulu jika ingin menghapus permanen.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setDeleteTargetClass(null);
                      setDeleteStats(null);
                    }}
                    className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus kelas <strong>"{deleteTargetClass.nama}"</strong> secara permanen?
                  <br />
                  Kelas ini belum memiliki riwayat siswa, absensi, atau jadwal apapun sehingga aman untuk dihapus.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setDeleteTargetClass(null);
                      setDeleteStats(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleConfirmPermanentDelete(deleteTargetClass)}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/20 cursor-pointer"
                  >
                    Ya, Hapus Kelas Ini
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
