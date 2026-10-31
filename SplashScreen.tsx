import React, { useEffect } from 'react';
import { SchoolLogo } from './SchoolLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-between bg-white px-6 py-12 relative overflow-hidden select-none animate-fadeIn">
      {/* Top subtle decorative pattern */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-50/70 to-transparent pointer-events-none"></div>

      <div className="w-full"></div>

      {/* Center Logo & Branding */}
      <div className="flex flex-col items-center text-center z-10 transition-all transform scale-100 duration-700">
        <div className="p-4 bg-emerald-50/80 rounded-3xl shadow-sm border border-emerald-100 mb-5">
          <SchoolLogo size={90} />
        </div>

        <h1 className="text-2xl font-extrabold text-[#075B36] tracking-tight">
          SMP Islam At-Toyib 45
        </h1>

        <div className="mt-2.5 inline-block bg-[#E5F5EC] text-[#075B36] font-semibold text-xs px-3.5 py-1 rounded-full border border-emerald-200/60">
          Aplikasi Absensi Siswa
        </div>

        <p className="mt-3 text-xs text-slate-500 font-medium tracking-wide">
          Disiplin • Berilmu • Berakhlak Mulia
        </p>

        {/* Small loading indicator */}
        <div className="mt-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#078749] animate-bounce"></span>
          <span className="w-2 h-2 rounded-full bg-[#078749] animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 rounded-full bg-[#078749] animate-bounce [animation-delay:0.4s]"></span>
        </div>
      </div>

      {/* Bottom decorative wave */}
      <div className="w-full text-center z-10">
        <p className="text-[11px] text-slate-400">
          Mudah, Cepat, Akurat Untuk Kehadiran Siswa
        </p>
        <p className="text-[10px] text-slate-300 mt-1">Versi 2.4.0 (Build 45)</p>
      </div>
    </div>
  );
};
