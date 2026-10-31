import React from 'react';
import { Home, CalendarCheck, Calendar, User, Bell } from 'lucide-react';

export type TabKey = 'beranda' | 'absensi' | 'jadwal' | 'profil' | 'notifikasi';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  unreadNotificationsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  unreadNotificationsCount = 0,
}) => {
  return (
    <nav className="sticky bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      {/* 1. Beranda */}
      <button
        onClick={() => onTabChange('beranda')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'beranda' ? 'text-[#078749]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <Home className="w-5 h-5" strokeWidth={activeTab === 'beranda' ? 2.5 : 2} />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            activeTab === 'beranda' ? 'font-bold text-[#078749]' : 'font-medium'
          }`}
        >
          Beranda
        </span>
      </button>

      {/* 2. Absensi */}
      <button
        onClick={() => onTabChange('absensi')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'absensi' ? 'text-[#078749]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <CalendarCheck className="w-5 h-5" strokeWidth={activeTab === 'absensi' ? 2.5 : 2} />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            activeTab === 'absensi' ? 'font-bold text-[#078749]' : 'font-medium'
          }`}
        >
          Absensi
        </span>
      </button>

      {/* 3. Jadwal */}
      <button
        onClick={() => onTabChange('jadwal')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'jadwal' ? 'text-[#078749]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <Calendar className="w-5 h-5" strokeWidth={activeTab === 'jadwal' ? 2.5 : 2} />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            activeTab === 'jadwal' ? 'font-bold text-[#078749]' : 'font-medium'
          }`}
        >
          Jadwal
        </span>
      </button>

      {/* 4. Notifikasi */}
      <button
        onClick={() => onTabChange('notifikasi')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'notifikasi' ? 'text-[#078749]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" strokeWidth={activeTab === 'notifikasi' ? 2.5 : 2} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
              {unreadNotificationsCount}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            activeTab === 'notifikasi' ? 'font-bold text-[#078749]' : 'font-medium'
          }`}
        >
          Notifikasi
        </span>
      </button>

      {/* 5. Profil */}
      <button
        onClick={() => onTabChange('profil')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'profil' ? 'text-[#078749]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="relative">
          <User className="w-5 h-5" strokeWidth={activeTab === 'profil' ? 2.5 : 2} />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            activeTab === 'profil' ? 'font-bold text-[#078749]' : 'font-medium'
          }`}
        >
          Profil
        </span>
      </button>
    </nav>
  );
};
