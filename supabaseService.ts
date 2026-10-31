import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, Role } from '../types';
import { StorageService } from './storageService';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fidppetwejaghxsrutea.supabase.co';
export const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZHBwZXR3ZWphZ2h4c3J1dGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjQ3NTIsImV4cCI6MjEwODk0MDc1Mn0.326T2317yG5lPXoMwNkPhrSgysqzdPpHAev9ccdtuBY';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface SchoolOption {
  school_id: string;
  school_name: string;
  school_code: string;
  role: Role;
  job_title?: string;
  is_claimed?: boolean;
}

export interface ClaimRpcResponse {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
  available_schools?: SchoolOption[];
  profile?: any;
  active_school_id?: string;
  role?: string;
}

/**
 * Service untuk menangani otorisasi Supabase & pemanggilan RPC claim_google_account
 */
export class SupabaseService {
  /**
   * Cek apakah Supabase backend sudah terkonfigurasi
   */
  static isAvailable(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  }

  /**
   * Memulai OAuth Google login via Supabase
   */
  static async signInWithGoogle(): Promise<{ error?: string }> {
    if (!supabase) {
      return { error: 'Konfigurasi Supabase (VITE_SUPABASE_URL / ANON_KEY) belum terpasang.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Gagal memulai login Google.' };
    }
  }

  /**
   * Memanggil RPC claim_google_account di PostgreSQL Supabase
   * @param targetSchoolId ID sekolah target opsional (jika akun terdaftar di banyak sekolah)
   */
  static async callClaimGoogleAccountRpc(targetSchoolId?: string): Promise<ClaimRpcResponse> {
    if (!supabase) {
      return {
        success: false,
        error_code: 'NOT_CONFIGURED',
        error: 'Koneksi Supabase belum diaktifkan.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('claim_google_account', {
        target_school_id: targetSchoolId || null,
      });

      if (error) {
        return {
          success: false,
          error_code: 'RPC_ERROR',
          error: error.message,
        };
      }

      return data as ClaimRpcResponse;
    } catch (err: any) {
      return {
        success: false,
        error_code: 'CLIENT_EXCEPTION',
        error: err.message || 'Terjadi kesalahan saat memproses klaim akun Google.',
      };
    }
  }

  /**
   * Mengonversi profil Supabase ke format User aplikasi lokal
   */
  static mapProfileToAppUser(profile: any): User {
    return {
      id: profile.id,
      username: profile.username || profile.email?.split('@')[0] || 'user',
      nama: profile.full_name || 'Pengguna',
      email: profile.email,
      googleEmail: profile.google_email || profile.email,
      isGoogleLinked: true,
      role: (profile.role as Role) || 'siswa',
      status: (profile.status as 'aktif' | 'nonaktif') || 'aktif',
      foto: profile.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      jabatan: profile.job_title || undefined,
      nip: profile.nip || undefined,
      studentId: profile.student_id || undefined,
      lastLoginAt: profile.last_login_at || new Date().toISOString(),
    };
  }

  /**
   * Proses pendaftaran/login Google: memanggil RPC dan menyinkronkan data pengguna lokal
   */
  static async handlePostGoogleAuth(targetSchoolId?: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    errorCode?: string;
    availableSchools?: SchoolOption[];
  }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        errorCode: 'SUPABASE_OFFLINE',
        error: 'Supabase belum dikonfigurasi.',
      };
    }

    const rpcRes = await this.callClaimGoogleAccountRpc(targetSchoolId);

    if (!rpcRes.success) {
      return {
        success: false,
        error: rpcRes.error || 'Verifikasi akun Google gagal.',
        errorCode: rpcRes.error_code,
        availableSchools: rpcRes.available_schools,
      };
    }

    if (rpcRes.profile) {
      const appUser = this.mapProfileToAppUser(rpcRes.profile);
      // Simpan ke local storage agar sinkron dengan state aplikasi
      StorageService.setCurrentUser(appUser);
      // Sinkronkan ke daftar users di storage
      const users = StorageService.getUsers();
      const existingIdx = users.findIndex((u) => u.id === appUser.id || (u.googleEmail && u.googleEmail.toLowerCase() === appUser.googleEmail?.toLowerCase()));
      if (existingIdx >= 0) {
        users[existingIdx] = { ...users[existingIdx], ...appUser };
      } else {
        users.push(appUser);
      }
      StorageService.saveUsers(users);

      return {
        success: true,
        user: appUser,
      };
    }

    return {
      success: false,
      error: 'Profil pengguna tidak ditemukan setelah klaim.',
    };
  }

  /**
   * Memeriksa apakah saat ini ada sesi aktif dari redirect Google OAuth
   */
  static async checkOAuthCallback(): Promise<{
    hasSession: boolean;
    authUser?: SupabaseAuthUser | null;
  }> {
    if (!supabase) return { hasSession: false, authUser: null };

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        return { hasSession: false, authUser: null };
      }
      return { hasSession: true, authUser: session.user };
    } catch {
      return { hasSession: false, authUser: null };
    }
  }

  /**
   * Logout dari Supabase auth jika aktif
   */
  static async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
  }

  /**
   * ID Sekolah default untuk SMP Islam At-Toyib 45
   */
  static readonly DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

  /**
   * Menyinkronkan catatan presensi ke Supabase table public.attendance
   */
  static async syncAttendanceToSupabase(record: any, schoolId: string = this.DEFAULT_SCHOOL_ID): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase tidak aktif' };

    try {
      // Dapatkan data session saat ini
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || record.petugasId;

      const payload = {
        school_id: schoolId,
        student_id: record.studentId,
        class_id: record.classId || record.kelasId || null,
        date: record.tanggal,
        status: record.status,
        notes: record.catatan || null,
        recorded_time: record.waktuPencatatan || '07:00:00',
        recorded_by_id: currentUserId,
        source: record.sumber || 'MANUAL',
        session: record.sesi || 'Pagi',
      };

      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'school_id,student_id,date' });

      if (error) {
        console.warn('Sync attendance ke Supabase gagal:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Exception sync attendance:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mengambil data presensi dari Supabase untuk sinkronisasi antar perangkat
   */
  static async fetchOnlineAttendance(date?: string, schoolId: string = this.DEFAULT_SCHOOL_ID): Promise<any[] | null> {
    if (!supabase) return null;

    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('school_id', schoolId);

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Fetch online attendance error:', error.message);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Langganan Realtime untuk pembaruan data absensi dari perangkat lain
   */
  static subscribeToAttendance(callback: (payload: any) => void): any {
    if (!supabase) return null;
    try {
      const channel = supabase
        .channel('attendance_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance' },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe();
      return channel;
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      return null;
    }
  }

  /**
   * Berhenti berlangganan channel Realtime
   */
  static unsubscribe(channel: any): void {
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  }
}


