import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Users,
  CheckSquare,
  MoreHorizontal,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/expenses', label: t.nav.expenses, icon: Receipt },
    { to: '/shopping', label: t.nav.shopping, icon: ShoppingBag },
    { to: '/vendors', label: t.nav.vendors, icon: Users },
    { to: '/checklist', label: t.nav.checklist, icon: CheckSquare },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ivory/95 backdrop-blur-md border-t border-gold/40 px-2 py-1 shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? 'text-burgundy font-bold scale-105'
                    : 'text-charcoal-muted hover:text-burgundy font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 mb-0.5 ${
                      isActive ? 'text-burgundy' : 'text-charcoal-muted'
                    }`}
                  />
                  <span className="text-[10px] truncate max-w-[64px]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-charcoal-muted hover:text-burgundy transition-all duration-200 min-w-[56px] cursor-pointer"
          aria-label="Open more menu options"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5 text-charcoal-muted" />
          <span className="text-[10px] font-medium">{t.nav.more}</span>
        </button>
      </div>
    </nav>
  );
};
