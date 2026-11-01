import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ShoppingItem, ShoppingItemEntity, ShoppingStatus } from '../../types';
import { IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: ShoppingItem | ShoppingItemEntity | null;
}

export const AddShoppingModal: React.FC<AddShoppingModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
}) => {
  const { t, language } = useTranslation();
  const { addShoppingItem, updateShoppingItem } = useWedding();
  const isEditing = Boolean(itemToEdit);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('bride_clothing');
  const [description, setDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<ShoppingStatus>('planned');
  const [assignedTo, setAssignedTo] = useState('Mummy');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [deadline, setDeadline] = useState('');
  const [storeName, setStoreName] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || itemToEdit.title || '');
      setCategory(itemToEdit.category || 'bride_clothing');
      setDescription(itemToEdit.description || '');
      setEstimatedPrice(String(itemToEdit.estimatedPrice || ''));
      setActualPrice(itemToEdit.actualPrice ? String(itemToEdit.actualPrice) : '');
      setQuantity(String(itemToEdit.quantity || 1));
      setStatus((itemToEdit.status as ShoppingStatus) || 'planned');
      setAssignedTo(itemToEdit.assignedTo || 'Family Member');
      setPriority(itemToEdit.priority || (itemToEdit.urgency as any) || 'medium');
      setDeadline(itemToEdit.deadline || '');
      setStoreName(itemToEdit.storeName || '');
      setNotes(itemToEdit.notes || '');
    } else {
      setName('');
      setCategory('bride_clothing');
      setDescription('');
      setEstimatedPrice('');
      setActualPrice('');
      setQuantity('1');
      setStatus('planned');
      setAssignedTo('Mummy');
      setPriority('medium');
      setDeadline('');
      setStoreName('');
      setNotes('');
    }
    setError(null);
    setSuccess(null);
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(language === 'hi' ? 'सामान का नाम / विवरण आवश्यक है।' : 'Item name is required.');
      return;
    }

    const est = parseFloat(estimatedPrice);
    if (isNaN(est) || est < 0) {
      setError(language === 'hi' ? 'कृपया अनुमानित लागत दर्ज करें।' : 'Please enter a valid estimated price.');
      return;
    }

    const act = actualPrice ? parseFloat(actualPrice) : undefined;
    if (act !== undefined && (isNaN(act) || act < 0)) {
      setError(language === 'hi' ? 'कृपया वास्तविक खरीद मूल्य सही दर्ज करें।' : 'Please enter a valid actual price.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        title: name.trim(),
        category,
        description: description.trim() || undefined,
        estimatedPrice: est,
        actualPrice: act,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        status,
        assignedTo: assignedTo.trim() || 'Family Member',
        priority,
        urgency: priority === 'urgent' ? 'high' : priority,
        deadline: deadline || undefined,
        storeName: storeName.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing && itemToEdit) {
        await updateShoppingItem(itemToEdit.id, payload);
        setSuccess(language === 'hi' ? 'सामान विवरण अद्यतन हो गया।' : 'Shopping item updated.');
      } else {
        await addShoppingItem(payload);
        setSuccess(language === 'hi' ? 'सामान खरीदारी सूची में जोड़ा गया।' : 'Shopping item added to register.');
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
      title={isEditing ? (language === 'hi' ? 'खरीदारी सामान संपादित करें' : 'Edit Shopping Item') : t.shopping.modalTitle}
      subtitle={language === 'hi' ? 'लागत, दर्जी, जिम्मेदार सदस्य एवं समय-सीमा ट्रैक करें।' : 'Track estimates, actual pricing, and responsible family member.'}
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

        {/* Item Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="shop-item-name-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.itemName} *
            </label>
            <input
              id="shop-item-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bridal Lehenga, Sherwani, Jewelry"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.category} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="bride_clothing">{language === 'hi' ? 'दुल्हन के वस्त्र' : "Bride's Clothing"}</option>
              <option value="groom_clothing">{language === 'hi' ? 'दूल्हे के वस्त्र' : "Groom's Clothing"}</option>
              <option value="jewellery">{language === 'hi' ? 'गहने व आभूषण' : 'Jewellery & Accessories'}</option>
              <option value="family_clothing">{language === 'hi' ? 'परिवार के वस्त्र' : 'Family Clothing'}</option>
              <option value="gifts">{language === 'hi' ? 'उपहार व लेन-देन' : 'Gifts & Hampers'}</option>
              <option value="decorations">{language === 'hi' ? 'सजावट का सामान' : 'Wedding Decorations'}</option>
              <option value="ceremony_supplies">{language === 'hi' ? 'पूजा व रस्म सामग्री' : 'Ceremony Supplies'}</option>
              <option value="household">{language === 'hi' ? 'गृहस्थी का सामान' : 'Household Items'}</option>
              <option value="other">{language === 'hi' ? 'अन्य विविध' : 'Other'}</option>
            </select>
          </div>
        </div>

        {/* Pricing: Estimated & Actual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="shop-item-estimated-input" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.estimatedPrice} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                id="shop-item-estimated-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.actualPrice}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder="e.g. 48000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm font-semibold focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'मात्रा (Quantity)' : 'Quantity'}
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Status, Priority & Responsible Member */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.status}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ShoppingStatus)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="planned">{language === 'hi' ? 'योजनाबद्ध' : 'Planned'}</option>
              <option value="to_buy">{t.shopping.toBuy}</option>
              <option value="in_tailoring">{t.shopping.inTailoring}</option>
              <option value="purchased">{t.shopping.purchased}</option>
              <option value="cancelled">{language === 'hi' ? 'रद्द' : 'Cancelled'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.urgency}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="urgent">{language === 'hi' ? 'अति आवश्यक (Urgent)' : 'Urgent'}</option>
              <option value="high">{language === 'hi' ? 'उच्च (High)' : 'High'}</option>
              <option value="medium">{language === 'hi' ? 'सामान्य (Medium)' : 'Medium'}</option>
              <option value="low">{language === 'hi' ? 'कम प्राथमिकता (Low)' : 'Low'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.responsiblePerson} *
            </label>
            <input
              type="text"
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Mummy, Priya, Chacha Ji"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Deadline & Store */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'खरीद की अंतिम तिथि (Deadline)' : 'Target Purchase Deadline'}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'दुकान / ब्रांड का नाम' : 'Store / Vendor Name'}
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Sabyasachi, Manyavar, Local Bazaar"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {t.shopping.notes}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Trial fitting on 15th, matching jewellery needed"
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
              : (language === 'hi' ? 'सामान जोड़ें' : 'Add Shopping Item')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
