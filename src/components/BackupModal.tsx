import React, { useRef } from 'react';
import { AppState } from '../types';
import { downloadFile, exportExpensesToCSV } from '../utils/storage';
import { generateSampleData } from '../data/constants';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Database
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onRestoreState: (newState: AppState) => void;
  currentMonth: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  state,
  onRestoreState,
  currentMonth,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Export JSON (Sanitized - Contains strictly financial records, zero tokens/secrets)
  const handleExportJSON = () => {
    const sanitizedState: AppState = {
      expenses: state.expenses.map((e) => ({
        id: e.id,
        amount: Math.abs(Number(e.amount) || 0),
        currency: e.currency,
        category: e.category,
        date: e.date,
        description: e.description || '',
        source: e.source || 'self',
        paymentMethod: e.paymentMethod,
        otherPaymentReason: e.otherPaymentReason,
        lender: e.lender,
        recurring: e.recurring,
        settled: e.settled,
        status: e.status || 'ACTIVE',
        reversalOf: e.reversalOf || null,
        reversalReason: e.reversalReason || null,
        reversedAt: e.reversedAt || null,
        version: e.version || 1,
        updatedAt: e.updatedAt,
      })),
      categories: state.categories || [],
      customCurrencies: state.customCurrencies || [],
      lenders: state.lenders || [],
      budgets: state.budgets || {},
      darkMode: state.darkMode,
      primaryCurrency: state.primaryCurrency || 'USD',
    };

    const jsonStr = JSON.stringify(sanitizedState, null, 2);
    downloadFile(jsonStr, `ledger-backup-${currentMonth}.json`, 'application/json');
  };

  // Export CSV
  const handleExportCSV = () => {
    const monthExpenses = state.expenses.filter((e) => e.date && e.date.startsWith(currentMonth));
    exportExpensesToCSV(monthExpenses, currentMonth);
  };

  // Import JSON with Strict Schema Validation & Non-Destructive Merge
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.expenses)) {
          alert('Invalid backup format: Must be a valid Ledger JSON backup containing an expenses array.');
          return;
        }

        // Validate expenses structure & values
        const validExpenses = parsed.expenses.filter((exp: any) => {
          return (
            exp &&
            typeof exp.id === 'string' &&
            exp.id.trim() !== '' &&
            typeof exp.amount === 'number' &&
            !isNaN(exp.amount) &&
            isFinite(exp.amount) &&
            typeof exp.currency === 'string' &&
            typeof exp.category === 'string'
          );
        });

        if (validExpenses.length === 0 && parsed.expenses.length > 0) {
          alert('Import failed: None of the records matched the required financial schema format.');
          return;
        }

        // Non-destructive merge logic: combine existing and imported expenses without deleting
        const expenseMap = new Map<string, any>();
        for (const existing of state.expenses) {
          expenseMap.set(existing.id, existing);
        }
        for (const imported of validExpenses) {
          const current = expenseMap.get(imported.id);
          // If collision, pick record with newer updatedAt or higher version
          if (!current || (imported.updatedAt && new Date(imported.updatedAt).getTime() >= new Date(current.updatedAt || 0).getTime())) {
            expenseMap.set(imported.id, imported);
          }
        }

        const mergedExpenses = Array.from(expenseMap.values());
        const mergedCategories = Array.from(new Set([...state.categories, ...(parsed.categories || [])]));
        const mergedCurrencies = Array.from(new Set([...state.customCurrencies, ...(parsed.customCurrencies || [])]));
        const mergedLenders = Array.from(new Set([...state.lenders, ...(parsed.lenders || [])]));
        const mergedBudgets = { ...state.budgets, ...(parsed.budgets || {}) };

        const mergedState: AppState = {
          expenses: mergedExpenses,
          categories: mergedCategories,
          customCurrencies: mergedCurrencies,
          lenders: mergedLenders,
          budgets: mergedBudgets,
          darkMode: state.darkMode,
          primaryCurrency: state.primaryCurrency,
        };

        if (confirm(`Import and safely merge ${validExpenses.length} records into financial history? Existing data will be preserved.`)) {
          onRestoreState(mergedState);
          alert('Backup safely merged and restored!');
          onClose();
        }
      } catch (err) {
        alert('Could not parse the backup file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Load Sample Data
  const handleLoadSampleData = () => {
    if (confirm('Load sample demonstration data? Existing data will be combined/updated.')) {
      const sample = generateSampleData();
      onRestoreState(sample);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Data Backup, Restore & Export
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Data Backup & Restore Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Local Data Management
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export JSON */}
              <button
                onClick={handleExportJSON}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-2xl text-left hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Export JSON Backup
                </span>
                <span className="text-[10px] text-zinc-500">Download .JSON file for restore</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-2xl text-left hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Export CSV Spreadsheet
                </span>
                <span className="text-[10px] text-zinc-500">Excel / Google Sheets format</span>
              </button>

              {/* Import JSON */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-2xl text-left hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Import JSON Backup
                </span>
                <span className="text-[10px] text-zinc-500">Restore state from .JSON file</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />

              {/* Sample Data */}
              <button
                onClick={handleLoadSampleData}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-2xl text-left hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <Sparkles className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Load Sample Data
                </span>
                <span className="text-[10px] text-zinc-500">Populate demo entries</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
