import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import {
  X,
  Gift,
  BarChart3,
  ScanLine,
  Settings,
  Heart,
  Crown,
  Info,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const moreItems = [
    { to: '/gifts', label: t.nav.gifts, icon: Gift, badge: language === 'hi' ? 'पवित्र' : 'Sacred' },
    { to: '/reports', label: t.nav.reports, icon: BarChart3 },
    { to: '/smartscan', label: t.nav.smartscan, icon: ScanLine },
    { to: '/settings', label: t.nav.settings, icon: Settings },
    { to: '/welcome', label: t.nav.welcome, icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden flex justify-end bg-charcoal/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="More navigation menu"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-4/5 max-w-xs bg-ivory h-full shadow-2xl flex flex-col border-l border-gold/40 animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-4 border-b border-gold/25 bg-ivory-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy flex items-center justify-center text-gold border border-gold/40">
              <Crown className="w-4 h-4 text-gold-light" />
            </div>
            <div>
              <span className="font-royal text-base font-bold text-burgundy block leading-none">
                {t.appName}
              </span>
              <span className="text-[10px] text-charcoal-muted mt-0.5 block">
                {language === 'hi' ? 'अतिरिक्त विकल्प' : 'More Screens'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-charcoal-muted hover:text-burgundy hover:bg-rose/40 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language switcher inside drawer */}
        <div className="p-4 border-b border-gold/20 bg-rose-light/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-charcoal">
            {language === 'hi' ? 'भाषा चुनें' : 'Language'}
          </span>
          <LanguageSwitcher />
        </div>

        {/* Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-burgundy text-ivory shadow-xs'
                      : 'text-charcoal hover:bg-rose/40 hover:text-burgundy'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-gold-light' : 'text-charcoal-muted'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark font-bold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gold/25 bg-ivory-light text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-burgundy font-bold">
            <Heart className="w-3.5 h-3.5 fill-burgundy" />
            <span>Kavya & Rohan</span>
          </div>
          <div className="text-[10px] text-charcoal-muted mt-1">
            {t.appTagline}
          </div>
        </div>
      </div>
    </div>
  );
};
