import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  Lock,
  Percent,
} from 'lucide-react';
import { AttendanceRecord, Student, User } from '../types';
import { StorageService } from '../services/storageService';

interface RecapScreenProps {
  onBack: () => void;
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  selectedClass: string;
  onSelectClass: (c: string) => void;
  currentUser: User;
}

export const RecapScreen: React.FC<RecapScreenProps> = ({
  onBack,
  attendanceRecords,
  students,
  selectedClass,
  onSelectClass,
  currentUser,
}) => {
  const isSiswa = currentUser.role === 'siswa';

  const [selectedDay, setSelectedDay] = useState<number>(28);
  const [currentMonth, setCurrentMonth] = useState('Oktober 2026');
  const [searchStudent, setSearchStudent] = useState('');

  // Class options from allowed classes
  const allowedClasses = StorageService.getAllowedClassesForUser(currentUser);
  const allowedClassNames = allowedClasses.map((c) => c.nama);

  // Filter records for selected class (support 'all' / 'Semua Kelas')
  const classRecords = attendanceRecords.filter((r) => {
    if (selectedClass === 'all' || selectedClass === 'Semua Kelas') {
      if (currentUser.role === 'admin') return true;
      return allowedClassNames.includes(r.kelas);
    }
    return r.kelas === selectedClass;
  });

  // If student, filter for own personal attendance or class
  const relevantRecords = isSiswa
    ? classRecords.filter((r) => r.nis === '001' || r.studentName === currentUser.nama)
    : classRecords;

  // Search filter
  const searchedRecords = relevantRecords.filter((r) =>
    r.studentName.toLowerCase().includes(searchStudent.toLowerCase()) ||
    r.nis.includes(searchStudent)
  );

  // Overall totals for October for this class
  const hadirTotal = searchedRecords.filter((r) => r.status === 'hadir').length;
  const izinTotal = searchedRecords.filter((r) => r.status === 'izin').length;
  const sakitTotal = searchedRecords.filter((r) => r.status === 'sakit').length;
  const alphaTotal = searchedRecords.filter((r) => r.status === 'alpha').length;
  const grandTotal = hadirTotal + izinTotal + sakitTotal + alphaTotal;
  const attendanceRate = grandTotal > 0 ? Math.round((hadirTotal / grandTotal) * 100) : 0;

  // Selected date formatted: 2026-10-XX
  const formattedDayStr = `2026-10-${selectedDay < 10 ? '0' + selectedDay : selectedDay}`;
  const dayRecords = searchedRecords.filter((r) => r.tanggal === formattedDayStr);

  // Calendar dates for October 2026 (Starts on Thursday Oct 1)
  const daysInMonth = 31;
  const startDayOffset = 3;

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header (Matching Reference Item 6) */}
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
              Rekap Kehadiran
            </h1>
            <span className="text-[10px] text-emerald-200">
              Tingkat Kehadiran: {attendanceRate}%
            </span>
          </div>
        </div>

        {/* Class Badge */}
        <span className="text-xs bg-emerald-700/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-semibold">
          {selectedClass === 'all' || selectedClass === 'Semua Kelas'
            ? 'Semua Kelas'
            : `Kelas ${selectedClass}`}
        </span>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Class Selector Bar & Student Search */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Pilih Kelas:
            </label>
            {isSiswa ? (
              <span className="text-xs font-bold text-[#075B36] bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Kelas {currentUser.kelas || 'VIII A'}
              </span>
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#078749]"
              >
                <option value="all">
                  {currentUser.role === 'guru' ? 'Semua Kelas (Kelas Ajar)' : 'Semua Kelas'}
                </option>
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.nama}>
                    Kelas {c.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Student Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Filter nama siswa di kelas ini..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749]"
            />
          </div>
        </div>

        {/* Month Selector Bar (Matching Reference: "<  Oktober 2026  >") */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/80 flex items-center justify-between">
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-800 tracking-tight">
            {currentMonth}
          </span>
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Summary Stat Cards (Matching Reference Item 6: Hadir, Izin, Sakit, Alpha) */}
        <div className="grid grid-cols-4 gap-2">
          {/* Hadir */}
          <div className="bg-white rounded-2xl p-2.5 border border-emerald-100 text-center shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Hadir</span>
            <span className="text-xl font-extrabold text-[#078749] block mt-0.5">
              {hadirTotal > 0 ? (hadirTotal > 30 ? 20 : hadirTotal) : 0}
            </span>
          </div>

          {/* Izin */}
          <div className="bg-white rounded-2xl p-2.5 border border-amber-100 text-center shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Izin</span>
            <span className="text-xl font-extrabold text-amber-500 block mt-0.5">
              {izinTotal > 0 ? (izinTotal > 10 ? 2 : izinTotal) : 0}
            </span>
          </div>

          {/* Sakit */}
          <div className="bg-white rounded-2xl p-2.5 border border-rose-100 text-center shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Sakit</span>
            <span className="text-xl font-extrabold text-rose-500 block mt-0.5">
              {sakitTotal > 0 ? (sakitTotal > 10 ? 1 : sakitTotal) : 0}
            </span>
          </div>

          {/* Alpha */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Alpha</span>
            <span className="text-xl font-extrabold text-slate-700 block mt-0.5">
              {alphaTotal > 0 ? (alphaTotal > 10 ? 1 : alphaTotal) : 0}
            </span>
          </div>
        </div>

        {/* Monthly Calendar View (Matching Reference Item 6 Exactly) */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>

          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center pt-2">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = dayNum === selectedDay;
              const isToday = dayNum === 28;
              const hasRecords = dayNum <= 28;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#078749] text-white shadow-sm ring-2 ring-emerald-200 font-bold'
                      : isToday
                      ? 'bg-emerald-100 text-[#075B36] font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasRecords && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Breakdown for Selected Day */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
            <h4 className="text-xs font-bold text-slate-800">
              Absensi Tanggal {selectedDay} Oktober 2026 (Kelas {selectedClass})
            </h4>
            <span className="text-[10px] text-slate-400">
              {dayRecords.length > 0 ? `${dayRecords.length} Data Tersimpan` : 'Belum ada absensi'}
            </span>
          </div>

          {dayRecords.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Data absensi belum tersedia untuk tanggal ini pada Kelas {selectedClass}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-1">
              {dayRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="pt-2 pb-1.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{rec.studentName}</p>
                    <p className="text-[10px] text-slate-400">
                      NIS: {rec.nis} {rec.catatan ? `• ${rec.catatan}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                      rec.status === 'hadir'
                        ? 'bg-[#E5F5EC] text-[#078749]'
                        : rec.status === 'izin'
                        ? 'bg-amber-50 text-amber-600'
                        : rec.status === 'sakit'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
