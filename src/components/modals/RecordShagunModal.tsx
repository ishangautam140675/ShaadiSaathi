import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import { AlertCircle, CheckCircle2, HeartHandshake } from 'lucide-react';

interface RecordShagunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordShagunModal: React.FC<RecordShagunModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const { addShagunGift } = useWedding();

  const [donorName, setDonorName] = useState('');
  const [relation, setRelation] = useState('');
  const [side, setSide] = useState<'bride' | 'groom' | 'mutual'>('bride');
  const [giftType, setGiftType] = useState<'cash' | 'gold_silver' | 'item'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [eventName, setEventName] = useState<'roka' | 'engagement' | 'sangeet' | 'haldi' | 'wedding' | 'reception'>('wedding');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnGiftNotes, setReturnGiftNotes] = useState('');
  const [thankYouSent, setThankYouSent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!donorName.trim()) {
      setError(language === 'hi' ? 'आशीर्वादकर्ता का नाम आवश्यक है' : 'Donor name is required');
      return;
    }

    let parsedCash: number | undefined = undefined;
    if (giftType === 'cash') {
      parsedCash = parseFloat(cashAmount);
      if (isNaN(parsedCash) || parsedCash <= 0) {
        setError(language === 'hi' ? 'वैध शगुन राशि (उदा. ₹5100) दर्ज करें' : 'Enter a valid Shagun cash amount');
        return;
      }
    } else if (!itemDescription.trim()) {
      setError(language === 'hi' ? 'उपहार या आभूषण का विवरण दर्ज करें' : 'Item description is required');
      return;
    }

    addShagunGift({
      donorName: donorName.trim(),
      relation: relation.trim() || 'Family / Friend',
      side,
      giftType,
      cashAmount: parsedCash,
      itemDescription: itemDescription.trim() || undefined,
      eventName,
      date,
      returnGiftNotes: returnGiftNotes.trim() || undefined,
      thankYouSent,
    });

    setSuccess(t.expenses.validationSuccess);
    setTimeout(() => {
      setSuccess(null);
      setDonorName('');
      setCashAmount('');
      setItemDescription('');
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.gifts.modalTitle}
      subtitle={t.gifts.subtitle}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cultural Sanctity Notice */}
        <div className="p-3 rounded-xl bg-rose-light border border-gold/40 text-charcoal text-xs flex items-start gap-2.5">
          <HeartHandshake className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {t.gifts.noticeBox}
          </span>
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
            <label htmlFor="shagun-donor-name" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.donorName} *
            </label>
            <input
              id="shagun-donor-name"
              type="text"
              required
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="e.g. Ramesh & Sunita Verma (Tau Ji)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="shagun-relation" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.relation}
            </label>
            <input
              id="shagun-relation"
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="e.g. Maternal Uncle / Jaipur"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="shagun-gift-type" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.type}
            </label>
            <select
              id="shagun-gift-type"
              value={giftType}
              onChange={(e) => setGiftType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="cash">Cash Envelope (नकद लिफ़ाफ़ा)</option>
              <option value="gold_silver">Gold / Silver (स्वर्ण / रजत)</option>
              <option value="item">Physical Item (उपहार / भेंट)</option>
            </select>
          </div>

          <div>
            <label htmlFor="shagun-side" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.side}
            </label>
            <select
              id="shagun-side"
              value={side}
              onChange={(e) => setSide(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="bride">{t.common.brideSide}</option>
              <option value="groom">{t.common.groomSide}</option>
              <option value="mutual">{t.common.mutual}</option>
            </select>
          </div>

          <div>
            <label htmlFor="shagun-event" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.event}
            </label>
            <select
              id="shagun-event"
              value={eventName}
              onChange={(e) => setEventName(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy capitalize"
            >
              <option value="roka">Roka Ceremony</option>
              <option value="engagement">Engagement</option>
              <option value="sangeet">Sangeet & Mehendi</option>
              <option value="haldi">Haldi</option>
              <option value="wedding">Wedding Day (शादी)</option>
              <option value="reception">Reception</option>
            </select>
          </div>
        </div>

        {giftType === 'cash' ? (
          <div>
            <label htmlFor="shagun-cash-amount" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.amountOrDesc} (₹ Cash Shagun) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-gold-dark font-bold text-sm">₹</span>
              <input
                id="shagun-cash-amount"
                type="number"
                min="1"
                step="any"
                required
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="e.g. 5100 or 11000 or 21000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy font-medium"
              />
            </div>
            <p className="text-[11px] text-charcoal-muted mt-1">
              {language === 'hi' ? 'पारंपरिक शुभ शगुन: ₹501, ₹1100, ₹2100, ₹5100, ₹11000, ₹21000, ₹51000' : 'Auspicious figures: ₹501, ₹1100, ₹2100, ₹5100, ₹11000, ₹21000, ₹51000'}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="shagun-item-desc" className="block text-xs font-semibold text-charcoal mb-1">
              {t.gifts.amountOrDesc} (Description) *
            </label>
            <input
              id="shagun-item-desc"
              type="text"
              required
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="e.g. 10g 24K Gold Coin with Lakshmi imprint / Silver Bowl Set"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shagun-return-notes" className="block text-xs font-semibold text-charcoal mb-1">
              Return Gift / Hamper Given
            </label>
            <input
              id="shagun-return-notes"
              type="text"
              value={returnGiftNotes}
              onChange={(e) => setReturnGiftNotes(e.target.value)}
              placeholder="e.g. Silver coin & dry fruits box"
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="shagun-date" className="block text-xs font-semibold text-charcoal mb-1">
              {t.common.date}
            </label>
            <input
              id="shagun-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="shagun-thankyou"
            checked={thankYouSent}
            onChange={(e) => setThankYouSent(e.target.checked)}
            className="w-4 h-4 rounded text-burgundy border-gold/50 focus:ring-burgundy"
          />
          <label htmlFor="shagun-thankyou" className="text-xs text-charcoal font-medium cursor-pointer">
            {language === 'hi' ? 'धन्यवाद संदेश / पावती भेजी जा चुकी है' : 'Thank-you message / acknowledgment sent'}
          </label>
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
