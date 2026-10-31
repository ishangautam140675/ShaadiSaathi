import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ExpenseCategory } from '../../types';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddVendorModal: React.FC<AddVendorModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { addVendor } = useWedding();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('photography');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }

    const agreed = parseFloat(agreedAmount);
    if (isNaN(agreed) || agreed <= 0) {
      setError(t.expenses.validationErrorAmount);
      return;
    }

    const adv = advancePaid ? parseFloat(advancePaid) : 0;
    const balance = agreed - adv;
    const status = adv >= agreed ? 'fully_paid' : adv > 0 ? 'advance_paid' : 'booked';

    addVendor({
      name: name.trim(),
      category,
      contactPerson: contactPerson.trim() || 'Manager',
      phone: phone.trim() || '',
      city: city.trim() || 'Local',
      agreedAmount: agreed,
      advancePaid: adv,
      balanceDue: balance > 0 ? balance : 0,
      dueDate,
      status,
      notes: notes.trim() || undefined,
    });

    setSuccess(t.expenses.validationSuccess);
    setTimeout(() => {
      setSuccess(null);
      setName('');
      setAgreedAmount('');
      setAdvancePaid('');
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.vendors.modalTitle}
      subtitle={t.vendors.subtitle}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honest Notice regarding fake payments */}
        <div className="p-3 rounded-xl bg-gold/15 border border-gold/40 text-charcoal text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-gold-dark flex-shrink-0 mt-0.5" />
          <span>{t.vendors.noFakePaymentsNotice}</span>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" className="p-3 rounded-xl bg-sage/20 border border-sage/40 text-sage-dark text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vendor-name" className="block text-xs font-semibold text-charcoal mb-1">
              Vendor / Business Name *
            </label>
            <input
              id="vendor-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Rajputana Caterers"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="vendor-category" className="block text-xs font-semibold text-charcoal mb-1">
              Service Category *
            </label>
            <select
              id="vendor-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              {Object.entries(t.categories).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="vendor-contact" className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.contactPerson}
            </label>
            <input
              id="vendor-contact"
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Chef Manpreet"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="vendor-phone" className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.phone}
            </label>
            <input
              id="vendor-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="vendor-city" className="block text-xs font-semibold text-charcoal mb-1">
              City / Location
            </label>
            <input
              id="vendor-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Delhi / Jaipur"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="vendor-agreed-amount" className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.agreedAmount} (₹) *
            </label>
            <input
              id="vendor-agreed-amount"
              type="number"
              min="1"
              required
              value={agreedAmount}
              onChange={(e) => setAgreedAmount(e.target.value)}
              placeholder="250000"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy font-medium"
            />
          </div>

          <div>
            <label htmlFor="vendor-advance-paid" className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.advancePaid} (₹)
            </label>
            <input
              id="vendor-advance-paid"
              type="number"
              min="0"
              value={advancePaid}
              onChange={(e) => setAdvancePaid(e.target.value)}
              placeholder="50000"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy font-medium"
            />
          </div>

          <div>
            <label htmlFor="vendor-due-date" className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.dueDate}
            </label>
            <input
              id="vendor-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div>
          <label htmlFor="vendor-notes" className="block text-xs font-semibold text-charcoal mb-1">
            Contract Terms & Notes
          </label>
          <input
            id="vendor-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 50% due at check-in, rest within 48h after event"
            className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
          />
        </div>

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
            className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            {t.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
};
