import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { AppState, Expense, ExpenseFilter } from './types';
import {
  loadState,
  saveExpense,
  updateExpense,
  reverseExpense,
  saveBudget,
  saveCategory,
  saveCustomCurrency,
  saveLender,
  replaceEntireState,
  saveSettings,
  getCurrentMonthKey,
} from './utils/storage';
import { DEFAULT_CATEGORIES, generateSampleData, BASE_CURRENCIES } from './data/constants';
import { Navbar } from './components/Navbar';
import { CurrencyCards } from './components/CurrencyCards';
import { ExpenseList } from './components/ExpenseList';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DebtTracker } from './components/DebtTracker';
import { BudgetManager } from './components/BudgetManager';
import { ExpenseModal } from './components/ExpenseModal';
import { BackupModal } from './components/BackupModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { BankEmailModal } from './components/BankEmailModal';
import { AuthScreen } from './components/AuthScreen';
import { synchronizeData } from './services/syncEngine';
import { getSupabaseClient } from './services/supabaseClient';
import { getAppReleaseInfo } from './version';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function App() {
  const releaseInfo = getAppReleaseInfo();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string>(
    'Please sign in or create an account to record financial entries, modify budgets, or sync data.'
  );

  const [state, setState] = useState<AppState>({
    expenses: [],
    categories: DEFAULT_CATEGORIES,
    customCurrencies: [],
    lenders: [],
    budgets: {},
    darkMode: true,
    primaryCurrency: 'USD',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentMonth, setCurrentMonth] = useState<string>(() => getCurrentMonthKey());
  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics' | 'debts' | 'budgets'>('expenses');

  const [filter, setFilter] = useState<ExpenseFilter>({
    search: '',
    currency: '',
    category: '',
    source: 'all',
    sortBy: 'date-desc',
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [isBankEmailOpen, setIsBankEmailOpen] = useState<boolean>(false);

  // Refresh state from IndexedDB
  const refreshState = async (userId?: string) => {
    try {
      const targetUserId = userId || currentUser?.id;
      const loaded = await loadState(targetUserId);
      
      // If public view has no expenses yet, populate default sample data for smooth guest viewing experience
      if (!targetUserId && (!loaded.expenses || loaded.expenses.length === 0)) {
        const sample = generateSampleData();
        setState(sample);
      } else {
        setState(loaded);
      }
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Central Auth Session Listener
  useEffect(() => {
    const client = getSupabaseClient();
    
    if (!client) {
      setCheckingAuth(false);
      refreshState();
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      setCurrentUser(sessionUser);
      setCheckingAuth(false);
      refreshState(sessionUser?.id).then(() => {
        if (sessionUser) {
          synchronizeData().then(() => refreshState(sessionUser.id));
        }
      });
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      const updatedUser = session?.user || null;
      setCurrentUser(updatedUser);
      setCheckingAuth(false);
      refreshState(updatedUser?.id).then(() => {
        if (updatedUser) {
          synchronizeData().then(() => refreshState(updatedUser.id));
        }
      });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Automatic periodic background sync (runs every 10s and on network/tab return)
  useEffect(() => {
    const doAutoSync = async () => {
      if (currentUser) {
        await synchronizeData();
        await refreshState(currentUser.id);
      }
    };

    // Trigger immediate sync
    doAutoSync();

    const intervalId = setInterval(doAutoSync, 10000);

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        doAutoSync();
      }
    };

    window.addEventListener('online', handleVisibilityOrOnline);
    document.addEventListener('visibilitychange', handleVisibilityOrOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleVisibilityOrOnline);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    };
  }, [currentUser]);

  // Helper to ensure auth before mutation
  const requireAuthOrPrompt = (notice?: string): boolean => {
    if (!currentUser) {
      setAuthNotice(notice || 'Please sign in or create an account to record financial entries, modify budgets, or sync data.');
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  // Sign out handler
  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setCurrentUser(null);
    refreshState(undefined);
  };

  // Dark mode HTML attribute sync
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSettings(state.darkMode, state.primaryCurrency);
  }, [state.darkMode, state.primaryCurrency]);

  // Expenses for the selected month
  const monthExpenses = state.expenses.filter((e) => {
    if (!e.date) return false;
    return e.date.startsWith(currentMonth);
  });

  // Unique list of currencies used
  const usedCurrencies = Array.from(
    new Set([
      ...Object.keys(BASE_CURRENCIES),
      ...state.customCurrencies,
      ...state.expenses.map((e) => e.currency),
    ])
  ).filter(Boolean);

  // Add or Edit Expense
  const handleSaveExpense = async (data: Omit<Expense, 'id'> & { id?: string }) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to save financial records.')) return;

    let targetExp: Expense;

    if (data.id) {
      targetExp = { ...data, id: data.id } as Expense;
      await updateExpense(targetExp);
    } else {
      const newId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      targetExp = { ...data, id: newId } as Expense;
      await saveExpense(targetExp);
    }

    // Ensure category exists
    if (data.category && !state.categories.includes(data.category)) {
      await saveCategory(data.category);
    }

    // Ensure custom currency exists
    if (data.currency && !BASE_CURRENCIES[data.currency] && !state.customCurrencies.includes(data.currency)) {
      await saveCustomCurrency(data.currency);
    }

    // Ensure lender exists
    if (data.source === 'borrowed' && data.lender && !state.lenders.includes(data.lender)) {
      await saveLender(data.lender);
    }

    await refreshState(currentUser?.id);
    synchronizeData().then(() => refreshState(currentUser?.id));
  };

  // Reverse Expense Entry
  const handleReverseExpense = async (id: string, reason?: string) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to reverse financial records.')) return;

    await reverseExpense(id, reason);
    await refreshState(currentUser?.id);
    synchronizeData().then(() => refreshState(currentUser?.id));
  };

  // Toggle Settle Status for Debt
  const handleToggleSettle = async (id: string) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to update debt settlement status.')) return;

    const target = state.expenses.find((e) => e.id === id);
    if (target) {
      const updated = { ...target, settled: !target.settled };
      await updateExpense(updated);
      await refreshState(currentUser?.id);
      synchronizeData().then(() => refreshState(currentUser?.id));
    }
  };

  // Add New Category
  const handleAddCategoryPrompt = async () => {
    if (!requireAuthOrPrompt('Please sign in or create an account to create custom categories.')) return;

    const cat = prompt('Enter new expense category name:');
    if (cat && cat.trim() && !state.categories.includes(cat.trim())) {
      await saveCategory(cat.trim());
      await refreshState(currentUser?.id);
      synchronizeData().then(() => refreshState(currentUser?.id));
    }
  };

  // Set Budget
  const handleSetBudget = async (currency: string, category: string, amount: number) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to set category budgets.')) return;

    await saveBudget(currency, category, amount);
    await refreshState(currentUser?.id);
    synchronizeData().then(() => refreshState(currentUser?.id));
  };

  // Remove Budget
  const handleRemoveBudget = async (currency: string, category: string) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to modify budgets.')) return;

    await saveBudget(currency, category, 0);
    await refreshState(currentUser?.id);
    synchronizeData().then(() => refreshState(currentUser?.id));
  };

  // Handle Restore State
  const handleRestoreState = async (newState: AppState) => {
    if (!requireAuthOrPrompt('Please sign in or create an account to restore data.')) return;

    await replaceEntireState(newState);
    await refreshState(currentUser?.id);
    synchronizeData().then(() => refreshState(currentUser?.id));
  };

  // Initial Auth Loading Screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl inline-flex text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-sm font-semibold text-slate-300">Loading ledger vault...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white font-sans selection:bg-indigo-500 selection:text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)' }}>
      {/* Frosted Glass Background Ambient Glowing Orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 pointer-events-none" />
      <div className="fixed top-1/2 -right-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 pointer-events-none" />
      <div className="fixed -bottom-24 left-1/3 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-15 pointer-events-none" />

      {/* Navigation Header */}
      <Navbar
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        darkMode={state.darkMode}
        onToggleDarkMode={() => setState((prev) => ({ ...prev, darkMode: !prev.darkMode }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenExpenseModal={() => {
          if (!requireAuthOrPrompt('Please sign in or create an account to add expense entries.')) return;
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenCloudSyncModal={() => {
          if (!requireAuthOrPrompt('Please sign in or create an account to access cloud sync settings.')) return;
          setIsCloudSyncOpen(true);
        }}
        onOpenBankEmailModal={() => setIsBankEmailOpen(true)}
        userEmail={currentUser?.email}
        onSignOut={handleSignOut}
        onOpenAuthModal={() => {
          setAuthNotice('Sign in or register to sync financial records securely across all your devices.');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Currency Summary Overview Bar */}
        <CurrencyCards
          expenses={monthExpenses}
          selectedCurrency={filter.currency}
          onSelectCurrency={(cur) => setFilter({ ...filter, currency: cur })}
        />

        {/* Tab Content */}
        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={monthExpenses}
            categories={state.categories}
            currencies={usedCurrencies}
            filter={filter}
            onFilterChange={setFilter}
            onEditExpense={(exp) => {
              if (!requireAuthOrPrompt('Please sign in or create an account to edit expense records.')) return;
              setEditingExpense(exp);
              setIsExpenseModalOpen(true);
            }}
            onReverseExpense={handleReverseExpense}
            onToggleSettle={handleToggleSettle}
            onExportCSV={() => setIsBackupModalOpen(true)}
            onAddCategory={handleAddCategoryPrompt}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsCharts expenses={monthExpenses} currentMonth={currentMonth} />
        )}

        {activeTab === 'debts' && (
          <DebtTracker expenses={monthExpenses} onToggleSettle={handleToggleSettle} />
        )}

        {activeTab === 'budgets' && (
          <BudgetManager
            expenses={monthExpenses}
            categories={state.categories}
            currencies={usedCurrencies}
            budgets={state.budgets}
            onSetBudget={handleSetBudget}
            onRemoveBudget={handleRemoveBudget}
          />
        )}
      </main>

      {/* Permanent Production Footer displaying Version & System Time */}
      <footer className="mt-12 py-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          Ledger Expense Vault • Update #{releaseInfo.updateNumber} (Version {releaseInfo.version})
        </p>
        <p className="text-[11px] text-slate-500 font-mono">
          {releaseInfo.releasedAt.formatted}
        </p>
      </footer>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
        categories={state.categories}
        currencies={usedCurrencies}
        lenders={state.lenders}
      />

      {/* Backup / Export Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        state={state}
        onRestoreState={handleRestoreState}
        currentMonth={currentMonth}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onDataChanged={() => refreshState(currentUser?.id)}
      />

      {/* Bank Email Ingestion Modal */}
      <BankEmailModal
        isOpen={isBankEmailOpen}
        onClose={() => setIsBankEmailOpen(false)}
      />

      {/* Authentication Modal Popup */}
      <AuthScreen
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        titleNotice={authNotice}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          refreshState(user.id).then(() => synchronizeData());
        }}
      />
    </div>
  );
}
