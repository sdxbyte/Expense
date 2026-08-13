import { AppState } from '../types';

export const BASE_CURRENCIES: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  QAR: { symbol: 'QAR', name: 'Qatari Riyal' },
  NPR: { symbol: 'NPR', name: 'Nepalese Rupee' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  AED: { symbol: 'AED', name: 'UAE Dirham' },
};

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Housing & Rent',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Subscriptions',
  'Personal',
  'Travel',
  'Other',
];

export const DEFAULT_PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Mobile Wallet',
  'Other',
];

export const DEFAULT_STATE: AppState = {
  expenses: [],
  categories: DEFAULT_CATEGORIES,
  customCurrencies: [],
  lenders: [],
  budgets: {},
  darkMode: true,
  primaryCurrency: 'QAR',
};

export function getCurrencySymbol(code: string): string {
  if (BASE_CURRENCIES[code]) return BASE_CURRENCIES[code].symbol;
  return code;
}

export function generateSampleData(): AppState {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return {
    expenses: [
      {
        id: 'sample-1',
        amount: 45.5,
        currency: 'QAR',
        category: 'Food & Dining',
        date: `${year}-${month}-02`,
        description: 'Lunch with colleagues',
        source: 'self',
        paymentMethod: 'Credit Card',
        recurring: false,
      },
      {
        id: 'sample-2',
        amount: 250,
        currency: 'QAR',
        category: 'Groceries',
        date: `${year}-${month}-04`,
        description: 'Weekly supermarket shopping',
        source: 'self',
        paymentMethod: 'Debit Card',
        recurring: false,
      },
      {
        id: 'sample-3',
        amount: 120,
        currency: 'USD',
        category: 'Subscriptions',
        date: `${year}-${month}-05`,
        description: 'Annual cloud software license',
        source: 'self',
        paymentMethod: 'Credit Card',
        recurring: true,
      },
      {
        id: 'sample-4',
        amount: 300,
        currency: 'QAR',
        category: 'Shopping',
        date: `${year}-${month}-08`,
        description: 'Borrowed from Alex for headphones',
        source: 'borrowed',
        lender: 'Alex',
        settled: false,
      },
      {
        id: 'sample-5',
        amount: 85,
        currency: 'NPR',
        category: 'Transportation',
        date: `${year}-${month}-09`,
        description: 'Taxi fare in Kathmandu',
        source: 'self',
        paymentMethod: 'Cash',
      },
      {
        id: 'sample-6',
        amount: 1500,
        currency: 'QAR',
        category: 'Housing & Rent',
        date: `${year}-${month}-01`,
        description: 'Monthly apartment rent',
        source: 'self',
        paymentMethod: 'Bank Transfer',
        recurring: true,
      },
    ],
    categories: DEFAULT_CATEGORIES,
    customCurrencies: [],
    lenders: ['Alex', 'John', 'Sarah'],
    budgets: {
      'QAR|Food & Dining': 500,
      'QAR|Groceries': 1000,
      'QAR|Shopping': 400,
    },
    darkMode: true,
    primaryCurrency: 'QAR',
  };
}
