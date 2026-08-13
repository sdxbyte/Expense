import React from 'react';
import { Expense } from '../types';
import { getCurrencySymbol } from '../data/constants';
import { HandCoins, CheckCircle2, User, AlertCircle, ArrowUpRight } from 'lucide-react';

interface DebtTrackerProps {
  expenses: Expense[];
  onToggleSettle: (id: string) => void;
}

export const DebtTracker: React.FC<DebtTrackerProps> = ({ expenses, onToggleSettle }) => {
  const borrowedExpenses = expenses.filter((e) => e.source === 'borrowed' && e.status !== 'REVERSED');

  // Aggregate by Lender & Currency
  const lenderBalances: Record<string, Record<string, { total: number; settled: number; pending: number; count: number }>> = {};

  borrowedExpenses.forEach((exp) => {
    const lender = exp.lender || 'Unspecified Lender';
    const cur = exp.currency || 'USD';

    if (!lenderBalances[lender]) {
      lenderBalances[lender] = {};
    }
    if (!lenderBalances[lender][cur]) {
      lenderBalances[lender][cur] = { total: 0, settled: 0, pending: 0, count: 0 };
    }

    lenderBalances[lender][cur].total += exp.amount;
    lenderBalances[lender][cur].count += 1;

    if (exp.settled) {
      lenderBalances[lender][cur].settled += exp.amount;
    } else {
      lenderBalances[lender][cur].pending += exp.amount;
    }
  });

  const lenders = Object.keys(lenderBalances);

  if (borrowedExpenses.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
        <HandCoins className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
          No Borrowed Money or Debts Recorded
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          When you borrow money or buy items using someone else's funds, select <span className="font-semibold text-amber-500">"Borrowed"</span> as the expense source to track debt balances here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-amber-500" />
            Lender Balances & Debt Tracker
          </h2>
          <p className="text-xs text-zinc-500">
            Track money owed to friends, family, or creditors across currencies.
          </p>
        </div>
      </div>

      {/* Lender Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lenders.map((lender) => {
          const curData = lenderBalances[lender];

          return (
            <div
              key={lender}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{lender}</h3>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Lender Account
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(curData).map(([cur, stats]) => {
                  const symbol = getCurrencySymbol(cur);
                  const isFullySettled = stats.pending === 0;

                  return (
                    <div
                      key={cur}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          {cur}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFullySettled
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isFullySettled ? 'Fully Settled' : 'Balance Pending'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-zinc-400">Pending Debt:</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">
                          {symbol} {stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {stats.settled > 0 && (
                        <div className="flex items-baseline justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
                          <span>Settled:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {symbol} {stats.settled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Borrowed Expense Ledger List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Borrowed Transactions
        </h3>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {borrowedExpenses.map((exp) => {
            const symbol = getCurrencySymbol(exp.currency);

            return (
              <div
                key={exp.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 px-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {exp.category}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {exp.date}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Lender: {exp.lender || 'Unspecified'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{exp.description || 'No notes'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {symbol} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] font-mono text-zinc-400">
                      {exp.currency}
                    </span>
                  </div>

                  <button
                    onClick={() => onToggleSettle(exp.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      exp.settled
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{exp.settled ? 'Settled' : 'Mark Paid'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
