import React, { useState } from 'react';
import { Expense, ExpenseFilter } from '../types';
import { getCurrencySymbol } from '../data/constants';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Tag, 
  ArrowUpDown, 
  Plus, 
  FileSpreadsheet,
  Repeat,
  HandCoins,
  Wallet,
  History,
  AlertCircle
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  categories: string[];
  currencies: string[];
  filter: ExpenseFilter;
  onFilterChange: (newFilter: ExpenseFilter) => void;
  onEditExpense: (expense: Expense) => void;
  onReverseExpense: (id: string, reason?: string) => void;
  onToggleSettle: (id: string) => void;
  onExportCSV: () => void;
  onAddCategory: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  currencies,
  filter,
  onFilterChange,
  onEditExpense,
  onReverseExpense,
  onToggleSettle,
  onExportCSV,
  onAddCategory,
}) => {
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState<string>('');

  const handleConfirmReversal = (id: string) => {
    const reason = reversalReasonInput.trim() || 'Record correction / cancellation';
    onReverseExpense(id, reason);
    setReversingId(null);
    setReversalReasonInput('');
  };
  // Filter logic
  let filtered = expenses.filter((e) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchCat = e.category?.toLowerCase().includes(q);
      const matchLender = e.lender?.toLowerCase().includes(q);
      const matchAmount = e.amount.toString().includes(q);
      if (!matchDesc && !matchCat && !matchLender && !matchAmount) return false;
    }
    if (filter.currency && e.currency !== filter.currency) return false;
    if (filter.category && e.category !== filter.category) return false;
    if (filter.source && filter.source !== 'all' && e.source !== filter.source) return false;
    return true;
  });

  // Sorting logic
  filtered.sort((a, b) => {
    if (filter.sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (filter.sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (filter.sortBy === 'amount-desc') return b.amount - a.amount;
    if (filter.sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-3">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search expenses, notes, categories..."
              value={filter.search}
              onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onAddCategory}
              className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Manage Categories"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Category</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          {/* Currency Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Currency
            </label>
            <select
              value={filter.currency}
              onChange={(e) => onFilterChange({ ...filter, currency: e.target.value })}
              className="w-full py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">All Currencies</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) => onFilterChange({ ...filter, category: e.target.value })}
              className="w-full py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Source
            </label>
            <select
              value={filter.source}
              onChange={(e) => onFilterChange({ ...filter, source: e.target.value })}
              className="w-full py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="self">Paid Myself</option>
              <option value="borrowed">Borrowed</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Sort By
            </label>
            <select
              value={filter.sortBy}
              onChange={(e) => onFilterChange({ ...filter, sortBy: e.target.value as any })}
              className="w-full py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List Items */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
          <Filter className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No expenses found
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Try adjusting your search terms or filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map((exp) => {
            const symbol = getCurrencySymbol(exp.currency);
            const isBorrowed = exp.source === 'borrowed';

            return (
              <div
                key={exp.id}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left side: Category, description, badges */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold mt-0.5 ${
                      isBorrowed
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                    }`}
                  >
                    {isBorrowed ? <HandCoins className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {exp.category}
                      </span>

                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {exp.date}
                      </span>

                      {exp.status === 'REVERSED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <History className="w-3 h-3" />
                          Reversed
                        </span>
                      )}

                      {exp.status === 'AMENDED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          Amended v{exp.version || 2}
                        </span>
                      )}

                      {isBorrowed && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exp.settled
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {exp.settled ? 'Settled Debt' : `Borrowed (${exp.lender || 'Lender'})`}
                        </span>
                      )}

                      {exp.recurring && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          Recurring
                        </span>
                      )}
                    </div>

                    <p className={`text-xs ${exp.status === 'REVERSED' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-400'} font-normal`}>
                      {exp.description || 'No description provided'}
                    </p>

                    {exp.status === 'REVERSED' && exp.reversalReason && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Reversal Reason: {exp.reversalReason}
                      </p>
                    )}

                    {/* Additional Payment Info */}
                    {!isBorrowed && exp.paymentMethod && (
                      <p className="text-[11px] text-zinc-400 font-medium">
                        Payment: {exp.paymentMethod} {exp.otherPaymentReason ? `(${exp.otherPaymentReason})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Amount & Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60">
                  <div className="text-left sm:text-right">
                    <span className={`text-base font-black ${exp.status === 'REVERSED' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'} tracking-tight`}>
                      {symbol} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                      {exp.currency}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Settle Debt Button */}
                    {isBorrowed && exp.status !== 'REVERSED' && (
                      <button
                        onClick={() => onToggleSettle(exp.id)}
                        className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          exp.settled
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={exp.settled ? 'Mark as Unsettled' : 'Mark as Paid / Settled'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit Button */}
                    {exp.status !== 'REVERSED' && (
                      <button
                        onClick={() => onEditExpense(exp)}
                        className="p-2 text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                        title="Edit / Amend Expense"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Reverse Button (Preserves Financial History) */}
                    {exp.status !== 'REVERSED' ? (
                      reversingId === exp.id ? (
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                          <input
                            type="text"
                            placeholder="Reason..."
                            value={reversalReasonInput}
                            onChange={(e) => setReversalReasonInput(e.target.value)}
                            className="w-24 px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleConfirmReversal(exp.id)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] rounded-lg cursor-pointer"
                          >
                            Reverse
                          </button>
                          <button
                            onClick={() => {
                              setReversingId(null);
                              setReversalReasonInput('');
                            }}
                            className="px-1.5 py-1 text-zinc-400 hover:text-zinc-200 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReversingId(exp.id);
                            setReversalReasonInput('');
                          }}
                          className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Reverse Record (Immutable History)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-zinc-400 px-2 font-mono">
                        Audited
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
