import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'ledger_bank.db');
export const sqliteDb = new DatabaseSync(dbPath);

export function initSqliteSchema(): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      gmail_message_id TEXT UNIQUE NOT NULL,
      account TEXT,
      direction TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payee_raw TEXT NOT NULL,
      payee_display TEXT,
      category TEXT,
      category_reason TEXT,
      status TEXT NOT NULL DEFAULT 'unsorted',
      email_received_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payee_rules (
      payee_raw TEXT PRIMARY KEY,
      payee_display TEXT,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_gmail_msg ON transactions(gmail_message_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_payee_raw ON transactions(payee_raw);
  `);
}
