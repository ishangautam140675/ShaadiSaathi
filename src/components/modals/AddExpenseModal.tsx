import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ExpenseCategory, PaymentMethod, Expense, ExpenseEntity } from '../../types';
import { AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | ExpenseEntity | null;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const { t } = useTranslation();
  const { addExpense, updateExpense } = useWedding();

  const isEditing = !!expenseToEdit;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('catering');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidByName, setPaidByName] = useState('Rajesh Sharma');
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setTitle(expenseToEdit.title);
        setAmount(expenseToEdit.amount.toString());
        setPaidAmount(
          (expenseToEdit.paidAmount !== undefined ? expenseToEdit.paidAmount : expenseToEdit.amount).toString()
        );
        setCategory(expenseToEdit.category);
        setDate(expenseToEdit.date);
        setPaidByName(
          ('paidByName' in expenseToEdit && expenseToEdit.paidByName) ||
          ('paidBy' in expenseToEdit && expenseToEdit.paidBy) ||
          'Family Member'
        );
        setVendorName(
          ('vendorName' in expenseToEdit && expenseToEdit.vendorName) ||
          ('paidTo' in expenseToEdit && expenseToEdit.paidTo) ||
          ''
        );
        setPaymentMethod(
          ('paymentMethod' in expenseToEdit && expenseToEdit.paymentMethod) ||
          ('paymentMode' in expenseToEdit && expenseToEdit.paymentMode as PaymentMethod) ||
          'upi'
        );
        setNotes(expenseToEdit.notes || '');
      } else {
        setTitle('');
        setAmount('');
        setPaidAmount('');
        setCategory('catering');
        setDate(new Date().toISOString().split('T')[0]);
        setPaidByName('Rajesh Sharma');
        setVendorName('');
        setPaymentMethod('upi');
        setNotes('');
      }
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
    }
  }, [isOpen, expenseToEdit]);

  // Handle amount change - if creating new and paidAmount is empty, prefill paidAmount
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (!isEditing && (paidAmount === '' || paidAmount === amount)) {
      setPaidAmount(val);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaidAmount = paidAmount !== '' ? parseFloat(paidAmount) || 0 : 0;
  const outstandingBalance = Math.max(0, parsedAmount - parsedPaidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t.expenses.validationErrorTitle);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(t.expenses.validationErrorAmount);
      return;
    }

    const numericPaid = paidAmount !== '' ? parseFloat(paidAmount) : numericAmount;
    if (isNaN(numericPaid) || numericPaid < 0) {
      setError(t.expenses.validationErrorPaidAmount);
      return;
    }

    if (numericPaid > numericAmount) {
      setError(t.expenses.validationErrorPaidAmount);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        title: title.trim(),
        amount: numericAmount,
        paidAmount: numericPaid,
        category,
        date,
        paidByName: paidByName.trim() || 'Family Member',
        vendorName: vendorName.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      if (isEditing && expenseToEdit) {
        await updateExpense(expenseToEdit.id, payload);
      } else {
        await addExpense(payload);
      }

      setSuccess(isEditing ? t.expenses.saveSuccess : t.expenses.validationSuccess);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t.expenses.editModalTitle : t.expenses.modalTitle}
      subtitle={isEditing ? t.expenses.editModalDesc : t.expenses.modalDesc}
      maxWidth="lg"
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

        {/* Title */}
        <div>
          <label htmlFor="exp-title-input" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.fieldTitle} *
          </label>
          <input
            id="exp-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.expenses.fieldTitlePlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Amounts (Total + Paid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="exp-amount-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldAmount} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                id="exp-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-paid-amount-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaidAmount} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                id="exp-paid-amount-input"
                type="number"
                step="0.01"
                min="0"
                max={amount || undefined}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>
        </div>

        {/* Outstanding calculation pill */}
        {parsedAmount > 0 && (
          <div className="p-2.5 rounded-xl bg-ivory border border-gold/30 flex items-center justify-between text-xs">
            <span className="text-charcoal-muted">
              {t.expenses.fieldOutstanding}:
            </span>
            <span className={`font-bold ${outstandingBalance > 0 ? 'text-burgundy' : 'text-sage'}`}>
              ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {outstandingBalance === 0 ? ' (Fully Cleared)' : ' (Pending Balance)'}
            </span>
          </div>
        )}

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="exp-category-select" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldCategory} *
            </label>
            <select
              id="exp-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="venue">{t.categories.venue}</option>
              <option value="catering">{t.categories.catering}</option>
              <option value="decoration">{t.categories.decoration || t.categories.decor}</option>
              <option value="clothing">{t.categories.clothing || t.categories.attire}</option>
              <option value="jewellery">{t.categories.jewellery || t.categories.jewelry}</option>
              <option value="photography">{t.categories.photography}</option>
              <option value="invitations">{t.categories.invitations || t.categories.invitations_gifts}</option>
              <option value="makeup">{t.categories.makeup}</option>
              <option value="transport">{t.categories.transport || t.categories.logistics_travel}</option>
              <option value="gifts">{t.categories.gifts}</option>
              <option value="other">{t.categories.other || t.categories.miscellaneous}</option>
            </select>
          </div>

          <div>
            <label htmlFor="exp-date-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldDate} *
            </label>
            <input
              id="exp-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Paid By & Vendor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="exp-paidby-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaidBy} *
            </label>
            <input
              id="exp-paidby-input"
              type="text"
              required
              value={paidByName}
              onChange={(e) => setPaidByName(e.target.value)}
              placeholder="e.g. Chacha Ji, Papa, Priya"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="exp-vendor-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaidTo}
            </label>
            <input
              id="exp-vendor-input"
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Taj Caterers, Sabyasachi"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="exp-method-select" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.fieldPaymentMode} *
          </label>
          <select
            id="exp-method-select"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          >
            <option value="upi">{t.expenses.methodUpi}</option>
            <option value="bank_transfer">{t.expenses.methodBank}</option>
            <option value="card">{t.expenses.methodCard}</option>
            <option value="cash">{t.expenses.methodCash}</option>
            <option value="other">{t.expenses.methodOther}</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="exp-notes-input" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.fieldNotes}
          </label>
          <textarea
            id="exp-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Advance paid via GPay, final settlement pending on delivery"
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Actions */}
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
            {isSubmitting ? t.expenses.saving : isEditing ? t.expenses.saveBtn : t.expenses.submitBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
};
