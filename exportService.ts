import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Student } from '../types';
import { StorageService } from './storageService';

export class ExportService {
  /**
   * Export attendance data to a formatted PDF document with official Islamic school header
   */
  static exportAttendancePDF(params: {
    title: string;
    kelas: string;
    rentangTanggal: string;
    records: AttendanceRecord[];
    schoolName?: string;
    totalHadir: number;
    totalIzin: number;
    totalSakit: number;
    totalAlpha: number;
    persentase: number;
  }): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const settings = StorageService.getSettings();

    const officialSchoolName = settings.namaSekolah || params.schoolName || 'SMP Islam At-Toyib 45';
    const officialAddress = settings.alamat || 'Jl. Raya Pesantren No. 45, Cirebon, Jawa Barat 45153';
    const officialContact = `WhatsApp: ${settings.noWhatsapp || '0812-3456-7890'} | Email: ${settings.emailSekolah || 'info@attoyib45.sch.id'}`;

    // Header Kop Surat
    doc.setFillColor(7, 91, 54); // #075B36
    doc.rect(0, 0, pageWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(7, 91, 54);
    doc.text(officialSchoolName.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(75, 85, 99);
    doc.text(officialAddress, pageWidth / 2, 28, { align: 'center' });
    doc.text(officialContact, pageWidth / 2, 33, { align: 'center' });

    // Hairline double border
    doc.setDrawColor(7, 91, 54);
    doc.setLineWidth(1.5);
    doc.line(14, 37, pageWidth - 14, 37);
    doc.setLineWidth(0.5);
    doc.line(14, 39, pageWidth - 14, 39);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text('LAPORAN REKAPITULASI KEHADIRAN SISWA', pageWidth / 2, 48, { align: 'center' });

    // Filter details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Kelas: ${params.kelas}`, 14, 56);
    doc.text(`Periode: ${params.rentangTanggal}`, 14, 62);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 14, 56, { align: 'right' });
    doc.text(`Tingkat Kehadiran: ${params.persentase}%`, pageWidth - 14, 62, { align: 'right' });

    // Summary Box
    doc.setFillColor(229, 245, 236); // #E5F5EC
    doc.roundedRect(14, 67, pageWidth - 28, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(7, 91, 54);
    doc.text(`HADIR: ${params.totalHadir}`, 24, 76);
    doc.setTextColor(217, 119, 6);
    doc.text(`IZIN: ${params.totalIzin}`, 70, 76);
    doc.setTextColor(220, 38, 38);
    doc.text(`SAKIT: ${params.totalSakit}`, 115, 76);
    doc.setTextColor(107, 114, 128);
    doc.text(`ALPHA: ${params.totalAlpha}`, 160, 76);

    // Table Header
    let y = 88;
    doc.setFillColor(7, 135, 73); // #078749
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('No', 18, y + 5.5);
    doc.text('NIS', 28, y + 5.5);
    doc.text('Nama Siswa', 52, y + 5.5);
    doc.text('Tanggal', 120, y + 5.5);
    doc.text('Status', 152, y + 5.5);
    doc.text('Keterangan', 172, y + 5.5);

    // Table rows
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);

    const displayRecords = params.records.slice(0, 24); // fit on one page cleanly
    displayRecords.forEach((rec, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }

      doc.text(String(idx + 1), 18, y + 5);
      doc.text(rec.nis || '-', 28, y + 5);
      doc.text(rec.studentName.substring(0, 28), 52, y + 5);
      doc.text(rec.tanggal, 120, y + 5);

      // Status colored
      if (rec.status === 'hadir') {
        doc.setTextColor(7, 135, 73);
        doc.text('Hadir', 152, y + 5);
      } else if (rec.status === 'izin') {
        doc.setTextColor(217, 119, 6);
        doc.text('Izin', 152, y + 5);
      } else if (rec.status === 'sakit') {
        doc.setTextColor(220, 38, 38);
        doc.text('Sakit', 152, y + 5);
      } else {
        doc.setTextColor(107, 114, 128);
        doc.text('Alpha', 152, y + 5);
      }
      doc.setTextColor(31, 41, 55);

      doc.text((rec.catatan || '-').substring(0, 20), 172, y + 5);

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(14, y + 7, pageWidth - 14, y + 7);

      y += 7;
    });

    // Signature Area
    const signY = Math.max(y + 12, 235);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Mengetahui,', 24, signY);
    doc.text('Kepala SMP Islam At-Toyib 45', 24, signY + 5);
    doc.text('Wali Kelas ' + params.kelas, pageWidth - 60, signY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Pak H. Bambang Sudrajat, M.M.', 24, signY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 19750814 200212 1 003', 24, signY + 33);

    doc.setFont('helvetica', 'bold');
    doc.text('Ibu Siti Rahmah, S.Pd.', pageWidth - 60, signY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 19830421 200903 2 007', pageWidth - 60, signY + 33);

    // Save PDF
    const cleanFilename = `Laporan_Absensi_${params.kelas.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(cleanFilename);
  }

  /**
   * Export attendance data to real Excel (.xlsx) file
   */
  static exportAttendanceExcel(params: {
    kelas: string;
    rentangTanggal: string;
    records: AttendanceRecord[];
    schoolName: string;
  }): void {
    const dataRows = params.records.map((r, i) => ({
      No: i + 1,
      NIS: r.nis,
      'Nama Siswa': r.studentName,
      Kelas: r.kelas,
      Tanggal: r.tanggal,
      'Waktu Absensi': r.waktuPencatatan,
      Status: r.status.toUpperCase(),
      Keterangan: r.catatan || '-',
      'Dicatat Oleh': r.dicatatOleh,
      'Status Sinkron': r.isSynced ? 'Tersinkron (Online)' : 'Lokal (Pending)',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Adjust column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 26 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Absensi_${params.kelas}`);

    const filename = `Rekap_Absensi_${params.kelas.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export student master data to Excel
   */
  static exportStudentsExcel(students: Student[]): void {
    const rows = students.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      'Nama Lengkap': s.nama,
      Kelas: s.kelas,
      'Jenis Kelamin': s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tanggal Lahir': s.tanggalLahir || '-',
      Alamat: s.alamat || '-',
      'No Telepon Ortu': s.noTeleponOrtu || '-',
      Status: s.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 26 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa');
    XLSX.writeFile(wb, `Data_Siswa_SMP_Islam_At-Toyib_45_${Date.now()}.xlsx`);
  }
}
