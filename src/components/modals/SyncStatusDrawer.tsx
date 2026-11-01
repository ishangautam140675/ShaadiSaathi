import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { syncEngine } from '../../services/sync/syncEngine';
import { offlineStorage, type QueuedSyncOperation } from '../../services/storage/indexedDb';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import {
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Clock,
  HardDrive,
  Trash2,
  CheckCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface SyncStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncStatusDrawer: React.FC<SyncStatusDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<QueuedSyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    persisted: boolean;
    quotaBytes?: number;
    usageBytes?: number;
    usagePercent?: number;
  }>({ persisted: false });

  const [conflictOp, setConflictOp] = useState<QueuedSyncOperation | null>(null);

  const loadData = async () => {
    const allOps = await offlineStorage.getAllQueueOperations();
    setQueue(allOps);
    const health = await offlineStorage.checkStorageHealth();
    setStorageInfo(health);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setIsOnline(state.isOnline);
      setIsSyncing(state.syncState === 'syncing');
      if (isOpen) {
        loadData();
      }
    });
    return unsubscribe;
  }, [isOpen]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncEngine.triggerSync();
    await loadData();
    setIsSyncing(false);
  };

  const handleRetryAll = async () => {
    await syncEngine.retryAll();
    await loadData();
  };

  const handleDiscard = async (operationId: string) => {
    await syncEngine.discardOperation(operationId);
    await loadData();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t.sync.drawerTitle}
        subtitle={t.sync.drawerSubtitle}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Network & Storage Header Card */}
          <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 card-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isOnline ? 'bg-sage/20 text-sage-dark' : 'bg-charcoal/15 text-charcoal'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5 text-sage-dark" /> : <WifiOff className="w-5 h-5 text-charcoal" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-burgundy font-royal">
                    {isOnline ? t.sync.statusOnline : t.sync.statusOffline}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOnline ? 'bg-sage/20 text-sage-dark' : 'bg-gold/20 text-gold-dark'
                    }`}
                  >
                    {isOnline ? 'Connected' : 'Offline Ready'}
                  </span>
                </div>
                <div className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-gold-dark" />
                  <span>
                    IndexedDB: {storageInfo.persisted ? t.sync.storagePersistent : t.sync.storageStandard}
                    {storageInfo.usagePercent !== undefined && ` (${storageInfo.usagePercent}% used)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={isSyncing || !isOnline}
                onClick={handleSyncNow}
                className="px-3.5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold-light ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t.sync.syncingBtn : t.sync.syncNowBtn}</span>
              </button>
            </div>
          </div>

          {/* Storage Safety Notice */}
          <div className="p-3.5 rounded-2xl bg-gold/15 border border-gold/40 text-xs text-charcoal flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.sync.storageWarning}</p>
          </div>

          {/* Queue Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
                {t.sync.pendingChangesCount} ({queue.length})
              </h4>
              {queue.some((o) => o.status === 'failed') && (
                <button
                  type="button"
                  onClick={handleRetryAll}
                  className="text-xs text-burgundy hover:underline font-semibold cursor-pointer"
                >
                  {t.sync.retryAllBtn}
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-6 rounded-2xl bg-ivory-light border border-gold/25 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-sage-dark mx-auto" />
                <p className="text-xs sm:text-sm text-charcoal font-medium">
                  {t.sync.noPendingChanges}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {queue.map((op) => {
                  const title = op.payload?.title || op.payload?.name || `${op.entityType} ${op.operationType.toLowerCase()}`;
                  const amount = op.payload?.amount ?? op.payload?.estimatedPrice;

                  return (
                    <div
                      key={op.operationId}
                      className="p-3 rounded-xl border border-gold/30 bg-ivory flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark font-bold text-[10px] uppercase flex-shrink-0">
                          {op.entityType}
                        </span>
                        <div className="min-w-0">
                          <strong className="text-charcoal block truncate text-xs">{title}</strong>
                          <div className="text-[11px] text-charcoal-muted flex items-center gap-2">
                            {amount !== undefined && <span className="font-semibold text-burgundy">₹{amount.toLocaleString('en-IN')}</span>}
                            <span>{new Date(op.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {op.status === 'conflict' ? (
                          <button
                            type="button"
                            onClick={() => setConflictOp(op)}
                            className="px-2.5 py-1 rounded-lg bg-burgundy/15 text-burgundy border border-burgundy/40 text-[11px] font-bold cursor-pointer hover:bg-burgundy/25 flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 text-burgundy" />
                            <span>{t.sync.reviewConflictBtn}</span>
                          </button>
                        ) : op.status === 'failed' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-burgundy flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-burgundy" />
                              <span>{t.sync.statusError}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDiscard(op.operationId)}
                              title={t.sync.discardBtn}
                              className="p-1 rounded-md text-charcoal-muted hover:text-burgundy cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : op.status === 'syncing' ? (
                          <span className="text-[11px] font-semibold text-gold-dark flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-gold-dark animate-spin" />
                            <span>{t.sync.statusSyncing}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gold-dark" />
                            <span>{t.sync.statusPending}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-ivory border border-gold/40 text-xs font-semibold text-charcoal hover:bg-rose/40 cursor-pointer"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </Modal>

      {/* Nested Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={Boolean(conflictOp)}
        onClose={() => setConflictOp(null)}
        operation={conflictOp}
        onResolved={loadData}
      />
    </>
  );
};
