import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, ShieldAlert, ArrowRight, Building2 } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { SupabaseService, SchoolOption } from '../services/supabaseService';
import { useBackHandler } from '../hooks/useBackHandler';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('guru');
  const [password, setPassword] = useState('guru123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Google Login States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<SchoolOption[]>([]);
  const [pendingEmail, setPendingEmail] = useState<string>('');

  // Auto check OAuth callback when redirected from Google OAuth
  useEffect(() => {
    if (SupabaseService.isAvailable()) {
      SupabaseService.checkOAuthCallback().then(async ({ hasSession }) => {
        if (hasSession) {
          setGoogleLoading(true);
          setShowGoogleModal(true);
          const res = await SupabaseService.handlePostGoogleAuth();
          setGoogleLoading(false);
          if (res.success && res.user) {
            setShowGoogleModal(false);
            onLoginSuccess(res.user);
          } else if (res.errorCode === 'MULTIPLE_SCHOOLS' && res.availableSchools) {
            setAvailableSchools(res.availableSchools);
          } else {
            setGoogleError(res.error || 'Verifikasi login Google gagal.');
          }
        }
      });
    }
  }, []);

  // Back interceptors for modals
  useBackHandler(
    'login-google-modal',
    20,
    () => {
      setShowGoogleModal(false);
      setGoogleError(null);
      setAvailableSchools([]);
      return true;
    },
    showGoogleModal
  );

  useBackHandler(
    'login-forgot-password-modal',
    10,
    () => {
      setShowForgotPassword(false);
      return true;
    },
    showForgotPassword
  );

  // Handle real Google OAuth sign in via Supabase
  const handleGoogleOAuthSignIn = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    const res = await SupabaseService.signInWithGoogle();
    if (res.error) {
      setGoogleLoading(false);
      if (res.error.includes('Unsupported provider') || res.error.includes('provider is not enabled')) {
        setGoogleError(
          'Provider Google belum diaktifkan di Dashboard Supabase (Authentication > Providers > Google). Silakan aktifkan di Supabase, atau klik akun terdaftar Anda di daftar bawah untuk masuk langsung!'
        );
      } else {
        setGoogleError(res.error);
      }
    }
  };

  // Process Google Login & RPC Verification
  const handleSelectGoogleAccount = async (email: string, targetSchoolId?: string) => {
    setGoogleError(null);
    setGoogleLoading(true);
    setPendingEmail(email);

    // Jika ada session OAuth Google Supabase yang aktif di browser ini, jalankan RPC claim
    if (SupabaseService.isAvailable()) {
      try {
        const { hasSession } = await SupabaseService.checkOAuthCallback();
        if (hasSession) {
          const res = await SupabaseService.handlePostGoogleAuth(targetSchoolId);
          setGoogleLoading(false);
          if (res.success && res.user) {
            setShowGoogleModal(false);
            setAvailableSchools([]);
            onLoginSuccess(res.user);
            return;
          } else if (res.errorCode === 'MULTIPLE_SCHOOLS' && res.availableSchools) {
            setAvailableSchools(res.availableSchools);
            return;
          } else {
            setGoogleError(res.error || 'Autentikasi akun Google gagal.');
            return;
          }
        }
      } catch (err: any) {
        console.warn('Gagal memproses via Supabase RPC, beralih ke autentikasi lokal:', err);
      }
    }

    // Otentikasi langsung via data lokal terverifikasi (offline-first)
    setTimeout(() => {
      setGoogleLoading(false);
      const res = StorageService.authenticateWithGoogle(email);
      if (res.success && res.user) {
        setShowGoogleModal(false);
        setAvailableSchools([]);
        onLoginSuccess(res.user);
      } else {
        setGoogleError(res.error || 'Autentikasi akun Google gagal.');
      }
    }, 200);
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    handleSelectGoogleAccount(customGoogleEmail);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const trimmedUser = username.trim().toLowerCase();
      const trimmedPass = password.trim();

      const users = StorageService.getUsers();
      const found = users.find((u) => u.username.toLowerCase() === trimmedUser);

      if (!found) {
        setErrorMessage('Username tidak terdaftar dalam sistem!');
        return;
      }

      // Check if user is disabled
      if (found.status === 'nonaktif') {
        setErrorMessage('Akun Anda sedang dinonaktifkan. Silakan hubungi admin sekolah.');
        return;
      }

      const validPasswords: Record<string, string> = {
        admin: 'admin123',
        guru: 'guru123',
        siswa: 'siswa123',
      };

      if (validPasswords[trimmedUser] && validPasswords[trimmedUser] !== trimmedPass) {
        setErrorMessage('Password salah! Silakan periksa kembali.');
        return;
      }

      // Login success
      StorageService.setCurrentUser(found);
      onLoginSuccess(found);
    }, 400);
  };

  const handleQuickSelect = (roleName: string, pass: string) => {
    setUsername(roleName);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="flex-1 w-full bg-white flex flex-col justify-between relative overflow-y-auto min-h-[680px]">
      {/* Top Section with Logo */}
      <div className="px-6 pt-10 pb-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-[#E5F5EC] rounded-3xl flex items-center justify-center p-2 shadow-sm border border-emerald-100 mb-3">
          <SchoolLogo size={52} />
        </div>

        <h1 className="text-xl font-bold text-[#075B36] tracking-tight">
          SMP Islam At-Toyib 45
        </h1>

        <p className="text-xs text-slate-500 font-medium mt-1">
          Aplikasi • Absensi • Berakhlak
        </p>

        {/* Google Sign-In Button (Primary Authentication Method) */}
        <div className="w-full mt-4">
          <button
            type="button"
            onClick={() => {
              setGoogleError(null);
              setShowGoogleModal(true);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-emerald-100 hover:border-emerald-300 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-slate-800 group-hover:text-[#075B36] transition-colors">
              Masuk dengan Akun Google (Gmail)
            </span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            Hanya akun Google yang telah didaftarkan dan diaktifkan admin yang boleh masuk.
          </p>
        </div>

        {/* Divider for Transition / Fallback Login */}
        <div className="w-full flex items-center my-3.5 gap-2.5">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            atau login manual (transisi)
          </span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* Quick Demo Credentials pill selector */}
        <div className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200/80">
          <p className="text-[11px] text-slate-500 mb-1.5 font-medium">
            Pilih Akun Demo Cepat (Username):
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickSelect('guru', 'guru123')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                username === 'guru'
                  ? 'bg-[#078749] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Guru
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('siswa', 'siswa123')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                username === 'siswa'
                  ? 'bg-[#078749] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Siswa
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('admin', 'admin123')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                username === 'admin'
                  ? 'bg-[#078749] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full mt-3.5 space-y-3.5 text-left">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749] focus:ring-1 focus:ring-[#078749] transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#078749] focus:ring-1 focus:ring-[#078749] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#078749] hover:bg-[#075B36] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Login dengan Password'
            )}
          </button>

          {/* Lupa Password Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-slate-500 hover:text-[#078749] font-medium"
            >
              Lupa password?
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Bottom Wave with Mosque Silhouette */}
      <div className="w-full relative mt-auto">
        <svg
          viewBox="0 0 400 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
        >
          <path
            d="M0 45C60 20 140 60 200 40C260 20 340 55 400 35V120H0V45Z"
            fill="#E5F5EC"
          />
          <path
            d="M0 65C80 40 130 75 220 55C310 35 360 65 400 50V120H0V65Z"
            fill="#078749"
            fillOpacity="0.85"
          />
          {/* Mosque Domes in center */}
          <g fill="#075B36" fillOpacity="0.4">
            <path d="M185 85C185 75 192 68 200 65C208 68 215 75 215 85H185Z" />
            <path d="M165 88C165 80 171 74 177 72C183 74 189 80 189 88H165Z" />
            <path d="M211 88C211 80 217 74 223 72C229 74 235 80 235 88H211Z" />
            <line x1="200" y1="65" x2="200" y2="60" stroke="#075B36" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Slogan over bottom background */}
        <div className="bg-[#075B36] text-center pb-5 pt-1 text-emerald-100">
          <p className="text-[11px] font-medium tracking-wide">
            Disiplin • Berilmu • Berakhlak Mulia
          </p>
        </div>
      </div>

      {/* Google Account Picker Modal (Google Identity Services Simulation) */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-left border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Masuk dengan Google</h3>
                  <p className="text-[10px] text-slate-500">SMP Islam At-Toyib 45</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  setGoogleError(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Notification Banner (Required Error Messages) */}
            {googleError && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-900 text-xs">Akses Ditolak</p>
                  <p className="text-xs leading-relaxed mt-0.5">{googleError}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {googleLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold text-slate-800">Memverifikasi Akun Google...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Memeriksa izin dan status aktif akun di database sekolah
                </p>
              </div>
            ) : availableSchools.length > 0 ? (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Pilih Sekolah Tujuan</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Email <strong>{pendingEmail}</strong> terdaftar di {availableSchools.length} sekolah. Silakan pilih sekolah yang ingin Anda akses:
                  </p>
                </div>

                <div className="space-y-2">
                  {availableSchools.map((sch) => (
                    <button
                      key={sch.school_id}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(pendingEmail, sch.school_id)}
                      className="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                          {sch.school_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {sch.role}
                          </span>
                          {sch.job_title && (
                            <span className="text-[10px] text-slate-500 truncate">
                              {sch.job_title}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAvailableSchools([])}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 text-center"
                >
                  Kembali ke daftar akun
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {SupabaseService.isAvailable() && (
                  <button
                    type="button"
                    onClick={handleGoogleOAuthSignIn}
                    className="w-full py-2.5 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#FFFFFF"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Masuk via Akun Google Online (OAuth)</span>
                  </button>
                )}

                <p className="text-[11px] text-slate-600 font-medium">
                  {SupabaseService.isAvailable() ? 'Atau pilih akun tersimpan/demo:' : 'Pilih akun Google yang tersimpan di perangkat ini:'}
                </p>

                {/* Preset Verified / Registered Accounts on Device */}
                <div className="space-y-2">
                  {/* 1. Admin Account - Pak H. Bambang */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('admin.bambang@gmail.com')}
                    className="w-full p-2.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
                        alt="Admin"
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                            Pak H. Bambang Sudrajat
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 text-blue-800">
                            Admin
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          admin.bambang@gmail.com
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                  </button>

                  {/* 1b. User Admin Account - an29dii@gmail.com */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('an29dii@gmail.com')}
                    className="w-full p-2.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#075B36] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        A
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-800">
                            Andii (Akun Google Anda)
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            Admin
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium truncate">
                          an29dii@gmail.com
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                  </button>

                  {/* 2. Guru Account */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('sitirahmah.guru@gmail.com')}
                    className="w-full p-2.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
                        alt="Guru"
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                            Ibu Siti Rahmah, S.Pd.
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            Guru
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          sitirahmah.guru@gmail.com
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                  </button>

                  {/* 3. Siswa Account */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('ahmadfauzi.siswa@gmail.com')}
                    className="w-full p-2.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
                        alt="Siswa"
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                            Ahmad Fauzi
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800">
                            Siswa VIII A
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          ahmadfauzi.siswa@gmail.com
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                  </button>

                  {/* 4. Disabled Account (Demo Testing for Requirement 3: Deactivated) */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('budi.nonaktif@gmail.com')}
                    className="w-full p-2.5 rounded-2xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50 text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group"
                    title="Uji penolakan akun yang dinonaktifkan admin"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                        BS
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            Budi Santoso
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-800">
                            Nonaktif
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-600 truncate">
                          budi.nonaktif@gmail.com (Uji Nonaktif)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-rose-700 font-semibold shrink-0">
                      Tes Tolak
                    </span>
                  </button>
                </div>

                {/* Option to input custom Google account or test un-registered email */}
                <div className="pt-2 border-t border-slate-100">
                  {!showCustomEmailInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomEmailInput(true)}
                      className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Gunakan Akun Google Lain / Ketik Email</span>
                    </button>
                  ) : (
                    <form onSubmit={handleCustomGoogleSubmit} className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Ketik Alamat Gmail untuk Masuk:
                      </label>
                      <input
                        type="email"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        placeholder="nama.anda@gmail.com"
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-2 px-3 bg-[#078749] hover:bg-[#075B36] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Verifikasi & Masuk
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomGoogleEmail('unregistered@gmail.com');
                            handleSelectGoogleAccount('unregistered@gmail.com');
                          }}
                          className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap"
                          title="Uji penolakan akun belum terdaftar"
                        >
                          Uji Belum Terdaftar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Keamanan Google OAuth 2.0</span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  setGoogleError(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl text-left border border-slate-100">
            <h3 className="text-base font-bold text-slate-800">Pemulihan Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan username atau email Anda untuk mereset password melalui tim admin sekolah.
            </p>

            {resetSuccess ? (
              <div className="my-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#078749] shrink-0 mt-0.5" />
                <span>
                  Instruksi pemulihan telah dikirimkan ke email terdaftar Anda atau silakan hubungi Tata Usaha Sekolah.
                </span>
              </div>
            ) : (
              <div className="my-4 space-y-3">
                <label className="text-xs font-semibold text-slate-700">Email atau NIS</label>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="contoh: guru@attoyib45.sch.id"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#078749]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setForgotEmail('');
                }}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100"
              >
                Tutup
              </button>
              {!resetSuccess && (
                <button
                  type="button"
                  onClick={() => {
                    if (forgotEmail.trim()) {
                      setResetSuccess(true);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#078749] text-white text-xs font-medium hover:bg-[#075B36]"
                >
                  Kirim Instruksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
