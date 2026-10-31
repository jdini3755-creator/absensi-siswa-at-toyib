import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  QrCode,
  Search,
  CheckCircle2,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Phone,
  MapPin,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Student, User } from '../types';
import { StorageService } from '../services/storageService';
import { SchoolLogo } from './SchoolLogo';
import { getSchoolLogoDataUrl } from '../utils/logoHelper';

interface StudentCardScreenProps {
  onBack: () => void;
  currentUser: User | null;
  students: Student[];
  initialStudentId?: string;
}

export const StudentCardScreen: React.FC<StudentCardScreenProps> = ({
  onBack,
  currentUser,
  students,
  initialStudentId,
}) => {
  const settings = StorageService.getSettings();

  // If currentUser is siswa, lock to themselves
  const isSiswa = currentUser?.role === 'siswa';

  const accessibleStudents = useMemo(() => {
    if (isSiswa) {
      return students.filter(
        (s) =>
          (currentUser.studentId && s.id === currentUser.studentId) ||
          s.nis === '001' ||
          s.nama.toLowerCase() === currentUser.nama.toLowerCase()
      );
    }
    return students;
  }, [students, isSiswa, currentUser]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId && accessibleStudents.some((s) => s.id === initialStudentId)) {
      return initialStudentId;
    }
    return accessibleStudents[0]?.id || 's-001';
  });

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  const currentStudent = useMemo(() => {
    return (
      accessibleStudents.find((s) => s.id === selectedStudentId) ||
      accessibleStudents[0] ||
      null
    );
  }, [accessibleStudents, selectedStudentId]);

  // Generate QR code whenever selected student changes
  useEffect(() => {
    if (currentStudent) {
      const qrPayload = JSON.stringify({
        nis: currentStudent.nis,
        nama: currentStudent.nama,
        kelas: currentStudent.kelas,
        sekolah: 'SMP Islam At-Toyib 45',
      });

      QRCode.toDataURL(qrPayload, {
        width: 250,
        margin: 1,
        color: {
          dark: '#075B36',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR Code:', err));
    }
  }, [currentStudent]);

  const classes = useMemo(() => {
    const allowed = StorageService.getAllowedClassesForUser(currentUser);
    return allowed.map((c) => c.nama);
  }, [currentUser]);

  const filteredStudents = useMemo(() => {
    return accessibleStudents.filter((s) => {
      const matchClass = selectedClassFilter === 'all' || s.kelas === selectedClassFilter;
      const matchSearch =
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery) ||
        (s.nisn && s.nisn.includes(searchQuery));
      return matchClass && matchSearch;
    });
  }, [accessibleStudents, selectedClassFilter, searchQuery]);

  const currentIdx = filteredStudents.findIndex((s) => s.id === currentStudent?.id);

  const handleNext = () => {
    if (currentIdx < filteredStudents.length - 1) {
      setSelectedStudentId(filteredStudents[currentIdx + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setSelectedStudentId(filteredStudents[currentIdx - 1].id);
    }
  };

  // Convert image URL to Base64 helper for PDF
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
            return;
          }
        } catch {
          // fallback
        }
        resolve('');
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  };

  // Generate Single Student Card PDF (Standard CR80: 85.6mm x 54mm)
  const downloadSingleCardPdf = async () => {
    if (!currentStudent) return;
    setIsGeneratingPdf(true);

    try {
      // 85.6 x 54 mm landscape
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [54, 85.6],
      });

      // Get official school logo (from settings or generated emblem)
      const schoolLogoData = await getSchoolLogoDataUrl(settings);

      // ================= PAGE 1: DEPAN (FRONT) =================
      // Background gradient/fill
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 85.6, 54, 'F');

      // Top Header bar
      doc.setFillColor(7, 91, 54); // #075B36
      doc.rect(0, 0, 85.6, 14, 'F');

      // Header Golden accent line
      doc.setFillColor(217, 119, 6); // gold
      doc.rect(0, 13.5, 85.6, 0.7, 'F');

      // Draw School Logo
      if (schoolLogoData) {
        try {
          doc.addImage(schoolLogoData, 'PNG', 4, 1.8, 10.5, 10.5);
        } catch (e) {
          console.warn('Could not draw school logo on card:', e);
        }
      }

      // Header text (aligned beside the logo)
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(settings.namaSekolah.toUpperCase(), 16.5, 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(229, 245, 236);
      doc.text(settings.slogan, 16.5, 8.2);

      doc.setFontSize(4.5);
      doc.setTextColor(253, 224, 71); // amber-300
      doc.text('KARTU TANDA PELAJAR RESMI', 16.5, 11.2);

      // Photo frame
      doc.setFillColor(229, 245, 236);
      doc.roundedRect(4.5, 17, 22, 28, 1.5, 1.5, 'F');
      doc.setDrawColor(7, 91, 54);
      doc.setLineWidth(0.4);
      doc.roundedRect(4.5, 17, 22, 28, 1.5, 1.5, 'D');

      // Load & draw student photo
      let studentPhotoData = '';
      if (currentStudent.foto && currentStudent.foto.startsWith('data:image')) {
        studentPhotoData = currentStudent.foto;
      } else if (currentStudent.foto) {
        studentPhotoData = await loadImageAsBase64(currentStudent.foto);
      }

      if (studentPhotoData) {
        try {
          doc.addImage(studentPhotoData, 'JPEG', 5.2, 17.7, 20.6, 26.6);
        } catch {
          doc.setTextColor(7, 91, 54);
          doc.setFontSize(5);
          doc.text('FOTO SISWA', 15.5, 31, { align: 'center' });
        }
      } else {
        doc.setTextColor(7, 91, 54);
        doc.setFontSize(5);
        doc.text('FOTO SISWA', 15.5, 31, { align: 'center' });
      }

      // Student info text
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(currentStudent.nama, 29, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NIS', 29, 25);
      doc.text(':', 40, 25);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(currentStudent.nis, 42, 25);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('NISN', 29, 29);
      doc.text(':', 40, 29);
      doc.setTextColor(15, 23, 42);
      doc.text(currentStudent.nisn || '-', 42, 29);

      doc.setTextColor(100, 116, 139);
      doc.text('Kelas', 29, 33);
      doc.text(':', 40, 33);
      doc.setTextColor(7, 91, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(currentStudent.kelas, 42, 33);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Status', 29, 37);
      doc.text(':', 40, 37);
      doc.setTextColor(15, 23, 42);
      doc.text(
        currentStudent.statusAkademik ? currentStudent.statusAkademik.toUpperCase() : 'AKTIF',
        42,
        37
      );

      doc.setTextColor(100, 116, 139);
      doc.text('Masa Berlaku', 29, 41);
      doc.text(':', 40, 41);
      doc.setTextColor(15, 23, 42);
      doc.text('Selama Menjadi Siswa', 42, 41);

      // QR Code
      if (qrDataUrl) {
        try {
          doc.addImage(qrDataUrl, 'PNG', 64, 18, 17, 17);
          doc.setFontSize(4);
          doc.setTextColor(100, 116, 139);
          doc.text('Scan Presensi', 72.5, 36.5, { align: 'center' });
        } catch {
          // ignore
        }
      }

      // Bottom green stripe
      doc.setFillColor(7, 91, 54);
      doc.rect(0, 51.5, 85.6, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(4);
      doc.text('Kartu Identitas Resmi Peserta Didik SMP Islam At-Toyib 45', 42.8, 53.2, { align: 'center' });

      // ================= PAGE 2: BELAKANG (BACK) =================
      doc.addPage([54, 85.6], 'landscape');

      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 85.6, 54, 'F');

      // Top Back bar
      doc.setFillColor(7, 91, 54);
      doc.rect(0, 0, 85.6, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text('KETENTUAN & TATA TERTIB KARTU PELAJAR', 42.8, 4, { align: 'center' });

      // Rules text
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      const rules = [
        '1. Kartu ini adalah bukti sah identitas siswa SMP Islam At-Toyib 45.',
        '2. Wajib dibawa setiap hari untuk absensi barcode dan peminjaman perpustakaan.',
        '3. Tidak diperkenankan dipinjamkan atau disalahgunakan oleh pihak lain.',
        '4. Apabila kartu ini hilang atau rusak, segera melapor ke bagian Tata Usaha.',
        '5. Barangsiapa menemukan kartu ini dimohon menyerahkan ke alamat sekolah.',
      ];
      let yRule = 10;
      rules.forEach((rule) => {
        doc.text(rule, 5, yRule);
        yRule += 3.2;
      });

      // School contacts block
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(5, 27, 80.6, 27);

      doc.setFontSize(4.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`Alamat: ${settings.alamat || 'Jl. Raya Pesantren No. 45'}`, 5, 30.5);
      doc.text(`WhatsApp: ${settings.noWhatsapp || '0812-3456-7890'} | Email: ${settings.emailSekolah || 'info@attoyib45.sch.id'}`, 5, 33.5);

      // Principal Signature block
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.text('Cirebon, 15 Juli 2026', 65, 38, { align: 'center' });
      doc.text('Kepala Sekolah,', 65, 41, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text('Pak H. Bambang Sudrajat, M.M.', 65, 49.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.text('NIP. 197508122002121001', 65, 51.5, { align: 'center' });

      // Save PDF
      doc.save(`Kartu_Pelajar_${currentStudent.nis}_${currentStudent.nama.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error creating PDF:', err);
      alert('Terjadi kesalahan saat membuat file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Batch download PDF for all students in current filter
  const downloadBatchCardsPdf = async () => {
    if (filteredStudents.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4', // 210 x 297 mm
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(7, 91, 54);
      doc.text(settings.namaSekolah.toUpperCase(), 105, 14, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `LEMBAR CETAK KARTU PELAJAR - KELAS: ${selectedClassFilter === 'all' ? 'SEMUA KELAS' : selectedClassFilter}`,
        105,
        19,
        { align: 'center' }
      );

      // 4 cards per page in grid (2 cols x 2 rows)
      // Card size: 85.6 x 54 mm
      const cardW = 85.6;
      const cardH = 54;
      const startX = 14;
      const startY = 25;
      const gapX = 10;
      const gapY = 12;

      let pageCount = 1;
      let slot = 0;

      const schoolLogoData = await getSchoolLogoDataUrl(settings);

      for (let i = 0; i < filteredStudents.length; i++) {
        const student = filteredStudents[i];
        if (slot === 4) {
          doc.addPage();
          pageCount++;
          slot = 0;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(7, 91, 54);
          doc.text(settings.namaSekolah.toUpperCase(), 105, 14, { align: 'center' });
        }

        const col = slot % 2;
        const row = Math.floor(slot / 2);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        // Card Border & Background
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'D');

        // Header bar
        doc.setFillColor(7, 91, 54);
        doc.rect(x, y, cardW, 12, 'F');

        // Draw School Logo
        if (schoolLogoData) {
          try {
            doc.addImage(schoolLogoData, 'PNG', x + 3, y + 1.6, 8.8, 8.8);
          } catch {
            // fallback
          }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(settings.namaSekolah.toUpperCase(), x + 13.5, y + 4.5);

        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(229, 245, 236);
        doc.text(settings.slogan, x + 13.5, y + 7.5);

        doc.setTextColor(253, 224, 71);
        doc.text('KARTU TANDA PELAJAR RESMI', x + 13.5, y + 10.2);

        // Photo box
        doc.setFillColor(229, 245, 236);
        doc.roundedRect(x + 4, y + 15, 18, 24, 1, 1, 'F');
        doc.setDrawColor(7, 91, 54);
        doc.roundedRect(x + 4, y + 15, 18, 24, 1, 1, 'D');

        // Student photo
        let photoBase64 = '';
        if (student.foto && student.foto.startsWith('data:image')) {
          photoBase64 = student.foto;
        } else if (student.foto) {
          photoBase64 = await loadImageAsBase64(student.foto);
        }
        if (photoBase64) {
          try {
            doc.addImage(photoBase64, 'JPEG', x + 4.5, y + 15.5, 17, 23);
          } catch {
            doc.setTextColor(7, 91, 54);
            doc.setFontSize(4);
            doc.text('FOTO', x + 13, y + 27, { align: 'center' });
          }
        }

        // Details
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(student.nama.length > 22 ? student.nama.substring(0, 20) + '...' : student.nama, x + 25, y + 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(`NIS : ${student.nis}`, x + 25, y + 23);
        doc.text(`NISN : ${student.nisn || '-'}`, x + 25, y + 27);
        doc.text(`Kelas : ${student.kelas}`, x + 25, y + 31);
        doc.text(`Status : ${student.statusAkademik ? student.statusAkademik.toUpperCase() : 'AKTIF'}`, x + 25, y + 35);

        // QR Code
        const payload = JSON.stringify({
          nis: student.nis,
          nama: student.nama,
          kelas: student.kelas,
          sekolah: 'SMP Islam At-Toyib 45',
        });
        const qrUrl = await QRCode.toDataURL(payload, { width: 150, margin: 1 });
        doc.addImage(qrUrl, 'PNG', x + 66, y + 15, 15, 15);

        // Bottom stripe
        doc.setFillColor(7, 91, 54);
        doc.rect(x, y + 51.5, cardW, 2.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(3.8);
        doc.text('SMP Islam At-Toyib 45 - Kartu Pelajar', x + cardW / 2, y + 53.2, { align: 'center' });

        slot++;
      }

      doc.save(`Lembar_Kartu_Pelajar_${selectedClassFilter}_${filteredStudents.length}_Siswa.pdf`);
    } catch (err) {
      console.error('Error generating batch PDF:', err);
      alert('Terjadi kesalahan saat memproses lembar cetak.');
    } finally {
      setIsGeneratingPdf(false);
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
            <h1 className="text-lg font-bold text-white tracking-wide">Kartu Tanda Pelajar</h1>
            <p className="text-[11px] text-emerald-200">Format Resmi CR80 & Ekspor PDF</p>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Class Filter & Search (For Teacher / Admin) */}
        {!isSiswa && (
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa atau NIS..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination & Counter */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span>
                Menampilkan <strong>{currentIdx + 1}</strong> dari <strong>{filteredStudents.length}</strong> siswa
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx <= 0}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIdx >= filteredStudents.length - 1}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Side Toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCardSide('front')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              cardSide === 'front'
                ? 'bg-[#075B36] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tampilan Depan
          </button>
          <button
            onClick={() => setCardSide('back')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              cardSide === 'back'
                ? 'bg-[#075B36] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tampilan Belakang
          </button>
        </div>

        {/* Logo status notification for admin if custom logo not uploaded */}
        {!settings.logoBase64 && currentUser?.role === 'admin' && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <span className="font-bold text-amber-900 block">Logo Kustom Sekolah Belum Diunggah</span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Kartu pelajar dan file cetak PDF saat ini menggunakan lambang resmi bawaan SMP Islam At-Toyib 45. Anda dapat mengunggah logo resmi beresolusi tinggi di menu <strong>Profil &gt; Pengaturan Sekolah</strong> agar langsung tampil di kartu.
              </p>
            </div>
          </div>
        )}

        {/* Interactive Student ID Card Preview */}
        {currentStudent ? (
          <div className="relative mx-auto max-w-sm w-full perspective-1000">
            {cardSide === 'front' ? (
              /* FRONT CARD */
              <div className="w-full aspect-[85.6/54] bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-950/10 flex flex-col justify-between relative transition-all duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#075B36] to-[#054327] px-3 py-2 text-white flex items-center gap-2.5 relative">
                  <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0">
                    <SchoolLogo size={28} />
                  </div>
                  <div className="leading-tight">
                    <h2 className="text-[11px] font-extrabold tracking-wide uppercase">
                      {settings.namaSekolah}
                    </h2>
                    <p className="text-[7.5px] text-emerald-200 font-medium">{settings.slogan}</p>
                    <p className="text-[6.5px] text-amber-300 font-semibold tracking-wider">
                      KARTU TANDA PELAJAR
                    </p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-3 flex items-center gap-3 flex-1 bg-gradient-to-b from-white to-slate-50">
                  {/* Photo */}
                  <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-[#075B36] shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
                    <img
                      src={currentStudent.foto}
                      alt={currentStudent.nama}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1 text-left">
                    <h3 className="text-xs font-extrabold text-slate-900 truncate">
                      {currentStudent.nama}
                    </h3>
                    <div className="text-[10px] space-y-0.5 text-slate-600">
                      <div className="flex">
                        <span className="w-12 text-slate-400 font-medium">NIS</span>
                        <span className="font-bold text-slate-800">: {currentStudent.nis}</span>
                      </div>
                      <div className="flex">
                        <span className="w-12 text-slate-400 font-medium">NISN</span>
                        <span className="text-slate-800">: {currentStudent.nisn || '-'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-12 text-slate-400 font-medium">Kelas</span>
                        <span className="font-bold text-[#075B36]">: {currentStudent.kelas}</span>
                      </div>
                      <div className="flex">
                        <span className="w-12 text-slate-400 font-medium">Status</span>
                        <span className="font-semibold text-emerald-700">
                          : {currentStudent.statusAkademik ? currentStudent.statusAkademik.toUpperCase() : 'AKTIF'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="w-16 flex flex-col items-center shrink-0">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code Siswa" className="w-14 h-14" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 rounded flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <span className="text-[7px] text-slate-400 font-medium mt-0.5">Scan Presensi</span>
                  </div>
                </div>

                {/* Footer Stripe */}
                <div className="bg-[#075B36] py-1 text-center text-[7px] text-emerald-100 font-medium">
                  {settings.namaLengkapAplikasi} • Dokumen Resmi Sekolah
                </div>
              </div>
            ) : (
              /* BACK CARD */
              <div className="w-full aspect-[85.6/54] bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-950/10 flex flex-col justify-between p-3.5 relative transition-all duration-300 text-left">
                {/* Header */}
                <div className="border-b border-emerald-800/20 pb-1 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#075B36] uppercase tracking-wider">
                    Ketentuan & Tata Tertib Kartu
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#075B36]" />
                </div>

                {/* Rules */}
                <ol className="text-[7.5px] text-slate-600 space-y-0.5 list-decimal pl-3 font-normal leading-tight">
                  <li>Kartu ini adalah identitas resmi siswa SMP Islam At-Toyib 45.</li>
                  <li>Wajib dibawa setiap hari kerja untuk absensi digital QR Code.</li>
                  <li>Dilarang meminjamkan atau memindahtangankan kartu kepada pihak lain.</li>
                  <li>Apabila kartu hilang/rusak, segera melapor ke Tata Usaha.</li>
                </ol>

                {/* Contacts & Signature */}
                <div className="flex items-end justify-between border-t border-slate-100 pt-1.5">
                  <div className="text-[6.5px] text-slate-500 space-y-0.5 max-w-[170px]">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{settings.alamat || 'Jl. Raya Pesantren No. 45'}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>{settings.noWhatsapp || '0812-3456-7890'}</span>
                    </p>
                  </div>

                  {/* Stamp & Signature representation */}
                  <div className="text-center text-[7px] leading-tight">
                    <p className="text-slate-400 text-[6px]">Cirebon, 15 Juli 2026</p>
                    <p className="font-semibold text-slate-700">Kepala Sekolah,</p>
                    <div className="my-0.5 font-serif italic text-emerald-800 font-bold text-[8px]">
                      H. Bambang Sudrajat
                    </div>
                    <p className="font-bold text-slate-900 text-[6.5px]">Pak H. Bambang Sudrajat, M.M.</p>
                    <p className="text-[5.5px] text-slate-400">NIP. 197508122002121001</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-500">
            Tidak ada siswa ditemukan.
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={downloadSingleCardPdf}
            disabled={!currentStudent || isGeneratingPdf}
            className="w-full py-3 bg-[#075B36] hover:bg-[#064e2e] active:scale-[0.98] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf
              ? 'Membuat Dokumen PDF...'
              : `Unduh Kartu Pelajar ${currentStudent ? currentStudent.nama : ''} (PDF)`}
          </button>

          {!isSiswa && (
            <button
              type="button"
              onClick={downloadBatchCardsPdf}
              disabled={filteredStudents.length === 0 || isGeneratingPdf}
              className="w-full py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              Cetak Massal ({filteredStudents.length} Siswa pada Lembar A4)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
