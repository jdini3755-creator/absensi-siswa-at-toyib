export type Role = 'admin' | 'guru' | 'siswa';

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpha';

export interface User {
  id: string;
  username: string;
  nama: string;
  email?: string;
  googleEmail?: string; // Verified Google (Gmail) address
  isGoogleLinked?: boolean;
  role: Role;
  status: 'aktif' | 'nonaktif';
  foto: string;
  kelas?: string; // e.g. "VIII A"
  jabatan?: string; // e.g. "Wali Kelas VIII A & Guru PAI"
  nip?: string;
  studentId?: string; // link to student record if role is siswa
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  registeredBy?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  tanggalLahir?: string;
  alamat?: string;
  foto: string;
  status: 'aktif' | 'nonaktif';
  statusAkademik?: 'aktif' | 'lulus' | 'pindah' | 'nonaktif';
  tahunLulus?: string;
  tanggalLulus?: string;
  noTeleponOrtu?: string;
  riwayatKelas?: {
    tahunAjaran: string;
    kelas: string;
    tanggal: string;
    catatan?: string;
  }[];
}

export interface ClassItem {
  id: string;
  nama: string;
  tingkat: string; // 'VII' | 'VIII' | 'IX' or custom
  waliKelas: string;
  tahunAjaran: string;
  status?: 'aktif' | 'nonaktif';
  kapasitas?: number;
  keterangan?: string;
}

export interface StudentWarning {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  kategori: 'Kedisiplinan' | 'Kerapian' | 'Ibadah/Keagamaan' | 'Akademik' | 'Perilaku/Sosial' | 'Lainnya';
  tingkat: 'Ringan' | 'Sedang' | 'Berat';
  kronologi: string;
  tindakanPembinaan: string;
  catatan?: string;
  dicatatOleh: string;
  petugasId: string;
  statusTindakLanjut: 'Baru' | 'Dalam pembinaan' | 'Selesai' | 'Perlu tindak lanjut';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PromotionLog {
  id: string;
  tanggal: string;
  tahunAjaranAsal: string;
  tahunAjaranTujuan: string;
  kelasAsal: string;
  kelasTujuan: string;
  tipe: 'KENAIKAN' | 'KELULUSAN';
  jumlahSiswa: number;
  siswaList: {
    id: string;
    nama: string;
    nis: string;
    kelasAsal: string;
    kelasTujuan: string;
  }[];
  dilakukanOleh: string;
  isReverted?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  status: AttendanceStatus;
  catatan?: string;
  waktuPencatatan: string; // HH:mm:ss
  dicatatOleh: string;
  petugasId?: string;
  sumber?: 'SCAN' | 'MANUAL';
  sesi?: string; // e.g. "Pagi"
  waktuKoreksi?: string;
  dikoreksiOleh?: string;
  isSynced: boolean; // For offline support
}

export interface Subject {
  id: string;
  nama: string;
  kode: string;
  kategori?: string;
  status: 'aktif' | 'nonaktif';
}

export interface TeacherAssignment {
  id: string;
  guruId: string;
  guruNama: string;
  mataPelajaranId: string;
  mataPelajaranNama: string;
  kelas: string; // e.g. "VIII A"
  tahunAjaran: string; // e.g. "2026/2027"
  semester: 'Ganjil' | 'Genap';
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  updatedById: string;
}

export interface AssignmentAuditLog {
  id: string;
  assignmentId: string;
  tindakan: 'TAMBAH' | 'EDIT' | 'HAPUS';
  guruNama: string;
  mataPelajaranNama: string;
  kelas: string;
  dilakukanOleh: string;
  dilakukanOlehId: string;
  waktu: string;
  detailSebelum?: string;
  detailSesudah?: string;
}

export interface ScheduleItem {
  id: string;
  kelas: string;
  mataPelajaran: string;
  guru: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string;
  jamSelesai: string;
  ruangan?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  mataPelajaran: string;
  semester: 'Ganjil' | 'Genap';
  tahunAjaran: string;
  nilaiTugas: number;
  nilaiUlangan: number;
  nilaiUjian: number;
  nilaiAkhir: number;
  catatanGuru?: string;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  pembuat: string;
  kategori: 'Akademik' | 'Kegiatan' | 'Umum' | 'Keagamaan';
  penting: boolean;
}

export interface NotificationItem {
  id: string;
  judul: string;
  deskripsi: string;
  waktu: string;
  kategori: 'absensi' | 'izin' | 'sakit' | 'laporan' | 'pengumuman' | 'jadwal' | 'teguran';
  sudahDibaca: boolean;
  targetRole?: Role;
  tautan?: string;
}

export interface AppSettings {
  namaSekolah: string;
  namaLengkapAplikasi: string;
  slogan: string;
  alamat?: string;
  noWhatsapp?: string;
  emailSekolah?: string;
  websiteSekolah?: string;
  logoUrl?: string;
  logoBase64?: string;
  tahunAjaranAktif: string;
  semesterAktif: 'Ganjil' | 'Genap';
  jamMasuk: string;
  jamPulang: string;
  isOfflineModeSimulated: boolean;
}
