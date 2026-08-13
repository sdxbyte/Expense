import React, { useState } from 'react';
import { Expense } from '../types';
import { getCurrencySymbol, BASE_CURRENCIES } from '../data/constants';
import { PiggyBank, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BudgetManagerProps {
  expenses: Expense[];
  categories: string[];
  currencies: string[];
  budgets: Record<string, number>;
  onSetBudget: (currency: string, category: string, amount: number) => void;
  onRemoveBudget: (currency: string, category: string) => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  expenses,
  categories,
  currencies,
  budgets,
  onSetBudget,
  onRemoveBudget,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencies[0] || 'QAR');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || 'Food & Dining');
  const [budgetInput, setBudgetInput] = useState<string>('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      onSetBudget(selectedCurrency, selectedCategory, val);
      setBudgetInput('');
    }
  };

  // Compute category spending for the current month per currency for active expenses
  const categorySpending: Record<string, number> = {};
  expenses
    .filter((exp) => exp.status !== 'REVERSED')
    .forEach((exp) => {
      const key = `${exp.currency}|${exp.category}`;
      categorySpending[key] = (categorySpending[key] || 0) + exp.amount;
    });

  const budgetEntries = Object.entries(budgets);

  return (
    <div className="space-y-6">
      {/* Set Budget Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Monthly Category Budgets
            </h2>
            <p className="text-xs text-zinc-500">
              Set target spending caps for each category to keep expenses under control.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Budget Limit
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 500"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!budgetInput || parseFloat(budgetInput) <= 0}
              className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Budget</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Budgets Progress Gauges */}
      {budgetEntries.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
          <PiggyBank className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No active budgets set
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Fill in the form above to add your first category budget target.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetEntries.map(([key, limitVal]) => {
            const limit = Number(limitVal);
            const [cur, cat] = key.split('|');
            const symbol = getCurrencySymbol(cur);
            const spent = categorySpending[key] || 0;
            const percentage = Math.min((spent / limit) * 100, 100);
            const isOver = spent > limit;
            const isWarning = percentage >= 80 && !isOver;

            return (
              <div
                key={key}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-violet-600 dark:text-violet-400">
                      {cur}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                      {cat}
                    </h3>
                  </div>

                  <button
                    onClick={() => onRemoveBudget(cur, cat)}
                    className="text-xs text-zinc-400 hover:text-red-500 font-medium"
                  >
                    Remove
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-zinc-500">
                      Spent: <strong className="text-zinc-900 dark:text-zinc-100">{symbol}{spent.toLocaleString()}</strong>
                    </span>
                    <span className="text-zinc-500">
                      Limit: <strong className="text-zinc-900 dark:text-zinc-100">{symbol}{limit.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        isOver
                          ? 'bg-red-500'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Status indicator text */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  {isOver ? (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Over budget by {symbol}{(spent - limit).toLocaleString()}
                    </span>
                  ) : isWarning ? (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Near limit ({percentage.toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {symbol}{(limit - spent).toLocaleString()} remaining
                    </span>
                  )}
                  <span className="font-mono text-zinc-400 text-[10px]">
                    {((spent / limit) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
