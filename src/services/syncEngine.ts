import { getSupabaseClient, getCurrentSupabaseUser } from './supabaseClient';
import { db, ensureDbReady } from '../db/dexieDB';
import {
  getPendingSyncOperations,
  updateSyncOperationStatus,
  removeSyncOperation,
} from './syncQueue';
import { AppState, Expense, SyncStateInfo, SyncStatus } from '../types';
import { triggerGitAutoSync } from './gitSyncService';

let syncStateListeners: ((info: SyncStateInfo) => void)[] = [];
let currentSyncInfo: SyncStateInfo = {
  status: 'SYNCED',
  pendingCount: 0,
  lastSyncedAt: localStorage.getItem('ledger_last_synced_at'),
  errorMessage: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  userEmail: null,
};

export function subscribeSyncState(listener: (info: SyncStateInfo) => void): () => void {
  syncStateListeners.push(listener);
  listener(currentSyncInfo);
  return () => {
    syncStateListeners = syncStateListeners.filter((l) => l !== listener);
  };
}

function updateSyncInfo(partial: Partial<SyncStateInfo>): void {
  currentSyncInfo = { ...currentSyncInfo, ...partial };
  for (const listener of syncStateListeners) {
    listener(currentSyncInfo);
  }
}

export async function checkOnlineStatus(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateSyncInfo({ isOnline: false, status: 'OFFLINE' });
    return false;
  }

  const client = getSupabaseClient();
  if (!client) {
    updateSyncInfo({ isOnline: true });
    return true; // Local mode online
  }

  try {
    // Quick ping test to check reachability
    const { error } = await client.from('expenses').select('id').limit(1);
    const isAvailable = !error || error.code === 'PGRST116' || error.message.includes('relation');
    updateSyncInfo({ isOnline: isAvailable });
    return isAvailable;
  } catch (err) {
    updateSyncInfo({ isOnline: false, status: 'OFFLINE' });
    return false;
  }
}

export async function synchronizeData(): Promise<boolean> {
  await ensureDbReady();
  const isOnline = await checkOnlineStatus();
  const pendingOps = await getPendingSyncOperations();
  updateSyncInfo({ pendingCount: pendingOps.length });

  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser();
  updateSyncInfo({ userEmail: user?.email || null });

  if (!client || !user) {
    // Local-only mode or not signed in
    if (pendingOps.length > 0) {
      updateSyncInfo({ status: 'PENDING' });
    } else {
      updateSyncInfo({ status: isOnline ? 'SYNCED' : 'OFFLINE' });
    }
    return true;
  }

  if (!isOnline) {
    updateSyncInfo({ status: 'OFFLINE' });
    return false;
  }

  updateSyncInfo({ status: 'SYNCING', errorMessage: null });

  try {
    // 1. Push local changes
    for (const op of pendingOps) {
      await updateSyncOperationStatus(op.operationId, 'SYNCING');

      let success = false;
      const { entityType, entityId, operationType, payload } = op;

      if (entityType === 'expense') {
        const expenseData: Expense = payload;
        const { error } = await client.from('expenses').upsert({
          id: expenseData.id,
          user_id: user.id,
          amount: Math.abs(Number(expenseData.amount) || 0),
          currency: expenseData.currency,
          category: expenseData.category,
          date: expenseData.date,
          description: expenseData.description || '',
          source: expenseData.source || 'self',
          payment_method: expenseData.paymentMethod || null,
          other_payment_reason: expenseData.otherPaymentReason || null,
          lender: expenseData.lender || null,
          recurring: expenseData.recurring || false,
          settled: expenseData.settled || false,
          status: expenseData.status || 'ACTIVE',
          reversal_of: expenseData.reversalOf || null,
          reversal_reason: expenseData.reversalReason || null,
          reversed_at: expenseData.reversedAt || null,
          version: expenseData.version || 1,
          updated_at: expenseData.updatedAt || new Date().toISOString(),
        });
        success = !error;
      } else if (entityType === 'budget') {
        const { error } = await client.from('budgets').upsert({
          id: entityId,
          user_id: user.id,
          currency: payload.currency,
          category: payload.category,
          amount: payload.amount,
          updated_at: payload.updatedAt || new Date().toISOString(),
        });
        success = !error;
      } else if (entityType === 'category' || entityType === 'customCurrency' || entityType === 'lender') {
        const tableMap = {
          category: 'categories',
          customCurrency: 'custom_currencies',
          lender: 'lenders',
        };
        const tableName = tableMap[entityType];
        const { error } = await client.from(tableName).upsert({
          id: entityId,
          user_id: user.id,
          name: payload.name || entityId,
          updated_at: payload.updatedAt || new Date().toISOString(),
        });
        success = !error;
      }

      if (success) {
        await removeSyncOperation(op.operationId);
      } else {
        await updateSyncOperationStatus(op.operationId, 'FAILED', 'Cloud sync error');
      }
    }

    // 2. Pull remote changes from cloud
    const lastSync = currentSyncInfo.lastSyncedAt;
    
    // Pull Expenses
    let expQuery = client.from('expenses').select('*').eq('user_id', user.id);
    if (lastSync) expQuery = expQuery.gt('updated_at', lastSync);
    const { data: remoteExpenses } = await expQuery;

    if (remoteExpenses && remoteExpenses.length > 0) {
      for (const row of remoteExpenses) {
        const local = await db.expenses.get(row.id);
        const remoteUpdatedAt = new Date(row.updated_at || 0).getTime();
        const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

        if (!local || remoteUpdatedAt >= localUpdatedAt) {
          const mappedExpense: Expense = {
            id: row.id,
            amount: Number(row.amount),
            currency: row.currency,
            category: row.category,
            date: row.date,
            description: row.description || '',
            source: row.source || 'self',
            paymentMethod: row.payment_method,
            otherPaymentReason: row.other_payment_reason,
            lender: row.lender,
            recurring: Boolean(row.recurring),
            settled: Boolean(row.settled),
            status: row.status || 'ACTIVE',
            reversalOf: row.reversal_of || null,
            reversalReason: row.reversal_reason || null,
            reversedAt: row.reversed_at || null,
            version: row.version ? Number(row.version) : 1,
            updatedAt: row.updated_at,
            userId: user.id,
          };
          await db.expenses.put(mappedExpense);
        }
      }
    }

    // Pull Budgets
    let budgetQuery = client.from('budgets').select('*').eq('user_id', user.id);
    if (lastSync) budgetQuery = budgetQuery.gt('updated_at', lastSync);
    const { data: remoteBudgets } = await budgetQuery;

    if (remoteBudgets && remoteBudgets.length > 0) {
      for (const row of remoteBudgets) {
        const local = await db.budgets.get(row.id);
        const remoteUpdatedAt = new Date(row.updated_at || 0).getTime();
        const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

        if (!local || remoteUpdatedAt >= localUpdatedAt) {
          await db.budgets.put({
            id: row.id,
            currency: row.currency,
            category: row.category,
            amount: Number(row.amount),
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
            userId: user.id,
          });
        }
      }
    }

    const nowISO = new Date().toISOString();
    localStorage.setItem('ledger_last_synced_at', nowISO);
    const remainingOps = await getPendingSyncOperations();

    updateSyncInfo({
      status: remainingOps.length === 0 ? 'SYNCED' : 'PENDING',
      pendingCount: remainingOps.length,
      lastSyncedAt: nowISO,
    });

    // Trigger automatic Git repository push sync as per permanent rule
    triggerGitAutoSync('database & state synchronization');

    return true;
  } catch (err: any) {
    console.error('Error during synchronization:', err);
    updateSyncInfo({
      status: 'FAILED',
      errorMessage: err?.message || 'Sync failed',
    });
    return false;
  }
}

// Auto sync listener setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    checkOnlineStatus();
    synchronizeData();
  });
  window.addEventListener('offline', () => {
    updateSyncInfo({ isOnline: false, status: 'OFFLINE' });
  });

  // Periodic background sync every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      synchronizeData();
    }
  }, 30000);
}
