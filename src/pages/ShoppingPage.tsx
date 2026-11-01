import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddShoppingModal } from '../components/modals/AddShoppingModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import type { ShoppingItem, ShoppingItemEntity } from '../types';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  User,
  Store,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';

export const ShoppingPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { shoppingItems, deleteShoppingItem, shoppingSummary, isPreviewMode, togglePreviewMode } = useWedding();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | ShoppingItemEntity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ShoppingItem | ShoppingItemEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return shoppingItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const title = item.name || item.title || '';
      const store = item.storeName || '';
      const assigned = item.assignedTo || '';

      const matchesSearch =
        title.toLowerCase().includes(q) ||
        assigned.toLowerCase().includes(q) ||
        store.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatus === 'all' || item.status === selectedStatus;

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const matchesPriority =
        selectedPriority === 'all' || (item.priority || item.urgency) === selectedPriority;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
  }, [shoppingItems, searchQuery, selectedStatus, selectedCategory, selectedPriority]);

  const estimatedTotal = shoppingSummary?.estimatedTotal ?? filteredItems.reduce((sum, i) => sum + i.estimatedPrice, 0);
  const actualTotal = shoppingSummary?.actualSpent ?? filteredItems.reduce((sum, i) => sum + (i.actualPrice || 0), 0);
  const variance = shoppingSummary?.variance ?? (estimatedTotal - actualTotal);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await deleteShoppingItem(itemToDelete.id);
      setItemToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'rose';
      case 'high': return 'gold';
      case 'medium': return 'sage';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.shopping.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.shopping.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isViewer ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 text-gold-dark text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'केवल पठन अनुमति' : 'Read-Only (Viewer)'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span>{t.shopping.addItemBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.shopping.estimatedTotal}
          </span>
          <div className="text-xl font-bold text-burgundy mt-1">
            ₹{estimatedTotal.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.shopping.actualTotal}
          </span>
          <div className="text-xl font-bold text-sage-dark mt-1">
            ₹{actualTotal.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-muted">
              {t.shopping.variance}
            </span>
            {variance >= 0 ? (
              <TrendingDown className="w-4 h-4 text-sage" />
            ) : (
              <TrendingUp className="w-4 h-4 text-burgundy" />
            )}
          </div>
          <div
            className={`text-xl font-bold mt-1 ${
              variance >= 0 ? 'text-sage-dark' : 'text-burgundy'
            }`}
          >
            {variance >= 0 ? '+' : '-'}₹{Math.abs(variance).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-ivory-light rounded-2xl p-4 border border-gold/30 card-shadow flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'सामान, दुकान या सदस्य खोजें...' : 'Search item name, store, or assigned person...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">{t.shopping.allCategories}</option>
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.shopping.allStatuses}</option>
              <option value="planned">{language === 'hi' ? 'योजनाबद्ध' : 'Planned'}</option>
              <option value="to_buy">{t.shopping.toBuy}</option>
              <option value="in_tailoring">{t.shopping.inTailoring}</option>
              <option value="purchased">{t.shopping.purchased}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">{language === 'hi' ? 'सभी प्राथमिकता' : 'All Priorities'}</option>
              <option value="urgent">{language === 'hi' ? 'अति आवश्यक (Urgent)' : 'Urgent'}</option>
              <option value="high">{language === 'hi' ? 'उच्च (High)' : 'High'}</option>
              <option value="medium">{language === 'hi' ? 'सामान्य (Medium)' : 'Medium'}</option>
              <option value="low">{language === 'hi' ? 'कम (Low)' : 'Low'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shopping Items List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-burgundy" />}
          title={t.shopping.emptyTitle}
          description={t.shopping.emptySubtitle}
          actionLabel={!isViewer ? t.shopping.addItemBtn : undefined}
          onAction={() => {
            setItemToEdit(null);
            setIsAddModalOpen(true);
          }}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const title = item.name || item.title;
            const priorityVal = item.priority || item.urgency;
            return (
              <div
                key={item.id}
                className="bg-ivory-light rounded-2xl p-4 sm:p-5 border border-gold/30 card-shadow flex flex-col justify-between space-y-3 hover:border-gold/60 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={getPriorityBadgeVariant(priorityVal)} size="sm">
                      {priorityVal ? priorityVal.toUpperCase() : 'MEDIUM'}
                    </Badge>

                    <Badge
                      variant={
                        item.status === 'purchased'
                          ? 'sage'
                          : item.status === 'in_tailoring'
                          ? 'gold'
                          : 'outline'
                      }
                      size="sm"
                    >
                      {item.status === 'purchased'
                        ? t.shopping.purchased
                        : item.status === 'in_tailoring'
                        ? t.shopping.inTailoring
                        : t.shopping.toBuy}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-burgundy font-royal">
                    {title}
                  </h3>

                  {item.quantity && item.quantity > 1 && (
                    <span className="text-xs font-semibold text-charcoal-muted">
                      Qty: {item.quantity}
                    </span>
                  )}

                  <div className="flex items-center gap-3 text-xs text-charcoal-muted mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-charcoal font-medium">
                      <User className="w-3.5 h-3.5 text-gold-dark" />
                      {item.assignedTo}
                    </span>

                    {item.storeName && (
                      <span className="flex items-center gap-1 text-charcoal-muted">
                        <Store className="w-3.5 h-3.5 text-burgundy" />
                        {item.storeName}
                      </span>
                    )}
                  </div>

                  {item.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-muted mt-2">
                      <Calendar className="w-3.5 h-3.5 text-gold-dark" />
                      <span>Deadline: <strong>{item.deadline}</strong></span>
                      {item.isOverdue && (
                        <span className="inline-flex items-center gap-1 text-burgundy font-bold text-[10px] px-1.5 py-0.5 rounded-full bg-burgundy/10">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-charcoal-muted italic mt-2 p-2 rounded-lg bg-ivory border border-gold/20 line-clamp-2">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gold/25 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-charcoal-muted block text-[11px]">
                        {t.shopping.estimatedPrice}
                      </span>
                      <strong className="text-charcoal font-bold">
                        ₹{item.estimatedPrice.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-charcoal-muted block text-[11px]">
                        {t.shopping.actualPrice}
                      </span>
                      <strong className="text-sage-dark font-bold">
                        {item.actualPrice
                          ? `₹${item.actualPrice.toLocaleString('en-IN')}`
                          : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {!isViewer && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gold/15">
                      <button
                        type="button"
                        onClick={() => {
                          setItemToEdit(item);
                          setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gold/40 hover:bg-rose/30 text-charcoal text-xs font-semibold cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-1 rounded-lg border border-burgundy/30 text-burgundy hover:bg-burgundy/10 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Shopping Item Modal */}
      <AddShoppingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title={language === 'hi' ? 'खरीदारी सामान हटाएं' : 'Delete Shopping Item'}
        description={language === 'hi' ? 'क्या आप निश्चित रूप से इस सामान को सूची से हटाना चाहते हैं?' : 'Are you sure you want to remove this item from the shopping register?'}
        itemName={itemToDelete?.name || itemToDelete?.title}
      />
    </div>
  );
};
