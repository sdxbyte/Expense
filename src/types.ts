export type ExpenseSource = 'self' | 'borrowed';
export type ExpenseStatus = 'ACTIVE' | 'REVERSED' | 'AMENDED';

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  source: ExpenseSource;
  paymentMethod?: string;
  otherPaymentReason?: string;
  lender?: string;
  recurring?: boolean;
  settled?: boolean;
  status?: ExpenseStatus; // ACTIVE, REVERSED, AMENDED
  reversalOf?: string | null; // ID of original record if this is a reversal
  reversalReason?: string | null; // Reason for reversal
  reversedAt?: string | null; // ISO timestamp when reversed
  version?: number; // Revision / version history counter
  updatedAt?: string; // ISO string
  deletedAt?: string | null; // Deprecated - financial records are never deleted
  userId?: string | null;
}

export interface Budget {
  id?: string; // key e.g. "USD|Food"
  currency: string;
  category: string;
  amount: number;
  updatedAt?: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface CategoryItem {
  id: string; // name
  name: string;
  updatedAt?: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface CustomCurrencyItem {
  id: string; // code
  code: string;
  updatedAt?: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface LenderItem {
  id: string; // name
  name: string;
  updatedAt?: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface AppState {
  expenses: Expense[];
  categories: string[];
  customCurrencies: string[];
  lenders: string[];
  budgets: Record<string, number>; // key e.g. "USD|Food" -> amount
  darkMode: boolean;
  primaryCurrency: string;
}

export interface ExpenseFilter {
  search: string;
  currency: string;
  category: string;
  source: string; // 'all' | 'self' | 'borrowed'
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
  showReversals?: boolean;
}

export type EntityType = 'expense' | 'category' | 'customCurrency' | 'lender' | 'budget';
export type OperationType = 'CREATE' | 'UPDATE' | 'REVERSE';
export type SyncStatus = 'SYNCED' | 'SYNCING' | 'PENDING' | 'FAILED' | 'OFFLINE';

export interface SyncQueueItem {
  operationId: string; // unique ID
  entityType: EntityType;
  entityId: string;
  operationType: OperationType;
  payload: any;
  createdAt: string; // ISO string
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  lastError?: string;
  userId?: string | null;
}

export interface SyncStateInfo {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt?: string | null;
  errorMessage?: string | null;
  isOnline: boolean;
  userEmail?: string | null;
}

