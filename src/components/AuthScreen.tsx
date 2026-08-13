import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { CountryPhoneInput } from './CountryPhoneInput';
import { OtpVerificationStep } from './OtpVerificationStep';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
