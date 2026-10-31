-- =============================================================================
-- PENYUNTIKAN DATA AWAL SEKOLAH (SEED DATA): SMP ISLAM AT-TOYIB 45
-- Karakteristik : Idempotent (ON CONFLICT DO NOTHING / UPDATE),
--                 Relasi school_id Konsisten, UUID Deterministik,
--                 Data Siswa, Kelas, Guru, Mapel, dan Allowlist Lengkap
-- File          : supabase/migrations/20261030_seed_initial_data.sql
-- =============================================================================

DO $$
DECLARE
  v_school_id CONSTANT UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;

  -- UUID Kelas
  v_class_7a CONSTANT UUID := 'c0000000-0000-0000-0000-00000000007a'::uuid;
  v_class_7b CONSTANT UUID := 'c0000000-0000-0000-0000-00000000007b'::uuid;
  v_class_8a CONSTANT UUID := 'c0000000-0000-0000-0000-00000000008a'::uuid;
  v_class_8b CONSTANT UUID := 'c0000000-0000-0000-0000-00000000008b'::uuid;
  v_class_9a CONSTANT UUID := 'c0000000-0000-0000-0000-00000000009a'::uuid;
  v_class_9b CONSTANT UUID := 'c0000000-0000-0000-0000-00000000009b'::uuid;

  -- UUID Mata Pelajaran
  v_sub_pai CONSTANT UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_sub_mtk CONSTANT UUID := 'b0000000-0000-0000-0000-000000000002'::uuid;
  v_sub_arb CONSTANT UUID := 'b0000000-0000-0000-0000-000000000003'::uuid;
  v_sub_thf CONSTANT UUID := 'b0000000-0000-0000-0000-000000000004'::uuid;
  v_sub_ind CONSTANT UUID := 'b0000000-0000-0000-0000-000000000005'::uuid;
  v_sub_ing CONSTANT UUID := 'b0000000-0000-0000-0000-000000000006'::uuid;
  v_sub_ipa CONSTANT UUID := 'b0000000-0000-0000-0000-000000000007'::uuid;
  v_sub_ips CONSTANT UUID := 'b0000000-0000-0000-0000-000000000008'::uuid;
  v_sub_inf CONSTANT UUID := 'b0000000-0000-0000-0000-000000000009'::uuid;
  v_sub_pjk CONSTANT UUID := 'b0000000-0000-0000-0000-000000000010'::uuid;
  v_sub_fqh CONSTANT UUID := 'b0000000-0000-0000-0000-000000000011'::uuid;
  v_sub_sbp CONSTANT UUID := 'b0000000-0000-0000-0000-000000000012'::uuid;

  -- UUID Siswa Utama
  v_std_001 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_std_002 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000002'::uuid;
  v_std_003 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000003'::uuid;
  v_std_004 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000004'::uuid;
  v_std_005 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000005'::uuid;
  v_std_006 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000006'::uuid;
  v_std_007 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000007'::uuid;
  v_std_008 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000008'::uuid;
  v_std_101 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000101'::uuid;
  v_std_102 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000102'::uuid;
  v_std_103 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000103'::uuid;
  v_std_009 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000009'::uuid;
  v_std_201 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000201'::uuid;
  v_std_202 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000202'::uuid;
  v_std_203 CONSTANT UUID := 'd0000000-0000-0000-0000-000000000203'::uuid;
BEGIN

  -- 1. PROFIL TENANT SEKOLAH: SMP ISLAM AT-TOYIB 45
  INSERT INTO public.schools (
    id, code, name, slogan, address, phone, email, website, logo_url,
    active_academic_year, active_semester, entry_time, exit_time, is_active
  ) VALUES (
    v_school_id,
    'SMP-ATTOYIB-45',
    'SMP Islam At-Toyib 45',
    'Disiplin • Berilmu • Berakhlak Mulia',
    'Jl. Raya Pesantren No. 45, Cirebon, Jawa Barat 45153',
    '0812-3456-7890',
    'info@attoyib45.sch.id',
    'https://smpislamattoyib45.sch.id',
    '/assets/aistudio/file_000000005df48211a3bd68595e8ebec9_7f896c67.png',
    '2026/2027',
    'Ganjil',
    '07:00:00',
    '14:30:00',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slogan = EXCLUDED.slogan,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    logo_url = EXCLUDED.logo_url,
    active_academic_year = EXCLUDED.active_academic_year,
    active_semester = EXCLUDED.active_semester,
    entry_time = EXCLUDED.entry_time,
    exit_time = EXCLUDED.exit_time,
    updated_at = NOW();

  -- 2. MASTER KELAS
  INSERT INTO public.classes (id, school_id, name, level, academic_year, capacity, status, notes)
  VALUES
    (v_class_7a, v_school_id, 'VII A', 'VII', '2026/2027', 32, 'aktif', 'Wali Kelas: Ustadz Muhammad Ridwan, S.Pd.I'),
    (v_class_7b, v_school_id, 'VII B', 'VII', '2026/2027', 32, 'aktif', 'Wali Kelas: Ustadzah Nurul Hidayah, S.Pd.'),
    (v_class_8a, v_school_id, 'VIII A', 'VIII', '2026/2027', 30, 'aktif', 'Wali Kelas: Ustadzah Siti Rahmah, S.Pd.'),
    (v_class_8b, v_school_id, 'VIII B', 'VIII', '2026/2027', 30, 'aktif', 'Wali Kelas: Ustadz Ahmad Zaki, M.Pd.'),
    (v_class_9a, v_school_id, 'IX A', 'IX', '2026/2027', 28, 'aktif', 'Wali Kelas: Ustadz Drs. H. Syarifudin'),
    (v_class_9b, v_school_id, 'IX B', 'IX', '2026/2027', 28, 'aktif', 'Wali Kelas: Ustadzah Fatimah Azzahra, S.Ag.')
  ON CONFLICT (school_id, id) DO UPDATE SET
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    capacity = EXCLUDED.capacity,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- 3. MASTER MATA PELAJARAN
  INSERT INTO public.subjects (id, school_id, code, name, category, status)
  VALUES
    (v_sub_pai, v_school_id, 'PAI-01', 'Pendidikan Agama Islam (PAI)', 'Pendidikan Agama & Budi Pekerti', 'aktif'),
    (v_sub_mtk, v_school_id, 'MTK-01', 'Matematika', 'MIPA', 'aktif'),
    (v_sub_arb, v_school_id, 'ARB-01', 'Bahasa Arab', 'Muatan Lokal Keagamaan', 'aktif'),
    (v_sub_thf, v_school_id, 'THF-01', 'Tahfidz Al-Qur''an', 'Kepesantrenan', 'aktif'),
    (v_sub_ind, v_school_id, 'IND-01', 'Bahasa Indonesia', 'Bahasa', 'aktif'),
    (v_sub_ing, v_school_id, 'ING-01', 'Bahasa Inggris', 'Bahasa', 'aktif'),
    (v_sub_ipa, v_school_id, 'IPA-01', 'IPA (Fisika & Biologi)', 'MIPA', 'aktif'),
    (v_sub_ips, v_school_id, 'IPS-01', 'IPS Terpadu', 'Sosial Humaniora', 'aktif'),
    (v_sub_inf, v_school_id, 'INF-01', 'Informatika & Komputer', 'Teknologi', 'aktif'),
    (v_sub_pjk, v_school_id, 'PJK-01', 'Pendidikan Jasmani (PJOK)', 'Kebugaran', 'aktif'),
    (v_sub_fqh, v_school_id, 'FQH-01', 'Fiqih & Ibadah Amaliah', 'Pendidikan Agama', 'aktif'),
    (v_sub_sbp, v_school_id, 'SBP-01', 'Seni Budaya & Prakarya', 'Kesenian', 'aktif')
  ON CONFLICT (school_id, id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    status = EXCLUDED.status;

  -- 4. MASTER DATA SISWA
  INSERT INTO public.students (
    id, school_id, nis, nisn, name, current_class_id, gender, birth_date, address, parent_phone, status, academic_status
  ) VALUES
    (v_std_001, v_school_id, '001', '0089123401', 'Ahmad Fauzi', v_class_8a, 'L', '2012-05-14', 'Jl. Melati No. 12, Kebon Jeruk', '081234567890', 'aktif', 'aktif'),
    (v_std_002, v_school_id, '002', '0089123402', 'Siti Nurhaliza', v_class_8a, 'P', '2012-08-20', 'Jl. Anggrek No. 5, Palmerah', '081298765432', 'aktif', 'aktif'),
    (v_std_003, v_school_id, '003', '0089123403', 'Budi Santoso', v_class_8a, 'L', '2012-02-10', 'Jl. Mawar No. 45, Grogol', '081345678901', 'aktif', 'aktif'),
    (v_std_004, v_school_id, '004', '0089123404', 'Ani Lestari', v_class_8a, 'P', '2012-11-03', 'Jl. Cempaka No. 8, Cengkareng', '081211223344', 'aktif', 'aktif'),
    (v_std_005, v_school_id, '005', '0089123405', 'Rian Saputra', v_class_8a, 'L', '2012-04-18', 'Jl. Kenanga No. 21, Kalideres', '081399887766', 'aktif', 'aktif'),
    (v_std_006, v_school_id, '006', '0089123406', 'Dewi Anggraini', v_class_8a, 'P', '2012-09-25', 'Jl. Dahlia No. 16, Kebon Jeruk', '081266554433', 'aktif', 'aktif'),
    (v_std_007, v_school_id, '007', '0089123407', 'Fajar Maulana', v_class_8a, 'L', '2012-01-30', 'Jl. Flamboyan No. 3, Kembangan', '081322334455', 'aktif', 'aktif'),
    (v_std_008, v_school_id, '008', '0089123408', 'Hafiz Al-Baqir', v_class_8a, 'L', '2012-07-12', 'Jl. Teratai No. 19, Meruya', '081277889900', 'aktif', 'aktif'),
    (v_std_101, v_school_id, '101', '0098123401', 'Aisyah Putri Azzahra', v_class_7a, 'P', '2013-03-15', 'Jl. Kyai Tapa No. 10', '081233445566', 'aktif', 'aktif'),
    (v_std_102, v_school_id, '102', '0098123402', 'Muhammad Bilal Al-Fatih', v_class_7a, 'L', '2013-06-22', 'Jl. Pos Pengumben No. 4', '081244556677', 'aktif', 'aktif'),
    (v_std_103, v_school_id, '103', '0098123403', 'Nabila Syakira', v_class_7b, 'P', '2013-08-11', 'Jl. Daan Mogot KM 11', '081377889911', 'aktif', 'aktif'),
    (v_std_009, v_school_id, '009', '0089123409', 'Rizky Ramadhan', v_class_8b, 'L', '2012-09-19', 'Jl. Kemuning Raya No. 18', '081288991122', 'aktif', 'aktif'),
    (v_std_201, v_school_id, '201', '0077123401', 'Zaskia Nur Madinah', v_class_9a, 'P', '2011-10-09', 'Jl. Surya Utama No. 8', '081355667788', 'aktif', 'aktif'),
    (v_std_202, v_school_id, '202', '0077123402', 'Farhan Robbani', v_class_9a, 'L', '2011-12-14', 'Jl. Pesanggrahan No. 27', '081366778899', 'aktif', 'aktif'),
    (v_std_203, v_school_id, '203', '0077123403', 'Salma Salsabila', v_class_9b, 'P', '2011-05-02', 'Jl. Joglo Raya No. 40', '081299881144', 'aktif', 'aktif')
  ON CONFLICT (school_id, id) DO UPDATE SET
    name = EXCLUDED.name,
    nisn = EXCLUDED.nisn,
    current_class_id = EXCLUDED.current_class_id,
    address = EXCLUDED.address,
    parent_phone = EXCLUDED.parent_phone,
    status = EXCLUDED.status,
    updated_at = NOW();

  -- 5. RIWAYAT KELAS SISWA (STUDENT CLASS HISTORY)
  INSERT INTO public.student_class_history (school_id, student_id, class_id, academic_year, assigned_date, notes)
  VALUES
    (v_school_id, v_std_001, v_class_8a, '2026/2027', '2026-07-14', 'Naik ke Kelas VIII A'),
    (v_school_id, v_std_002, v_class_8a, '2026/2027', '2026-07-14', 'Naik ke Kelas VIII A'),
    (v_school_id, v_std_003, v_class_8a, '2026/2027', '2026-07-14', 'Naik ke Kelas VIII A'),
    (v_school_id, v_std_004, v_class_8a, '2026/2027', '2026-07-14', 'Naik ke Kelas VIII A'),
    (v_school_id, v_std_005, v_class_8a, '2026/2027', '2026-07-14', 'Naik ke Kelas VIII A'),
    (v_school_id, v_std_101, v_class_7a, '2026/2027', '2026-07-15', 'Peserta didik baru Kelas VII A')
  ON CONFLICT DO NOTHING;

  -- 6. DAFTAR IZIN AKUN GOOGLE (ALLOWLIST / PRA-REGISTRASI ADMIN)
  -- Menyediakan akses login Google bagi Admin, Guru, dan Siswa
  INSERT INTO public.school_account_allowlist (
    school_id, email, full_name, role, status, job_title, nip, student_id
  ) VALUES
    -- Admin Utama (Akun Anda)
    (v_school_id, 'an29dii@gmail.com', 'Andii (Admin Utama)', 'admin', 'aktif', 'Administrator IT & Pengembang', '198909122014021002', NULL),
    -- Kepala Sekolah & Admin
    (v_school_id, 'admin.bambang@gmail.com', 'Pak H. Bambang Sudrajat, M.M.', 'admin', 'aktif', 'Kepala Sekolah & Administrator', '197508122002121001', NULL),
    -- Guru PAI & Wali Kelas VIII A
    (v_school_id, 'sitirahmah.guru@gmail.com', 'Ibu Siti Rahmah, S.Pd.', 'guru', 'aktif', 'Wali Kelas VIII A & Guru PAI', '198403152009032004', NULL),
    -- Guru Matematika & Wali Kelas VIII B
    (v_school_id, 'ahmadzaki.guru@gmail.com', 'Ustadz Ahmad Zaki, M.Pd.', 'guru', 'aktif', 'Wali Kelas VIII B & Guru Matematika', '198711202011011003', NULL),
    -- Siswa Ahmad Fauzi
    (v_school_id, 'ahmadfauzi.siswa@gmail.com', 'Ahmad Fauzi', 'siswa', 'aktif', 'Siswa Kelas VIII A', '001', v_std_001),
    -- Uji Akun Nonaktif (Siswa Budi Santoso)
    (v_school_id, 'budi.nonaktif@gmail.com', 'Budi Santoso', 'siswa', 'nonaktif', 'Siswa Kelas VIII A (Nonaktif)', '003', v_std_003)
  ON CONFLICT (school_id, email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    job_title = EXCLUDED.job_title,
    nip = EXCLUDED.nip,
    student_id = EXCLUDED.student_id,
    updated_at = NOW();

END $$;
