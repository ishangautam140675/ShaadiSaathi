import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddShoppingModal } from '../components/modals/AddShoppingModal';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  User,
  Store,
} from 'lucide-react';

export const ShoppingPage: React.FC = () => {
  const { t } = useTranslation();
  const { shoppingItems, isPreviewMode, togglePreviewMode } = useWedding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return shoppingItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.storeName && item.storeName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'all' || item.status === selectedStatus;

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [shoppingItems, searchQuery, selectedStatus, selectedCategory]);

  const estimatedTotal = filteredItems.reduce((sum, i) => sum + i.estimatedPrice, 0);
  const actualTotal = filteredItems.reduce((sum, i) => sum + (i.actualPrice || 0), 0);
  const variance = estimatedTotal - actualTotal;

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

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-light" />
          <span>{t.shopping.addItemBtn}</span>
        </button>
      </div>

      {/* Financial Estimates Bar */}
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
          <div className="text-xl font-bold text-charcoal mt-1">
            ₹{actualTotal.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.shopping.variance}
          </span>
          <div
            className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${
              variance >= 0 ? 'text-sage-dark' : 'text-burgundy'
            }`}
          >
            {variance >= 0 ? (
              <TrendingDown className="w-4 h-4 text-sage" />
            ) : (
              <TrendingUp className="w-4 h-4 text-burgundy" />
            )}
            <span>₹{Math.abs(variance).toLocaleString('en-IN')}</span>
            <span className="text-xs font-normal text-charcoal-muted">
              {variance >= 0 ? '(Within budget)' : '(Exceeded estimate)'}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-ivory-light rounded-2xl p-4 border border-gold/30 card-shadow flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shopping items, assigned family member, or store..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.shopping.allCategories}</option>
              <option value="bride">Bride's Trousseau</option>
              <option value="groom">Groom's Wardrobe</option>
              <option value="family">Immediate Family</option>
              <option value="pooja_ceremony">Puja & Ritual Items</option>
              <option value="return_gifts">Return Gifts & Favors</option>
              <option value="other">Other Items</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.shopping.allStatuses}</option>
              <option value="to_buy">{t.shopping.toBuy}</option>
              <option value="in_tailoring">{t.shopping.inTailoring}</option>
              <option value="purchased">{t.shopping.purchased}</option>
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
          actionLabel={t.shopping.addItemBtn}
          onAction={() => setIsModalOpen(true)}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-ivory-light rounded-2xl p-4 sm:p-5 border border-gold/30 card-shadow flex flex-col justify-between space-y-3 hover:border-gold/60 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant={
                      item.status === 'purchased'
                        ? 'sage'
                        : item.status === 'in_tailoring'
                        ? 'gold'
                        : 'rose'
                    }
                    size="sm"
                  >
                    {item.status === 'purchased'
                      ? t.shopping.purchased
                      : item.status === 'in_tailoring'
                      ? t.shopping.inTailoring
                      : t.shopping.toBuy}
                  </Badge>

                  <Badge
                    variant={item.urgency === 'high' ? 'burgundy' : 'outline'}
                    size="sm"
                  >
                    {item.urgency.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-burgundy leading-snug">
                  {item.title}
                </h3>

                {item.notes && (
                  <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                    {item.notes}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-gold/20 text-xs">
                {/* Pricing row */}
                <div className="flex items-center justify-between font-mono">
                  <span className="text-charcoal-muted">
                    Est: ₹{item.estimatedPrice.toLocaleString('en-IN')}
                  </span>
                  {item.actualPrice ? (
                    <span className="font-bold text-burgundy">
                      Paid: ₹{item.actualPrice.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-gold-dark italic">Unpurchased</span>
                  )}
                </div>

                {/* Responsible Person & Store */}
                <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-1">
                  <span className="flex items-center gap-1 font-semibold text-charcoal">
                    <User className="w-3 h-3 text-gold-dark" />
                    {item.assignedTo}
                  </span>

                  {item.storeName && (
                    <span className="flex items-center gap-1 truncate max-w-[130px]">
                      <Store className="w-3 h-3 text-burgundy" />
                      {item.storeName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddShoppingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
