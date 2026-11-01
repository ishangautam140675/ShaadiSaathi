export interface QueuedSyncOperation {
  operationId: string;
  familyId: string;
  userId: string;
  entityType: 'expense' | 'vendor' | 'vendor_payment' | 'shopping' | 'gift' | 'checklist' | 'budget';
  entityId?: string;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  baseVersion?: number;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastAttemptAt?: string;
  errorInfo?: string;
  serverRecord?: any;
}

export interface CachedRecord {
  compositeKey: string; // `${familyId}:${entityType}:${id}`
  familyId: string;
  entityType: string;
  id: string;
  data: any;
  version: number;
  syncStatus: 'synced' | 'draft_offline';
  updatedAt: string;
}

const DB_NAME = 'shaadisaathi_offline_db';
const DB_VERSION = 1;

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private memoryQueue: Map<string, QueuedSyncOperation> = new Map();

  private isIndexedDbAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  public async getDb(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDbAvailable()) return null;
    if (this.db) return this.db;

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'operationId' });
            queueStore.createIndex('by_status', 'status', { unique: false });
            queueStore.createIndex('by_family', 'familyId', { unique: false });
            queueStore.createIndex('by_created', 'createdAt', { unique: false });
          }

          if (!db.objectStoreNames.contains('cached_records')) {
            const cacheStore = db.createObjectStore('cached_records', { keyPath: 'compositeKey' });
            cacheStore.createIndex('by_family_entity', ['familyId', 'entityType'], { unique: false });
          }

          if (!db.objectStoreNames.contains('storage_metadata')) {
            db.createObjectStore('storage_metadata', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };

        request.onerror = () => {
          console.warn('[OfflineStorage] IndexedDB open error, using in-memory queue fallback.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[OfflineStorage] IndexedDB not accessible:', err);
        resolve(null);
      }
    });
  }

  // -------------------------------------------------------------
  // Sync Queue Operations
  // -------------------------------------------------------------

  public async enqueueOperation(op: QueuedSyncOperation): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryQueue.set(op.operationId, op);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingOperations(familyId?: string): Promise<QueuedSyncOperation[]> {
    const db = await this.getDb();
    if (!db) {
      const ops = Array.from(this.memoryQueue.values());
      return ops.filter((o) => (familyId ? o.familyId === familyId : true) && o.status === 'pending');
    }

    return new Promise((resolve) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => {
        const all: QueuedSyncOperation[] = req.result || [];
        const pending = all.filter((o) => (familyId ? o.familyId === familyId : true) && o.status === 'pending');
        // Sort by createdAt ascending to preserve dependency order
        pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        resolve(pending);
      };
      req.onerror = () => resolve([]);
    });
  }

  public async getAllQueueOperations(familyId?: string): Promise<QueuedSyncOperation[]> {
    const db = await this.getDb();
    if (!db) {
      const ops = Array.from(this.memoryQueue.values());
      return ops.filter((o) => (familyId ? o.familyId === familyId : true));
    }

    return new Promise((resolve) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => {
        const all: QueuedSyncOperation[] = req.result || [];
        const filtered = all.filter((o) => (familyId ? o.familyId === familyId : true));
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    });
  }

  public async updateOperationStatus(
    operationId: string,
    status: QueuedSyncOperation['status'],
    options?: { errorInfo?: string; serverRecord?: any; retryCount?: number }
  ): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      const op = this.memoryQueue.get(operationId);
      if (op) {
        op.status = status;
        if (options?.errorInfo !== undefined) op.errorInfo = options.errorInfo;
        if (options?.serverRecord !== undefined) op.serverRecord = options.serverRecord;
        if (options?.retryCount !== undefined) op.retryCount = options.retryCount;
        op.lastAttemptAt = new Date().toISOString();
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.get(operationId);
      req.onsuccess = () => {
        const op: QueuedSyncOperation | undefined = req.result;
        if (op) {
          op.status = status;
          if (options?.errorInfo !== undefined) op.errorInfo = options.errorInfo;
          if (options?.serverRecord !== undefined) op.serverRecord = options.serverRecord;
          if (options?.retryCount !== undefined) op.retryCount = options.retryCount;
          op.lastAttemptAt = new Date().toISOString();
          store.put(op);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async removeOperation(operationId: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryQueue.delete(operationId);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(operationId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearSyncedOperations(familyId?: string): Promise<void> {
    const all = await this.getAllQueueOperations(familyId);
    for (const op of all) {
      if (op.status === 'synced') {
        await this.removeOperation(op.operationId);
      }
    }
  }

  public async clearAllQueue(): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryQueue.clear();
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      tx.objectStore('sync_queue').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // -------------------------------------------------------------
  // Storage Quota & Persistence Health
  // -------------------------------------------------------------

  public async checkStorageHealth(): Promise<{
    persisted: boolean;
    quotaBytes?: number;
    usageBytes?: number;
    usagePercent?: number;
  }> {
    let persisted = false;
    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;
    let usagePercent: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quotaBytes = estimate.quota;
        usageBytes = estimate.usage;
        if (quotaBytes && usageBytes) {
          usagePercent = Math.round((usageBytes / quotaBytes) * 100);
        }
      }
    }

    return {
      persisted,
      quotaBytes,
      usageBytes,
      usagePercent,
    };
  }

  public async requestPersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
    return false;
  }
}

export const offlineStorage = new OfflineStorageManager();
