import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { Crown, Plus, Calendar, Heart, Menu } from 'lucide-react';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { t } = useTranslation();
  const { summary } = useWedding();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-ivory/90 backdrop-blur-md border-b border-gold/30 px-4 sm:px-6 py-3 transition-colors duration-200"
        aria-label="Application Header"
      >
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Mobile Brand / Toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="p-2 rounded-xl border border-gold/40 text-charcoal hover:bg-rose/40 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-burgundy" />
            </button>

            <NavLink to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-burgundy flex items-center justify-center text-gold border border-gold/40 shadow-xs">
                <Crown className="w-4 h-4 text-gold-light" />
              </div>
              <span className="font-royal text-lg font-bold text-burgundy">
                {t.appName}
              </span>
            </NavLink>
          </div>

          {/* Desktop Title & Wedding Countdown */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <Heart className="w-4 h-4 text-burgundy fill-burgundy" />
              <span>
                {summary.brideName} & {summary.groomName}
              </span>
            </div>
            <span className="text-gold">|</span>
            <div className="flex items-center gap-1.5 text-xs text-charcoal-muted font-medium bg-ivory-light px-3 py-1 rounded-full border border-gold/30 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-gold-dark" />
              <span>{summary.weddingDate}</span>
              <span className="font-bold text-burgundy ml-1">
                (48 {t.common.daysToGo})
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
              aria-label="Log new wedding expense"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span className="hidden sm:inline">{t.expenses.addExpenseBtn}</span>
              <span className="sm:hidden">{t.common.add}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />
    </>
  );
};
