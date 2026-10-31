import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ShoppingStatus } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddShoppingModal: React.FC<AddShoppingModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { addShoppingItem } = useWedding();

  const [title, setTitle] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [category, setCategory] = useState<'bride' | 'groom' | 'family' | 'pooja_ceremony' | 'return_gifts' | 'other'>('bride');
  const [assignedTo, setAssignedTo] = useState('Mummy');
  const [status, setStatus] = useState<ShoppingStatus>('to_buy');
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [storeName, setStoreName] = useState('');
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

    const est = parseFloat(estimatedPrice);
    if (isNaN(est) || est <= 0) {
      setError(t.expenses.validationErrorAmount);
      return;
    }

    const act = actualPrice ? parseFloat(actualPrice) : undefined;

    addShoppingItem({
      title: title.trim(),
      estimatedPrice: est,
      actualPrice: act,
      category,
      assignedTo: assignedTo.trim() || 'Family Member',
      status,
      urgency,
      storeName: storeName.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSuccess(t.expenses.validationSuccess);
    setTimeout(() => {
      setSuccess(null);
      setTitle('');
      setEstimatedPrice('');
      setActualPrice('');
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.shopping.modalTitle}
      subtitle={t.shopping.modalDesc}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="shopping-title" className="block text-xs font-semibold text-charcoal mb-1">
            {t.shopping.itemName} *
          </label>
          <input
            id="shopping-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sangeet Raw Silk Kurta Set"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shopping-estimated-price" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.estimatedPrice} *
            </label>
            <input
              id="shopping-estimated-price"
              type="number"
              min="1"
              required
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="15000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="shopping-actual-price" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.actualPrice}
            </label>
            <input
              id="shopping-actual-price"
              type="number"
              min="0"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              placeholder="Optional if not yet purchased"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shopping-category" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.category}
            </label>
            <select
              id="shopping-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="bride">Bride's Trousseau</option>
              <option value="groom">Groom's Wardrobe</option>
              <option value="family">Immediate Family</option>
              <option value="pooja_ceremony">Puja & Mandap Items</option>
              <option value="return_gifts">Return Gifts & Favors</option>
              <option value="other">Other Supplies</option>
            </select>
          </div>

          <div>
            <label htmlFor="shopping-assigned-to" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.responsiblePerson}
            </label>
            <input
              id="shopping-assigned-to"
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Mummy, Chacha Ji, Sister"
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shopping-status" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.status}
            </label>
            <select
              id="shopping-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ShoppingStatus)}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="to_buy">{t.shopping.toBuy}</option>
              <option value="in_tailoring">{t.shopping.inTailoring}</option>
              <option value="purchased">{t.shopping.purchased}</option>
            </select>
          </div>

          <div>
            <label htmlFor="shopping-urgency" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.urgency}
            </label>
            <select
              id="shopping-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as 'high' | 'medium' | 'low')}
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            >
              <option value="high">High Priority (Immediate)</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority (Flexible)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shopping-store" className="block text-xs font-semibold text-charcoal mb-1">
              Store / Vendor Name
            </label>
            <input
              id="shopping-store"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Chandni Chowk Silks / Manyavar"
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label htmlFor="shopping-notes" className="block text-xs font-semibold text-charcoal mb-1">
              {t.shopping.notes}
            </label>
            <input
              id="shopping-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shop address, fabric code, or fitting dates"
              className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
            />
          </div>
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
