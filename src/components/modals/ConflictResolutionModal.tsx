import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { syncEngine } from '../../services/sync/syncEngine';
import type { QueuedSyncOperation } from '../../services/storage/indexedDb';
import { AlertTriangle, Server, Smartphone, Check, ArrowRight } from 'lucide-react';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: QueuedSyncOperation | null;
  onResolved?: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  operation,
  onResolved,
}) => {
  const { t, language } = useTranslation();
  const [isResolving, setIsResolving] = useState(false);

  if (!operation) return null;

  const local = operation.payload || {};
  const server = operation.serverRecord || {};

  const handleResolve = async (resolution: 'keep_server' | 'overwrite_server') => {
    try {
      setIsResolving(true);
      await syncEngine.resolveConflict(operation.operationId, resolution);
      if (onResolved) onResolved();
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.sync.conflictTitle}
      subtitle={t.sync.conflictSubtitle}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Financial Security Guard Banner */}
        <div className="p-3.5 rounded-2xl bg-burgundy/10 border border-burgundy/30 text-xs text-charcoal flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
          <span>{t.sync.conflictFinancialWarning}</span>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Draft Card */}
          <div className="p-4 rounded-2xl border-2 border-gold/40 bg-ivory-light space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gold/25">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-burgundy" />
                <h3 className="font-bold text-sm text-burgundy font-royal">
                  {t.sync.localDraftTitle}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark">
                {language === 'hi' ? 'फोन / लैपटॉप ड्राफ्ट' : 'Your Device'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-charcoal">
              <div>
                <span className="text-charcoal-muted block text-[11px]">Title / Name:</span>
                <strong className="text-sm font-semibold text-charcoal">{local.title || local.name || '—'}</strong>
              </div>

              {(local.amount !== undefined || local.estimatedPrice !== undefined) && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Amount / Estimate:</span>
                  <strong className="text-sm font-bold text-burgundy">
                    ₹{((local.amount ?? local.estimatedPrice) || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              )}

              {local.paidAmount !== undefined && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Paid Amount:</span>
                  <span className="font-semibold text-sage-dark">
                    ₹{(local.paidAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {local.category && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Category:</span>
                  <span className="capitalize font-medium">{local.category}</span>
                </div>
              )}

              {local.notes && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Notes:</span>
                  <span className="italic text-charcoal-muted">{local.notes}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isResolving}
              onClick={() => handleResolve('overwrite_server')}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{t.sync.overwriteServerBtn}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-light" />
            </button>
          </div>

          {/* Server Record Card */}
          <div className="p-4 rounded-2xl border-2 border-sage/40 bg-sage/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sage/20">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sage-dark" />
                <h3 className="font-bold text-sm text-sage-dark font-royal">
                  {t.sync.serverRecordTitle}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sage/20 text-sage-dark">
                {language === 'hi' ? 'सर्वर वर्शन' : `Server v${server.version || 2}`}
              </span>
            </div>

            <div className="space-y-2 text-xs text-charcoal">
              <div>
                <span className="text-charcoal-muted block text-[11px]">Title / Name:</span>
                <strong className="text-sm font-semibold text-charcoal">{server.title || server.name || '—'}</strong>
              </div>

              {(server.amount !== undefined || server.estimatedPrice !== undefined) && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Amount / Estimate:</span>
                  <strong className="text-sm font-bold text-burgundy">
                    ₹{((server.amount ?? server.estimatedPrice) || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              )}

              {server.paidAmount !== undefined && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Paid Amount:</span>
                  <span className="font-semibold text-sage-dark">
                    ₹{(server.paidAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {server.category && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Category:</span>
                  <span className="capitalize font-medium">{server.category}</span>
                </div>
              )}

              {server.notes && (
                <div>
                  <span className="text-charcoal-muted block text-[11px]">Notes:</span>
                  <span className="italic text-charcoal-muted">{server.notes}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isResolving}
              onClick={() => handleResolve('keep_server')}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-sage-dark hover:bg-sage text-ivory text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-ivory" />
              <span>{t.sync.keepServerBtn}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gold/40 text-xs font-semibold text-charcoal hover:bg-rose/40 cursor-pointer"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
