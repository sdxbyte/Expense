import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Phone,
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  AlertCircle,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { CountryPhoneInput } from './CountryPhoneInput';
import { OtpVerificationStep } from './OtpVerificationStep';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
    />
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
    />
    <path
      fill="#FBBC05"
      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
    />
    <path
      fill="#34A853"
      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
    />
  </svg>
);

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
  isOpen?: boolean;
  onClose?: () => void;
  titleNotice?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onAuthenticated, 
  isOpen = true, 
  onClose,
  titleNotice
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Listen for Google OAuth popup response
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user: googleUser } = event.data;
        if (!googleUser || !googleUser.email) {
          setErrorMsg('Failed to receive Google profile data.');
          setIsGoogleLoading(false);
          return;
        }

        setIsGoogleLoading(true);
        setErrorMsg(null);
        try {
          const client = getSupabaseClient();
          if (client && typeof client.auth.signInWithGoogleUser === 'function') {
            const { data, error } = await client.auth.signInWithGoogleUser({
              email: googleUser.email,
              name: googleUser.name,
              sub: googleUser.sub,
              picture: googleUser.picture,
            });

            if (error) {
              setErrorMsg(error.message);
            } else if (data.user) {
              setSuccessMsg('Signed in with Google successfully!');
              setTimeout(() => {
                onAuthenticated(data.user!);
              }, 400);
            }
          } else {
            setErrorMsg('Authentication client is unavailable.');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Error completing Google sign in.');
        } finally {
          setIsGoogleLoading(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setErrorMsg(event.data.error || 'Google authentication was canceled.');
        setIsGoogleLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthenticated]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);

    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        setErrorMsg(data.error || 'Google Sign-In is not currently available. Please ensure GOOGLE_CLIENT_ID is configured.');
        setIsGoogleLoading(false);
        return;
      }

      // Open Google OAuth Provider URL in popup window directly
      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        'width=550,height=650,top=100,left=200,scrollbars=yes,status=yes'
      );

      if (!authWindow) {
        setErrorMsg('Popup was blocked by your browser. Please allow popups for this site to continue with Google.');
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg('Failed to initiate Google authentication. Please check your connection.');
      setIsGoogleLoading(false);
    }
  };

  const validatePasswordComplexity = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one numeric digit (0-9).';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      return 'Password must contain at least one special character (!@#$%^&*...).';
    }
    return null;
  };

  const handleCompleteSignUp = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setErrorMsg('Authentication service is currently unavailable. Please contact the administrator or try again later.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            phone: phone.trim(),
            otpVerified: true,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setShowOtpStep(false);
      } else if (data.user) {
        setSuccessMsg('OTP verified & account created successfully!');
        setTimeout(() => {
          onAuthenticated(data.user!);
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
      setShowOtpStep(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      const trimmedPhone = phone.trim();
      if (!trimmedPhone || trimmedPhone.length < 7) {
        setErrorMsg('Please enter a valid phone number (e.g. +1234567890).');
        return;
      }

      const passwordErr = validatePasswordComplexity(password);
      if (passwordErr) {
        setErrorMsg(passwordErr);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      // Proceed to OTP Verification Step
      setShowOtpStep(true);
      return;
    } else {
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }
    }

    const client = getSupabaseClient();
    if (!client) {
      setErrorMsg('Authentication service is currently unavailable. Please contact the administrator or try again later.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        setSuccessMsg('Sign in successful! Loading your financial vault...');
        setTimeout(() => {
          onAuthenticated(data.user!);
        }, 300);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="w-full max-w-md space-y-5 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full border border-slate-700 transition-colors z-20 cursor-pointer"
          title="Close sign-in prompt"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 border border-white/20 mb-1">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          Ledger
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Account Required to Save
          </span>
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          {titleNotice || 'Please sign in or create an account to record financial entries, modify budgets, or sync data.'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5">
        {showOtpStep ? (
          <OtpVerificationStep
            email={email}
            phone={phone}
            isLoading={isLoading}
            onCancel={() => setShowOtpStep(false)}
            onVerifySuccess={handleCompleteSignUp}
          />
        ) : (
          <>
            {/* Tabs: Sign In / Sign Up */}
            <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              aria-label="Continue with Google"
              className="w-full py-2.5 px-4 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-100 hover:text-white transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-2.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
                or with email
              </span>
            </div>

            {/* Feedback Messages */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-400" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-400" />
                    Select Country & Phone Number *
                  </label>
                  <CountryPhoneInput
                    value={phone}
                    onChange={setPhone}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-indigo-400" />
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {mode === 'signup' && (
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Must be min 8 chars with 1 uppercase, 1 number, and 1 special symbol.
                  </p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-400" />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span className="animate-pulse">Authenticating...</span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Proceed to OTP Verification'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

        {/* Security Notice Footer */}
        <div className="text-center text-[11px] text-slate-400 leading-relaxed px-2">
          Your financial data is private, encrypted, and accessible only to your authorized account.
        </div>
      </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {content}
    </div>
  );
};
