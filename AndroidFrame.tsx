import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Battery,
  Signal,
  Smartphone,
  Monitor,
  CloudOff,
  Cloud,
  RefreshCw,
  CornerDownLeft,
  Circle,
  Square,
  Triangle,
  SlidersHorizontal,
} from 'lucide-react';
import { Role } from '../types';

interface AndroidFrameProps {
  children: React.ReactNode;
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onSyncNow: () => void;
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  onOpenGuide: () => void;
  currentUserId?: string;
  onSelectUser?: (userId: string) => void;
  onAndroidBack?: () => void;
  onAndroidHome?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isPhoneFrame,
  setIsPhoneFrame,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onSyncNow,
  currentRole,
  onSelectRole,
  onOpenGuide,
  currentUserId,
  onSelectUser,
  onAndroidBack,
  onAndroidHome,
}) => {
  // Navigation mode: 3-button navigation or gesture pill
  const [navBarMode, setNavBarMode] = useState<'3-button' | 'gesture'>('3-button');
  const [recentsToast, setRecentsToast] = useState(false);

  // Keyboard shortcut listener: Escape key triggers Android Back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          if (onAndroidBack) {
            onAndroidBack();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAndroidBack]);

  const handleShowRecents = () => {
    setRecentsToast(true);
    setTimeout(() => setRecentsToast(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start text-slate-800">
      {/* Top Testing & Control Bar */}
      <header className="w-full bg-slate-950/90 border-b border-slate-800 text-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-white tracking-wide">
              SMP Islam At-Toyib 45
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden md:inline">
            Aplikasi Absensi Siswa • Android Native Simulation
          </span>
        </div>

        {/* Quick controls: Role, Back Button Test, Frame Toggle, Offline Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dedicated Android Hardware Back button test */}
          {onAndroidBack && (
            <button
              onClick={onAndroidBack}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              title="Simulasikan penekanan tombol Kembali (Back) sistem Android atau gestur geser tepi layar [Esc]"
            >
              <Triangle className="w-3.5 h-3.5 -rotate-90 fill-white" />
              <span>◁ Back HP (Uji)</span>
            </button>
          )}

          {/* Offline/Online toggle */}
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
            title="Klik untuk uji coba offline / online"
          >
            {isOffline ? <CloudOff className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
            <span>{isOffline ? 'Mode Offline' : 'Mode Online'}</span>
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={onSyncNow}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium animate-pulse"
              title="Sinkronkan data yang tersimpan di perangkat"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sinkron ({pendingSyncCount})</span>
            </button>
          )}

          {/* Quick Role & User Switcher for RBAC Testing */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => onSelectUser ? onSelectUser('u-guru') : onSelectRole('guru')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentUserId === 'u-guru' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Guru A: Ibu Siti Rahmah, S.Pd."
            >
              Guru A (Siti)
            </button>
            <button
              onClick={() => onSelectUser ? onSelectUser('u-guru-2') : onSelectRole('guru')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentUserId === 'u-guru-2' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Guru B: Ustadz Ahmad Zaki, M.Pd."
            >
              Guru B (Zaki)
            </button>
            <button
              onClick={() => onSelectUser ? onSelectUser('u-admin') : onSelectRole('admin')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentRole === 'admin' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Kepala Sekolah / Admin: Pak H. Bambang Sudrajat, M.M."
            >
              Admin
            </button>
            <button
              onClick={() => onSelectUser ? onSelectUser('u-siswa') : onSelectRole('siswa')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentRole === 'siswa' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Siswa: Ahmad Fauzi"
            >
              Siswa
            </button>
          </div>

          {/* Frame switch (Desktop only) */}
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
            title="Ubah tampilan frame HP atau layar penuh"
          >
            {isPhoneFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isPhoneFrame ? 'Layar Penuh' : 'Frame HP'}</span>
          </button>

          {/* Panduan */}
          <button
            onClick={onOpenGuide}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
          >
            Panduan & APK
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex items-center justify-center p-0 lg:p-6 overflow-x-hidden relative">
        {isPhoneFrame ? (
          // Realistic Android Phone Chassis (Pixel 8 / Galaxy S24 style)
          <div className="relative w-full max-w-[412px] h-[892px] max-h-[94vh] bg-black rounded-[46px] p-[11px] shadow-2xl ring-1 ring-slate-700/60 ring-offset-2 ring-offset-slate-900 flex flex-col my-auto transition-all">
            {/* Phone Bezel Buttons */}
            <div className="absolute -left-[14px] top-28 w-[3px] h-10 bg-slate-700 rounded-l-sm"></div>
            <div className="absolute -left-[14px] top-42 w-[3px] h-12 bg-slate-700 rounded-l-sm"></div>
            <div className="absolute -right-[14px] top-32 w-[3px] h-16 bg-slate-700 rounded-r-sm"></div>

            {/* Inner Screen */}
            <div className="relative w-full h-full bg-slate-50 rounded-[38px] overflow-hidden flex flex-col">
              {/* Android Status Bar */}
              <div className="w-full h-8 bg-inherit shrink-0 px-6 flex items-center justify-between text-xs text-inherit select-none z-30">
                <span className="font-semibold text-[13px] tracking-tight text-slate-800">9:41</span>
                {/* Front camera hole */}
                <div className="w-3.5 h-3.5 bg-black rounded-full mx-auto -mt-1 shadow-inner"></div>
                <div className="flex items-center gap-1.5 opacity-90 text-slate-800">
                  <Signal className="w-3.5 h-3.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <Battery className="w-4 h-4" />
                </div>
              </div>

              {/* Offline indicator banner if active */}
              {isOffline && (
                <div className="bg-amber-600 text-white text-[11px] font-medium px-4 py-1 flex items-center justify-between shrink-0 shadow-sm z-30">
                  <span className="flex items-center gap-1">
                    <CloudOff className="w-3 h-3" />
                    Perangkat Offline • Data tersimpan lokal
                  </span>
                  {pendingSyncCount > 0 && (
                    <span className="bg-amber-800/80 px-1.5 py-0.5 rounded text-[10px]">
                      {pendingSyncCount} tertunda
                    </span>
                  )}
                </div>
              )}

              {/* App Screen Content Scrollable */}
              <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col relative no-scrollbar">
                {children}

                {/* Recents Toast notice */}
                {recentsToast && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] px-3.5 py-1.5 rounded-full shadow-lg z-50 pointer-events-none animate-in fade-in">
                    Absensi Siswa SMP Islam At-Toyib 45
                  </div>
                )}
              </div>

              {/* Android Bottom Navigation Bar (Authentic 3-Button or Gesture Nav) */}
              <div className="w-full bg-slate-900 text-slate-400 shrink-0 select-none z-30 px-6 py-1.5 flex items-center justify-between border-t border-slate-800/80">
                {navBarMode === '3-button' ? (
                  <>
                    {/* Back Button (Triangle) */}
                    <button
                      onClick={onAndroidBack}
                      className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer group flex items-center justify-center"
                      title="Tombol Kembali (Back) HP Android"
                      aria-label="Kembali"
                    >
                      <Triangle className="w-4 h-4 -rotate-90 fill-current opacity-70 group-hover:opacity-100" />
                    </button>

                    {/* Home Button (Circle) */}
                    <button
                      onClick={onAndroidHome}
                      className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer group flex items-center justify-center"
                      title="Tombol Beranda (Home) HP Android"
                      aria-label="Beranda"
                    >
                      <Circle className="w-4 h-4 stroke-[2.5] opacity-70 group-hover:opacity-100" />
                    </button>

                    {/* Recents Button (Square) */}
                    <button
                      onClick={handleShowRecents}
                      className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer group flex items-center justify-center"
                      title="Tombol Aplikasi Terkini (Recents) HP Android"
                      aria-label="Aplikasi Terkini"
                    >
                      <Square className="w-3.5 h-3.5 stroke-[2.5] opacity-70 group-hover:opacity-100" />
                    </button>
                  </>
                ) : (
                  /* Gesture Navigation Pill */
                  <div
                    onClick={onAndroidBack}
                    className="w-full flex items-center justify-center py-1 cursor-pointer group"
                    title="Ketuk atau usap untuk kembali"
                  >
                    <div className="w-32 h-1 bg-slate-500 rounded-full group-hover:bg-emerald-400 transition-colors"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Full responsive canvas container
          <div className="w-full max-w-4xl min-h-[85vh] bg-slate-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto relative">
            {isOffline && (
              <div className="bg-amber-600 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between shrink-0 shadow-sm z-30">
                <span className="flex items-center gap-1.5">
                  <CloudOff className="w-4 h-4" />
                  Mode Offline Aktif • Absensi tetap dicatat di penyimpanan lokal perangkat (Local Room / IndexedDB)
                </span>
                {pendingSyncCount > 0 && (
                  <button
                    onClick={onSyncNow}
                    className="bg-amber-800 hover:bg-amber-700 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-100"
                  >
                    Sinkronkan {pendingSyncCount} data
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 w-full overflow-y-auto flex flex-col relative">{children}</div>

            {/* Bottom floating helper in full screen mode for testing back */}
            {onAndroidBack && (
              <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Navigasi Android:</span>
                  <button
                    onClick={onAndroidBack}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    title="Tekan untuk kembali sesuai riwayat navigasi [Esc]"
                  >
                    <Triangle className="w-3 h-3 -rotate-90 fill-white" />
                    <span>◁ Back HP</span>
                  </button>
                  <button
                    onClick={onAndroidHome}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <Circle className="w-3 h-3 stroke-[2.5]" />
                    <span>Home</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Dapat menggunakan tombol fisik HP, swipe back, atau tombol di layar
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
