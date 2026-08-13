import { AppState, Expense } from '../types';
import { db, DbBudget, DbMetaItem, ensureDbReady } from '../db/dexieDB';
import { loadStateFromIndexedDB } from '../db/migration';
import { enqueueSyncOperation } from '../services/syncQueue';
import { getCurrentSupabaseUser } from '../services/supabaseClient';
import { DEFAULT_STATE } from '../data/constants';
import { triggerGitAutoSync } from '../services/gitSyncService';
import { AmountSchema, ExpenseSchema, BackupDataSchemaV2 } from './schemas';
import { sanitizeCsvCell, roundMoney } from './crypto';

import { MASTER_SHARED_ACCOUNT_ID } from '../db/migration';

export async function requireAuthUser() {
  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('Authentication required: You must be logged in to access or modify financial records.');
  }
  return user;
}

export async function loadState(currentUserId?: string): Promise<AppState> {
  return await loadStateFromIndexedDB(currentUserId);
}

export async function saveExpense(expense: Expense): Promise<Expense> {
  await ensureDbReady();
  const user = await requireAuthUser();

  // Financial Amount Validation (No silent conversion of negative/NaN/Infinity)
  const parseResult = AmountSchema.safeParse(expense.amount);
  if (!parseResult.success) {
    throw new Error(`Invalid amount: ${parseResult.error.issues[0]?.message || 'Must be a valid positive monetary number'}`);
  }

  const now = new Date().toISOString();
  const updatedExpense: Expense = {
    ...expense,
    amount: roundMoney(expense.amount),
    status: expense.status || 'ACTIVE',
    version: expense.version || 1,
    updatedAt: now,
    deletedAt: null,
    userId: MASTER_SHARED_ACCOUNT_ID,
  };

  // Validate full expense object with Zod
  const validExp = ExpenseSchema.parse(updatedExpense);

  await db.expenses.put(validExp);
  await enqueueSyncOperation('expense', validExp.id, 'CREATE', validExp, user.id);
  triggerGitAutoSync('Add Expense');
  return validExp;
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  await ensureDbReady();
  const user = await requireAuthUser();

  const parseResult = AmountSchema.safeParse(expense.amount);
  if (!parseResult.success) {
    throw new Error(`Invalid amount: ${parseResult.error.issues[0]?.message || 'Must be a valid positive monetary number'}`);
  }

  const now = new Date().toISOString();
  const existing = await db.expenses.get(expense.id);

  const nextVersion = existing?.version ? existing.version + 1 : 1;
  const updatedExpense: Expense = {
    ...expense,
    amount: roundMoney(expense.amount),
    status: expense.status === 'REVERSED' ? 'REVERSED' : 'AMENDED',
    version: nextVersion,
    updatedAt: now,
    userId: MASTER_SHARED_ACCOUNT_ID,
  };

  const validExp = ExpenseSchema.parse(updatedExpense);

  await db.expenses.put(validExp);
  await enqueueSyncOperation('expense', expense.id, 'UPDATE', validExp, user.id);
  triggerGitAutoSync('Update Expense');
  return validExp;
}

// Financial Record Reversal (Immutable Audit History - Records are NEVER deleted)
export async function reverseExpense(id: string, reason: string = 'Correction / Reversal'): Promise<Expense | null> {
  await ensureDbReady();
  const user = await requireAuthUser();
  const now = new Date().toISOString();
  const existing = await db.expenses.get(id);

  if (existing) {
    const reversedExpense: Expense = {
      ...existing,
      status: 'REVERSED',
      reversalReason: reason,
      reversedAt: now,
      version: (existing.version || 1) + 1,
      updatedAt: now,
      userId: MASTER_SHARED_ACCOUNT_ID,
    };

    const validExp = ExpenseSchema.parse(reversedExpense);

    await db.expenses.put(validExp);
    await enqueueSyncOperation('expense', id, 'REVERSE', validExp, user.id);
    triggerGitAutoSync('Reverse Expense');
    return validExp;
  }
  return null;
}

export async function deleteExpense(id: string): Promise<void> {
  await reverseExpense(id, 'Record marked as reversed');
}

export async function saveBudget(currency: string, category: string, amount: number): Promise<void> {
  await ensureDbReady();
  const user = await requireAuthUser();

  const parseResult = AmountSchema.safeParse(amount);
  if (!parseResult.success) {
    throw new Error(`Invalid budget amount: ${parseResult.error.issues[0]?.message}`);
  }

  const now = new Date().toISOString();
  const key = `${currency}|${category}`;

  const budgetItem: DbBudget = {
    id: key,
    currency,
    category,
    amount: roundMoney(amount),
    updatedAt: now,
    deletedAt: null,
    userId: user.id,
  };

  await db.budgets.put(budgetItem);
  await enqueueSyncOperation('budget', key, 'UPDATE', budgetItem, user.id);
  triggerGitAutoSync('Save Budget');
}

export async function saveCategory(categoryName: string): Promise<void> {
  await ensureDbReady();
  const user = await requireAuthUser();
  const now = new Date().toISOString();
  const item: DbMetaItem = {
    id: categoryName,
    name: categoryName,
    updatedAt: now,
    deletedAt: null,
    userId: user.id,
  };

  await db.categories.put(item);
  await enqueueSyncOperation('category', categoryName, 'CREATE', item, user.id);
  triggerGitAutoSync('Save Category');
}

export async function saveCustomCurrency(currencyCode: string): Promise<void> {
  await ensureDbReady();
  const user = await requireAuthUser();
  const now = new Date().toISOString();
  const item: DbMetaItem = {
    id: currencyCode,
    name: currencyCode,
    updatedAt: now,
    deletedAt: null,
    userId: user.id,
  };

  await db.customCurrencies.put(item);
  await enqueueSyncOperation('customCurrency', currencyCode, 'CREATE', item, user.id);
  triggerGitAutoSync('Save Currency');
}

export async function saveLender(lenderName: string): Promise<void> {
  await ensureDbReady();
  const user = await requireAuthUser();
  const now = new Date().toISOString();
  const item: DbMetaItem = {
    id: lenderName,
    name: lenderName,
    updatedAt: now,
    deletedAt: null,
    userId: user.id,
  };

  await db.lenders.put(item);
  await enqueueSyncOperation('lender', lenderName, 'CREATE', item, user.id);
  triggerGitAutoSync('Save Lender');
}

export async function saveSettings(darkMode: boolean, primaryCurrency: string): Promise<void> {
  await ensureDbReady();
  await db.settings.put({ key: 'darkMode', value: darkMode });
  await db.settings.put({ key: 'primaryCurrency', value: primaryCurrency });
  triggerGitAutoSync('Save Settings');
}

/**
 * Transactional, Schema-Validated Backup Restoration (Requirement #5, #6, #7)
 * 1. Validates entire backup schema with Zod
 * 2. Enforces user ownership mapping (cannot override authenticated userId)
 * 3. Uses atomic Dexie transaction with rollback on failure
 */
export async function replaceEntireState(state: AppState): Promise<void> {
  await ensureDbReady();
  const user = await requireAuthUser();
  const now = new Date().toISOString();

  // Construct structured Version 2 backup payload
  const payloadToValidate = {
    schemaVersion: 2,
    applicationVersion: '2.4.0',
    exportedAt: now,
    exportedByUserId: user.id,
    data: {
      expenses: state.expenses || [],
      budgets: state.budgets || {},
      categories: state.categories || [],
      customCurrencies: state.customCurrencies || [],
      lenders: state.lenders || [],
      settings: {
        darkMode: Boolean(state.darkMode),
        primaryCurrency: state.primaryCurrency || 'USD',
      },
    },
  };

  // Step 1-12: Full Schema Validation with Zod
  const parseResult = BackupDataSchemaV2.safeParse(payloadToValidate);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    throw new Error(`Backup Validation Failed (${issue.path.join('.')}): ${issue.message}`);
  }

  const validBackup = parseResult.data;

  // Step 13: Execute atomic transaction to replace data for authenticated user only
  await db.transaction('rw', [db.expenses, db.budgets, db.categories, db.customCurrencies, db.lenders, db.settings, db.syncQueue], async () => {
    // Delete existing user-scoped records only
    await db.expenses.where('userId').equals(user.id).delete();
    await db.budgets.where('userId').equals(user.id).delete();
    await db.categories.where('userId').equals(user.id).delete();
    await db.customCurrencies.where('userId').equals(user.id).delete();
    await db.lenders.where('userId').equals(user.id).delete();

    // 1. Put validated expenses with forced user ownership
    if (validBackup.data.expenses.length > 0) {
      const expsToPut: Expense[] = validBackup.data.expenses.map((e) => ({
        ...e,
        userId: user.id,
        updatedAt: e.updatedAt || now,
      }));
      await db.expenses.bulkPut(expsToPut);
      for (const e of expsToPut) {
        await enqueueSyncOperation('expense', e.id, 'CREATE', e, user.id);
      }
    }

    // 2. Put validated budgets
    const budgetsToPut: DbBudget[] = [];
    for (const [key, amount] of Object.entries(validBackup.data.budgets)) {
      const [currency, category] = key.split('|');
      if (currency && category) {
        const b: DbBudget = { id: key, currency, category, amount, updatedAt: now, deletedAt: null, userId: user.id };
        budgetsToPut.push(b);
        await enqueueSyncOperation('budget', key, 'UPDATE', b, user.id);
      }
    }
    if (budgetsToPut.length > 0) {
      await db.budgets.bulkPut(budgetsToPut);
    }

    // 3. Put categories
    if (validBackup.data.categories.length > 0) {
      const catsToPut: DbMetaItem[] = validBackup.data.categories.map((cat) => ({
        id: cat,
        name: cat,
        updatedAt: now,
        deletedAt: null,
        userId: user.id,
      }));
      await db.categories.bulkPut(catsToPut);
    }

    // 4. Put currencies
    if (validBackup.data.customCurrencies.length > 0) {
      const currToPut: DbMetaItem[] = validBackup.data.customCurrencies.map((curr) => ({
        id: curr,
        name: curr,
        updatedAt: now,
        deletedAt: null,
        userId: user.id,
      }));
      await db.customCurrencies.bulkPut(currToPut);
    }

    // 5. Put lenders
    if (validBackup.data.lenders.length > 0) {
      const lendersToPut: DbMetaItem[] = validBackup.data.lenders.map((l) => ({
        id: l,
        name: l,
        updatedAt: now,
        deletedAt: null,
        userId: user.id,
      }));
      await db.lenders.bulkPut(lendersToPut);
    }

    // 6. Settings
    await db.settings.put({ key: 'darkMode', value: validBackup.data.settings.darkMode });
    await db.settings.put({ key: 'primaryCurrency', value: validBackup.data.settings.primaryCurrency });
  });

  triggerGitAutoSync('Restore State Backup');
}

export function getCurrentMonthKey(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + deltaMonths, 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function formatMonthDisplay(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExpensesToCSV(expenses: Expense[], monthKey: string): void {
  const header = 'ID,Date,Category,Description,Amount,Currency,Source,Payment Method,Lender,Status\n';
  const rows = expenses
    .map((e) => {
      const idCell = sanitizeCsvCell(e.id);
      const dateCell = sanitizeCsvCell(e.date);
      const catCell = sanitizeCsvCell(e.category);
      const descCell = sanitizeCsvCell(e.description);
      const amountCell = roundMoney(e.amount);
      const currCell = sanitizeCsvCell(e.currency);
      const sourceCell = sanitizeCsvCell(e.source);
      const pMethodCell = sanitizeCsvCell(e.paymentMethod);
      const lenderCell = sanitizeCsvCell(e.lender);
      const statusStr = e.source === 'borrowed' ? (e.settled ? 'Settled' : 'Pending') : 'Paid';
      const statusCell = sanitizeCsvCell(statusStr);

      return `${idCell},${dateCell},${catCell},${descCell},${amountCell},${currCell},${sourceCell},${pMethodCell},${lenderCell},${statusCell}`;
    })
    .join('\n');

  downloadFile(header + rows, `expenses_${monthKey}.csv`, 'text/csv');
}
