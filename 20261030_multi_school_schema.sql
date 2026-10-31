-- =============================================================================
-- SKEMA DATABASE MULTI-SEKOLAH REVISI AUDIT FINAL: APLIKASI ABSENSI SISWA DIGITAL
-- Platform      : Supabase (PostgreSQL 15+)
-- Karakteristik : Composite Foreign Keys, Anti-Privilege Escalation, 
--                 Strict Membership Auth, Google Provider & Verified Email Check, 
--                 Multi-School Explicit Selection, One-Time Claim Enforcement,
--                 Grade 0-100 Validation, Teacher Assignment Enforcement,
--                 RPC-Driven Google Registration (No auth.users DDL Triggers),
--                 Idempotent & Zero Data Loss
-- File          : supabase/migrations/20261030_multi_school_schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABEL UTAMA TENANT (SEKOLAH)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slogan VARCHAR(255) DEFAULT 'Disiplin • Berilmu • Berakhlak Mulia',
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(150),
  website VARCHAR(255),
  logo_url TEXT,
  active_academic_year VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  active_semester VARCHAR(10) NOT NULL DEFAULT 'Ganjil' CHECK (active_semester IN ('Ganjil', 'Genap')),
  entry_time TIME NOT NULL DEFAULT '07:00:00',
  exit_time TIME NOT NULL DEFAULT '14:30:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON public.schools(is_active);

-- =============================================================================
-- 2. TABEL DAFTAR IZIN AKUN GOOGLE (ALLOWLIST / PRA-REGISTRASI ADMIN)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.school_account_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  job_title VARCHAR(150),
  nip VARCHAR(50),
  student_id UUID,
  registered_by UUID,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_allowlist_school_email UNIQUE (school_id, email)
);

-- Penambahan kolom claimed_by jika belum ada dari eksekusi sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'school_account_allowlist' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE public.school_account_allowlist ADD COLUMN claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_allowlist_email_status ON public.school_account_allowlist(email, status);
CREATE INDEX IF NOT EXISTS idx_allowlist_claimed_by ON public.school_account_allowlist(claimed_by);

-- =============================================================================
-- 3. TABEL PROFIL PENGGUNA (PROFILES) & KEANGGOTAAN SEKOLAH (MEMBERSHIPS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT,
  active_school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT,
  username VARCHAR(100) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  google_email VARCHAR(150),
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'guru', 'siswa')),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  photo_url TEXT,
  job_title VARCHAR(150),
  nip VARCHAR(50),
  student_id UUID,
  registered_by UUID,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_profiles_school_id UNIQUE (school_id, id)
);

-- Penambahan kolom active_school_id jika belum ada dari eksekusi sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active_school_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN active_school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_school ON public.profiles(active_school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

-- Tabel Multi-Keanggotaan Sekolah (Sumber Kebenaran Hak Akses Pengguna)
CREATE TABLE IF NOT EXISTS public.user_school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  job_title VARCHAR(150),
  nip VARCHAR(50),
  student_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_school_membership UNIQUE (user_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_lookup ON public.user_school_memberships(user_id, school_id, status);

-- =============================================================================
-- 4. TABEL KELAS (CLASSES) DENGAN COMPOSITE UNIQUE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  name VARCHAR(50) NOT NULL,
  level VARCHAR(20) NOT NULL,
  homeroom_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  capacity INT NOT NULL DEFAULT 32,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_classes_school_id UNIQUE (school_id, id),
  CONSTRAINT uq_classes_school_name_year UNIQUE (school_id, name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);

-- =============================================================================
-- 5. TABEL SISWA (STUDENTS) & RIWAYAT KELAS DENGAN COMPOSITE KEYS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  nis VARCHAR(50) NOT NULL,
  nisn VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  current_class_id UUID NOT NULL,
  gender CHAR(1) NOT NULL CHECK (gender IN ('L', 'P')),
  birth_date DATE,
  address TEXT,
  parent_phone VARCHAR(50),
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  academic_status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (academic_status IN ('aktif', 'lulus', 'pindah', 'nonaktif')),
  graduation_year VARCHAR(20),
  graduation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_students_school_id UNIQUE (school_id, id),
  CONSTRAINT uq_students_school_nis UNIQUE (school_id, nis),
  CONSTRAINT fk_students_class FOREIGN KEY (school_id, current_class_id) 
    REFERENCES public.classes(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, current_class_id);

CREATE TABLE IF NOT EXISTS public.student_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_history_student FOREIGN KEY (school_id, student_id)
    REFERENCES public.students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_history_class FOREIGN KEY (school_id, class_id)
    REFERENCES public.classes(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_class_history_student ON public.student_class_history(student_id);

-- =============================================================================
-- 6. TABEL MATA PELAJARAN (SUBJECTS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subjects_school_id UNIQUE (school_id, id),
  CONSTRAINT uq_subjects_school_code UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON public.subjects(school_id);

-- =============================================================================
-- 7. TABEL PENUGASAN GURU & AUDIT LOG DENGAN COMPOSITE FK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_id UUID NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_assignments_school_id UNIQUE (school_id, id),
  CONSTRAINT uq_assignment_composite UNIQUE (school_id, teacher_id, subject_id, class_id, academic_year, semester),
  CONSTRAINT fk_assignment_teacher FOREIGN KEY (school_id, teacher_id) 
    REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_subject FOREIGN KEY (school_id, subject_id) 
    REFERENCES public.subjects(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_class FOREIGN KEY (school_id, class_id) 
    REFERENCES public.classes(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_assignment_lookup ON public.teacher_assignments(school_id, teacher_id, class_id, subject_id);

CREATE TABLE IF NOT EXISTS public.assignment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  assignment_id UUID,
  action VARCHAR(20) NOT NULL CHECK (action IN ('TAMBAH', 'EDIT', 'HAPUS')),
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  before_details JSONB,
  after_details JSONB,
  CONSTRAINT fk_audit_teacher FOREIGN KEY (school_id, teacher_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_subject FOREIGN KEY (school_id, subject_id) REFERENCES public.subjects(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_actor FOREIGN KEY (school_id, actor_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audit_school_time ON public.assignment_audit_logs(school_id, timestamp DESC);

-- =============================================================================
-- 8. TABEL JADWAL PELAJARAN (SCHEDULES) DENGAN COMPOSITE FK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  day VARCHAR(20) NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_schedules_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_subject FOREIGN KEY (school_id, subject_id) REFERENCES public.subjects(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_teacher FOREIGN KEY (school_id, teacher_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_schedules_class_day ON public.schedules(school_id, class_id, day);

-- =============================================================================
-- 9. TABEL REKAP KEHADIRAN SISWA (ATTENDANCE) DENGAN COMPOSITE FK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alpha')),
  notes TEXT,
  recorded_time TIME NOT NULL,
  recorded_by_id UUID NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('SCAN', 'MANUAL')),
  session VARCHAR(50) DEFAULT 'Pagi',
  correction_time TIMESTAMPTZ,
  corrected_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_school_student_date UNIQUE (school_id, student_id, date),
  CONSTRAINT fk_attendance_student FOREIGN KEY (school_id, student_id) REFERENCES public.students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_recorder FOREIGN KEY (school_id, recorded_by_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_attendance_query ON public.attendance(school_id, class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id, date);

-- =============================================================================
-- 10. TABEL NILAI SISWA (GRADES) DENGAN VALIDASI RANGE 0 - 100
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
  assignment_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (assignment_score >= 0.00 AND assignment_score <= 100.00),
  quiz_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (quiz_score >= 0.00 AND quiz_score <= 100.00),
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (exam_score >= 0.00 AND exam_score <= 100.00),
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (final_score >= 0.00 AND final_score <= 100.00),
  teacher_notes TEXT,
  graded_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_grade_student_subject UNIQUE (school_id, student_id, subject_id, semester, academic_year),
  CONSTRAINT fk_grades_student FOREIGN KEY (school_id, student_id) REFERENCES public.students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_grades_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_grades_subject FOREIGN KEY (school_id, subject_id) REFERENCES public.subjects(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_grades_grader FOREIGN KEY (school_id, graded_by_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

-- Memastikan constraint nilai 0-100 terpasang jika tabel sudah ada sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grades_assignment_range') THEN
    ALTER TABLE public.grades ADD CONSTRAINT chk_grades_assignment_range CHECK (assignment_score BETWEEN 0.00 AND 100.00);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grades_quiz_range') THEN
    ALTER TABLE public.grades ADD CONSTRAINT chk_grades_quiz_range CHECK (quiz_score BETWEEN 0.00 AND 100.00);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grades_exam_range') THEN
    ALTER TABLE public.grades ADD CONSTRAINT chk_grades_exam_range CHECK (exam_score BETWEEN 0.00 AND 100.00);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grades_final_range') THEN
    ALTER TABLE public.grades ADD CONSTRAINT chk_grades_final_range CHECK (final_score BETWEEN 0.00 AND 100.00);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grades_student_subject ON public.grades(student_id, subject_id);

-- =============================================================================
-- 11. TABEL TEGURAN / KEDISIPLINAN SISWA (STUDENT_WARNINGS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.student_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Kedisiplinan', 'Kerapian', 'Ibadah/Keagamaan', 'Akademik', 'Perilaku/Sosial', 'Lainnya')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Ringan', 'Sedang', 'Berat')),
  chronology TEXT NOT NULL,
  coaching_action TEXT NOT NULL,
  notes TEXT,
  recorded_by_id UUID NOT NULL,
  follow_up_status VARCHAR(50) NOT NULL CHECK (follow_up_status IN ('Baru', 'Dalam pembinaan', 'Selesai', 'Perlu tindak lanjut')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_warnings_student FOREIGN KEY (school_id, student_id) REFERENCES public.students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_warnings_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_warnings_recorder FOREIGN KEY (school_id, recorded_by_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_warnings_school_student ON public.student_warnings(school_id, student_id);

-- =============================================================================
-- 12. TABEL LOG KENAIKAN KELAS KOLEKTIF (PROMOTION_LOGS & PROMOTION_LOG_ITEMS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.promotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  source_academic_year VARCHAR(20) NOT NULL,
  target_academic_year VARCHAR(20) NOT NULL,
  source_class_id UUID NOT NULL,
  target_class_id UUID,
  type VARCHAR(20) NOT NULL CHECK (type IN ('KENAIKAN', 'KELULUSAN')),
  total_students INT NOT NULL,
  executed_by_id UUID NOT NULL,
  is_reverted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_promotion_logs_school_id UNIQUE (school_id, id),
  CONSTRAINT fk_promo_source_class FOREIGN KEY (school_id, source_class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_promo_target_class FOREIGN KEY (school_id, target_class_id) REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_promo_executor FOREIGN KEY (school_id, executed_by_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.promotion_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_log_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  source_class_id UUID NOT NULL,
  target_class_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_promo_items_log FOREIGN KEY (school_id, promotion_log_id) 
    REFERENCES public.promotion_logs(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_promo_items_student FOREIGN KEY (school_id, student_id) 
    REFERENCES public.students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_promo_items_source_class FOREIGN KEY (school_id, source_class_id) 
    REFERENCES public.classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_promo_items_target_class FOREIGN KEY (school_id, target_class_id) 
    REFERENCES public.classes(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_promo_items_lookup ON public.promotion_log_items(school_id, promotion_log_id, student_id);

-- =============================================================================
-- 13. TABEL PENGUMUMAN & NOTIFIKASI DENGAN COMPOSITE FK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  author_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Akademik', 'Kegiatan', 'Umum', 'Keagamaan')),
  is_important BOOLEAN NOT NULL DEFAULT false,
  target_role VARCHAR(20) DEFAULT 'ALL' CHECK (target_role IN ('ALL', 'guru', 'siswa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_announcements_author FOREIGN KEY (school_id, author_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  target_role VARCHAR(20),
  link_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. TABEL ANTREAN SINKRONISASI OFFLINE HP (OFFLINE_SYNC_QUEUE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  device_uuid VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'CONFLICT')),
  client_timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  conflict_reason TEXT,
  CONSTRAINT fk_queue_user FOREIGN KEY (school_id, user_id) REFERENCES public.profiles(school_id, id) ON DELETE RESTRICT
);

-- =============================================================================
-- 15. FUNGSI PEMBANTU OTORISASI (SCHEMA PUBLIC + SECURITY DEFINER + SEARCH PATH)
-- =============================================================================

-- Mengambil ID sekolah aktif yang TERVERIFIKASI memiliki membership aktif
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID AS $$
DECLARE
  v_school_id UUID;
  v_role VARCHAR;
BEGIN
  SELECT active_school_id, role INTO v_school_id, v_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Super admin dapat beroperasi pada sekolah aktif yang dipilihnya
  IF v_role = 'super_admin' THEN
    RETURN v_school_id;
  END IF;

  -- Pengguna biasa WAJIB memiliki membership aktif pada sekolah tersebut
  IF v_school_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_school_memberships
    WHERE user_id = auth.uid() 
      AND school_id = v_school_id 
      AND status = 'aktif'
  ) THEN
    RETURN v_school_id;
  END IF;

  -- Fallback: ambil sekolah pertama di mana pengguna memiliki membership aktif
  SELECT school_id INTO v_school_id
  FROM public.user_school_memberships
  WHERE user_id = auth.uid() AND status = 'aktif'
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Mengambil peran pengguna berdasarkan keanggotaan aktif di sekolah aktif
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
DECLARE
  v_role VARCHAR;
  v_active_school UUID;
BEGIN
  -- 1. Cek peran di tabel profiles jika pengguna adalah super_admin
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'super_admin' THEN
    RETURN 'super_admin';
  END IF;

  -- 2. Ambil ID sekolah aktif yang tervalidasi
  v_active_school := public.get_user_school_id();
  IF v_active_school IS NULL THEN
    RETURN 'siswa';
  END IF;

  -- 3. Ambil role dari keanggotaan terverifikasi dan aktif di sekolah tersebut
  SELECT m.role INTO v_role
  FROM public.user_school_memberships m
  WHERE m.user_id = auth.uid() 
    AND m.school_id = v_active_school 
    AND m.status = 'aktif'
  LIMIT 1;

  RETURN COALESCE(v_role, 'siswa');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID AS $$
  SELECT student_id FROM public.profiles WHERE id = auth.uid() AND role = 'siswa';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_class(p_school_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments
    WHERE school_id = p_school_id
      AND teacher_id = auth.uid() 
      AND class_id = p_class_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_subject_class(p_school_id UUID, p_subject_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments
    WHERE school_id = p_school_id
      AND teacher_id = auth.uid() 
      AND class_id = p_class_id
      AND subject_id = p_subject_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_student_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_class(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_subject_class(UUID, UUID, UUID) TO authenticated, anon;

-- =============================================================================
-- 16. TRIGGER PROTEKSI PROFIL & ALLOWLIST (ANTI-ESKALASI PERAN & MUTASI SEKOLAH)
-- =============================================================================

-- A. Proteksi Allowlist
CREATE OR REPLACE FUNCTION public.prevent_allowlist_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_user_role() = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- 1. Admin sekolah DILARANG membuat atau mengubah role menjadi super_admin
  IF NEW.role = 'super_admin' THEN
    RAISE EXCEPTION 'Akses ditolak: Admin sekolah tidak dapat menambahkan Super Admin ke dalam allowlist.';
  END IF;

  -- 2. Admin sekolah DILARANG menambahkan akun untuk sekolah lain
  IF NEW.school_id <> public.get_user_school_id() THEN
    RAISE EXCEPTION 'Akses ditolak: Admin sekolah hanya berwenang mengelola allowlist sekolah miliknya sendiri.';
  END IF;

  -- 3. Akun allowlist yang sudah diklaim DILARANG diubah email atau sekolahnya
  IF TG_OP = 'UPDATE' AND OLD.claimed_at IS NOT NULL THEN
    IF (NEW.email IS DISTINCT FROM OLD.email) OR (NEW.school_id IS DISTINCT FROM OLD.school_id) THEN
      RAISE EXCEPTION 'Akses ditolak: Akun allowlist yang sudah aktif/diklaim tidak dapat diubah email atau sekolahnya.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_allowlist ON public.school_account_allowlist;
CREATE TRIGGER trg_protect_allowlist
  BEFORE INSERT OR UPDATE ON public.school_account_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.prevent_allowlist_privilege_escalation();

-- B. Proteksi Profil
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role VARCHAR;
BEGIN
  v_caller_role := public.get_user_role();

  -- Super admin memiliki hak penuh
  IF v_caller_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Admin sekolah: dilarang memindahkan profil ke sekolah lain atau menaikkan ke super_admin
  IF v_caller_role = 'admin' AND OLD.school_id = public.get_user_school_id() THEN
    IF NEW.role = 'super_admin' THEN
      RAISE EXCEPTION 'Akses ditolak: Admin sekolah dilarang mengangkat pengguna menjadi Super Admin.';
    END IF;
    IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Akses ditolak: Admin sekolah tidak dapat memindahkan akun ke sekolah lain.';
    END IF;
    -- Validasi active_school_id jika diubah
    IF NEW.active_school_id IS DISTINCT FROM OLD.active_school_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.user_school_memberships
        WHERE user_id = NEW.id AND school_id = NEW.active_school_id AND status = 'aktif'
      ) THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak memiliki keanggotaan aktif pada sekolah tersebut.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Pengguna biasa (Guru / Siswa saat memperbarui profil sendiri):
  -- DILARANG MENGUBAH: role, school_id, status, student_id, nip, email, google_email, username
  IF (NEW.role IS DISTINCT FROM OLD.role) OR 
     (NEW.school_id IS DISTINCT FROM OLD.school_id) OR 
     (NEW.status IS DISTINCT FROM OLD.status) OR 
     (NEW.nip IS DISTINCT FROM OLD.nip) OR
     (NEW.student_id IS DISTINCT FROM OLD.student_id) OR
     (NEW.email IS DISTINCT FROM OLD.email) OR
     (NEW.google_email IS DISTINCT FROM OLD.google_email) OR
     (NEW.username IS DISTINCT FROM OLD.username) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda hanya diperbolehkan memperbarui data tampilan pribadi (foto profil).';
  END IF;

  -- Pengguna biasa hanya boleh mengubah active_school_id ke sekolah tempat memiliki membership aktif
  IF NEW.active_school_id IS DISTINCT FROM OLD.active_school_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_school_memberships
      WHERE user_id = NEW.id AND school_id = NEW.active_school_id AND status = 'aktif'
    ) THEN
      RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki keanggotaan aktif pada sekolah tersebut.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profiles ON public.profiles;
CREATE TRIGGER trg_protect_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- =============================================================================
-- 17. PROSEDUR RESMI PENDAFTARAN & KLAIM AKUN GOOGLE (RPC SECURE DEFINER)
--     Dipanggil oleh Client setelah login Google berhasil tanpa trigger auth.users
-- =============================================================================
CREATE OR REPLACE FUNCTION public.claim_google_account(target_school_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_auth_user RECORD;
  v_user_email TEXT;
  v_provider TEXT;
  v_email_verified BOOLEAN;
  v_matching_count INT;
  v_allowlist RECORD;
  v_schools_list JSONB;
  v_existing_profile RECORD;
  v_target_school_id UUID := target_school_id;
BEGIN
  -- 1. Validasi Autentikasi Pengguna
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error', 'Sesi autentikasi tidak ditemukan. Silakan login kembali dengan Google.'
    );
  END IF;

  -- 2. Ambil Data Autentikasi Tepercaya Langsung dari auth.users (Server-Authoritative)
  SELECT id, email, email_confirmed_at, raw_app_meta_data, banned_until, deleted_at 
  INTO v_auth_user 
  FROM auth.users 
  WHERE id = v_user_id;

  IF v_auth_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_NOT_FOUND',
      'error', 'Akun autentikasi tidak ditemukan di database autentikasi.'
    );
  END IF;

  IF v_auth_user.deleted_at IS NOT NULL OR (v_auth_user.banned_until IS NOT NULL AND v_auth_user.banned_until > NOW()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_BLOCKED',
      'error', 'Akun pengguna ini telah dinonaktifkan atau diblokir.'
    );
  END IF;

  -- 3. Validasi Provider Google OAuth Tepercaya dari raw_app_meta_data (Bukan user_metadata!)
  v_provider := v_auth_user.raw_app_meta_data->>'provider';
  IF v_provider IS DISTINCT FROM 'google' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PROVIDER',
      'error', 'Akses ditolak: Hanya metode login Google OAuth (Gmail) resmi yang diizinkan.'
    );
  END IF;

  -- 4. Validasi Email Tepercaya dari Kolom Resmi auth.users.email
  v_user_email := LOWER(TRIM(v_auth_user.email));
  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EMAIL_MISSING',
      'error', 'Autentikasi gagal: Email akun Google tidak terdeteksi.'
    );
  END IF;

  -- 5. Validasi Status Email Terverifikasi Berdasarkan Bukti Tepercaya
  -- Menggunakan email_confirmed_at resmi dari Supabase atau OIDC root claim auth.jwt()
  -- (Dilarang mengandalkan raw_user_meta_data atau jwt->'user_metadata' yang dapat dimanipulasi pengguna)
  v_email_verified := (v_auth_user.email_confirmed_at IS NOT NULL) OR 
                      COALESCE((auth.jwt() ->> 'email_verified')::boolean, false);

  IF NOT v_email_verified THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EMAIL_NOT_VERIFIED',
      'error', 'Autentikasi gagal: Email Google Anda belum terverifikasi secara resmi oleh Google.'
    );
  END IF;

  -- 6. Pencegahan Pengambilalihan Akun / Profil (Anti-Account Takeover)
  -- A. Pastikan email Google ini tidak terikat pada profiles.id pengguna lain
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (LOWER(email) = v_user_email OR LOWER(google_email) = v_user_email)
      AND id <> v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PROFILE_CONFLICT',
      'error', 'Akses ditolak: Alamat email Google ini telah terdaftar pada akun pengguna lain.'
    );
  END IF;

  -- B. Ambil profil pengguna saat ini (jika sudah pernah terdaftar)
  SELECT * INTO v_existing_profile FROM public.profiles WHERE id = v_user_id;

  -- C. Jika pengguna sudah memiliki profil, verifikasi kesesuaian email
  IF v_existing_profile.id IS NOT NULL THEN
    IF LOWER(COALESCE(v_existing_profile.google_email, v_existing_profile.email)) IS DISTINCT FROM v_user_email THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'IDENTITY_MISMATCH',
        'error', 'Akses ditolak: Identitas Google tidak sesuai dengan data profil Anda yang terdaftar.'
      );
    END IF;
  END IF;

  -- 7. Deteksi Undangan / Hak Akses Sekolah yang Aktif untuk Email Ini
  SELECT COUNT(*) INTO v_matching_count
  FROM public.school_account_allowlist
  WHERE LOWER(email) = v_user_email AND status = 'aktif';

  IF v_matching_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNREGISTERED',
      'error', 'Akun Google ini belum terdaftar di sistem sekolah mana pun. Silakan hubungi admin sekolah Anda.'
    );
  END IF;

  -- 8. Penanganan Multi-Sekolah: Jika terdaftar di lebih dari 1 sekolah dan belum memilih target
  IF v_matching_count > 1 AND v_target_school_id IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'school_id', s.id,
        'school_name', s.name,
        'school_code', s.code,
        'role', a.role,
        'job_title', a.job_title,
        'is_claimed', (a.claimed_by = v_user_id)
      )
    ) INTO v_schools_list
    FROM public.school_account_allowlist a
    JOIN public.schools s ON s.id = a.school_id
    WHERE LOWER(a.email) = v_user_email AND a.status = 'aktif';

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MULTIPLE_SCHOOLS',
      'error', 'Email Anda terdaftar di beberapa sekolah. Silakan pilih sekolah yang ingin diakses.',
      'available_schools', v_schools_list
    );
  END IF;

  -- 9. Penguncian Baris Allowlist Secara Eksklusif (SELECT ... FOR UPDATE)
  -- Kedua jalur (dengan target_school_id maupun tanpa target_school_id) wajib hanya memilih baris dengan status = 'aktif'
  IF v_target_school_id IS NOT NULL THEN
    SELECT * INTO v_allowlist
    FROM public.school_account_allowlist
    WHERE LOWER(email) = v_user_email
      AND school_id = v_target_school_id
      AND status = 'aktif'
    FOR UPDATE;
  ELSE
    SELECT * INTO v_allowlist
    FROM public.school_account_allowlist
    WHERE LOWER(email) = v_user_email
      AND status = 'aktif'
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- Verifikasi keberadaan baris allowlist aktif yang berhasil dikunci
  -- Status NULL, nonaktif, atau status lainnya ditolak dengan error INVALID_SCHOOL
  IF v_allowlist.id IS NULL OR v_allowlist.status IS DISTINCT FROM 'aktif' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SCHOOL',
      'error', 'Akun Anda tidak memiliki undangan atau hak akses aktif pada sekolah yang dipilih.'
    );
  END IF;

  -- 10. Proteksi Klaim Satu Kali: Mencegah Pengambilalihan Undangan oleh Akun Lain
  IF v_allowlist.claimed_by IS NOT NULL AND v_allowlist.claimed_by <> v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_ALREADY_CLAIMED',
      'error', 'Undangan pendaftaran sekolah ini telah digunakan oleh akun Google lain.'
    );
  END IF;

  -- 11. Pencegahan Eskalasi Peran Super Admin
  IF v_allowlist.role = 'super_admin' OR v_allowlist.role NOT IN ('admin', 'guru', 'siswa') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PRIVILEGE_VIOLATION',
      'error', 'Akses ditolak: Hak akses Super Admin tidak dapat diklaim melalui pendaftaran Google.'
    );
  END IF;

  -- 12. Sinkronisasi Profil Pengguna Secara Aman (Tanpa Merusak Data yang Bukan Haknya)
  IF v_existing_profile.id IS NULL THEN
    INSERT INTO public.profiles (
      id,
      school_id,
      active_school_id,
      full_name,
      email,
      google_email,
      role,
      status,
      job_title,
      nip,
      student_id,
      registered_by,
      last_login_at
    ) VALUES (
      v_user_id,
      v_allowlist.school_id,
      v_allowlist.school_id,
      v_allowlist.full_name,
      v_user_email,
      v_user_email,
      v_allowlist.role,
      v_allowlist.status,
      v_allowlist.job_title,
      v_allowlist.nip,
      v_allowlist.student_id,
      v_allowlist.registered_by,
      NOW()
    );
  ELSE
    -- Pengguna sudah ada: pertahankan role super_admin jika ada, jangan timpa sekolah induk jika sudah ada
    UPDATE public.profiles
    SET last_login_at = NOW(),
        active_school_id = v_allowlist.school_id,
        school_id = COALESCE(public.profiles.school_id, v_allowlist.school_id),
        role = CASE WHEN public.profiles.role = 'super_admin' THEN 'super_admin' ELSE v_allowlist.role END,
        full_name = COALESCE(v_allowlist.full_name, public.profiles.full_name),
        google_email = v_user_email,
        email = COALESCE(public.profiles.email, v_user_email)
    WHERE id = v_user_id;
  END IF;

  -- 13. Sinkronisasi Keanggotaan Sekolah Resmi (User School Memberships)
  INSERT INTO public.user_school_memberships (
    user_id,
    school_id,
    role,
    status,
    job_title,
    nip,
    student_id
  ) VALUES (
    v_user_id,
    v_allowlist.school_id,
    v_allowlist.role,
    v_allowlist.status,
    v_allowlist.job_title,
    v_allowlist.nip,
    v_allowlist.student_id
  )
  ON CONFLICT (user_id, school_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    job_title = EXCLUDED.job_title,
    nip = EXCLUDED.nip,
    student_id = EXCLUDED.student_id;

  -- 14. Tandai Baris Undangan Telah Diklaim oleh Pengguna Ini
  UPDATE public.school_account_allowlist
  SET claimed_at = COALESCE(claimed_at, NOW()),
      claimed_by = v_user_id
  WHERE id = v_allowlist.id;

  -- 15. Ambil Profil Terkini dan Kembalikan Respon Sukses
  SELECT * INTO v_existing_profile FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Akun Google berhasil diverifikasi dan terhubung ke sekolah.',
    'profile', row_to_json(v_existing_profile),
    'active_school_id', v_allowlist.school_id,
    'role', v_allowlist.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

GRANT EXECUTE ON FUNCTION public.claim_google_account(UUID) TO authenticated;

-- =============================================================================
-- 18. SELURUH KEBIJAKAN ROW LEVEL SECURITY (RLS) DENGAN USING & WITH CHECK
-- =============================================================================

-- A. SCHOOLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_select" ON public.schools;
CREATE POLICY "schools_select" ON public.schools FOR SELECT USING (
  id = public.get_user_school_id() OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "schools_update_admin" ON public.schools;
CREATE POLICY "schools_update_admin" ON public.schools FOR UPDATE USING (
  (id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- B. ALLOWLIST
ALTER TABLE public.school_account_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allowlist_select" ON public.school_account_allowlist;
CREATE POLICY "allowlist_select" ON public.school_account_allowlist FOR SELECT USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "allowlist_insert" ON public.school_account_allowlist;
CREATE POLICY "allowlist_insert" ON public.school_account_allowlist FOR INSERT WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "allowlist_update" ON public.school_account_allowlist;
CREATE POLICY "allowlist_update" ON public.school_account_allowlist FOR UPDATE USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "allowlist_delete" ON public.school_account_allowlist;
CREATE POLICY "allowlist_delete" ON public.school_account_allowlist FOR DELETE USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- C. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() IN ('admin', 'guru')) OR
  id = auth.uid()
);
DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage" ON public.profiles FOR ALL USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
) WITH CHECK (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
);
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);

-- D. USER SCHOOL MEMBERSHIPS
ALTER TABLE public.user_school_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memberships_select" ON public.user_school_memberships;
CREATE POLICY "memberships_select" ON public.user_school_memberships FOR SELECT USING (
  user_id = auth.uid() OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "memberships_admin_manage" ON public.user_school_memberships;
CREATE POLICY "memberships_admin_manage" ON public.user_school_memberships FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  public.get_user_role() = 'super_admin'
);

-- E. CLASSES
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (
  school_id = public.get_user_school_id() OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "classes_admin_manage" ON public.classes;
CREATE POLICY "classes_admin_manage" ON public.classes FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- F. STUDENTS & STUDENT CLASS HISTORY
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, current_class_id)) OR
  (public.get_user_role() = 'siswa' AND id = public.get_current_student_id())
);
DROP POLICY IF EXISTS "students_admin_manage" ON public.students;
CREATE POLICY "students_admin_manage" ON public.students FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

ALTER TABLE public.student_class_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "history_select" ON public.student_class_history;
CREATE POLICY "history_select" ON public.student_class_history FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() IN ('admin', 'guru')) OR
  (public.get_user_role() = 'siswa' AND student_id = public.get_current_student_id())
);
DROP POLICY IF EXISTS "history_admin_manage" ON public.student_class_history;
CREATE POLICY "history_admin_manage" ON public.student_class_history FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- G. SUBJECTS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (
  school_id = public.get_user_school_id() OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "subjects_admin_manage" ON public.subjects;
CREATE POLICY "subjects_admin_manage" ON public.subjects FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- H. TEACHER ASSIGNMENTS & AUDIT LOGS
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_select" ON public.teacher_assignments;
CREATE POLICY "assignments_select" ON public.teacher_assignments FOR SELECT USING (
  school_id = public.get_user_school_id() OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "assignments_admin_manage" ON public.teacher_assignments;
CREATE POLICY "assignments_admin_manage" ON public.teacher_assignments FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

ALTER TABLE public.assignment_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select" ON public.assignment_audit_logs;
CREATE POLICY "audit_select" ON public.assignment_audit_logs FOR SELECT USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "audit_insert" ON public.assignment_audit_logs;
CREATE POLICY "audit_insert" ON public.assignment_audit_logs FOR INSERT WITH CHECK (
  school_id = public.get_user_school_id() AND public.get_user_role() IN ('admin', 'super_admin')
);

-- I. SCHEDULES
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_select" ON public.schedules;
CREATE POLICY "schedules_select" ON public.schedules FOR SELECT USING (
  school_id = public.get_user_school_id() OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "schedules_admin_manage" ON public.schedules;
CREATE POLICY "schedules_admin_manage" ON public.schedules FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- J. ATTENDANCE (REKAP KEHADIRAN)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id)) OR
  (public.get_user_role() = 'siswa' AND student_id = public.get_current_student_id())
);
DROP POLICY IF EXISTS "attendance_insert_authorized" ON public.attendance;
CREATE POLICY "attendance_insert_authorized" ON public.attendance FOR INSERT WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id) AND recorded_by_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "attendance_update_authorized" ON public.attendance;
CREATE POLICY "attendance_update_authorized" ON public.attendance FOR UPDATE USING (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id))
  )
) WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id))
  )
);

-- K. GRADES (NILAI SISWA) DENGAN PEMBATASAN GURU & VALIDASI RANGE
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grades_select" ON public.grades;
CREATE POLICY "grades_select" ON public.grades FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_subject_class(school_id, subject_id, class_id)) OR
  (public.get_user_role() = 'siswa' AND student_id = public.get_current_student_id())
);
DROP POLICY IF EXISTS "grades_insert_teacher" ON public.grades;
CREATE POLICY "grades_insert_teacher" ON public.grades FOR INSERT WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_subject_class(school_id, subject_id, class_id) AND graded_by_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "grades_update_teacher" ON public.grades;
CREATE POLICY "grades_update_teacher" ON public.grades FOR UPDATE USING (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_subject_class(school_id, subject_id, class_id))
  )
) WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_subject_class(school_id, subject_id, class_id))
  )
);

-- L. STUDENT WARNINGS (TEGURAN) DENGAN PEMBATASAN GURU PADA KELASNYA
ALTER TABLE public.student_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warnings_select" ON public.student_warnings;
CREATE POLICY "warnings_select" ON public.student_warnings FOR SELECT USING (
  public.get_user_role() = 'super_admin' OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id)) OR
  (public.get_user_role() = 'siswa' AND student_id = public.get_current_student_id())
);
DROP POLICY IF EXISTS "warnings_insert_staff" ON public.student_warnings;
CREATE POLICY "warnings_insert_staff" ON public.student_warnings FOR INSERT WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id) AND recorded_by_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "warnings_update_staff" ON public.student_warnings;
CREATE POLICY "warnings_update_staff" ON public.student_warnings FOR UPDATE USING (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id) AND recorded_by_id = auth.uid())
  )
) WITH CHECK (
  school_id = public.get_user_school_id() AND (
    public.get_user_role() IN ('admin', 'super_admin') OR
    (public.get_user_role() = 'guru' AND public.is_teacher_assigned_to_class(school_id, class_id) AND recorded_by_id = auth.uid())
  )
);

-- M. PROMOTION LOGS & PROMOTION LOG ITEMS
ALTER TABLE public.promotion_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_logs_select" ON public.promotion_logs;
CREATE POLICY "promo_logs_select" ON public.promotion_logs FOR SELECT USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() IN ('admin', 'guru')) OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "promo_logs_admin_manage" ON public.promotion_logs;
CREATE POLICY "promo_logs_admin_manage" ON public.promotion_logs FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

ALTER TABLE public.promotion_log_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_items_select" ON public.promotion_log_items;
CREATE POLICY "promo_items_select" ON public.promotion_log_items FOR SELECT USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() IN ('admin', 'guru')) OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "promo_items_admin_manage" ON public.promotion_log_items;
CREATE POLICY "promo_items_admin_manage" ON public.promotion_log_items FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- N. ANNOUNCEMENTS & NOTIFICATIONS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (
  (school_id = public.get_user_school_id() AND (
    target_role = 'ALL' OR 
    target_role = public.get_user_role() OR 
    public.get_user_role() IN ('admin', 'super_admin')
  )) OR public.get_user_role() = 'super_admin'
);
DROP POLICY IF EXISTS "announcements_admin_manage" ON public.announcements;
CREATE POLICY "announcements_admin_manage" ON public.announcements FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (
  school_id = public.get_user_school_id() AND (
    recipient_id = auth.uid() OR
    (recipient_id IS NULL AND (target_role = 'ALL' OR target_role = public.get_user_role())) OR
    public.get_user_role() = 'super_admin'
  )
);
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (
  school_id = public.get_user_school_id() AND recipient_id = auth.uid()
) WITH CHECK (
  school_id = public.get_user_school_id() AND recipient_id = auth.uid()
);
DROP POLICY IF EXISTS "notifications_admin_manage" ON public.notifications;
CREATE POLICY "notifications_admin_manage" ON public.notifications FOR ALL USING (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR public.get_user_role() = 'super_admin'
);

-- O. OFFLINE SYNC QUEUE
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_queue_user_manage" ON public.offline_sync_queue;
CREATE POLICY "sync_queue_user_manage" ON public.offline_sync_queue FOR ALL USING (
  (school_id = public.get_user_school_id() AND user_id = auth.uid()) OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  public.get_user_role() = 'super_admin'
) WITH CHECK (
  (school_id = public.get_user_school_id() AND user_id = auth.uid()) OR
  (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin') OR
  public.get_user_role() = 'super_admin'
);
