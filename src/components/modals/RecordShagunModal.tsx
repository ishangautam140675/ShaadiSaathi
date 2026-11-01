import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ShagunGift, GiftEntity } from '../../types';
import { IndianRupee, AlertCircle, CheckCircle2, HeartHandshake } from 'lucide-react';

interface RecordShagunModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftToEdit?: ShagunGift | GiftEntity | null;
}

export const RecordShagunModal: React.FC<RecordShagunModalProps> = ({
  isOpen,
  onClose,
  giftToEdit,
}) => {
  const { t, language } = useTranslation();
  const { addShagunGift, updateShagunGift } = useWedding();
  const isEditing = Boolean(giftToEdit);

  const [giverName, setGiverName] = useState('');
  const [relation, setRelation] = useState('');
  const [side, setSide] = useState<'bride' | 'groom' | 'mutual'>('bride');
  const [giftType, setGiftType] = useState<'cash' | 'shagun' | 'physical_gift' | 'jewellery' | 'other'>('cash');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('couple');
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (giftToEdit) {
      setGiverName(giftToEdit.giverName || giftToEdit.donorName || '');
      setRelation(giftToEdit.relation || '');
      setSide((giftToEdit.side as any) || 'bride');
      setGiftType((giftToEdit.giftType as any) || 'cash');
      setAmount(giftToEdit.cashAmount ? String(giftToEdit.cashAmount) : (giftToEdit.amount ? String(giftToEdit.amount) : ''));
      setDescription(giftToEdit.description || giftToEdit.itemDescription || '');
      setRecipient(giftToEdit.recipient || 'couple');
      setDateReceived(giftToEdit.dateReceived || giftToEdit.date || new Date().toISOString().split('T')[0]);
      setNotes(giftToEdit.notes || giftToEdit.returnGiftNotes || '');
    } else {
      setGiverName('');
      setRelation('');
      setSide('bride');
      setGiftType('cash');
      setAmount('');
      setDescription('');
      setRecipient('couple');
      setDateReceived(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setError(null);
    setSuccess(null);
  }, [giftToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!giverName.trim()) {
      setError(language === 'hi' ? 'आशीर्वादकर्ता / परिवार का नाम आवश्यक है।' : 'Giver / Family name is required.');
      return;
    }

    const isMonetary = giftType === 'cash' || giftType === 'shagun';
    const parsedAmount = amount ? parseFloat(amount) : 0;

    if (isMonetary && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError(language === 'hi' ? 'कृपया मान्य शगुन राशि दर्ज करें (उदा. ₹5100)।' : 'Please enter a valid cash shagun amount (e.g. 5100).');
      return;
    }

    if (!isMonetary && !description.trim()) {
      setError(language === 'hi' ? 'उपहार या आभूषण का विवरण आवश्यक है।' : 'Gift description is required for non-cash gifts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        giverName: giverName.trim(),
        donorName: giverName.trim(),
        relation: relation.trim() || 'Relative / Friend',
        side,
        giftType,
        amount: isMonetary ? parsedAmount : undefined,
        cashAmount: isMonetary ? parsedAmount : undefined,
        description: description.trim() || undefined,
        itemDescription: description.trim() || undefined,
        recipient: recipient.trim() || 'couple',
        dateReceived,
        date: dateReceived,
        notes: notes.trim() || undefined,
      };

      if (isEditing && giftToEdit) {
        await updateShagunGift(giftToEdit.id, payload);
        setSuccess(language === 'hi' ? 'उपहार विवरण अद्यतन हो गया।' : 'Gift record updated successfully.');
      } else {
        await addShagunGift(payload);
        setSuccess(language === 'hi' ? 'शगुन बही में सफलतापूर्वक दर्ज हो गया।' : 'Recorded to sacred Shagun ledger.');
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

  const isCash = giftType === 'cash' || giftType === 'shagun';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (language === 'hi' ? 'शगुन / उपहार विवरण संपादित करें' : 'Edit Shagun Record') : t.gifts.modalTitle}
      subtitle={language === 'hi' ? 'पारंपरिक लिफ़ाफ़ा एवं उपहारों का बही खाता।' : 'Sacred ledger for cash envelopes (लिफ़ाफ़ा) and blessings.'}
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

        {/* Sacred Cultural Separation Note */}
        <div className="p-3 rounded-xl bg-gold/15 border border-gold/40 flex items-start gap-2 text-xs text-charcoal">
          <HeartHandshake className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
          <span>
            {language === 'hi'
              ? 'शगुन एवं उपहार शादी के सामान्य खर्चों या बजट से बिल्कुल अलग रखे जाते हैं।'
              : 'Shagun and gifts are kept strictly separated from operating expenses and budgets.'}
          </span>
        </div>

        {/* Giver Name & Relation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="shagun-giver-input" className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'आशीर्वाद दाता का नाम *' : 'Blessing Giver / Family Name *'}
            </label>
            <input
              id="shagun-giver-input"
              type="text"
              required
              value={giverName}
              onChange={(e) => setGiverName(e.target.value)}
              placeholder="e.g. Tau Ji, Uncle Vinod, Sharma Family"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.relation}
            </label>
            <input
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="e.g. Paternal Uncle, College Friend, Colleague"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Gift Type & Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.giftType} *
            </label>
            <select
              value={giftType}
              onChange={(e) => setGiftType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="cash">{t.gifts.cashShagun}</option>
              <option value="physical_gift">{language === 'hi' ? 'भौतिक उपहार (Physical Gift)' : 'Physical Gift'}</option>
              <option value="jewellery">{t.gifts.goldSilver}</option>
              <option value="other">{language === 'hi' ? 'अन्य आशीर्वाद' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.familySide} *
            </label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="bride">{t.gifts.brideSide}</option>
              <option value="groom">{t.gifts.groomSide}</option>
              <option value="mutual">{t.gifts.mutualGuests}</option>
            </select>
          </div>
        </div>

        {/* Cash Amount (If monetary) */}
        {isCash ? (
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.cashAmount} (₹) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5100 or 11000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.giftDesc} *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Silver Thali Set, Gold Coin 10g, Microwave"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        )}

        {/* Date Received & Recipient */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'प्राप्ति तिथि *' : 'Date Received *'}
            </label>
            <input
              type="date"
              required
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'उपहार प्राप्तकर्ता' : 'Gift Recipient'}
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Couple, Bride, Groom"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {t.gifts.returnGift}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Return gift given: Silver coin box, thanked on phone"
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
              : (language === 'hi' ? 'बही में दर्ज करें' : 'Record in Ledger')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
