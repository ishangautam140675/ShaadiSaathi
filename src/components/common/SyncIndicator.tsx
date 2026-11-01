import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { syncEngine, type SyncState } from '../../services/sync/syncEngine';
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface SyncIndicatorProps {
  onOpenDetails: () => void;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ onOpenDetails }) => {
  const { t } = useTranslation();
  const [syncInfo, setSyncInfo] = useState({
    syncState: 'online' as SyncState,
    isOnline: true,
    pendingCount: 0,
    conflictCount: 0,
    failedCount: 0,
    lastSyncedAt: null as string | null,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncInfo(state);
    });
    return unsubscribe;
  }, []);

  const { syncState, isOnline, pendingCount, conflictCount, failedCount } = syncInfo;

  let badgeColor = 'bg-sage/15 text-sage-dark border-sage/30';
  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-sage-dark" />;
  let label = t.sync.statusSynced;

  if (!isOnline) {
    badgeColor = 'bg-charcoal/10 text-charcoal border-gold/40';
    icon = <WifiOff className="w-3.5 h-3.5 text-charcoal" />;
    label = t.sync.statusOffline;
  } else if (conflictCount > 0) {
    badgeColor = 'bg-burgundy/15 text-burgundy border-burgundy/40 animate-pulse';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-burgundy" />;
    label = `${t.sync.statusConflict} (${conflictCount})`;
  } else if (failedCount > 0) {
    badgeColor = 'bg-burgundy/15 text-burgundy border-burgundy/30';
    icon = <AlertCircle className="w-3.5 h-3.5 text-burgundy" />;
    label = `${t.sync.statusError} (${failedCount})`;
  } else if (syncState === 'syncing') {
    badgeColor = 'bg-gold/20 text-gold-dark border-gold/40';
    icon = <RefreshCw className="w-3.5 h-3.5 text-gold-dark animate-spin" />;
    label = t.sync.statusSyncing;
  } else if (pendingCount > 0) {
    badgeColor = 'bg-gold/20 text-gold-dark border-gold/40';
    icon = <Clock className="w-3.5 h-3.5 text-gold-dark" />;
    label = `${pendingCount} ${t.sync.pendingChangesCount}`;
  }

  return (
    <button
      type="button"
      onClick={onOpenDetails}
      aria-label="Open synchronization details"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${badgeColor}`}
      title={
        isOnline
          ? pendingCount > 0
            ? `${pendingCount} changes waiting to synchronize with family server`
            : t.sync.noPendingChanges
          : t.sync.statusOffline
      }
    >
      {icon}
      <span className="truncate max-w-[120px]">{label}</span>
    </button>
  );
};
