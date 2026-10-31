import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ExpenseCategory, PaymentMode, PaymentStatus } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { addExpense } = useWedding();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('catering');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('Rajesh Sharma (Father)');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [side, setSide] = useState<'bride' | 'groom' | 'mutual'>('bride');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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

    // Add to context
    addExpense({
      title: title.trim(),
      amount: numericAmount,
      category,
      date,
      paidBy: paidBy.trim() || 'Family Member',
      paidTo: paidTo.trim() || undefined,
      paymentMode,
      status,
      side,
      notes: notes.trim() || undefined,
      receiptAttached: false,
    });

    setSuccess(t.expenses.validationSuccess);
    setTimeout(() => {
      setSuccess(null);
      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.expenses.modalTitle}
      subtitle={t.expenses.modalDesc}
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
          <label htmlFor="expense-title" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.fieldTitle} *
          </label>
          <input
            id="expense-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.expenses.fieldTitlePlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy focus:ring-1 focus:ring-burgundy transition-all"
          />
        </div>

        {/* Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expense-amount" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldAmount} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-gold-dark font-bold text-sm">₹</span>
              <input
                id="expense-amount"
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy focus:ring-1 focus:ring-burgundy font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="expense-category" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldCategory} *
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy focus:ring-1 focus:ring-burgundy capitalize"
            >
              {Object.entries(t.categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expense-date" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldDate} *
            </label>
            <input
              id="expense-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy focus:ring-1 focus:ring-burgundy"
            />
          </div>

          <div>
            <label htmlFor="expense-payment-mode" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaymentMode}
            </label>
            <select
              id="expense-payment-mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy focus:ring-1 focus:ring-burgundy uppercase"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="card">Credit / Debit Card</option>
            </select>
          </div>
        </div>

        {/* Paid By & Paid To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expense-paid-by" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaidBy}
            </label>
            <input
              id="expense-paid-by"
              type="text"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="expense-paid-to" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldPaidTo}
            </label>
            <input
              id="expense-paid-to"
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Sabyasachi Store / Pandit Ji"
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Status & Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expense-status" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldStatus}
            </label>
            <select
              id="expense-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="paid">{t.expenses.paid}</option>
              <option value="partial">{t.expenses.partial}</option>
              <option value="pending">{t.expenses.pending}</option>
            </select>
          </div>

          <div>
            <label htmlFor="expense-side" className="block text-xs font-semibold text-charcoal mb-1">
              {t.expenses.fieldSide}
            </label>
            <select
              id="expense-side"
              value={side}
              onChange={(e) => setSide(e.target.value as 'bride' | 'groom' | 'mutual')}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="bride">{t.common.brideSide}</option>
              <option value="groom">{t.common.groomSide}</option>
              <option value="mutual">{t.common.mutual}</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="expense-notes" className="block text-xs font-semibold text-charcoal mb-1">
            {t.expenses.fieldNotes}
          </label>
          <textarea
            id="expense-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cheque clearance details, bill memo number, or delivery terms"
            className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
          />
        </div>

        {/* Architecture Notice */}
        <div className="p-3 rounded-xl bg-ivory-dark/70 border border-gold/30 text-[11px] text-charcoal-muted leading-tight">
          💡 <strong>{t.common.phaseNoticeTitle}:</strong> {t.expenses.validationSuccess}
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gold/40 text-charcoal text-xs font-semibold hover:bg-rose/30 transition-colors cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all duration-200 shadow-sm cursor-pointer"
          >
            {t.expenses.submitBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
};
