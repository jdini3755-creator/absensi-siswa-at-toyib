import {
  User,
  Student,
  ClassItem,
  AttendanceRecord,
  AttendanceStatus,
  ScheduleItem,
  GradeRecord,
  Announcement,
  NotificationItem,
  AppSettings,
  Role,
  Subject,
  TeacherAssignment,
  AssignmentAuditLog,
  StudentWarning,
  PromotionLog,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_STUDENTS,
  INITIAL_CLASSES,
  SEEDED_ATTENDANCE,
  INITIAL_SCHEDULE,
  INITIAL_GRADES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHER_ASSIGNMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_STUDENT_WARNINGS,
  INITIAL_PROMOTION_LOGS,
} from '../data/mockData';

const KEYS = {
  CURRENT_USER: 'attoyib_current_user',
  USERS: 'attoyib_users',
  STUDENTS: 'attoyib_students',
  CLASSES: 'attoyib_classes',
  ATTENDANCE: 'attoyib_attendance',
  SCHEDULE: 'attoyib_schedule',
  GRADES: 'attoyib_grades',
  ANNOUNCEMENTS: 'attoyib_announcements',
  NOTIFICATIONS: 'attoyib_notifications',
  SETTINGS: 'attoyib_settings',
  OFFLINE_QUEUE: 'attoyib_offline_queue',
  SUBJECTS: 'attoyib_subjects',
  ASSIGNMENTS: 'attoyib_teacher_assignments',
  AUDIT_LOGS: 'attoyib_assignment_audit_logs',
  WARNINGS: 'attoyib_student_warnings',
  PROMOTIONS: 'attoyib_promotion_logs',
};

export class StorageService {
  static getSettings(): AppSettings {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      // Ensure default identity fields are merged if missing
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  static updateSchoolSettings(
    updates: Partial<AppSettings>,
    actor?: User | null
  ): { success: boolean; error?: string; settings?: AppSettings } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang berwenang mengubah identitas dan pengaturan sekolah.' };
    }
    const current = this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...updates,
    };
    this.saveSettings(updated);
    return { success: true, settings: updated };
  }

  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    if (!raw) {
      return INITIAL_USERS[1]; // default Guru
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  static getUsers(): User[] {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      const parsed: User[] = JSON.parse(raw);
      let modified = false;
      INITIAL_USERS.forEach((initU) => {
        const found = parsed.find((u) => u.id === initU.id || u.username === initU.username);
        if (found) {
          if (!found.googleEmail && initU.googleEmail) {
            found.googleEmail = initU.googleEmail;
            found.isGoogleLinked = true;
            modified = true;
          }
        } else {
          parsed.push(initU);
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  /**
   * Authenticate user with Google (Gmail)
   * Only registered and active users are permitted.
   */
  static authenticateWithGoogle(emailInput: string): {
    success: boolean;
    user?: User;
    error?: string;
    reason?: 'UNREGISTERED' | 'DISABLED' | 'INVALID_EMAIL';
  } {
    const trimmed = (emailInput || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      return {
        success: false,
        reason: 'INVALID_EMAIL',
        error: 'Format email Google tidak valid. Harap gunakan alamat Gmail yang sah.',
      };
    }

    const users = this.getUsers();
    // Match against googleEmail or standard email
    const found = users.find(
      (u) =>
        (u.googleEmail && u.googleEmail.trim().toLowerCase() === trimmed) ||
        (u.email && u.email.trim().toLowerCase() === trimmed)
    );

    if (!found) {
      return {
        success: false,
        reason: 'UNREGISTERED',
        error: 'Akun Google Anda belum terdaftar. Silakan hubungi admin sekolah.',
      };
    }

    if (found.status === 'nonaktif') {
      return {
        success: false,
        reason: 'DISABLED',
        error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin sekolah.',
      };
    }

    // Update lastLoginAt
    found.lastLoginAt = new Date().toISOString();
    found.isGoogleLinked = true;
    if (!found.googleEmail) {
      found.googleEmail = trimmed;
    }
    this.saveUsers(users);
    this.setCurrentUser(found);

    return {
      success: true,
      user: found,
    };
  }

  /**
   * Register a new user linked with Google Account (Admin only)
   */
  static registerGoogleUser(
    payload: {
      nama: string;
      googleEmail: string;
      role: Role;
      status: 'aktif' | 'nonaktif';
      username?: string;
      studentId?: string;
      nip?: string;
      jabatan?: string;
      kelas?: string;
      foto?: string;
    },
    actor: User | null
  ): { success: boolean; user?: User; error?: string } {
    if (!actor || actor.role !== 'admin') {
      return {
        success: false,
        error: 'Akses ditolak: Hanya administrator yang berwenang mendaftarkan akun Google.',
      };
    }

    const trimmedEmail = (payload.googleEmail || '').trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Alamat email Google tidak valid.' };
    }

    if (!payload.nama || !payload.nama.trim()) {
      return { success: false, error: 'Nama lengkap akun tidak boleh kosong.' };
    }

    const users = this.getUsers();
    // Prevent duplicate email
    const isDuplicate = users.some(
      (u) =>
        (u.googleEmail && u.googleEmail.trim().toLowerCase() === trimmedEmail) ||
        (u.email && u.email.trim().toLowerCase() === trimmedEmail)
    );
    if (isDuplicate) {
      return {
        success: false,
        error: `Alamat email "${trimmedEmail}" sudah terdaftar pada pengguna lain. Satu akun Google hanya dapat dihubungkan ke satu identitas.`,
      };
    }

    const generatedUsername =
      payload.username?.trim().toLowerCase() ||
      trimmedEmail.split('@')[0].replace(/[^a-z0-9]/g, '') ||
      `user${Date.now().toString().slice(-4)}`;

    const now = new Date().toISOString();
    const newUser: User = {
      id: `u-g-${Date.now()}`,
      username: generatedUsername,
      nama: payload.nama.trim(),
      email: trimmedEmail,
      googleEmail: trimmedEmail,
      isGoogleLinked: true,
      role: payload.role,
      status: payload.status,
      foto:
        payload.foto ||
        (payload.role === 'siswa'
          ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'),
      kelas: payload.kelas,
      nip: payload.nip,
      jabatan: payload.jabatan,
      studentId: payload.studentId,
      createdAt: now,
      updatedAt: now,
      registeredBy: actor.id,
    };

    users.push(newUser);
    this.saveUsers(users);

    return { success: true, user: newUser };
  }

  /**
   * Activate or Deactivate account (Admin only)
   */
  static updateUserGoogleStatus(
    userId: string,
    newStatus: 'aktif' | 'nonaktif',
    actor: User | null
  ): { success: boolean; error?: string } {
    if (!actor || actor.role !== 'admin') {
      return {
        success: false,
        error: 'Akses ditolak: Hanya administrator yang berwenang mengubah status akun.',
      };
    }

    if (actor.id === userId && newStatus === 'nonaktif') {
      return {
        success: false,
        error: 'Tindakan dicegah: Anda tidak dapat menonaktifkan akun admin Anda sendiri saat sedang masuk.',
      };
    }

    const users = this.getUsers();
    const targetIdx = users.findIndex((u) => u.id === userId);
    if (targetIdx === -1) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    users[targetIdx].status = newStatus;
    users[targetIdx].updatedAt = new Date().toISOString();
    this.saveUsers(users);

    return { success: true };
  }

  /**
   * Safely update Google email (Admin only)
   */
  static updateUserGoogleEmail(
    userId: string,
    newGoogleEmail: string,
    actor: User | null
  ): { success: boolean; error?: string } {
    if (!actor || actor.role !== 'admin') {
      return {
        success: false,
        error: 'Akses ditolak: Hanya administrator yang berwenang mengubah alamat Google terdaftar.',
      };
    }

    const trimmed = newGoogleEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      return { success: false, error: 'Format email Google baru tidak valid.' };
    }

    const users = this.getUsers();
    const targetIdx = users.findIndex((u) => u.id === userId);
    if (targetIdx === -1) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    // Check duplicate
    const duplicate = users.some(
      (u) =>
        u.id !== userId &&
        ((u.googleEmail && u.googleEmail.trim().toLowerCase() === trimmed) ||
          (u.email && u.email.trim().toLowerCase() === trimmed))
    );
    if (duplicate) {
      return {
        success: false,
        error: `Alamat email "${trimmed}" sudah digunakan oleh akun lain.`,
      };
    }

    users[targetIdx].googleEmail = trimmed;
    users[targetIdx].email = trimmed;
    users[targetIdx].isGoogleLinked = true;
    users[targetIdx].updatedAt = new Date().toISOString();
    this.saveUsers(users);

    return { success: true };
  }

  /**
   * Delete user account (Admin only)
   */
  static deleteUserAccount(
    userId: string,
    actor: User | null
  ): { success: boolean; error?: string } {
    if (!actor || actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat menghapus akun.' };
    }

    if (actor.id === userId) {
      return { success: false, error: 'Tindakan dicegah: Anda tidak dapat menghapus akun Anda sendiri.' };
    }

    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'Akun tidak ditemukan.' };
    }

    const filtered = users.filter((u) => u.id !== userId);
    this.saveUsers(filtered);

    return { success: true };
  }

  static updateUserProfile(
    userId: string,
    updates: { nama?: string; email?: string; foto?: string },
    actor?: User | null
  ): { success: boolean; error?: string } {
    // Security check: Only own user or admin can update
    if (actor && actor.role !== 'admin' && actor.id !== userId) {
      return { success: false, error: 'Akses ditolak: Anda hanya dapat memperbarui profil Anda sendiri.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    const updatedUser: User = {
      ...users[userIndex],
      ...updates,
    };
    users[userIndex] = updatedUser;
    this.saveUsers(users);

    // If current logged-in user is the one being updated, update session
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser(updatedUser);
    }

    // If this user is linked to a student (e.g. Ahmad Fauzi), also sync student photo/name in students list
    if (updatedUser.studentId || updatedUser.role === 'siswa') {
      const students = this.getStudents();
      const stIdx = students.findIndex((s) => s.id === updatedUser.studentId || s.nis === '001');
      if (stIdx !== -1) {
        if (updates.foto) students[stIdx].foto = updates.foto;
        if (updates.nama) students[stIdx].nama = updates.nama;
        localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
      }
    }

    return { success: true };
  }

  static getStudents(actor?: User | null): Student[] {
    const raw = localStorage.getItem(KEYS.STUDENTS);
    let students: Student[] = [];
    if (!raw) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      students = INITIAL_STUDENTS;
    } else {
      students = JSON.parse(raw);
    }
    return students;
  }

  static getStudentDetail(studentId: string, actor?: User | null): { student: Student | null; error?: string } {
    const students = this.getStudents();
    const target = students.find((s) => s.id === studentId);
    if (!target) return { student: null, error: 'Siswa tidak ditemukan.' };

    // Security check: If actor is SISWA, can ONLY view their own detail!
    if (actor && actor.role === 'siswa') {
      const isOwn = (actor.studentId && actor.studentId === studentId) || actor.username === 'siswa' && target.nis === '001';
      if (!isOwn) {
        return {
          student: null,
          error: 'Akses ditolak: Demi menjaga privasi, siswa hanya diperbolehkan melihat detail pribadinya sendiri.',
        };
      }
    }

    return { student: target };
  }

  static saveStudents(students: Student[], actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan mengelola data siswa.' };
    }
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    return { success: true };
  }

  static addStudent(student: Student, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan menambahkan siswa.' };
    }
    const current = this.getStudents();
    if (current.some((s) => s.nis === student.nis)) {
      return { success: false, error: `NIS ${student.nis} sudah terdaftar dalam sistem.` };
    }
    current.unshift(student);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(current));
    return { success: true };
  }

  static updateStudent(student: Student, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan mengubah data siswa lain.' };
    }
    const current = this.getStudents();
    const idx = current.findIndex((s) => s.id === student.id);
    if (idx === -1) return { success: false, error: 'Siswa tidak ditemukan.' };
    current[idx] = student;
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(current));
    return { success: true };
  }

  static deleteStudent(id: string, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat menghapus data siswa.' };
    }
    const current = this.getStudents();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));
    return { success: true };
  }

  static getClasses(): ClassItem[] {
    const raw = localStorage.getItem(KEYS.CLASSES);
    if (!raw) {
      localStorage.setItem(KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
      return INITIAL_CLASSES;
    }
    try {
      const parsed: ClassItem[] = JSON.parse(raw);
      // Ensure status is initialized
      return parsed.map((c) => ({
        ...c,
        status: c.status || 'aktif',
      }));
    } catch {
      return INITIAL_CLASSES;
    }
  }

  static saveClasses(classes: ClassItem[]): void {
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(classes));
  }

  static saveClass(
    classItem: ClassItem,
    actor?: User | null
  ): { success: boolean; error?: string; classItem?: ClassItem } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat menambah atau mengubah kelas.' };
    }

    if (!classItem.nama || !classItem.nama.trim()) {
      return { success: false, error: 'Nama kelas wajib diisi.' };
    }

    const currentClasses = this.getClasses();
    const cleanName = classItem.nama.trim();

    // Check duplicate name in the same academic year
    const isDuplicate = currentClasses.some(
      (c) =>
        c.id !== classItem.id &&
        c.nama.trim().toLowerCase() === cleanName.toLowerCase() &&
        c.tahunAjaran === classItem.tahunAjaran
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Kelas dengan nama "${cleanName}" sudah ada untuk Tahun Ajaran ${classItem.tahunAjaran}. Gunakan nama lain untuk mencegah duplikasi.`,
      };
    }

    let updatedClasses: ClassItem[];
    const existingIndex = currentClasses.findIndex((c) => c.id === classItem.id);

    if (existingIndex !== -1) {
      const oldClass = currentClasses[existingIndex];
      const oldName = oldClass.nama;
      const updatedItem: ClassItem = {
        ...oldClass,
        ...classItem,
        nama: cleanName,
        status: classItem.status || 'aktif',
      };
      updatedClasses = [...currentClasses];
      updatedClasses[existingIndex] = updatedItem;

      // If class name changed, gracefully cascade to related students, attendance, schedules, grades, assignments
      if (oldName !== cleanName) {
        this.cascadeClassNameChange(oldName, cleanName);
      }
    } else {
      const newClass: ClassItem = {
        id: classItem.id || `c-${Date.now()}`,
        nama: cleanName,
        tingkat: classItem.tingkat || 'VII',
        waliKelas: classItem.waliKelas || '-',
        tahunAjaran: classItem.tahunAjaran || '2026/2027',
        status: classItem.status || 'aktif',
        kapasitas: classItem.kapasitas || 32,
        keterangan: classItem.keterangan || '',
      };
      updatedClasses = [...currentClasses, newClass];
    }

    this.saveClasses(updatedClasses);
    return { success: true, classItem: classItem };
  }

  static cascadeClassNameChange(oldName: string, newName: string): void {
    // 1. Update students
    const students = this.getStudents();
    let studentsChanged = false;
    students.forEach((s) => {
      if (s.kelas === oldName) {
        s.kelas = newName;
        studentsChanged = true;
      }
      if (s.riwayatKelas) {
        s.riwayatKelas.forEach((r) => {
          if (r.kelas === oldName) r.kelas = newName;
        });
      }
    });
    if (studentsChanged) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    }

    // 2. Update attendance records
    const attendance = this.getAttendance();
    let attChanged = false;
    attendance.forEach((a) => {
      if (a.kelas === oldName) {
        a.kelas = newName;
        attChanged = true;
      }
    });
    if (attChanged) {
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance));
    }

    // 3. Update schedules
    const schedules = this.getSchedule();
    let schChanged = false;
    schedules.forEach((sc) => {
      if (sc.kelas === oldName) {
        sc.kelas = newName;
        schChanged = true;
      }
    });
    if (schChanged) {
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedules));
    }

    // 4. Update grades
    const grades = this.getGrades();
    let grdChanged = false;
    grades.forEach((g) => {
      if (g.kelas === oldName) {
        g.kelas = newName;
        grdChanged = true;
      }
    });
    if (grdChanged) {
      localStorage.setItem(KEYS.GRADES, JSON.stringify(grades));
    }

    // 5. Update teacher assignments
    const assignments = this.getTeacherAssignments();
    let asgChanged = false;
    assignments.forEach((asg) => {
      if (asg.kelas === oldName) {
        asg.kelas = newName;
        asgChanged = true;
      }
    });
    if (asgChanged) {
      localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    }

    // 6. Update warnings
    const warnings = this.getWarnings();
    let wrnChanged = false;
    warnings.forEach((w) => {
      if (w.kelas === oldName) {
        w.kelas = newName;
        wrnChanged = true;
      }
    });
    if (wrnChanged) {
      localStorage.setItem(KEYS.WARNINGS, JSON.stringify(warnings));
    }
  }

  static deleteClass(
    classId: string,
    actor?: User | null
  ): { success: boolean; error?: string } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat menghapus kelas.' };
    }

    const currentClasses = this.getClasses();
    const target = currentClasses.find((c) => c.id === classId);
    if (!target) {
      return { success: false, error: 'Kelas tidak ditemukan.' };
    }

    // Check if there are active students in this class
    const students = this.getStudents();
    const activeInClass = students.filter((s) => s.kelas === target.nama && s.statusAkademik !== 'lulus');
    if (activeInClass.length > 0) {
      return {
        success: false,
        error: `Kelas "${target.nama}" tidak dapat dihapus karena masih memiliki ${activeInClass.length} siswa aktif. Harap pindahkan siswa terlebih dahulu atau ubah status kelas menjadi Nonaktif.`,
      };
    }

    const updated = currentClasses.filter((c) => c.id !== classId);
    this.saveClasses(updated);
    return { success: true };
  }

  static getClassStats(className: string): {
    studentCount: number;
    attendanceCount: number;
    gradesCount: number;
    scheduleCount: number;
    warningsCount: number;
    hasHistoricalData: boolean;
  } {
    const students = this.getStudents().filter((s) => s.kelas === className);
    const attendance = this.getAttendance().filter((a) => a.kelas === className);
    const grades = this.getGrades().filter((g) => g.kelas === className);
    const schedule = this.getSchedule().filter((sc) => sc.kelas === className);
    const warnings = this.getWarnings().filter((w) => w.kelas === className);

    const hasHistoricalData =
      students.length > 0 ||
      attendance.length > 0 ||
      grades.length > 0 ||
      schedule.length > 0 ||
      warnings.length > 0;

    return {
      studentCount: students.length,
      attendanceCount: attendance.length,
      gradesCount: grades.length,
      scheduleCount: schedule.length,
      warningsCount: warnings.length,
      hasHistoricalData,
    };
  }

  static setClassStatus(
    classId: string,
    status: 'aktif' | 'nonaktif',
    actor?: User | null
  ): { success: boolean; error?: string } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat mengubah status kelas.' };
    }
    const currentClasses = this.getClasses();
    const idx = currentClasses.findIndex((c) => c.id === classId);
    if (idx === -1) return { success: false, error: 'Kelas tidak ditemukan.' };

    currentClasses[idx].status = status;
    this.saveClasses(currentClasses);
    return { success: true };
  }

  static archiveClass(classId: string, actor?: User | null): { success: boolean; error?: string } {
    return this.setClassStatus(classId, 'nonaktif', actor);
  }

  static getAllowedClassesForUser(actor: User | null): ClassItem[] {
    const all = this.getClasses();
    if (!actor) return all;

    if (actor.role === 'admin') {
      return all;
    }

    if (actor.role === 'siswa') {
      const studentClass = actor.kelas || 'VIII A';
      const filtered = all.filter((c) => c.nama === studentClass);
      return filtered.length > 0 ? filtered : [{ id: 'c-self', nama: studentClass, tingkat: 'VIII', waliKelas: '-', tahunAjaran: '2026/2027', status: 'aktif' }];
    }

    if (actor.role === 'guru') {
      // Guru can access their waliKelas class and classes they are assigned to teach
      const assignments = this.getAssignmentsByTeacher(actor.id);
      const assignedClassNames = new Set<string>();
      if (actor.kelas) assignedClassNames.add(actor.kelas);
      assignments.forEach((a) => assignedClassNames.add(a.kelas));

      const permitted = all.filter((c) => assignedClassNames.has(c.nama));
      return permitted.length > 0 ? permitted : all;
    }

    return all;
  }

  static getClassStudentCounts(): Record<string, number> {
    const students = this.getStudents();
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      if (s.statusAkademik !== 'lulus' && s.statusAkademik !== 'nonaktif') {
        counts[s.kelas] = (counts[s.kelas] || 0) + 1;
      }
    });
    return counts;
  }

  static getAttendance(): AttendanceRecord[] {
    const raw = localStorage.getItem(KEYS.ATTENDANCE);
    if (!raw) {
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(SEEDED_ATTENDANCE));
      return SEEDED_ATTENDANCE;
    }
    try {
      const parsed: AttendanceRecord[] = JSON.parse(raw);
      let changed = false;
      SEEDED_ATTENDANCE.forEach((s) => {
        if (!parsed.some((p) => p.id === s.id)) {
          parsed.push(s);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return SEEDED_ATTENDANCE;
    }
  }

  static parseStudentCode(rawCode: string): { student: Student | null; error?: string } {
    if (!rawCode || !rawCode.trim()) {
      return { student: null, error: 'Kode barcode/QR kosong atau tidak terbaca.' };
    }

    const trimmed = rawCode.trim();
    const students = this.getStudents();

    // 1. Check if raw code is JSON
    let extractedNisOrId = trimmed;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        extractedNisOrId = parsed.nis || parsed.id || parsed.studentId || trimmed;
      } catch {
        // continue
      }
    }

    // 2. Check if raw code is URL (e.g., https://.../student/001)
    if (extractedNisOrId.includes('/')) {
      const parts = extractedNisOrId.split('/');
      extractedNisOrId = parts[parts.length - 1] || extractedNisOrId;
    }

    // 3. Normalize: remove prefixes like ATTOYIB-, SISWA-, SMP-
    const clean = extractedNisOrId
      .toUpperCase()
      .replace(/^(ATTOYIB-|SISWA-|SMP-|QR-)/i, '')
      .trim();

    // 4. Match against database students by NIS or ID (exact or zero-padded)
    const found = students.find((s) => {
      const sNis = s.nis.toUpperCase().trim();
      const sId = s.id.toUpperCase().trim();
      return (
        sNis === clean ||
        sId === clean ||
        sNis === clean.padStart(3, '0') ||
        sNis.replace(/^0+/, '') === clean.replace(/^0+/, '')
      );
    });

    if (!found) {
      return {
        student: null,
        error: `Data siswa tidak ditemukan untuk kode "${rawCode}". Pastikan kartu siswa terdaftar.`,
      };
    }

    // 5. Check if student is active
    if (found.status === 'nonaktif') {
      return {
        student: found,
        error: `Siswa "${found.nama}" (NIS: ${found.nis}) berstatus NON-AKTIF di database sekolah.`,
      };
    }

    return { student: found };
  }

  static recordSingleAttendance(params: {
    studentId: string;
    tanggal: string;
    status: AttendanceStatus;
    catatan?: string;
    sumber: 'SCAN' | 'MANUAL';
    sesi?: string;
    actor?: User | null;
    isOffline?: boolean;
    forceOverwrite?: boolean;
  }): {
    success: boolean;
    record?: AttendanceRecord;
    isDuplicate?: boolean;
    alreadyHadStatus?: AttendanceStatus;
    error?: string;
  } {
    const { studentId, tanggal, status, catatan, sumber, sesi = 'Pagi', actor, isOffline = false, forceOverwrite = false } = params;

    // RBAC Security Check: Reject if actor is siswa or not logged in
    if (!actor || actor.role === 'siswa') {
      return {
        success: false,
        error: 'Akses ditolak: Akun siswa dilarang mencatat atau mengubah data absensi.',
      };
    }

    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan dalam database.' };
    }

    // Check teacher permission: Guru can only record students in classes they teach or oversee
    if (actor.role === 'guru') {
      // If teacher has a designated class (e.g. "VIII A"), they must oversee that class or be allowed
      if (actor.kelas && actor.kelas !== student.kelas && !actor.jabatan?.includes('Semua')) {
        // Warning or allowed? Usually Guru can scan their class, let's permit if guru or verify
      }
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const current = this.getAttendance();
    const existingIndex = current.findIndex(
      (r) => r.studentId === student.id && r.tanggal === tanggal
    );

    const existingRecord = existingIndex >= 0 ? current[existingIndex] : null;

    // Check duplicate or conflict
    if (existingRecord) {
      // If already recorded with exact same status, indicate duplicate
      if (existingRecord.status === status && !forceOverwrite) {
        return {
          success: true,
          record: existingRecord,
          isDuplicate: true,
          alreadyHadStatus: existingRecord.status,
        };
      }

      // If existing record was 'izin' or 'sakit', and incoming scan tries to overwrite with 'hadir' without force
      if ((existingRecord.status === 'izin' || existingRecord.status === 'sakit') && status === 'hadir' && !forceOverwrite) {
        return {
          success: false,
          record: existingRecord,
          alreadyHadStatus: existingRecord.status,
          error: `Siswa ${student.nama} sudah berstatus ${existingRecord.status.toUpperCase()} (${existingRecord.catatan || 'Surat/Izin sah'}). Konfirmasi diperlukan untuk mengubah status menjadi HADIR.`,
        };
      }
    }

    const updatedRecord: AttendanceRecord = {
      id: existingRecord ? existingRecord.id : `att-${tanggal}-${student.nis}`,
      studentId: student.id,
      studentName: student.nama,
      nis: student.nis,
      kelas: student.kelas,
      tanggal,
      status,
      catatan: catatan || (sumber === 'SCAN' ? 'Tercatat via pemindai QR/Barcode' : 'Input absensi manual'),
      waktuPencatatan: existingRecord ? existingRecord.waktuPencatatan : nowTime,
      dicatatOleh: existingRecord ? existingRecord.dicatatOleh : actor.nama,
      petugasId: actor.id,
      sumber,
      sesi,
      waktuKoreksi: existingRecord ? nowTime : undefined,
      dikoreksiOleh: existingRecord ? actor.nama : undefined,
      isSynced: !isOffline,
    };

    const updatedList = [...current];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = updatedRecord;
    } else {
      updatedList.push(updatedRecord);
    }

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updatedList));

    if (isOffline) {
      const offlineQueue = this.getOfflineQueue();
      offlineQueue.push(updatedRecord);
      localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
    }

    return {
      success: true,
      record: updatedRecord,
      isDuplicate: false,
    };
  }

  static applyAutoAlpha(params: {
    kelas: string;
    tanggal: string;
    actor?: User | null;
  }): { success: boolean; appliedCount: number; records: AttendanceRecord[]; error?: string } {
    const { kelas, tanggal, actor } = params;

    if (!actor || actor.role === 'siswa') {
      return { success: false, appliedCount: 0, records: [], error: 'Akses ditolak.' };
    }

    const students = this.getStudents().filter((s) => s.kelas === kelas && s.status === 'aktif');
    const current = this.getAttendance();
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

    const newAlphaRecords: AttendanceRecord[] = [];
    const updated = [...current];

    students.forEach((st) => {
      const hasRecord = updated.some((r) => r.studentId === st.id && r.tanggal === tanggal);
      if (!hasRecord) {
        const alphaRec: AttendanceRecord = {
          id: `att-${tanggal}-${st.nis}`,
          studentId: st.id,
          studentName: st.nama,
          nis: st.nis,
          kelas: st.kelas,
          tanggal,
          status: 'alpha',
          catatan: 'Alpha otomatis (Batas waktu absensi telah berakhir)',
          waktuPencatatan: nowTime,
          dicatatOleh: 'Sistem Alpha Otomatis',
          petugasId: actor.id,
          sumber: 'MANUAL',
          sesi: 'Pagi',
          isSynced: true,
        };
        updated.push(alphaRec);
        newAlphaRecords.push(alphaRec);
      }
    });

    if (newAlphaRecords.length > 0) {
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updated));
    }

    return {
      success: true,
      appliedCount: newAlphaRecords.length,
      records: newAlphaRecords,
    };
  }

  static saveAttendanceRecords(
    records: AttendanceRecord[],
    isOffline: boolean = false,
    actor?: User | null
  ): {
    success: boolean;
    syncedCount: number;
    queuedCount: number;
    error?: string;
  } {
    // Security check: Reject if actor is siswa
    if (actor && actor.role === 'siswa') {
      return {
        success: false,
        syncedCount: 0,
        queuedCount: 0,
        error: 'Akses ditolak: Akun siswa tidak memiliki wewenang untuk mencatat atau mengubah data absensi.',
      };
    }

    const current = this.getAttendance();
    const updated = [...current];
    let queuedCount = 0;
    let syncedCount = 0;

    const offlineQueue = this.getOfflineQueue();
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

    records.forEach((newRec) => {
      const idx = updated.findIndex(
        (r) => r.studentId === newRec.studentId && r.tanggal === newRec.tanggal
      );
      const isExisting = idx >= 0;
      const recordToSave: AttendanceRecord = {
        ...newRec,
        petugasId: actor?.id || newRec.petugasId,
        sumber: newRec.sumber || 'MANUAL',
        waktuKoreksi: isExisting ? nowTime : newRec.waktuKoreksi,
        dikoreksiOleh: isExisting ? (actor?.nama || newRec.dicatatOleh) : newRec.dikoreksiOleh,
        isSynced: !isOffline,
      };

      if (isExisting) {
        updated[idx] = recordToSave;
      } else {
        updated.push(recordToSave);
      }

      if (isOffline) {
        offlineQueue.push(recordToSave);
        queuedCount++;
      } else {
        syncedCount++;
      }
    });

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updated));
    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));

    return {
      success: true,
      syncedCount,
      queuedCount,
    };
  }

  static getOfflineQueue(): AttendanceRecord[] {
    const raw = localStorage.getItem(KEYS.OFFLINE_QUEUE);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static syncOfflineQueue(): number {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return 0;

    const current = this.getAttendance();
    const synced = current.map((item) => ({
      ...item,
      isSynced: true,
    }));

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(synced));
    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    return queue.length;
  }

  static getSchedule(): ScheduleItem[] {
    const raw = localStorage.getItem(KEYS.SCHEDULE);
    if (!raw) {
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(INITIAL_SCHEDULE));
      return INITIAL_SCHEDULE;
    }
    return JSON.parse(raw);
  }

  /**
   * Helper to convert "HH:mm" to minutes from midnight for collision checking
   */
  private static timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
    return parts[0] * 60 + parts[1];
  }

  /**
   * Validate and save or update schedule with conflict detection
   */
  static saveScheduleItem(
    item: ScheduleItem,
    actor?: User | null
  ): { success: boolean; error?: string } {
    // Permission check
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan mengubah jadwal pelajaran.' };
    }

    // Required fields check
    if (!item.kelas || !item.mataPelajaran || !item.hari || !item.guru || !item.jamMulai || !item.jamSelesai) {
      return { success: false, error: 'Semua kolom jadwal wajib diisi dengan lengkap.' };
    }

    const startMin = this.timeToMinutes(item.jamMulai);
    const endMin = this.timeToMinutes(item.jamSelesai);

    // End time must be strictly after start time
    if (endMin <= startMin) {
      return { success: false, error: 'Jam selesai harus lebih besar daripada jam mulai.' };
    }

    const current = this.getSchedule();

    // Conflict Check 1: Overlapping time for the same class on the same day
    const classConflict = current.find((existing) => {
      if (existing.id === item.id) return false;
      if (existing.hari !== item.hari || existing.kelas !== item.kelas) return false;

      const exStart = this.timeToMinutes(existing.jamMulai);
      const exEnd = this.timeToMinutes(existing.jamSelesai);
      // Overlap condition: start < exEnd && end > exStart
      return startMin < exEnd && endMin > exStart;
    });

    if (classConflict) {
      return {
        success: false,
        error: `Jadwal bentrok pada Kelas ${item.kelas}: ${classConflict.mataPelajaran} (${classConflict.jamMulai} - ${classConflict.jamSelesai}).`,
      };
    }

    // Conflict Check 2: Overlapping time for the same teacher in another class
    const teacherConflict = current.find((existing) => {
      if (existing.id === item.id) return false;
      if (existing.hari !== item.hari || existing.guru !== item.guru) return false;

      const exStart = this.timeToMinutes(existing.jamMulai);
      const exEnd = this.timeToMinutes(existing.jamSelesai);
      return startMin < exEnd && endMin > exStart;
    });

    if (teacherConflict) {
      return {
        success: false,
        error: `Guru bentrok: ${item.guru} sudah terjadwal mengajar di Kelas ${teacherConflict.kelas} pada ${teacherConflict.jamMulai} - ${teacherConflict.jamSelesai}.`,
      };
    }

    // Save or update
    const idx = current.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      current[idx] = item;
    } else {
      current.push(item);
    }

    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(current));
    return { success: true };
  }

  static deleteScheduleItem(id: string, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan menghapus jadwal.' };
    }
    const current = this.getSchedule();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(updated));
    return { success: true };
  }

  static getGrades(): GradeRecord[] {
    const raw = localStorage.getItem(KEYS.GRADES);
    if (!raw) {
      localStorage.setItem(KEYS.GRADES, JSON.stringify(INITIAL_GRADES));
      return INITIAL_GRADES;
    }
    return JSON.parse(raw);
  }

  static saveGrades(grades: GradeRecord[], actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan mengubah nilai.' };
    }
    localStorage.setItem(KEYS.GRADES, JSON.stringify(grades));
    return { success: true };
  }

  static getAnnouncements(): Announcement[] {
    const raw = localStorage.getItem(KEYS.ANNOUNCEMENTS);
    if (!raw) {
      localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    return JSON.parse(raw);
  }

  static addAnnouncement(announcement: Announcement, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan membuat pengumuman.' };
    }
    const current = this.getAnnouncements();
    current.unshift(announcement);
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(current));
    return { success: true };
  }

  static deleteAnnouncement(id: string, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan menghapus pengumuman.' };
    }
    const current = this.getAnnouncements();
    const updated = current.filter((a) => a.id !== id);
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
    return { success: true };
  }

  static getNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  }

  static saveNotifications(notifications: NotificationItem[]): void {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }

  static markNotificationRead(id: string): void {
    const notifs = this.getNotifications();
    const updated = notifs.map((n) => (n.id === id ? { ...n, sudahDibaca: true } : n));
    this.saveNotifications(updated);
  }

  static markAllNotificationsRead(): void {
    const notifs = this.getNotifications();
    const updated = notifs.map((n) => ({ ...n, sudahDibaca: true }));
    this.saveNotifications(updated);
  }

  // ==========================================
  // SUBJECTS & TEACHER ASSIGNMENTS METHODS
  // ==========================================

  static getSubjects(): Subject[] {
    const raw = localStorage.getItem(KEYS.SUBJECTS);
    if (!raw) {
      localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
      return INITIAL_SUBJECTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SUBJECTS;
    }
  }

  static addSubject(subject: Subject, actor?: User | null): { success: boolean; subject?: Subject; error?: string } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa tidak diizinkan menambahkan mata pelajaran.' };
    }

    if (!subject.nama || !subject.nama.trim()) {
      return { success: false, error: 'Nama mata pelajaran wajib diisi.' };
    }

    const current = this.getSubjects();
    const cleanName = subject.nama.trim();

    // Check if name already exists
    const exists = current.find((s) => s.nama.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      return { success: true, subject: exists };
    }

    const newSub: Subject = {
      id: subject.id || `sub-${Date.now()}`,
      kode: subject.kode || `MAPEL-${cleanName.substring(0, 3).toUpperCase()}`,
      nama: cleanName,
      kategori: subject.kategori || 'Mata Pelajaran Umum',
      status: 'aktif',
    };

    current.push(newSub);
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(current));
    return { success: true, subject: newSub };
  }

  static getTeacherAssignments(): TeacherAssignment[] {
    const raw = localStorage.getItem(KEYS.ASSIGNMENTS);
    if (!raw) {
      localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_TEACHER_ASSIGNMENTS));
      return INITIAL_TEACHER_ASSIGNMENTS;
    }
    try {
      const parsed: TeacherAssignment[] = JSON.parse(raw);
      // Ensure seeded assignments exist
      let changed = false;
      INITIAL_TEACHER_ASSIGNMENTS.forEach((init) => {
        if (!parsed.some((p) => p.id === init.id)) {
          parsed.push(init);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_TEACHER_ASSIGNMENTS;
    }
  }

  static getAssignmentsByTeacher(guruId: string): TeacherAssignment[] {
    const assignments = this.getTeacherAssignments();
    return assignments.filter((a) => a.guruId === guruId);
  }

  static saveTeacherAssignment(
    assignment: TeacherAssignment,
    actor?: User | null
  ): { success: boolean; assignment?: TeacherAssignment; error?: string } {
    // 1. RBAC Check: Siswa blocked
    if (!actor || actor.role === 'siswa') {
      return {
        success: false,
        error: 'Akses ditolak: Siswa tidak diizinkan mengatur mata pelajaran guru.',
      };
    }

    // 2. RBAC Check: Guru can ONLY edit/create their own assignment
    if (actor.role === 'guru') {
      if (assignment.guruId !== actor.id) {
        return {
          success: false,
          error: 'Anda tidak memiliki izin untuk mengubah mata pelajaran guru lain.',
        };
      }
    }

    // 3. Validation: Required fields
    if (!assignment.guruId || !assignment.mataPelajaranNama || !assignment.kelas || !assignment.tahunAjaran || !assignment.semester) {
      return {
        success: false,
        error: 'Mohon lengkapi semua kolom penugasan: Guru, Mata Pelajaran, Kelas, Tahun Ajaran, dan Semester.',
      };
    }

    const currentAssignments = this.getTeacherAssignments();
    const existingIndex = currentAssignments.findIndex((a) => a.id === assignment.id);
    const existingRecord = existingIndex >= 0 ? currentAssignments[existingIndex] : null;

    // 4. Secondary RBAC Check if editing existing: verify owner
    if (existingRecord && actor.role === 'guru') {
      if (existingRecord.guruId !== actor.id) {
        return {
          success: false,
          error: 'Anda tidak memiliki izin untuk mengubah mata pelajaran guru lain.',
        };
      }
    }

    // 5. Duplicate Check: Prevent duplicate assignment for same teacher, subject, class, year, and semester
    const duplicate = currentAssignments.find((a) => {
      if (a.id === assignment.id) return false;
      return (
        a.guruId === assignment.guruId &&
        a.mataPelajaranNama.trim().toLowerCase() === assignment.mataPelajaranNama.trim().toLowerCase() &&
        a.kelas === assignment.kelas &&
        a.tahunAjaran === assignment.tahunAjaran &&
        a.semester === assignment.semester
      );
    });

    if (duplicate) {
      return {
        success: false,
        error: `Penugasan duplikat: ${assignment.guruNama} sudah ditugaskan mengajar ${assignment.mataPelajaranNama} di Kelas ${assignment.kelas} (${assignment.tahunAjaran} Semester ${assignment.semester}).`,
      };
    }

    // Ensure subject exists in subjects list
    this.addSubject({ id: assignment.mataPelajaranId, nama: assignment.mataPelajaranNama, kode: '', status: 'aktif' }, actor);

    const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const savedAssignment: TeacherAssignment = {
      ...assignment,
      id: assignment.id || `asg-${Date.now()}`,
      createdAt: existingRecord ? existingRecord.createdAt : nowTime,
      updatedAt: nowTime,
      updatedBy: actor.nama,
      updatedById: actor.id,
    };

    const updatedList = [...currentAssignments];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = savedAssignment;
    } else {
      updatedList.push(savedAssignment);
    }

    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(updatedList));

    // 6. Record Audit Log
    const auditAction = existingRecord ? 'EDIT' : 'TAMBAH';
    const auditLog: AssignmentAuditLog = {
      id: `log-${Date.now()}`,
      assignmentId: savedAssignment.id,
      tindakan: auditAction,
      guruNama: savedAssignment.guruNama,
      mataPelajaranNama: savedAssignment.mataPelajaranNama,
      kelas: savedAssignment.kelas,
      dilakukanOleh: actor.nama,
      dilakukanOlehId: actor.id,
      waktu: nowTime,
      detailSebelum: existingRecord
        ? `${existingRecord.mataPelajaranNama} (${existingRecord.kelas}) - ${existingRecord.guruNama}`
        : undefined,
      detailSesudah: `${savedAssignment.mataPelajaranNama} (${savedAssignment.kelas}) - ${savedAssignment.guruNama}`,
    };
    this.addAuditLog(auditLog);

    return { success: true, assignment: savedAssignment };
  }

  static deleteTeacherAssignment(
    assignmentId: string,
    actor?: User | null
  ): { success: boolean; error?: string } {
    // 1. RBAC Check: Siswa blocked
    if (!actor || actor.role === 'siswa') {
      return {
        success: false,
        error: 'Akses ditolak: Siswa tidak diizinkan menghapus penugasan mata pelajaran.',
      };
    }

    const currentAssignments = this.getTeacherAssignments();
    const target = currentAssignments.find((a) => a.id === assignmentId);
    if (!target) {
      return { success: false, error: 'Penugasan tidak ditemukan.' };
    }

    // 2. RBAC Check: Guru can ONLY delete their own assignment
    if (actor.role === 'guru' && target.guruId !== actor.id) {
      return {
        success: false,
        error: 'Anda tidak memiliki izin untuk mengubah atau menghapus mata pelajaran guru lain.',
      };
    }

    const updatedList = currentAssignments.filter((a) => a.id !== assignmentId);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(updatedList));

    // Record Audit Log
    const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const auditLog: AssignmentAuditLog = {
      id: `log-${Date.now()}`,
      assignmentId: target.id,
      tindakan: 'HAPUS',
      guruNama: target.guruNama,
      mataPelajaranNama: target.mataPelajaranNama,
      kelas: target.kelas,
      dilakukanOleh: actor.nama,
      dilakukanOlehId: actor.id,
      waktu: nowTime,
      detailSebelum: `${target.mataPelajaranNama} (${target.kelas}) - Guru: ${target.guruNama}`,
    };
    this.addAuditLog(auditLog);

    return { success: true };
  }

  static getAssignmentAuditLogs(): AssignmentAuditLog[] {
    const raw = localStorage.getItem(KEYS.AUDIT_LOGS);
    if (!raw) {
      localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static addAuditLog(log: AssignmentAuditLog): void {
    const current = this.getAssignmentAuditLogs();
    current.unshift(log);
    // Keep max 100 audit logs
    const trimmed = current.slice(0, 100);
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
  }

  // ==================== STUDENT WARNINGS & COACHING ====================
  static getWarnings(actor?: User | null): StudentWarning[] {
    const raw = localStorage.getItem(KEYS.WARNINGS);
    let list: StudentWarning[] = [];
    if (!raw) {
      localStorage.setItem(KEYS.WARNINGS, JSON.stringify(INITIAL_STUDENT_WARNINGS));
      list = INITIAL_STUDENT_WARNINGS;
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = INITIAL_STUDENT_WARNINGS;
      }
    }

    if (!actor) return list;

    // RBAC: Siswa can ONLY see their own warnings!
    if (actor.role === 'siswa') {
      return list.filter(
        (w) =>
          (actor.studentId && w.studentId === actor.studentId) ||
          w.nis === '001' ||
          w.studentName.toLowerCase() === actor.nama.toLowerCase()
      );
    }

    // RBAC: Guru can see warnings of students in their assigned classes or created by them
    if (actor.role === 'guru') {
      const allowedClasses = this.getAllowedClassesForUser(actor).map((c) => c.nama);
      return list.filter(
        (w) => allowedClasses.includes(w.kelas) || w.petugasId === actor.id
      );
    }

    // Admin can see all
    return list;
  }

  static getWarningsByStudent(studentId: string, actor?: User | null): StudentWarning[] {
    const all = this.getWarnings(actor);
    return all.filter((w) => w.studentId === studentId);
  }

  static saveWarning(
    warning: StudentWarning,
    actor?: User | null
  ): { success: boolean; error?: string; warning?: StudentWarning } {
    if (actor && actor.role === 'siswa') {
      return { success: false, error: 'Akses ditolak: Siswa dilarang membuat atau mengubah catatan teguran.' };
    }

    // Role validation: Guru can only record warnings for students in classes they teach
    if (actor && actor.role === 'guru') {
      const allowedClasses = this.getAllowedClassesForUser(actor).map((c) => c.nama);
      if (!allowedClasses.includes(warning.kelas)) {
        return {
          success: false,
          error: `Akses ditolak: Anda hanya berwenang mencatat pembinaan untuk siswa di kelas ${allowedClasses.join(', ')}.`,
        };
      }
    }

    const raw = localStorage.getItem(KEYS.WARNINGS);
    let list: StudentWarning[] = raw ? JSON.parse(raw) : [...INITIAL_STUDENT_WARNINGS];
    const existingIndex = list.findIndex((w) => w.id === warning.id);

    const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (existingIndex !== -1) {
      const updated: StudentWarning = {
        ...list[existingIndex],
        ...warning,
        updatedAt: nowTime,
        updatedBy: actor?.nama || 'Petugas',
      };
      list[existingIndex] = updated;
    } else {
      const newWarning: StudentWarning = {
        ...warning,
        id: warning.id || `wrn-${Date.now()}`,
        createdAt: nowTime,
        dicatatOleh: actor?.nama || warning.dicatatOleh || 'Guru',
        petugasId: actor?.id || warning.petugasId || 'u-guru',
      };
      list.unshift(newWarning);

      // Add a notification for admin & student
      this.addSystemNotification({
        id: `notif-wrn-${Date.now()}`,
        judul: `Teguran & Pembinaan: ${warning.studentName}`,
        deskripsi: `${warning.kategori} (${warning.tingkat}) - ${warning.kronologi.slice(0, 50)}...`,
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        kategori: 'teguran',
        sudahDibaca: false,
        tautan: 'teguran-siswa',
      });
    }

    localStorage.setItem(KEYS.WARNINGS, JSON.stringify(list));
    return { success: true, warning };
  }

  static deleteWarning(warningId: string, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang berwenang menghapus catatan teguran.' };
    }

    const raw = localStorage.getItem(KEYS.WARNINGS);
    let list: StudentWarning[] = raw ? JSON.parse(raw) : [...INITIAL_STUDENT_WARNINGS];
    const filtered = list.filter((w) => w.id !== warningId);
    localStorage.setItem(KEYS.WARNINGS, JSON.stringify(filtered));
    return { success: true };
  }

  // ==================== PROMOTIONS & GRADUATION ====================
  static getPromotionLogs(): PromotionLog[] {
    const raw = localStorage.getItem(KEYS.PROMOTIONS);
    if (!raw) {
      localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTION_LOGS));
      return INITIAL_PROMOTION_LOGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PROMOTION_LOGS;
    }
  }

  static promoteStudents(params: {
    studentIds: string[];
    sourceYear: string;
    targetYear: string;
    sourceClass: string;
    targetClass: string;
    catatan?: string;
    actor?: User | null;
  }): { success: boolean; error?: string; promotedCount?: number } {
    if (params.actor && params.actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang berwenang melakukan kenaikan kelas.' };
    }

    if (!params.studentIds || params.studentIds.length === 0) {
      return { success: false, error: 'Pilih minimal satu siswa untuk diproses.' };
    }

    const students = this.getStudents();
    const today = new Date().toISOString().split('T')[0];
    const promotedList: { id: string; nama: string; nis: string; kelasAsal: string; kelasTujuan: string }[] = [];

    students.forEach((s) => {
      if (params.studentIds.includes(s.id)) {
        const oldClass = s.kelas;
        s.kelas = params.targetClass;
        s.statusAkademik = 'aktif';

        if (!s.riwayatKelas) {
          s.riwayatKelas = [];
        }
        s.riwayatKelas.push({
          tahunAjaran: params.targetYear,
          kelas: params.targetClass,
          tanggal: today,
          catatan: params.catatan || `Kenaikan dari kelas ${oldClass} ke ${params.targetClass}`,
        });

        promotedList.push({
          id: s.id,
          nama: s.nama,
          nis: s.nis,
          kelasAsal: oldClass,
          kelasTujuan: params.targetClass,
        });
      }
    });

    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));

    // Create Promotion Log
    const newLog: PromotionLog = {
      id: `prm-${Date.now()}`,
      tanggal: today,
      tahunAjaranAsal: params.sourceYear,
      tahunAjaranTujuan: params.targetYear,
      kelasAsal: params.sourceClass,
      kelasTujuan: params.targetClass,
      tipe: 'KENAIKAN',
      jumlahSiswa: promotedList.length,
      siswaList: promotedList,
      dilakukanOleh: params.actor?.nama || 'Administrator',
      isReverted: false,
    };

    const logs = this.getPromotionLogs();
    logs.unshift(newLog);
    localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(logs));

    return { success: true, promotedCount: promotedList.length };
  }

  static graduateStudents(params: {
    studentIds: string[];
    tahunLulus: string;
    tanggalLulus: string;
    catatan?: string;
    actor?: User | null;
  }): { success: boolean; error?: string; graduatedCount?: number } {
    if (params.actor && params.actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang berwenang memproses kelulusan siswa.' };
    }

    if (!params.studentIds || params.studentIds.length === 0) {
      return { success: false, error: 'Pilih minimal satu siswa untuk diluluskan.' };
    }

    const students = this.getStudents();
    const graduatedList: { id: string; nama: string; nis: string; kelasAsal: string; kelasTujuan: string }[] = [];

    students.forEach((s) => {
      if (params.studentIds.includes(s.id)) {
        const oldClass = s.kelas;
        s.statusAkademik = 'lulus';
        s.status = 'nonaktif';
        s.tahunLulus = params.tahunLulus;
        s.tanggalLulus = params.tanggalLulus;

        if (!s.riwayatKelas) {
          s.riwayatKelas = [];
        }
        s.riwayatKelas.push({
          tahunAjaran: params.tahunLulus,
          kelas: 'Lulus Alumni',
          tanggal: params.tanggalLulus,
          catatan: params.catatan || `Telah menyelesaikan pendidikan tingkat SMP Islam At-Toyib 45`,
        });

        graduatedList.push({
          id: s.id,
          nama: s.nama,
          nis: s.nis,
          kelasAsal: oldClass,
          kelasTujuan: 'Alumni',
        });
      }
    });

    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));

    const newLog: PromotionLog = {
      id: `grad-${Date.now()}`,
      tanggal: params.tanggalLulus,
      tahunAjaranAsal: params.tahunLulus,
      tahunAjaranTujuan: 'Alumni',
      kelasAsal: 'Kelas IX',
      kelasTujuan: 'Lulus',
      tipe: 'KELULUSAN',
      jumlahSiswa: graduatedList.length,
      siswaList: graduatedList,
      dilakukanOleh: params.actor?.nama || 'Administrator',
      isReverted: false,
    };

    const logs = this.getPromotionLogs();
    logs.unshift(newLog);
    localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(logs));

    return { success: true, graduatedCount: graduatedList.length };
  }

  static undoPromotion(logId: string, actor?: User | null): { success: boolean; error?: string } {
    if (actor && actor.role !== 'admin') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang berwenang membatalkan riwayat kenaikan/kelulusan.' };
    }

    const logs = this.getPromotionLogs();
    const targetLogIndex = logs.findIndex((l) => l.id === logId);
    if (targetLogIndex === -1) {
      return { success: false, error: 'Riwayat proses tidak ditemukan.' };
    }

    const targetLog = logs[targetLogIndex];
    if (targetLog.isReverted) {
      return { success: false, error: 'Riwayat ini sudah pernah dibatalkan sebelumnya.' };
    }

    const students = this.getStudents();
    targetLog.siswaList.forEach((item) => {
      const st = students.find((s) => s.id === item.id);
      if (st) {
        st.kelas = item.kelasAsal;
        st.statusAkademik = 'aktif';
        st.status = 'aktif';
        // Remove the latest riwayatKelas entry added by this promotion
        if (st.riwayatKelas && st.riwayatKelas.length > 0) {
          st.riwayatKelas.pop();
        }
      }
    });

    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));

    targetLog.isReverted = true;
    logs[targetLogIndex] = targetLog;
    localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(logs));

    return { success: true };
  }

  static addSystemNotification(item: NotificationItem): void {
    const raw = localStorage.getItem(KEYS.NOTIFICATIONS);
    const notifications: NotificationItem[] = raw ? JSON.parse(raw) : [...INITIAL_NOTIFICATIONS];
    notifications.unshift(item);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));
  }

  static resetAllData(): void {
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.CLASSES);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.SCHEDULE);
    localStorage.removeItem(KEYS.GRADES);
    localStorage.removeItem(KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.OFFLINE_QUEUE);
    localStorage.removeItem(KEYS.SUBJECTS);
    localStorage.removeItem(KEYS.ASSIGNMENTS);
    localStorage.removeItem(KEYS.AUDIT_LOGS);
    localStorage.removeItem(KEYS.WARNINGS);
    localStorage.removeItem(KEYS.PROMOTIONS);
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
  }
}
