import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { AlertTriangle } from 'lucide-react';
import type { Expense, ExpenseEntity } from '../../types';

interface DeleteExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (expenseId: string) => Promise<void>;
  expense: Expense | ExpenseEntity | null;
}

export const DeleteExpenseModal: React.FC<DeleteExpenseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  expense,
}) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!expense) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(expense.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.expenses.deleteConfirmTitle}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-burgundy/10 border border-burgundy/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
          <div className="text-xs text-charcoal space-y-1">
            <p className="font-semibold text-burgundy">
              {t.expenses.deleteConfirmDesc}
            </p>
            <div className="mt-2 p-2 rounded-lg bg-ivory border border-gold/30">
              <div className="font-bold text-charcoal">{expense.title}</div>
              <div className="text-burgundy font-bold text-sm mt-0.5">
                ₹{expense.amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal hover:bg-rose/40 cursor-pointer"
          >
            {t.expenses.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? t.expenses.saving : t.expenses.deleteConfirmBtn}
          </button>
        </div>
      </div>
    </Modal>
  );
};

