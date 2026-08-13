import React from 'react';
import { Expense } from '../types';
import { getCurrencySymbol } from '../data/constants';
import { Wallet, HandCoins, ArrowUpRight } from 'lucide-react';

interface CurrencyCardsProps {
  expenses: Expense[];
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
}

export const CurrencyCards: React.FC<CurrencyCardsProps> = ({
  expenses,
  selectedCurrency,
  onSelectCurrency,
}) => {
  // Aggregate totals per currency for active non-reversed expenses
  const activeExpenses = expenses.filter((e) => e.status !== 'REVERSED');
  const currencyTotals = activeExpenses.reduce((acc, exp) => {
    const cur = exp.currency || 'USD';
    if (!acc[cur]) {
      acc[cur] = { total: 0, self: 0, borrowed: 0, count: 0 };
    }
    acc[cur].total += exp.amount;
    acc[cur].count += 1;
    if (exp.source === 'borrowed') {
      acc[cur].borrowed += exp.amount;
    } else {
      acc[cur].self += exp.amount;
    }
    return acc;
  }, {} as Record<string, { total: number; self: number; borrowed: number; count: number }>);

  const currencies = Object.keys(currencyTotals);

  if (currencies.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
          Monthly Summary
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No expenses recorded for this month. Click <span className="font-semibold text-violet-600">Add Expense</span> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
          Monthly Overview by Currency
        </h2>
        {selectedCurrency && (
          <button
            onClick={() => onSelectCurrency('')}
            className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            Show All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currencies.map((cur) => {
          const data = currencyTotals[cur];
          const isSelected = selectedCurrency === cur;
          const symbol = getCurrencySymbol(cur);

          return (
            <div
              key={cur}
              onClick={() => onSelectCurrency(isSelected ? '' : cur)}
              className={`relative overflow-hidden rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/25 ring-2 ring-violet-400'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-violet-300 dark:hover:border-violet-700/60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-violet-600 dark:text-violet-400'
                    }`}
                  >
                    {cur}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-zinc-400'}`}>
                    {data.count} {data.count === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>
                <ArrowUpRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
              </div>

              {/* Total Amount */}
              <div className="mb-3">
                <p className={`text-xs font-medium uppercase tracking-wider ${isSelected ? 'text-violet-200' : 'text-zinc-400'}`}>
                  Total Spending
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {symbol} {data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Self vs Borrowed Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-current/10 text-xs">
                <div className="flex items-center gap-1.5">
                  <Wallet className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-200' : 'text-emerald-500'}`} />
                  <div>
                    <span className={`block text-[10px] uppercase font-semibold ${isSelected ? 'text-violet-200' : 'text-zinc-400'}`}>
                      Paid Myself
                    </span>
                    <span className="font-bold">
                      {symbol}{data.self.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <HandCoins className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-200' : 'text-amber-500'}`} />
                  <div>
                    <span className={`block text-[10px] uppercase font-semibold ${isSelected ? 'text-violet-200' : 'text-zinc-400'}`}>
                      Borrowed
                    </span>
                    <span className="font-bold">
                      {symbol}{data.borrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
