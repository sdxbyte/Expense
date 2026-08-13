import { db, ensureDbReady } from '../db/dexieDB';
import { EntityType, OperationType, SyncQueueItem } from '../types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'x4xxx-yxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function enqueueSyncOperation(
  entityType: EntityType,
  entityId: string,
  operationType: OperationType,
  payload: any,
  userId?: string | null
): Promise<SyncQueueItem> {
  await ensureDbReady();
  const item: SyncQueueItem = {
    operationId: generateUUID(),
    entityType,
    entityId,
    operationType,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'PENDING',
    userId: userId || null,
  };

  await db.syncQueue.put(item);
  return item;
}

export async function getPendingSyncOperations(): Promise<SyncQueueItem[]> {
  await ensureDbReady();
  const all = await db.syncQueue.toArray();
  return all
    .filter((op) => op.status === 'PENDING' || op.status === 'FAILED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateSyncOperationStatus(
  operationId: string,
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED',
  lastError?: string
): Promise<void> {
  const existing = await db.syncQueue.get(operationId);
  if (existing) {
    await db.syncQueue.update(operationId, {
      status,
      lastError: lastError || existing.lastError,
      retryCount: status === 'FAILED' ? existing.retryCount + 1 : existing.retryCount,
    });
  }
}

export async function removeSyncOperation(operationId: string): Promise<void> {
  await db.syncQueue.delete(operationId);
}

export async function clearSuccessfulSyncOperations(): Promise<void> {
  const successful = await db.syncQueue.where('status').equals('SUCCESS').toArray();
  for (const item of successful) {
    await db.syncQueue.delete(item.operationId);
  }
}

export async function getSyncQueueCount(): Promise<number> {
  const items = await getPendingSyncOperations();
  return items.length;
}
