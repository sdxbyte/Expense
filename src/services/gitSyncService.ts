export interface GitSyncStatus {
  lastSyncedAt: string | null;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastMessage: string | null;
  repository: string;
}

let currentGitStatus: GitSyncStatus = {
  lastSyncedAt: localStorage.getItem('ledger_git_last_synced_at'),
  status: 'IDLE',
  lastMessage: 'GitHub repository initialized and tracked',
  repository: 'sdxbyte/Expense',
};

type GitSyncListener = (status: GitSyncStatus) => void;
let listeners: GitSyncListener[] = [];

export function subscribeGitSyncStatus(listener: GitSyncListener): () => void {
  listeners.push(listener);
  listener(currentGitStatus);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function updateGitStatus(partial: Partial<GitSyncStatus>) {
  currentGitStatus = { ...currentGitStatus, ...partial };
  listeners.forEach((l) => l(currentGitStatus));
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export async function triggerGitAutoSync(reason: string = 'Database or state update'): Promise<boolean> {
  // Debounce rapid calls to avoid git lock contention
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  return new Promise((resolve) => {
    syncDebounceTimer = setTimeout(async () => {
      updateGitStatus({ status: 'SYNCING' });

      try {
        const response = await fetch('/api/git-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason,
            message: `auto-sync: ${reason} [${new Date().toISOString()}]`,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          updateGitStatus({
            status: 'ERROR',
            lastMessage: `Git sync failed: ${errText}`,
          });
          resolve(false);
          return;
        }

        const data = await response.json();
        const nowISO = new Date().toISOString();
        localStorage.setItem('ledger_git_last_synced_at', nowISO);

        updateGitStatus({
          status: 'SUCCESS',
          lastSyncedAt: nowISO,
          lastMessage: data.output || 'Repository synchronized with remote main',
        });
        resolve(true);
      } catch (err: any) {
        console.warn('Git auto-sync HTTP error:', err);
        updateGitStatus({
          status: 'ERROR',
          lastMessage: err?.message || 'Failed to communicate with git sync backend service',
        });
        resolve(false);
      }
    }, 1000);
  });
}
