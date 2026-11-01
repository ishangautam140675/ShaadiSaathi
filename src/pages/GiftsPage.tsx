import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { RecordShagunModal } from '../components/modals/RecordShagunModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import type { ShagunGift, GiftEntity } from '../types';
import {
  Gift,
  Plus,
  Search,
  Filter,
  HeartHandshake,
  Coins,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';

export const GiftsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { shagunGifts, deleteShagunGift, giftsSummary, isPreviewMode, togglePreviewMode } = useWedding();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [giftToEdit, setGiftToEdit] = useState<ShagunGift | GiftEntity | null>(null);
  const [giftToDelete, setGiftToDelete] = useState<ShagunGift | GiftEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredGifts = useMemo(() => {
    return shagunGifts.filter((g) => {
      const q = searchQuery.toLowerCase();
      const donor = g.giverName || g.donorName || '';
      const rel = g.relation || '';
      const desc = g.description || g.itemDescription || '';

      const matchesSearch =
        donor.toLowerCase().includes(q) ||
        rel.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q);

      const matchesSide = selectedSide === 'all' || g.side === selectedSide;
      const matchesType =
        selectedType === 'all' ||
        g.giftType === selectedType ||
        (selectedType === 'cash' && g.giftType === 'shagun') ||
        (selectedType === 'physical_gift' && g.giftType === 'item');

      return matchesSearch && matchesSide && matchesType;
    });
  }, [shagunGifts, searchQuery, selectedSide, selectedType]);

  const totalCashShagun = giftsSummary?.totalCashShagun ?? filteredGifts.reduce((sum, g) => sum + (g.cashAmount || g.amount || 0), 0);
  const cashEnvelopesCount = giftsSummary?.cashEnvelopesCount ?? filteredGifts.filter((g) => g.giftType === 'cash' || g.giftType === 'shagun').length;
  const physicalGiftsCount = (giftsSummary?.physicalGiftsCount ?? 0) + (giftsSummary?.jewelleryGiftsCount ?? 0) || filteredGifts.filter((g) => g.giftType !== 'cash' && g.giftType !== 'shagun').length;

  const handleDeleteConfirm = async () => {
    if (!giftToDelete) return;
    try {
      setIsDeleting(true);
      await deleteShagunGift(giftToDelete.id);
      setGiftToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
              {t.gifts.title}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark font-bold text-xs uppercase tracking-wider">
              {language === 'hi' ? 'पवित्र बही' : 'Sacred Ledger'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.gifts.subtitle}
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
                setGiftToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span>{t.gifts.addGiftBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cultural Separation Banner */}
      <div className="p-4 rounded-2xl bg-rose/40 border border-gold/30 text-xs text-charcoal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <HeartHandshake className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-burgundy block mb-0.5">
              {language === 'hi' ? 'शगुन एवं उपहारों की पवित्र परंपरा' : 'Sacred Indian Wedding Shagun Separation'}
            </strong>
            <span>
              {t.gifts.noticeBox}
            </span>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-muted">
              {t.gifts.totalCashReceived}
            </span>
            <Coins className="w-4 h-4 text-gold-dark" />
          </div>
          <div className="text-xl font-bold text-burgundy mt-1">
            ₹{totalCashShagun.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.gifts.envelopesCount}
          </span>
          <div className="text-xl font-bold text-sage-dark mt-1">
            {cashEnvelopesCount}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.gifts.physicalGiftsCount}
          </span>
          <div className="text-xl font-bold text-gold-dark mt-1">
            {physicalGiftsCount}
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
            placeholder={language === 'hi' ? 'आशीर्वादकर्ता या उपहार खोजें...' : 'Search by giver name, relation, or gift description...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Family Side Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{language === 'hi' ? 'दोनों पक्ष (All Sides)' : 'All Family Sides'}</option>
              <option value="bride">{t.gifts.brideSide}</option>
              <option value="groom">{t.gifts.groomSide}</option>
              <option value="mutual">{t.gifts.mutualGuests}</option>
            </select>
          </div>

          {/* Gift Type Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{language === 'hi' ? 'सभी उपहार प्रकार' : 'All Gift Types'}</option>
              <option value="cash">{t.gifts.cashShagun}</option>
              <option value="physical_gift">{language === 'hi' ? 'भौतिक उपहार' : 'Physical Gift'}</option>
              <option value="jewellery">{t.gifts.goldSilver}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gifts List */}
      {filteredGifts.length === 0 ? (
        <EmptyState
          icon={<Gift className="w-8 h-8 text-burgundy" />}
          title={t.gifts.emptyTitle}
          description={t.gifts.emptySubtitle}
          actionLabel={!isViewer ? t.gifts.recordShagunBtn : undefined}
          onAction={() => {
            setGiftToEdit(null);
            setIsModalOpen(true);
          }}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGifts.map((gift) => {
            const donor = gift.giverName || gift.donorName;
            const cash = gift.cashAmount ?? gift.amount;
            const desc = gift.description || gift.itemDescription;
            const dateStr = gift.dateReceived || gift.date;

            return (
              <div
                key={gift.id}
                className="bg-ivory-light rounded-2xl p-4 sm:p-5 border border-gold/30 card-shadow flex flex-col justify-between space-y-3 hover:border-gold/60 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant={gift.side === 'bride' ? 'rose' : gift.side === 'groom' ? 'gold' : 'sage'}
                      size="sm"
                    >
                      {gift.side === 'bride'
                        ? t.gifts.brideSide
                        : gift.side === 'groom'
                        ? t.gifts.groomSide
                        : t.gifts.mutualGuests}
                    </Badge>

                    <Badge variant={cash ? 'sage' : 'outline'} size="sm">
                      {cash
                        ? t.gifts.cashShagun
                        : gift.giftType === 'jewellery' || gift.giftType === 'gold_silver'
                        ? t.gifts.goldSilver
                        : 'PHYSICAL GIFT'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-burgundy font-royal">
                    {donor}
                  </h3>

                  <p className="text-xs text-charcoal-muted mt-0.5">
                    {gift.relation}
                  </p>

                  {/* Cash or Physical Gift Details */}
                  {cash ? (
                    <div className="mt-3 p-2.5 rounded-xl bg-ivory border border-gold/30 flex items-center justify-between">
                      <span className="text-xs text-charcoal-muted font-medium">
                        {t.gifts.cashAmount}:
                      </span>
                      <strong className="text-burgundy font-bold text-base">
                        ₹{cash.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded-xl bg-ivory border border-gold/30 text-xs">
                      <span className="text-charcoal-muted block text-[11px]">
                        {t.gifts.giftDesc}:
                      </span>
                      <strong className="text-charcoal font-semibold block mt-0.5">
                        {desc || 'Item Gift'}
                      </strong>
                    </div>
                  )}

                  {dateStr && (
                    <p className="text-[11px] text-charcoal-muted mt-2">
                      Received: <strong>{dateStr}</strong>
                    </p>
                  )}

                  {gift.notes && (
                    <p className="text-xs text-charcoal-muted italic mt-2 p-2 rounded-lg bg-ivory border border-gold/20 line-clamp-2">
                      "{gift.notes}"
                    </p>
                  )}
                </div>

                {/* Actions Bar */}
                {!isViewer && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gold/15">
                    <button
                      type="button"
                      onClick={() => {
                        setGiftToEdit(gift);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gold/40 hover:bg-rose/30 text-charcoal text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGiftToDelete(gift)}
                      className="p-1 rounded-lg border border-burgundy/30 text-burgundy hover:bg-burgundy/10 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record / Edit Shagun Modal */}
      <RecordShagunModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setGiftToEdit(null);
        }}
        giftToEdit={giftToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(giftToDelete)}
        onClose={() => setGiftToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title={language === 'hi' ? 'शगुन रिकॉर्ड हटाएं' : 'Delete Shagun Record'}
        description={language === 'hi' ? 'क्या आप निश्चित रूप से इस शगुन प्रविष्टि को हटाना चाहते हैं?' : 'Are you sure you want to remove this record from the sacred ledger?'}
        itemName={giftToDelete?.giverName || giftToDelete?.donorName}
      />
    </div>
  );
};
