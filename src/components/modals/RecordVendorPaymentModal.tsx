import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { Vendor, VendorEntity, PaymentMethod } from '../../types';
import { IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecordVendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | VendorEntity | null;
}

export const RecordVendorPaymentModal: React.FC<RecordVendorPaymentModalProps> = ({
  isOpen,
  onClose,
  vendor,
}) => {
  const { t, language } = useTranslation();
  const { addVendorPayment } = useWedding();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [recordInExpenses, setRecordInExpenses] = useState(true);
  const [allowOverpayment, setAllowOverpayment] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!vendor) return null;

  const numericAmount = parseFloat(amount);
  const balanceDue = vendor.balanceDue || 0;
  const isOverpaying = !isNaN(numericAmount) && numericAmount > balanceDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(language === 'hi' ? 'कृपया एक मान्य राशि दर्ज करें।' : 'Please enter a valid payment amount.');
      return;
    }

    if (isOverpaying && !allowOverpayment) {
      setError(
        language === 'hi'
          ? `भुगतान राशि शेष बकाया (₹${balanceDue.toLocaleString('en-IN')}) से अधिक है। कृपया अतिरिक्त भुगतान की अनुमति दें।`
          : `Payment amount exceeds remaining balance (₹${balanceDue.toLocaleString('en-IN')}). Check allow overpayment if intentional.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await addVendorPayment(vendor.id, {
        amount: numericAmount,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
        recordInExpenses,
        allowOverpayment,
      });

      setSuccess(language === 'hi' ? 'भुगतान सफलतापूर्वक दर्ज किया गया।' : 'Vendor payment successfully logged.');
      setTimeout(() => {
        onClose();
        setAmount('');
        setTransactionReference('');
        setNotes('');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to log vendor payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'hi' ? `विक्रेता भुगतान दर्ज करें (${vendor.name})` : `Log Payment for ${vendor.name}`}
      subtitle={language === 'hi' ? 'अनुबंध बकाया के विरुद्ध भुगतान दर्ज करें।' : 'Record an advance deposit or milestone installment payment.'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-sage/20 border border-sage/40 text-sage-dark text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Balance Due Context Banner */}
        <div className="p-3 rounded-xl bg-ivory border border-gold/30 flex items-center justify-between text-xs">
          <span className="text-charcoal-muted">
            {language === 'hi' ? 'कुल अनुबंध / शेष बकाया:' : 'Agreed / Balance Due:'}
          </span>
          <span className="font-bold text-burgundy">
            ₹{vendor.agreedAmount.toLocaleString('en-IN')} / ₹{balanceDue.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'भुगतान राशि (₹) *' : 'Payment Amount (₹) *'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'भुगतान तिथि *' : 'Payment Date *'}
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'भुगतान माध्यम' : 'Payment Method'}
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
          >
            <option value="upi">{t.expenses.methodUpi || 'UPI / QR Code'}</option>
            <option value="bank_transfer">{t.expenses.methodBank || 'Bank Transfer (NEFT/RTGS)'}</option>
            <option value="card">{t.expenses.methodCard || 'Card'}</option>
            <option value="cash">{t.expenses.methodCash || 'Cash'}</option>
            <option value="other">{t.expenses.methodOther || 'Other'}</option>
          </select>
        </div>

        {/* Transaction Reference */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'यूटीआर / संदर्भ संख्या (वैकल्पिक)' : 'UTR / Transaction Reference (Optional)'}
          </label>
          <input
            type="text"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="e.g. UPI/283921/HDFC or Cheque #102938"
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Accounting Integration Checkbox */}
        <div className="p-3 rounded-xl bg-ivory-light border border-gold/30 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={recordInExpenses}
              onChange={(e) => setRecordInExpenses(e.target.checked)}
              className="mt-0.5 rounded border-gold text-burgundy focus:ring-burgundy"
            />
            <div className="text-xs">
              <span className="font-semibold text-charcoal block">
                {language === 'hi' ? 'शादी के खर्चों में दर्ज करें (Zero Double Counting)' : 'Record in Wedding Expenses (No Double Counting)'}
              </span>
              <span className="text-charcoal-muted text-[11px] block mt-0.5">
                {language === 'hi'
                  ? 'यह स्वचालित रूप से खर्च रजिस्टर में एक प्रविष्टि जोड़ता है ताकि बजट गणनाएं सही रहें।'
                  : 'Automatically syncs to the wedding expenses ledger linked to this vendor.'}
              </span>
            </div>
          </label>

          {isOverpaying && (
            <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-gold/20">
              <input
                type="checkbox"
                checked={allowOverpayment}
                onChange={(e) => setAllowOverpayment(e.target.checked)}
                className="mt-0.5 rounded border-gold text-burgundy focus:ring-burgundy"
              />
              <span className="text-xs font-semibold text-burgundy">
                {language === 'hi' ? 'अतिरिक्त भुगतान की पुष्टि करें (अनुबंध से अधिक राशि)' : 'Confirm intentional overpayment exceeding agreed contract.'}
              </span>
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'टिप्पणी (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 2nd installment paid via mobile banking"
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gold/40 text-charcoal text-xs sm:text-sm font-semibold hover:bg-rose/30 cursor-pointer"
          >
            {t.expenses.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? (language === 'hi' ? 'सहेज रहे हैं...' : 'Recording...')
              : (language === 'hi' ? 'भुगतान दर्ज करें' : 'Record Payment')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
