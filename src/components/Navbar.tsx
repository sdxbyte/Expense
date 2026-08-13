import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Moon, 
  Sun, 
  Plus, 
  PieChart,
  List,
  HandCoins,
  PiggyBank,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  LogOut,
  UserCheck,
  Mail
} from 'lucide-react';
import { formatMonthDisplay, shiftMonthKey, getCurrentMonthKey } from '../utils/storage';
import { subscribeSyncState } from '../services/syncEngine';
import { SyncStateInfo } from '../types';

interface NavbarProps {
  currentMonth: string;
  onMonthChange: (newMonth: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: 'expenses' | 'analytics' | 'debts' | 'budgets';
  onTabChange: (tab: 'expenses' | 'analytics' | 'debts' | 'budgets') => void;
  onOpenExpenseModal: () => void;
  onOpenBackupModal: () => void;
  onOpenCloudSyncModal: () => void;
  onOpenBankEmailModal?: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonth,
  onMonthChange,
  darkMode,
  onToggleDarkMode,
  activeTab,
  onTabChange,
  onOpenExpenseModal,
  onOpenBackupModal,
  onOpenCloudSyncModal,
  onOpenBankEmailModal,
  userEmail,
  onSignOut,
  onOpenAuthModal,
}) => {
  const isCurrentMonth = currentMonth === getCurrentMonthKey();
  const [syncInfo, setSyncInfo] = useState<SyncStateInfo>({
    status: 'SYNCED',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: true,
    userEmail: null,
  });

  useEffect(() => {
    return subscribeSyncState(setSyncInfo);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Logo & Month Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30 border border-white/20">
                L
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                  Ledger
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
                    Offline First
                  </span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  Personal Finance Tracker
                </p>
              </div>
            </div>

            {/* Month Navigation Pill */}
            <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-inner">
              <button
                onClick={() => onMonthChange(shiftMonthKey(currentMonth, -1))}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-200 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatMonthDisplay(currentMonth)}</span>
                {isCurrentMonth && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Current Month" />
                )}
              </div>

              <button
                onClick={() => onMonthChange(shiftMonthKey(currentMonth, 1))}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-200 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            {/* Cloud Sync Status Indicator Button */}
            <button
              onClick={onOpenCloudSyncModal}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 transition-all flex items-center gap-1.5 shadow-sm backdrop-blur-md cursor-pointer"
              title="Cloud Sync Status & Account"
            >
              {syncInfo.status === 'SYNCED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {syncInfo.status === 'SYNCING' && <RefreshCw className="w-3.5 h-3.5 text-indigo-300 animate-spin" />}
              {syncInfo.status === 'PENDING' && <Cloud className="w-3.5 h-3.5 text-amber-300" />}
              {syncInfo.status === 'FAILED' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              {syncInfo.status === 'OFFLINE' && <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
              
              <span className="hidden md:inline">
                {syncInfo.status === 'SYNCED' && 'Synced'}
                {syncInfo.status === 'SYNCING' && 'Syncing...'}
                {syncInfo.status === 'PENDING' && `${syncInfo.pendingCount} Pending`}
                {syncInfo.status === 'FAILED' && 'Sync Error'}
                {syncInfo.status === 'OFFLINE' && 'Offline'}
              </span>
            </button>

            {/* Bank Email Ingestion Modal Button */}
            {onOpenBankEmailModal && (
              <button
                onClick={onOpenBankEmailModal}
                className="px-3 py-2 text-xs font-medium rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 transition-all flex items-center gap-1.5 shadow-sm backdrop-blur-md cursor-pointer"
                title="Bank Email Ingestion & Diagnostic"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Bank Email</span>
              </button>
            )}

            <button
              onClick={onOpenBackupModal}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 transition-all flex items-center gap-1.5 shadow-sm backdrop-blur-md"
              title="Backup / Restore / Export"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-200 bg-white/10 hover:bg-white/15 rounded-xl border border-white/15 transition-all backdrop-blur-md"
              title={darkMode ? 'Light Theme Accent' : 'Dark Theme Accent'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            </button>

            <button
              onClick={onOpenExpenseModal}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>

            {userEmail ? (
              <>
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate max-w-[120px]">{userEmail}</span>
                </div>

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-2 text-slate-300 hover:text-rose-300 bg-white/10 hover:bg-rose-950/50 rounded-xl border border-white/15 hover:border-rose-800/50 transition-all backdrop-blur-md cursor-pointer"
                    title="Sign Out of Account"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl border border-indigo-500/40 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Sign In or Register"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTabChange('expenses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <List className="w-3.5 h-3.5 text-indigo-300" />
            <span>Expenses</span>
          </button>

          <button
            onClick={() => onTabChange('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-purple-300" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => onTabChange('debts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'debts'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 text-amber-300" />
            <span>Borrowed & Debt</span>
          </button>

          <button
            onClick={() => onTabChange('budgets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'budgets'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5 text-emerald-300" />
            <span>Budgets</span>
          </button>
        </div>
      </div>
    </header>
  );
};

