import React, { useState } from 'react';
import { Expense } from '../types';
import { getCurrencySymbol } from '../data/constants';
import { BarChart3, PieChart, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

interface AnalyticsChartsProps {
  expenses: Expense[];
  currentMonth: string;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ expenses, currentMonth }) => {
  const activeExpenses = expenses.filter((e) => e.status !== 'REVERSED');

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return activeExpenses.length > 0 ? activeExpenses[0].currency : 'QAR';
  });

  // Extract all available currencies for this month
  const availableCurrencies = Array.from(new Set(activeExpenses.map((e) => e.currency)));
  const activeCurrency = availableCurrencies.includes(selectedCurrency)
    ? selectedCurrency
    : availableCurrencies[0] || 'QAR';

  const monthExpenses = activeExpenses.filter((e) => e.currency === activeCurrency);
  const currencySymbol = getCurrencySymbol(activeCurrency);

  // Group by day of month for daily bar chart
  const [yearStr, monthStr] = currentMonth.split('-');
  const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();

  const dailyTotals: Record<number, number> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    dailyTotals[i] = 0;
  }

  monthExpenses.forEach((exp) => {
    const day = parseInt(exp.date.split('-')[2], 10);
    if (dailyTotals[day] !== undefined) {
      dailyTotals[day] += exp.amount;
    }
  });

  const maxDailyAmount = Math.max(...Object.values(dailyTotals), 1);

  // Group by Category
  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach((exp) => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryList = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Category Color Palette
  const colors = [
    '#7C5CFF', // violet
    '#22D3B8', // teal
    '#FF5470', // pink/danger
    '#FFB020', // amber/warn
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // orange
    '#EC4899', // rose
    '#8B5CF6', // purple
    '#06B6D4', // cyan
  ];

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
        <TrendingUp className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
          No Data for Analytics
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Add expenses for this month to see visual charts, daily spending breakdowns, and category insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Selector Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Analytics Currency
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {availableCurrencies.map((cur) => (
            <button
              key={cur}
              onClick={() => setSelectedCurrency(cur)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCurrency === cur
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                Daily Spending Pattern
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {currencySymbol} {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent across {monthExpenses.length} entries
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-1 bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-lg">
              {activeCurrency}
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
            {Object.entries(dailyTotals).map(([dayStr, amount]) => {
              const heightPercent = maxDailyAmount > 0 ? (amount / maxDailyAmount) * 100 : 0;
              const day = parseInt(dayStr, 10);
              const hasSpent = amount > 0;

              return (
                <div
                  key={day}
                  className="flex-1 min-w-[12px] flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  {hasSpent && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                      Day {day}: {currencySymbol}{amount.toLocaleString()}
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    style={{ height: `${Math.max(heightPercent, hasSpent ? 8 : 2)}%` }}
                    className={`w-full rounded-t-sm transition-all ${
                      hasSpent
                        ? 'bg-violet-600 dark:bg-violet-500 group-hover:bg-violet-400'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  />

                  {/* Day label */}
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
                    {day % 5 === 0 || day === 1 ? day : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 font-medium">
            <span>Day 1</span>
            <span>Day {daysInMonth}</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-teal-500" />
              Category Breakdown
            </h3>
            <span className="text-xs text-zinc-400 font-medium">
              {categoryList.length} Categories
            </span>
          </div>

          {/* Category List Progress Bars */}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {categoryList.map((item, idx) => {
              const color = colors[idx % colors.length];

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {currencySymbol} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-zinc-400 w-10 text-right font-mono">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
