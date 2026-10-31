import React from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  AlertTriangle,
  FileText,
  Megaphone,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsScreenProps {
  onBack: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNavigate: (screen: string) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  notifications,
  onMarkAllAsRead,
  onNavigate,
}) => {
  const getIconForCategory = (kategori: string) => {
    switch (kategori) {
      case 'absensi':
        return (
          <div className="w-10 h-10 rounded-full bg-[#E5F5EC] flex items-center justify-center text-[#078749] shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
        );
      case 'izin':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'sakit':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'laporan':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'pengumuman':
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header (Matching Reference Item 8) */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">
            Notifikasi
          </h1>
        </div>

        <button
          onClick={onMarkAllAsRead}
          className="flex items-center gap-1 text-xs text-emerald-200 hover:text-white font-medium"
          title="Tandai semua dibaca"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Tandai dibaca</span>
        </button>
      </header>

      {/* Notifications List (Matching Reference Item 8 Exactly) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Tidak ada notifikasi baru
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.tautan) onNavigate(item.tautan);
              }}
              className={`bg-white rounded-2xl p-3.5 border transition-all flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.99] ${
                item.sudahDibaca ? 'border-slate-100 opacity-80' : 'border-emerald-200 ring-1 ring-emerald-500/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {getIconForCategory(item.kategori)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {item.judul}
                    </h3>
                    {!item.sudahDibaca && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#078749] shrink-0"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate leading-tight">
                    {item.deskripsi}
                  </p>
                </div>
              </div>

              {/* Timestamp on right */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400">
                  {item.waktu}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
