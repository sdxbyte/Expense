import Dexie, { Table } from 'dexie';
import { Expense, SyncQueueItem } from '../types';

export interface DbBudget {
  id: string; // "USD|Food"
  currency: string;
  category: string;
  amount: number;
  updatedAt: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface DbMetaItem {
  id: string; // name or code
  name: string;
  updatedAt: string;
  deletedAt?: string | null;
  userId?: string | null;
}

export interface DbSetting {
  key: string;
  value: any;
}

export class LedgerDexieDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  budgets!: Table<DbBudget, string>;
  categories!: Table<DbMetaItem, string>;
  customCurrencies!: Table<DbMetaItem, string>;
  lenders!: Table<DbMetaItem, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<DbSetting, string>;

  constructor() {
    super('LedgerDatabase');
    this.version(1).stores({
      expenses: 'id, currency, category, date, source, updatedAt, deletedAt, userId',
      budgets: 'id, currency, category, updatedAt, deletedAt, userId',
      categories: 'id, name, updatedAt, deletedAt, userId',
      customCurrencies: 'id, name, updatedAt, deletedAt, userId',
      lenders: 'id, name, updatedAt, deletedAt, userId',
      syncQueue: 'operationId, entityType, entityId, operationType, status, createdAt, userId',
      settings: 'key',
    });

    this.version(2).stores({
      expenses: 'id, currency, category, date, source, updatedAt, deletedAt, userId',
      budgets: 'id, currency, category, updatedAt, deletedAt, userId',
      categories: 'id, name, updatedAt, deletedAt, userId',
      customCurrencies: 'id, name, updatedAt, deletedAt, userId',
      lenders: 'id, name, updatedAt, deletedAt, userId',
      syncQueue: 'operationId, entityType, entityId, operationType, status, createdAt, userId',
      settings: 'key',
    });

    this.version(3).stores({
      expenses: 'id, currency, category, date, source, status, reversalOf, version, updatedAt, deletedAt, userId',
      budgets: 'id, currency, category, updatedAt, deletedAt, userId',
      categories: 'id, name, updatedAt, deletedAt, userId',
      customCurrencies: 'id, name, updatedAt, deletedAt, userId',
      lenders: 'id, name, updatedAt, deletedAt, userId',
      syncQueue: 'operationId, entityType, entityId, operationType, status, createdAt, userId',
      settings: 'key',
    });
  }
}

export const db = new LedgerDexieDatabase();

export async function ensureDbReady(): Promise<void> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (err: any) {
    console.warn('Dexie database open warning, retrying open:', err);
    try {
      if (!db.isOpen()) {
        await db.open();
      }
    } catch (retryErr) {
      console.error('Failed to open Dexie database:', retryErr);
    }
  }
}
