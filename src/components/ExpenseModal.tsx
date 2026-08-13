import React, { useState, useEffect } from 'react';
import { Expense, ExpenseSource } from '../types';
import { BASE_CURRENCIES } from '../data/constants';
import { X, Plus, Wallet, HandCoins, Check } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id'> & { id?: string }) => void;
  initialExpense?: Expense | null;
  categories: string[];
  currencies: string[];
  lenders: string[];
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  categories,
  currencies,
  lenders,
}) => {
  const [source, setSource] = useState<ExpenseSource>('self');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('QAR');
  const [customCurrency, setCustomCurrency] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0] || 'Food & Dining');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Debit Card');
  const [otherPaymentReason, setOtherPaymentReason] = useState<string>('');
  const [lender, setLender] = useState<string>('');
  const [customLender, setCustomLender] = useState<string>('');
  const [recurring, setRecurring] = useState<boolean>(false);

  useEffect(() => {
    if (initialExpense) {
      setSource(initialExpense.source || 'self');
      setAmount(initialExpense.amount ? initialExpense.amount.toString() : '');
      setCurrency(initialExpense.currency || 'QAR');
      setCategory(initialExpense.category || categories[0]);
      setDate(initialExpense.date || new Date().toISOString().split('T')[0]);
      setDescription(initialExpense.description || '');
      setPaymentMethod(initialExpense.paymentMethod || 'Debit Card');
      setOtherPaymentReason(initialExpense.otherPaymentReason || '');
      setLender(initialExpense.lender || '');
      setRecurring(!!initialExpense.recurring);
    } else {
      setSource('self');
      setAmount('');
      setCurrency(currencies[0] || 'QAR');
      setCategory(categories[0] || 'Food & Dining');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPaymentMethod('Debit Card');
      setOtherPaymentReason('');
      setLender(lenders[0] || '');
      setRecurring(false);
    }
  }, [initialExpense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const finalCurrency = currency === '__other__' ? customCurrency.trim().toUpperCase() : currency;
    const finalCategory = category === '__other__' ? customCategory.trim() : category;
    const finalLender = source === 'borrowed' ? (lender === '__other__' ? customLender.trim() : lender) : '';

    if (!finalCurrency || !finalCategory) return;

    onSave({
      id: initialExpense ? initialExpense.id : undefined,
      amount: numAmount,
      currency: finalCurrency,
      category: finalCategory,
      date,
      description,
      source,
      paymentMethod: source === 'self' ? paymentMethod : undefined,
      otherPaymentReason: source === 'self' && paymentMethod === 'Other' ? otherPaymentReason : undefined,
      lender: finalLender,
      recurring,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {initialExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Source Toggle */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
              Expense Source
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setSource('self')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  source === 'self'
                    ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Paid Myself</span>
              </button>

              <button
                type="button"
                onClick={() => setSource('borrowed')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  source === 'borrowed'
                    ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <HandCoins className="w-4 h-4" />
                <span>Borrowed Money</span>
              </button>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full py-2.5 px-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__other__">+ Custom Currency</option>
              </select>
            </div>
          </div>

          {/* Custom Currency input if selected */}
          {currency === '__other__' && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Custom Currency Code
              </label>
              <input
                type="text"
                placeholder="e.g. BTC, JPY, EUR"
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value)}
                className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__other__">+ New Category</option>
            </select>
          </div>

          {/* Custom Category input */}
          {category === '__other__' && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                New Category Name
              </label>
              <input
                type="text"
                placeholder="e.g. Books, Gifts, Fitness"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          {/* Payment Method vs Lender Name */}
          {source === 'self' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Payment">Mobile Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                Lender / Who did you borrow from? *
              </label>
              <select
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                {lenders.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value="__other__">+ Add New Lender</option>
              </select>

              {lender === '__other__' && (
                <input
                  type="text"
                  placeholder="Enter lender's name"
                  value={customLender}
                  onChange={(e) => setCustomLender(e.target.value)}
                  className="mt-2 w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs text-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Grocery items, dinner with family"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Recurring Expense Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="recurringCheck"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="recurringCheck" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
              This is a recurring monthly expense (rent, subscription, etc.)
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialExpense ? 'Save Changes' : 'Add Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
