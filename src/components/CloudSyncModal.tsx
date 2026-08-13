import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  UserCheck,
  LogOut,
  Layers,
  GitBranch,
  GitCommit,
} from 'lucide-react';
import {
  getSupabaseClient,
  getCurrentSupabaseUser,
} from '../services/supabaseClient';
import { synchronizeData, subscribeSyncState } from '../services/syncEngine';
import { triggerGitAutoSync, subscribeGitSyncStatus, GitSyncStatus } from '../services/gitSyncService';
import { SyncStateInfo } from '../types';
import { CountryPhoneInput } from './CountryPhoneInput';
import { OtpVerificationStep } from './OtpVerificationStep';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [syncInfo, setSyncInfo] = useState<SyncStateInfo>({
    status: 'SYNCED',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: true,
    userEmail: null,
  });

  const [gitStatus, setGitStatus] = useState<GitSyncStatus>({
    lastSyncedAt: null,
    status: 'IDLE',
    lastMessage: null,
    repository: 'sdxbyte/Expense',
  });

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least 1 uppercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least 1 numeric digit.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return 'Password must contain at least 1 special character.';
    return null;
  };

  useEffect(() => {
    const unsubCloud = subscribeSyncState(setSyncInfo);
    const unsubGit = subscribeGitSyncStatus(setGitStatus);

    getCurrentSupabaseUser().then((u) => {
      if (u?.email) {
        setSyncInfo((prev) => ({ ...prev, userEmail: u.email }));
      }
    });

    return () => {
      unsubCloud();
      unsubGit();
    };
  }, []);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    await synchronizeData();
    onDataChanged();
  };

  const handleCompleteSignUp = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Backend service is currently unavailable.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { phone: phone.trim(), otpVerified: true },
        },
      });
      if (error) throw error;

      setAuthMessage('Account verified & created successfully!');
      setSyncInfo((prev) => ({ ...prev, userEmail: data.user?.email || null }));
      setShowOtpStep(false);

      await synchronizeData();
      onDataChanged();
    } catch (err: any) {
      setAuthMessage(err.message || 'Registration failed');
      setShowOtpStep(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Backend service is currently unavailable.');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'signin') {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setAuthMessage(`Welcome back, ${data.user?.email}`);
        setSyncInfo((prev) => ({ ...prev, userEmail: data.user?.email || null }));
        await synchronizeData();
        onDataChanged();
      } else {
        if (!phone.trim() || phone.trim().length < 7) {
          setAuthMessage('Please enter a valid phone number.');
          setAuthLoading(false);
          return;
        }

        const pwdErr = validatePassword(password);
        if (pwdErr) {
          setAuthMessage(pwdErr);
          setAuthLoading(false);
          return;
        }

        // Show OTP Step
        setShowOtpStep(true);
      }
    } catch (err: any) {
      setAuthMessage(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setSyncInfo((prev) => ({ ...prev, userEmail: null }));
    setAuthMessage('Signed out successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">
                  Offline-First Cloud Sync
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Zero Subscriptions • Secure Offline & Cloud Financial Vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Sync Status
            </span>
            <div className="flex items-center gap-2">
              {syncInfo.status === 'SYNCED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                </span>
              )}
              {syncInfo.status === 'SYNCING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
                </span>
              )}
              {syncInfo.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5" /> {syncInfo.pendingCount} Pending
                </span>
              )}
              {syncInfo.status === 'FAILED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sync Error
                </span>
              )}
              {syncInfo.status === 'OFFLINE' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-400/30 text-xs font-semibold">
                  <WifiOff className="w-3.5 h-3.5" /> Offline Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
            <span>
              Pending Local Queue:{' '}
              <strong className="text-white">{syncInfo.pendingCount} ops</strong>
            </span>
            <button
              onClick={handleSyncNow}
              disabled={syncInfo.status === 'SYNCING'}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.status === 'SYNCING' ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          </div>
        </div>

        {/* Admin GitHub Panel */}
        <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 mb-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                GitHub Panel
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
              Connected ✓
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Repository</span>
              <strong className="text-white">sdxbyte/Expense</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Branch</span>
              <strong className="text-purple-300">main</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Status</span>
              <strong className="text-emerald-400">
                {gitStatus.status === 'SYNCING' ? 'SYNCING' : gitStatus.status === 'ERROR' ? 'FAILED' : 'SYNCED'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Last Commit</span>
              <strong className="text-indigo-300">45c5a3f</strong>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 text-[11px]">
              Last Sync:{' '}
              <strong className="text-slate-200">
                {gitStatus.lastSyncedAt
                  ? new Date(gitStatus.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Up to date'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => triggerGitAutoSync('Manual Admin GitHub Sync')}
              disabled={gitStatus.status === 'SYNCING'}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md border border-white/10 disabled:opacity-50 cursor-pointer"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>SYNC NOW</span>
            </button>
          </div>
        </div>

        {/* User Auth Section */}
        {syncInfo.userEmail ? (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                <p className="text-sm font-semibold text-white">{syncInfo.userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              Sign Out
            </button>
          </div>
        ) : showOtpStep ? (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5">
            <OtpVerificationStep
              email={email}
              phone={phone}
              isLoading={authLoading}
              onCancel={() => setShowOtpStep(false)}
              onVerifySuccess={handleCompleteSignUp}
            />
          </div>
        ) : (
          <form onSubmit={handleAuth} className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                Cloud Account Authentication
              </h3>
              <div className="flex bg-white/10 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    authMode === 'signin' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    authMode === 'signup' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <input
                type="email"
                placeholder="Email address *"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
              />
              {authMode === 'signup' && (
                <CountryPhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                />
              )}
              <input
                type="password"
                placeholder={authMode === 'signup' ? "Password (8+ chars, uppercase, number, symbol) *" : "Password *"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {authLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In & Sync' : 'Proceed to OTP Verification'}
            </button>
          </form>
        )}

        {authMessage && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mb-4 text-center">
            {authMessage}
          </p>
        )}
      </div>
    </div>
  );
};
