import { db, DbBudget, DbMetaItem, ensureDbReady } from './dexieDB';
import { AppState, Expense } from '../types';
import { DEFAULT_STATE } from '../data/constants';

const LOCALSTORAGE_KEY = 'ledger_expense_tracker_state';
const MIGRATION_FLAG_KEY = 'ledger_dexie_migrated_v1';

export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  try {
    await ensureDbReady();
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const now = new Date().toISOString();

    // 1. Migrate Expenses with UNASSIGNED_MIGRATED ownership
    if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
      const expsToPut: Expense[] = [];
      for (const exp of parsed.expenses as Expense[]) {
        const existing = await db.expenses.get(exp.id);
        if (!existing) {
          expsToPut.push({
            ...exp,
            userId: exp.userId || 'UNASSIGNED_MIGRATED',
            updatedAt: exp.updatedAt || now,
            deletedAt: exp.deletedAt || null,
          });
        }
      }
      if (expsToPut.length > 0) {
        await db.expenses.bulkPut(expsToPut);
      }
    }

    // 2. Migrate Budgets with UNASSIGNED_MIGRATED ownership
    if (parsed.budgets && typeof parsed.budgets === 'object') {
      const budgetsToPut: DbBudget[] = [];
      for (const [key, amount] of Object.entries(parsed.budgets)) {
        const [currency, category] = key.split('|');
        if (currency && category) {
          const existing = await db.budgets.get(key);
          if (!existing) {
            budgetsToPut.push({
              id: key,
              currency,
              category,
              amount: Number(amount),
              updatedAt: now,
              deletedAt: null,
              userId: 'UNASSIGNED_MIGRATED',
            });
          }
        }
      }
      if (budgetsToPut.length > 0) {
        await db.budgets.bulkPut(budgetsToPut);
      }
    }

    // 3. Migrate Categories
    const categories: string[] = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : DEFAULT_STATE.categories;
    const catsToPut: DbMetaItem[] = [];
    for (const cat of categories) {
      const existing = await db.categories.get(cat);
      if (!existing) {
        catsToPut.push({ id: cat, name: cat, updatedAt: now, deletedAt: null, userId: 'UNASSIGNED_MIGRATED' });
      }
    }
    if (catsToPut.length > 0) {
      await db.categories.bulkPut(catsToPut);
    }

    // 4. Migrate Custom Currencies
    if (Array.isArray(parsed.customCurrencies)) {
      const currToPut: DbMetaItem[] = [];
      for (const code of parsed.customCurrencies) {
        const existing = await db.customCurrencies.get(code);
        if (!existing) {
          currToPut.push({ id: code, name: code, updatedAt: now, deletedAt: null, userId: 'UNASSIGNED_MIGRATED' });
        }
      }
      if (currToPut.length > 0) {
        await db.customCurrencies.bulkPut(currToPut);
      }
    }

    // 5. Migrate Lenders
    if (Array.isArray(parsed.lenders)) {
      const lendersToPut: DbMetaItem[] = [];
      for (const l of parsed.lenders) {
        const existing = await db.lenders.get(l);
        if (!existing) {
          lendersToPut.push({ id: l, name: l, updatedAt: now, deletedAt: null, userId: 'UNASSIGNED_MIGRATED' });
        }
      }
      if (lendersToPut.length > 0) {
        await db.lenders.bulkPut(lendersToPut);
      }
    }

    // 6. Migrate App Settings
    await db.settings.put({ key: 'darkMode', value: Boolean(parsed.darkMode) });
    await db.settings.put({ key: 'primaryCurrency', value: parsed.primaryCurrency || DEFAULT_STATE.primaryCurrency });

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Error migrating localStorage to IndexedDB:', err);
  }
}

export const MASTER_SHARED_ACCOUNT_ID = 'master_shared_ledger_account';

/**
 * Single Unified Master Account IndexedDB Data Loader.
 * Session-wise user identification loads and persists data to a single unified master account.
 */
export async function loadStateFromIndexedDB(currentUserId?: string): Promise<AppState> {
  try {
    await ensureDbReady();
    const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (!isMigrated) {
      await migrateLocalStorageToIndexedDB();
    }

    if (!currentUserId) {
      return DEFAULT_STATE;
    }

    // Load all active expenses across the unified master account
    const allExpenses = await db.expenses.toArray();
    const activeExpenses = allExpenses.filter((e) => !e.deletedAt);

    // Read all budgets across the unified master account
    const allBudgets = await db.budgets.toArray();
    const activeBudgets = allBudgets.filter((b) => !b.deletedAt);
    const budgetsRecord: Record<string, number> = {};
    for (const b of activeBudgets) {
      budgetsRecord[b.id] = b.amount;
    }

    // Read all categories
    const allCategories = await db.categories.toArray();
    const activeCategories = allCategories.filter((c) => !c.deletedAt).map((c) => c.name);
    const categoriesList = activeCategories.length > 0 ? activeCategories : DEFAULT_STATE.categories;

    // Read all custom currencies
    const allCurrencies = await db.customCurrencies.toArray();
    const activeCurrencies = allCurrencies.filter((c) => !c.deletedAt).map((c) => c.name);

    // Read all lenders
    const allLenders = await db.lenders.toArray();
    const activeLenders = allLenders.filter((l) => !l.deletedAt).map((l) => l.name);

    // Read settings
    const darkModeSetting = await db.settings.get('darkMode');
    const primaryCurrencySetting = await db.settings.get('primaryCurrency');

    return {
      expenses: activeExpenses,
      categories: categoriesList,
      customCurrencies: activeCurrencies,
      lenders: activeLenders,
      budgets: budgetsRecord,
      darkMode: darkModeSetting ? Boolean(darkModeSetting.value) : DEFAULT_STATE.darkMode,
      primaryCurrency: primaryCurrencySetting ? String(primaryCurrencySetting.value) : DEFAULT_STATE.primaryCurrency,
    };
  } catch (err) {
    console.error('Failed to load state from IndexedDB:', err);
    return DEFAULT_STATE;
  }
}
