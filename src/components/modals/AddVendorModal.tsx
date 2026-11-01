import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ExpenseCategory, Vendor, VendorEntity } from '../../types';
import { IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: Vendor | VendorEntity | null;
}

export const AddVendorModal: React.FC<AddVendorModalProps> = ({
  isOpen,
  onClose,
  vendorToEdit,
}) => {
  const { t, language } = useTranslation();
  const { addVendor, updateVendor } = useWedding();
  const isEditing = Boolean(vendorToEdit);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('photography');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'booked' | 'advance_paid' | 'fully_paid' | 'in_negotiation' | 'cancelled'>('booked');
  const [eventName, setEventName] = useState('');
  const [notes, setNotes] = useState('');
  const [recordAdvanceInExpenses, setRecordAdvanceInExpenses] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendorToEdit) {
      setName(vendorToEdit.name || '');
      setCategory(vendorToEdit.category || 'photography');
      setContactPerson(vendorToEdit.contactPerson || '');
      setPhone(vendorToEdit.phone || '');
      setEmail(vendorToEdit.email || '');
      setCity(vendorToEdit.city || '');
      setAddress(vendorToEdit.address || '');
      setAgreedAmount(String(vendorToEdit.agreedAmount || ''));
      setAdvancePaid(String(vendorToEdit.advancePaid || ''));
      setDueDate(vendorToEdit.dueDate || new Date().toISOString().split('T')[0]);
      setStatus(vendorToEdit.status || 'booked');
      setEventName(vendorToEdit.eventName || '');
      setNotes(vendorToEdit.notes || '');
    } else {
      setName('');
      setCategory('photography');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setCity('');
      setAddress('');
      setAgreedAmount('');
      setAdvancePaid('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setStatus('booked');
      setEventName('');
      setNotes('');
      setRecordAdvanceInExpenses(true);
    }
    setError(null);
    setSuccess(null);
  }, [vendorToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(language === 'hi' ? 'विक्रेता / सेवा प्रदाता का नाम आवश्यक है।' : 'Vendor name is required.');
      return;
    }

    const agreed = parseFloat(agreedAmount);
    if (isNaN(agreed) || agreed < 0) {
      setError(language === 'hi' ? 'कृपया अनुबंध की सही कुल राशि दर्ज करें।' : 'Please enter a valid agreed amount.');
      return;
    }

    const adv = advancePaid ? parseFloat(advancePaid) : 0;
    if (adv > agreed) {
      setError(language === 'hi' ? 'अग्रिम भुगतान कुल अनुबंध राशि से अधिक नहीं हो सकता।' : 'Advance payment cannot exceed agreed amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && vendorToEdit) {
        await updateVendor(vendorToEdit.id, {
          name: name.trim(),
          category,
          contactPerson: contactPerson.trim() || 'Manager',
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim() || 'Local',
          address: address.trim() || undefined,
          agreedAmount: agreed,
          dueDate,
          status,
          eventName: eventName.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        setSuccess(language === 'hi' ? 'विक्रेता विवरण अद्यतन हो गया।' : 'Vendor updated successfully.');
      } else {
        await addVendor({
          name: name.trim(),
          category,
          contactPerson: contactPerson.trim() || 'Manager',
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim() || 'Local',
          address: address.trim() || undefined,
          agreedAmount: agreed,
          advancePaid: adv,
          dueDate,
          eventName: eventName.trim() || undefined,
          notes: notes.trim() || undefined,
          recordAdvanceInExpenses: Boolean(recordAdvanceInExpenses && adv > 0),
        });
        setSuccess(language === 'hi' ? 'विक्रेता सफलतापूर्वक पंजीकृत हो गया।' : 'Vendor successfully registered.');
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (language === 'hi' ? 'विक्रेता विवरण संपादित करें' : 'Edit Vendor Details') : t.vendors.modalTitle}
      subtitle={language === 'hi' ? 'अनुबंध, अग्रिम भुगतान एवं संपर्क जानकारी प्रबंधित करें।' : 'Track contracts, advance payments, and contact details.'}
      maxWidth="lg"
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

        {/* Vendor Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="vendor-name-input" className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'विक्रेता / फर्म का नाम *' : 'Vendor / Business Name *'}
            </label>
            <input
              id="vendor-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Palace Banquet"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'श्रेणी *' : 'Vendor Category *'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="venue">{t.categories.venue}</option>
              <option value="catering">{t.categories.catering}</option>
              <option value="decoration">{t.categories.decoration || t.categories.decor}</option>
              <option value="photography">{t.categories.photography}</option>
              <option value="makeup">{t.categories.makeup}</option>
              <option value="clothing">{t.categories.clothing || t.categories.attire}</option>
              <option value="jewellery">{t.categories.jewellery || t.categories.jewelry}</option>
              <option value="transport">{t.categories.transport || t.categories.logistics_travel}</option>
              <option value="invitations">{t.categories.invitations || t.categories.invitations_gifts}</option>
              <option value="gifts">{t.categories.gifts}</option>
              <option value="other">{t.categories.other || t.categories.miscellaneous}</option>
            </select>
          </div>
        </div>

        {/* Contact Person & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.contactPerson} *
            </label>
            <input
              type="text"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Harish Mehta (Manager)"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.phone}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* City & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'शहर / स्थान' : 'City / Location'}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Udaipur or Local"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'ईमेल (वैकल्पिक)' : 'Email Address (Optional)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. vendor@business.com"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Financials: Agreed Amount & Advance Paid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.agreedAmount} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                {t.vendors.advancePaid}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={agreedAmount || undefined}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
                />
              </div>
            </div>
          )}

          {isEditing && (
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                {language === 'hi' ? 'अनुबंध स्थिति' : 'Contract Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
              >
                <option value="booked">{t.vendors.booked}</option>
                <option value="advance_paid">{t.vendors.advanceStatus}</option>
                <option value="fully_paid">{t.vendors.fullyPaid}</option>
                <option value="in_negotiation">In Negotiation</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Due Date & Related Event */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.vendors.dueDate}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'संबंधित विवाह कार्यक्रम' : 'Related Wedding Event'}
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Sangeet, Mehendi, Reception"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Advance Expense Linking Checkbox (Create mode only) */}
        {!isEditing && parseFloat(advancePaid) > 0 && (
          <div className="p-3 rounded-xl bg-ivory-light border border-gold/30">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={recordAdvanceInExpenses}
                onChange={(e) => setRecordAdvanceInExpenses(e.target.checked)}
                className="rounded border-gold text-burgundy focus:ring-burgundy"
              />
              <span className="font-semibold text-charcoal">
                {language === 'hi' ? 'इस अग्रिम भुगतान को शादी के खर्चों में भी दर्ज करें' : 'Record this initial advance payment in Wedding Expenses'}
              </span>
            </label>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'अनुबंध विवरण / टिप्पणियां' : 'Contract Details / Notes'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Advance paid by cheque, final settlement on wedding night."
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
              ? (language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...')
              : isEditing
              ? (language === 'hi' ? 'विवरण अद्यतन करें' : 'Save Changes')
              : (language === 'hi' ? 'विक्रेता जोड़ें' : 'Register Vendor')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
