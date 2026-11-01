import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { SyncIndicator } from '../common/SyncIndicator';
import { SyncStatusDrawer } from '../modals/SyncStatusDrawer';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import { useAuth } from '../../context/useAuth';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { Badge } from '../common/Badge';
import { Crown, Plus, Calendar, Heart, Menu, LogIn, LogOut, User } from 'lucide-react';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { t } = useTranslation();
  const { summary } = useWedding();
  const { user, family, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

  const isViewer = user?.role === 'VIEWER';
  const brideDisplay = family?.bride_name || summary.brideName;
  const groomDisplay = family?.groom_name || summary.groomName;
  const weddingDateDisplay = family?.wedding_date || summary.weddingDate;

  const handleSignOut = async () => {
    if (window.confirm(t.auth.signOutConfirm)) {
      await signOut();
      navigate('/welcome');
    }
  };

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
                {brideDisplay} & {groomDisplay}
              </span>
            </div>
            <span className="text-gold">|</span>
            <div className="flex items-center gap-1.5 text-xs text-charcoal-muted font-medium bg-ivory-light px-3 py-1 rounded-full border border-gold/30 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-gold-dark" />
              <span>{weddingDateDisplay}</span>
              <span className="font-bold text-burgundy ml-1">
                (48 {t.common.daysToGo})
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync & Connectivity Indicator */}
            <SyncIndicator onOpenDetails={() => setIsSyncDrawerOpen(true)} />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Authenticated User or Sign In Button */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/family"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ivory-light border border-gold/30 hover:bg-rose/30 transition-colors text-xs"
                >
                  <User className="w-3.5 h-3.5 text-burgundy" />
                  <span className="font-bold text-charcoal max-w-[100px] truncate">{user.name}</span>
                  <Badge
                    variant={user.role === 'OWNER' ? 'burgundy' : user.role === 'FAMILY_MEMBER' ? 'gold' : 'outline'}
                    size="sm"
                  >
                    {user.role === 'OWNER' ? 'Admin' : user.role === 'FAMILY_MEMBER' ? 'Member' : 'Viewer'}
                  </Badge>
                </NavLink>

                {/* Add Expense (Disabled for Viewers) */}
                <button
                  type="button"
                  disabled={isViewer}
                  onClick={() => setIsExpenseModalOpen(true)}
                  title={isViewer ? t.permissions.viewerReadOnly : t.expenses.addExpenseBtn}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                    isViewer
                      ? 'bg-charcoal/20 text-charcoal-muted cursor-not-allowed'
                      : 'bg-burgundy hover:bg-burgundy-dark text-ivory cursor-pointer hover:shadow-md'
                  }`}
                >
                  <Plus className="w-4 h-4 text-gold-light" />
                  <span className="hidden sm:inline">{t.expenses.addExpenseBtn}</span>
                  <span className="sm:hidden">{t.common.add}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-xl border border-gold/30 text-charcoal-muted hover:text-burgundy hover:bg-rose/30 transition-colors cursor-pointer"
                  title={t.auth.signOutBtn}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/sign-in"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-gold-light" />
                <span>{t.nav.signIn}</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      {/* Sync Status & Offline Queue Drawer */}
      <SyncStatusDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
      />
    </>
  );
};
