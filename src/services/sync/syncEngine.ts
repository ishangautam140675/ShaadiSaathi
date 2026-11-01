import { offlineStorage } from '../storage/indexedDb';

export type SyncState = 'online' | 'offline' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface SyncEngineListener {
  (state: {
    syncState: SyncState;
    isOnline: boolean;
    pendingCount: number;
    conflictCount: number;
    failedCount: number;
    lastSyncedAt: string | null;
  }): void;
}

class SyncEngine {
  private syncState: SyncState = 'online';
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private listeners: Set<SyncEngineListener> = new Set();
  private autoSyncInterval: any = null;
  private currentFamilyId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.syncState = this.isOnline ? 'online' : 'offline';

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.syncState = 'offline';
        this.notify();
      });

      // Periodic background check every 30 seconds when tab is open
      this.autoSyncInterval = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.triggerSync();
        }
      }, 30000);
    }
  }

  public setFamilyId(familyId: string | null) {
    this.currentFamilyId = familyId;
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const queue = await offlineStorage.getAllQueueOperations(this.currentFamilyId || undefined);
    const pendingCount = queue.filter((o) => o.status === 'pending' || o.status === 'syncing').length;
    const conflictCount = queue.filter((o) => o.status === 'conflict').length;
    const failedCount = queue.filter((o) => o.status === 'failed').length;

    let computedState: SyncState = this.syncState;
    if (!this.isOnline) {
      computedState = 'offline';
    } else if (this.isSyncing) {
      computedState = 'syncing';
    } else if (conflictCount > 0) {
      computedState = 'conflict';
    } else if (failedCount > 0) {
      computedState = 'error';
    } else if (pendingCount > 0) {
      computedState = 'syncing';
    } else {
      computedState = this.lastSyncedAt ? 'synced' : 'online';
    }

    for (const listener of this.listeners) {
      try {
        listener({
          syncState: computedState,
          isOnline: this.isOnline,
          pendingCount,
          conflictCount,
          failedCount,
          lastSyncedAt: this.lastSyncedAt,
        });
      } catch (err) {
        console.error('[SyncEngine] Listener error:', err);
      }
    }
  }

  /**
   * Real connectivity probe
   */
  public async probeConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      this.isOnline = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      this.isOnline = res.ok;
      return res.ok;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Main Synchronization Execution Loop
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncing) return;

    const healthy = await this.probeConnectivity();
    if (!healthy) {
      this.syncState = 'offline';
      this.notify();
      return;
    }

    const pending = await offlineStorage.getPendingOperations(this.currentFamilyId || undefined);
    if (pending.length === 0) {
      this.syncState = 'synced';
      this.lastSyncedAt = new Date().toISOString();
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.syncState = 'syncing';
    this.notify();

    try {
      // Mark operations as syncing
      for (const op of pending) {
        await offlineStorage.updateOperationStatus(op.operationId, 'syncing');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      try {
        const token = localStorage.getItem('shaadisaathi_session_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // Storage restricted
      }

      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          operations: pending.map((o) => ({
            operationId: o.operationId,
            entityType: o.entityType,
            entityId: o.entityId,
            operationType: o.operationType,
            payload: o.payload,
            baseVersion: o.baseVersion,
          })),
        }),
      });

      if (!res.ok) {
        // Transient network or server 5xx error
        for (const op of pending) {
          await offlineStorage.updateOperationStatus(op.operationId, 'pending', {
            retryCount: op.retryCount + 1,
            errorInfo: `Server response code ${res.status}`,
          });
        }
        this.syncState = 'error';
        return;
      }

      const data = await res.json();
      const results: Array<{
        operationId: string;
        status: 'synced' | 'conflict' | 'error';
        serverRecord?: any;
        error?: { code: string; message: string };
      }> = data.results || [];

      for (const r of results) {
        if (r.status === 'synced') {
          await offlineStorage.updateOperationStatus(r.operationId, 'synced', {
            serverRecord: r.serverRecord,
          });
          // Remove confirmed operations cleanly
          await offlineStorage.removeOperation(r.operationId);
        } else if (r.status === 'conflict') {
          await offlineStorage.updateOperationStatus(r.operationId, 'conflict', {
            serverRecord: r.serverRecord,
            errorInfo: r.error?.message || 'Conflict detected with server version.',
          });
        } else if (r.status === 'error') {
          await offlineStorage.updateOperationStatus(r.operationId, 'failed', {
            errorInfo: r.error?.message || 'Server rejected mutation.',
            retryCount: 99, // permanent failure
          });
        }
      }

      this.lastSyncedAt = new Date().toISOString();
    } catch (err: any) {
      console.warn('[SyncEngine] Sync batch network exception:', err);
      for (const op of pending) {
        await offlineStorage.updateOperationStatus(op.operationId, 'pending', {
          retryCount: op.retryCount + 1,
          errorInfo: err.message || 'Network failure during sync transmission.',
        });
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Conflict Resolution handler
   */
  public async resolveConflict(
    operationId: string,
    resolution: 'keep_server' | 'overwrite_server'
  ): Promise<void> {
    const queue = await offlineStorage.getAllQueueOperations();
    const op = queue.find((o) => o.operationId === operationId);
    if (!op) return;

    if (resolution === 'keep_server') {
      // User chooses to discard local draft and accept the latest server record
      await offlineStorage.removeOperation(operationId);
      this.notify();
    } else if (resolution === 'overwrite_server') {
      // User chooses to re-apply local changes on top of latest server version
      const latestVersion = op.serverRecord?.version ?? 2;
      op.baseVersion = latestVersion;
      op.status = 'pending';
      op.retryCount = 0;
      op.errorInfo = undefined;
      await offlineStorage.enqueueOperation(op);
      this.notify();
      await this.triggerSync();
    }
  }

  /**
   * Discard a failed or unwanted queued operation
   */
  public async discardOperation(operationId: string): Promise<void> {
    await offlineStorage.removeOperation(operationId);
    this.notify();
  }

  /**
   * Retry all failed or pending operations
   */
  public async retryAll(): Promise<void> {
    const queue = await offlineStorage.getAllQueueOperations(this.currentFamilyId || undefined);
    for (const op of queue) {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.retryCount = 0;
        op.errorInfo = undefined;
        await offlineStorage.enqueueOperation(op);
      }
    }
    await this.triggerSync();
  }

  public destroy() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
  }
}

export const syncEngine = new SyncEngine();
