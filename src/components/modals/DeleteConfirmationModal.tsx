import React from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  itemName?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isDeleting = false,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/25 text-burgundy">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold">{description}</p>
            {itemName && (
              <p className="mt-1 font-bold text-charcoal">
                "{itemName}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-gold/40 text-charcoal text-xs sm:text-sm font-semibold hover:bg-rose/30 cursor-pointer disabled:opacity-50"
          >
            {t.expenses.cancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-gold-light" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
