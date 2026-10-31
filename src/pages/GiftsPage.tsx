import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { RecordShagunModal } from '../components/modals/RecordShagunModal';
import {
  Gift,
  Plus,
  Search,
  Filter,
  HeartHandshake,
  Coins,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const GiftsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { shagunGifts, isPreviewMode, togglePreviewMode } = useWedding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredGifts = useMemo(() => {
    return shagunGifts.filter((g) => {
      const matchesSearch =
        g.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.relation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.itemDescription && g.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSide = selectedSide === 'all' || g.side === selectedSide;
      const matchesType = selectedType === 'all' || g.giftType === selectedType;

      return matchesSearch && matchesSide && matchesType;
    });
  }, [shagunGifts, searchQuery, selectedSide, selectedType]);

  const totalCashShagun = filteredGifts.reduce((sum, g) => sum + (g.cashAmount || 0), 0);
  const cashEnvelopesCount = filteredGifts.filter((g) => g.giftType === 'cash').length;
  const physicalGiftsCount = filteredGifts.filter((g) => g.giftType !== 'cash').length;

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

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-light" />
          <span>{t.gifts.addGiftBtn}</span>
        </button>
      </div>

      {/* Cultural Distinction Banner: Mandatory Non-Mixing */}
      <div className="p-4 rounded-2xl bg-rose-light border border-gold/40 text-xs text-charcoal flex items-start gap-3 card-shadow">
        <HeartHandshake className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-burgundy block mb-0.5">
            {language === 'hi' ? 'सांस्कृतिक मर्यादा एवं स्वतंत्र बही' : 'Sacred Distinction & Independent Ledger'}
          </strong>
          <span>{t.gifts.noticeBox}</span>
        </div>
      </div>

      {/* Shagun Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-gold-dark" />
            {t.gifts.totalCashReceived}
          </span>
          <div className="text-2xl font-bold text-burgundy mt-1">
            ₹{totalCashShagun.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.gifts.envelopesCount}
          </span>
          <div className="text-2xl font-bold text-charcoal mt-1">
            {cashEnvelopesCount}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.gifts.physicalGiftsCount}
          </span>
          <div className="text-2xl font-bold text-sage-dark mt-1">
            {physicalGiftsCount}
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
            placeholder="Search blessings by family name, city, or relation..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.common.all} Sides</option>
              <option value="bride">{t.common.brideSide}</option>
              <option value="groom">{t.common.groomSide}</option>
              <option value="mutual">{t.common.mutual}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.common.all} Types</option>
              <option value="cash">Cash (नकद लिफ़ाफ़ा)</option>
              <option value="gold_silver">Gold / Silver (सोना / चांदी)</option>
              <option value="item">Physical Gifts (उपहार)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gifts Register Table & Cards */}
      {filteredGifts.length === 0 ? (
        <EmptyState
          icon={<Gift className="w-8 h-8 text-burgundy" />}
          title={t.gifts.emptyTitle}
          description={t.gifts.emptySubtitle}
          actionLabel={t.gifts.addGiftBtn}
          onAction={() => setIsModalOpen(true)}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-ivory-light rounded-2xl border border-gold/30 card-shadow overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-ivory border-b border-gold/25 text-charcoal-muted uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t.gifts.donorName}</th>
                  <th className="py-3 px-4">{t.gifts.relation}</th>
                  <th className="py-3 px-4">{t.gifts.event}</th>
                  <th className="py-3 px-4">{t.gifts.side}</th>
                  <th className="py-3 px-4 text-right">{t.gifts.amountOrDesc}</th>
                  <th className="py-3 px-4 text-center">{t.gifts.thankYou}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {filteredGifts.map((gift) => (
                  <tr key={gift.id} className="hover:bg-rose-light/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-burgundy">{gift.donorName}</div>
                      {gift.returnGiftNotes && (
                        <div className="text-[11px] text-charcoal-muted mt-0.5">
                          Return Gift: {gift.returnGiftNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal">{gift.relation}</td>
                    <td className="py-3.5 px-4 capitalize text-charcoal-muted">
                      {gift.eventName}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={gift.side === 'bride' ? 'rose' : gift.side === 'groom' ? 'gold' : 'sage'}
                        size="sm"
                      >
                        {gift.side === 'bride'
                          ? t.common.brideSide
                          : gift.side === 'groom'
                          ? t.common.groomSide
                          : t.common.mutual}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-burgundy text-base whitespace-nowrap">
                      {gift.cashAmount ? (
                        <span>₹{gift.cashAmount.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-xs font-semibold text-charcoal">
                          {gift.itemDescription}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={gift.thankYouSent ? 'sage' : 'outline'}
                        size="sm"
                        icon={
                          gift.thankYouSent ? (
                            <CheckCircle2 className="w-3 h-3 text-sage" />
                          ) : (
                            <Clock className="w-3 h-3 text-gold-dark" />
                          )
                        }
                      >
                        {gift.thankYouSent ? t.gifts.sent : t.gifts.pending}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredGifts.map((gift) => (
              <div
                key={gift.id}
                className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-burgundy">
                      {gift.donorName}
                    </h3>
                    <p className="text-xs text-charcoal-muted mt-0.5">
                      {gift.relation} &bull; <span className="capitalize">{gift.eventName}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    {gift.cashAmount ? (
                      <span className="text-base font-bold text-burgundy">
                        ₹{gift.cashAmount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-charcoal">
                        {gift.itemDescription}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gold/20">
                  <Badge
                    variant={gift.side === 'bride' ? 'rose' : gift.side === 'groom' ? 'gold' : 'sage'}
                    size="sm"
                  >
                    {gift.side === 'bride' ? t.common.brideSide : gift.side === 'groom' ? t.common.groomSide : t.common.mutual}
                  </Badge>

                  <Badge
                    variant={gift.thankYouSent ? 'sage' : 'outline'}
                    size="sm"
                  >
                    {gift.thankYouSent ? 'Thank You Sent' : 'Thank You Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Modal */}
      <RecordShagunModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
