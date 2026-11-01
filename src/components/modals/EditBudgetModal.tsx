import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import { AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
}) => {
  const { t, language } = useTranslation();
  const { updateBudget } = useWedding();

  const [budgetInput, setBudgetInput] = useState<string>(() => currentBudget.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBudgetInput(currentBudget.toString());
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentBudget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(budgetInput);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError(t.expenses.validationErrorAmount);
      return;
    }

    try {
      setIsSubmitting(true);
      await updateBudget(numericAmount);
      setSuccess(t.expenses.budgetUpdatedSuccess);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.expenses.editBudgetModalTitle}
      subtitle={t.expenses.editBudgetModalDesc}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="p-3 rounded-xl bg-sage/20 border border-sage/40 text-sage-dark text-xs flex items-center gap-2 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label htmlFor="budget-amount-input" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.targetBudgetLabel} *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IndianRupee className="w-4 h-4 text-gold-dark" />
            </div>
            <input
              id="budget-amount-input"
              type="number"
              step="1000"
              min="0"
              required
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="e.g. 2500000"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm font-semibold focus:border-burgundy"
            />
          </div>
          <p className="text-[11px] text-charcoal-muted mt-1">
            {language === 'hi'
              ? 'यह राशि डैशबोर्ड के शेष बजट और प्रतिशत उपयोग की गणना के लिए उपयोग की जाएगी।'
              : 'This amount serves as the authoritative baseline for all budget utilization calculations.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold/25">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal hover:bg-rose/40 cursor-pointer"
          >
            {t.expenses.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? t.expenses.savingBudget : t.expenses.saveBudgetBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
};
