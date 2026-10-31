/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import {
  User,
  Student,
  AttendanceRecord,
  ScheduleItem,
  GradeRecord,
  Announcement,
  NotificationItem,
  AppSettings,
  Role,
} from './types';
import { AndroidFrame } from './components/AndroidFrame';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { DailyAttendanceScreen } from './components/DailyAttendanceScreen';
import { ScanQRScreen } from './components/ScanQRScreen';
import { StudentsScreen } from './components/StudentsScreen';
import { RecapScreen } from './components/RecapScreen';
import { ReportScreen } from './components/ReportScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SelectClassScreen } from './components/SelectClassScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { GradesScreen } from './components/GradesScreen';
import { AnnouncementsScreen } from './components/AnnouncementsScreen';
import { TeacherSubjectsScreen } from './components/TeacherSubjectsScreen';
import { SchoolSettingsScreen } from './components/SchoolSettingsScreen';
import { ClassesScreen } from './components/ClassesScreen';
import { StudentCardScreen } from './components/StudentCardScreen';
import { StudentPromotionScreen } from './components/StudentPromotionScreen';
import { StudentWarningsScreen } from './components/StudentWarningsScreen';
import { GoogleAccountsScreen } from './components/GoogleAccountsScreen';
import { GuideModal } from './components/GuideModal';
import { BottomNavBar, TabKey } from './components/BottomNavBar';
import { NavigationManager } from './services/navigationManager';
import { useBackHandler } from './hooks/useBackHandler';
import { LogOut, AlertTriangle } from 'lucide-react';

export default function App() {
  // Splash Screen state
  const [showSplash, setShowSplash] = useState(true);

  // App settings & simulation states
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // User auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());

  // Data collections
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    StorageService.getAttendance()
  );
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => StorageService.getSchedule());
  const [grades, setGrades] = useState<GradeRecord[]>(() => StorageService.getGrades());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    StorageService.getAnnouncements()
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    StorageService.getNotifications()
  );
  const [pendingSyncQueue, setPendingSyncQueue] = useState<AttendanceRecord[]>(() =>
    StorageService.getOfflineQueue()
  );

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<string>('beranda');
  const [selectedClass, setSelectedClass] = useState<string>('VIII A');
  const [targetStudentForCard, setTargetStudentForCard] = useState<string | undefined>(undefined);

  // Android Exit & Confirmation states
  const [showExitToast, setShowExitToast] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isAppClosed, setIsAppClosed] = useState(false);
  const [unsavedPrompt, setUnsavedPrompt] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Initialize and connect NavigationManager with React state
  useEffect(() => {
    NavigationManager.init('beranda');
    NavigationManager.setOnScreenChange((screen) => {
      setCurrentScreen(screen);
    });
    NavigationManager.setOnExitToastTrigger((show) => {
      setShowExitToast(show);
      if (show) {
        setTimeout(() => setShowExitToast(false), 2500);
      }
    });
    NavigationManager.setOnExitModalTrigger((show) => {
      setShowExitModal(show);
    });
    NavigationManager.setOnUnsavedPromptTrigger((prompt) => {
      setUnsavedPrompt(prompt);
    });

    return () => {
      NavigationManager.destroy();
    };
  }, []);

  // Back interceptor for Guide Modal (Priority 100)
  useBackHandler(
    'guide-modal-app',
    100,
    () => {
      setIsGuideOpen(false);
      return true;
    },
    isGuideOpen
  );

  // Back interceptor for Exit Confirmation Dialog (Priority 90)
  useBackHandler(
    'exit-confirm-modal-app',
    90,
    () => {
      setShowExitModal(false);
      return true;
    },
    showExitModal
  );

  // Back interceptor for Unsaved Changes Dialog (Priority 95)
  useBackHandler(
    'unsaved-changes-prompt-app',
    95,
    () => {
      if (unsavedPrompt) {
        unsavedPrompt.onCancel();
      }
      return true;
    },
    unsavedPrompt !== null && unsavedPrompt.isOpen
  );

  const handleNavigate = (screen: string) => {
    NavigationManager.navigate(screen);
  };

  // Sync count
  const pendingSyncCount = pendingSyncQueue.length;

  // Unread notifications count
  const unreadCount = notifications.filter((n) => !n.sudahDibaca).length;

  // Today attendance for selected class
  const todayAttendance = attendanceRecords.filter(
    (a) => a.kelas === selectedClass && a.tanggal === '2026-10-28'
  );

  // Supabase Realtime Listener untuk pembaruan instan antar perangkat
  useEffect(() => {
    if (SupabaseService.isAvailable()) {
      const channel = SupabaseService.subscribeToAttendance(() => {
        setAttendanceRecords(StorageService.getAttendance());
      });
      return () => {
        if (channel) SupabaseService.unsubscribe(channel);
      };
    }
  }, []);

  // Handlers for data updates
  const handleSaveAttendance = (records: AttendanceRecord[]) => {
    const res = StorageService.saveAttendanceRecords(records, isOffline, currentUser);
    if (!res.success) {
      alert(res.error || 'Akses ditolak: Siswa dilarang menyimpan absensi.');
      return;
    }
    setAttendanceRecords(StorageService.getAttendance());
    setPendingSyncQueue(StorageService.getOfflineQueue());

    // Sinkronisasi otomatis ke Supabase jika online
    if (!isOffline && SupabaseService.isAvailable()) {
      records.forEach((rec) => {
        SupabaseService.syncAttendanceToSupabase(rec);
      });
    }
  };

  const handleAttendanceScanned = (record: AttendanceRecord) => {
    setAttendanceRecords(StorageService.getAttendance());
    setPendingSyncQueue(StorageService.getOfflineQueue());

    // Sinkronisasi otomatis ke Supabase jika online
    if (!isOffline && SupabaseService.isAvailable() && record) {
      SupabaseService.syncAttendanceToSupabase(record);
    }
  };

  const handleSyncNow = async () => {
    const queue = StorageService.getOfflineQueue();
    if (SupabaseService.isAvailable() && queue.length > 0) {
      for (const rec of queue) {
        await SupabaseService.syncAttendanceToSupabase(rec);
      }
    }
    const syncedCount = StorageService.syncOfflineQueue();
    setAttendanceRecords(StorageService.getAttendance());
    setPendingSyncQueue([]);
    alert(`Berhasil menyinkronkan ${syncedCount} data absensi ke server!`);
  };

  const handleToggleOffline = () => {
    setIsOffline((prev) => !prev);
  };

  const handleAddStudent = (student: Student) => {
    const res = StorageService.addStudent(student, currentUser);
    if (!res.success) {
      alert(res.error || 'Gagal menambahkan siswa.');
      return;
    }
    setStudents(StorageService.getStudents());
  };

  const handleUpdateStudent = (student: Student) => {
    const res = StorageService.updateStudent(student, currentUser);
    if (!res.success) {
      alert(res.error || 'Gagal memperbarui siswa.');
      return;
    }
    setStudents(StorageService.getStudents());
  };

  const handleDeleteStudent = (id: string) => {
    const res = StorageService.deleteStudent(id, currentUser);
    if (!res.success) {
      alert(res.error || 'Gagal menghapus siswa.');
      return;
    }
    setStudents(StorageService.getStudents());
  };

  const handleSaveScheduleItem = (item: ScheduleItem): { success: boolean; error?: string } => {
    const res = StorageService.saveScheduleItem(item, currentUser);
    if (res.success) {
      setSchedule(StorageService.getSchedule());
    }
    return res;
  };

  const handleDeleteScheduleItem = (id: string): { success: boolean; error?: string } => {
    const res = StorageService.deleteScheduleItem(id, currentUser);
    if (res.success) {
      setSchedule(StorageService.getSchedule());
    }
    return res;
  };

  const handleUpdateGrade = (grade: GradeRecord) => {
    const updated = grades.map((g) => (g.id === grade.id ? grade : g));
    StorageService.saveGrades(updated, currentUser);
    setGrades(updated);
  };

  const handleAddAnnouncement = (ann: Announcement) => {
    const res = StorageService.addAnnouncement(ann, currentUser);
    if (!res.success) {
      alert(res.error || 'Gagal membuat pengumuman.');
      return;
    }
    setAnnouncements(StorageService.getAnnouncements());
  };

  const handleDeleteAnnouncement = (id: string) => {
    const res = StorageService.deleteAnnouncement(id, currentUser);
    if (!res.success) {
      alert(res.error || 'Gagal menghapus pengumuman.');
      return;
    }
    setAnnouncements(StorageService.getAnnouncements());
  };

  const handleMarkAllNotificationsRead = () => {
    StorageService.markAllNotificationsRead();
    setNotifications(StorageService.getNotifications());
  };

  const handleSelectRole = (role: Role) => {
    const users = StorageService.getUsers();
    const target = users.find((u) => u.role === role) || users[0];
    StorageService.setCurrentUser(target);
    setCurrentUser(target);

    // If student, auto-set selectedClass to their class
    if (target.kelas) {
      setSelectedClass(target.kelas);
    }
  };

  const handleSelectUser = (userId: string) => {
    const users = StorageService.getUsers();
    const target = users.find((u) => u.id === userId) || users[0];
    StorageService.setCurrentUser(target);
    setCurrentUser(target);

    if (target.kelas) {
      setSelectedClass(target.kelas);
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    NavigationManager.reset('beranda');
    setCurrentScreen('beranda');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.kelas) {
      setSelectedClass(user.kelas);
    }
    NavigationManager.reset('beranda');
    setCurrentScreen('beranda');
  };

  const handleUpdateUser = (updated: User) => {
    const res = StorageService.updateUserProfile(
      updated.id,
      { nama: updated.nama, email: updated.email, foto: updated.foto },
      currentUser
    );
    if (res.success) {
      setCurrentUser(updated);
      setStudents(StorageService.getStudents());
    } else {
      alert(res.error || 'Gagal memperbarui profil');
    }
  };

  // Map current screen to BottomNavBar tab
  const getActiveTab = (): TabKey => {
    if (currentScreen === 'beranda') return 'beranda';
    if (currentScreen === 'absensi') return 'absensi';
    if (currentScreen === 'jadwal') return 'jadwal';
    if (currentScreen === 'notifikasi') return 'notifikasi';
    if (currentScreen === 'profil') return 'profil';
    return 'beranda';
  };

  // Determine whether to show the Bottom Navigation Bar
  const shouldShowBottomNav =
    currentUser &&
    !showSplash &&
    [
      'beranda',
      'absensi',
      'jadwal',
      'notifikasi',
      'profil',
      'nilai',
      'pengumuman',
      'rekap',
      'laporan',
      'siswa-list',
      'mapel-guru',
      'pengaturan-sekolah',
      'kelola-kelas',
      'kartu-pelajar',
      'kenaikan-kelas',
      'teguran-siswa',
      'kelola-akun',
    ].includes(currentScreen);

  // Render main screen component
  const renderScreen = () => {
    if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    if (isAppClosed) {
      return (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center select-none">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
            <LogOut className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Aplikasi Ditutup</h2>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Sesi aplikasi Absensi Siswa SMP Islam At-Toyib 45 telah diakhiri. Tekan tombol di bawah untuk membuka kembali.
          </p>
          <button
            onClick={() => {
              setIsAppClosed(false);
              NavigationManager.reset('beranda');
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-95"
          >
            Buka Kembali Aplikasi
          </button>
        </div>
      );
    }

    if (!currentUser) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    switch (currentScreen) {
      case 'beranda':
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={(screen) => handleNavigate(screen)}
            unreadCount={unreadCount}
            todayAttendance={todayAttendance}
          />
        );

      case 'absensi':
        return (
          <DailyAttendanceScreen
            onBack={() => NavigationManager.handleBack()}
            onOpenClassSelect={() => handleNavigate('pilih-kelas')}
            onOpenScan={() => handleNavigate('scan')}
            selectedClass={selectedClass}
            students={students}
            existingAttendance={attendanceRecords}
            onSaveAttendance={handleSaveAttendance}
            isOffline={isOffline}
            currentUser={currentUser}
          />
        );

      case 'scan':
        return (
          <ScanQRScreen
            onBack={() => NavigationManager.handleBack()}
            students={students}
            onAttendanceScanned={handleAttendanceScanned}
            existingAttendance={attendanceRecords}
            currentUser={currentUser}
            isOffline={isOffline}
          />
        );

      case 'siswa-list':
        return (
          <StudentsScreen
            onBack={() => NavigationManager.handleBack()}
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            currentUser={currentUser}
            onNavigateToCard={(id) => {
              setTargetStudentForCard(id);
              handleNavigate('kartu-pelajar');
            }}
          />
        );

      case 'rekap':
        return (
          <RecapScreen
            onBack={() => NavigationManager.handleBack()}
            attendanceRecords={attendanceRecords}
            students={students}
            selectedClass={selectedClass}
            onSelectClass={(c) => setSelectedClass(c)}
            currentUser={currentUser}
          />
        );

      case 'laporan':
        return (
          <ReportScreen
            onBack={() => NavigationManager.handleBack()}
            attendanceRecords={attendanceRecords}
            students={students}
            selectedClass={selectedClass}
            onSelectClass={(cls) => setSelectedClass(cls)}
            currentUser={currentUser}
          />
        );

      case 'notifikasi':
        return (
          <NotificationsScreen
            onBack={() => NavigationManager.handleBack()}
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllNotificationsRead}
            onNavigate={(screen) => handleNavigate(screen)}
          />
        );

      case 'profil':
        return (
          <ProfileScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            appSettings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              StorageService.saveSettings(newSettings);
            }}
            onOpenGuide={() => setIsGuideOpen(true)}
            pendingSyncCount={pendingSyncCount}
            onSyncNow={handleSyncNow}
            onNavigate={(screen) => handleNavigate(screen)}
          />
        );

      case 'pilih-kelas':
        return (
          <SelectClassScreen
            onBack={() => NavigationManager.handleBack()}
            selectedClass={selectedClass}
            onSelectClass={(c) => setSelectedClass(c)}
            currentUser={currentUser}
          />
        );

      case 'pengaturan-sekolah':
        return (
          <SchoolSettingsScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          />
        );

      case 'kelola-kelas':
        return (
          <ClassesScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            onSelectClassForAttendance={(cls) => {
              setSelectedClass(cls);
              handleNavigate('absensi');
            }}
          />
        );

      case 'kartu-pelajar':
        return (
          <StudentCardScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            students={students}
            initialStudentId={targetStudentForCard}
          />
        );

      case 'kenaikan-kelas':
        return (
          <StudentPromotionScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            onRefreshData={() => setStudents(StorageService.getStudents())}
          />
        );

      case 'teguran-siswa':
        return (
          <StudentWarningsScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
          />
        );

      case 'jadwal':
        return (
          <ScheduleScreen
            onBack={() => NavigationManager.handleBack()}
            scheduleList={schedule}
            selectedClass={selectedClass}
            onSelectClass={(c) => setSelectedClass(c)}
            currentUser={currentUser}
            onSaveScheduleItem={handleSaveScheduleItem}
            onDeleteScheduleItem={handleDeleteScheduleItem}
            onNavigateToTeacherSubjects={() => handleNavigate('mapel-guru')}
          />
        );

      case 'nilai':
        return (
          <GradesScreen
            onBack={() => NavigationManager.handleBack()}
            grades={grades}
            students={students}
            selectedClass={selectedClass}
            userRole={currentUser.role}
            currentUser={currentUser}
            onUpdateGrade={handleUpdateGrade}
          />
        );

      case 'mapel-guru':
        return (
          <TeacherSubjectsScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
            onNavigateToSchedule={() => handleNavigate('jadwal')}
          />
        );

      case 'pengumuman':
        return (
          <AnnouncementsScreen
            onBack={() => NavigationManager.handleBack()}
            announcements={announcements}
            userRole={currentUser.role}
            onAddAnnouncement={handleAddAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
          />
        );

      case 'kelola-akun':
        return (
          <GoogleAccountsScreen
            onBack={() => NavigationManager.handleBack()}
            currentUser={currentUser}
          />
        );

      default:
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={(screen) => handleNavigate(screen)}
            unreadCount={unreadCount}
            todayAttendance={todayAttendance}
          />
        );
    }
  };

  return (
    <AndroidFrame
      isPhoneFrame={isPhoneFrame}
      setIsPhoneFrame={setIsPhoneFrame}
      isOffline={isOffline}
      onToggleOffline={handleToggleOffline}
      pendingSyncCount={pendingSyncCount}
      onSyncNow={handleSyncNow}
      currentRole={currentUser?.role || 'guru'}
      onSelectRole={handleSelectRole}
      currentUserId={currentUser?.id}
      onSelectUser={handleSelectUser}
      onOpenGuide={() => setIsGuideOpen(true)}
      onAndroidBack={() => NavigationManager.handleBack()}
      onAndroidHome={() => handleNavigate('beranda')}
    >
      <div className="flex-1 w-full flex flex-col justify-between min-h-full bg-slate-50 relative">
        <div className="flex-1 w-full flex flex-col">{renderScreen()}</div>

        {shouldShowBottomNav && !isAppClosed && (
          <BottomNavBar
            activeTab={getActiveTab()}
            onTabChange={(tab) => handleNavigate(tab)}
            unreadNotificationsCount={unreadCount}
          />
        )}

        {/* Android Native-Style Toast on Single Back Press on Dashboard */}
        {showExitToast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/80 z-50 pointer-events-none animate-fade-in flex items-center gap-2 backdrop-blur-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Tekan kembali sekali lagi untuk keluar dari aplikasi</span>
          </div>
        )}

        {/* Android Exit Confirmation Dialog on Double Back Press on Dashboard */}
        {showExitModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Keluar dari Aplikasi?</h3>
                  <p className="text-[11px] text-slate-500">SMP Islam At-Toyib 45</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menutup sesi aplikasi Absensi Siswa SMP Islam At-Toyib 45?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    setIsAppClosed(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved Changes Confirmation Dialog */}
        {unsavedPrompt && unsavedPrompt.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {unsavedPrompt.title || 'Perubahan Belum Disimpan'}
                  </h3>
                  <p className="text-[11px] text-amber-700 font-medium">Peringatan Navigasi</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {unsavedPrompt.message ||
                  'Terdapat data formulir yang belum disimpan. Apakah Anda yakin ingin membatalkan perubahan dan meninggalkan halaman ini?'}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => unsavedPrompt.onCancel()}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Lanjut Mengedit
                </button>
                <button
                  type="button"
                  onClick={() => unsavedPrompt.onConfirm()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  Buang Perubahan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </AndroidFrame>
  );
}
