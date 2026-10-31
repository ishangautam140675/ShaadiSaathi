import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Users,
  Gift,
  CheckSquare,
  BarChart3,
  ScanLine,
  Settings,
  Heart,
  Crown,
  Sparkles,
} from 'lucide-react';

export const DesktopSidebar: React.FC = () => {
  const { t, language } = useTranslation();
  const { summary } = useWedding();

  const navItems = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/expenses', label: t.nav.expenses, icon: Receipt },
    { to: '/shopping', label: t.nav.shopping, icon: ShoppingBag },
    { to: '/vendors', label: t.nav.vendors, icon: Users },
    { to: '/gifts', label: t.nav.gifts, icon: Gift, highlight: true },
    { to: '/checklist', label: t.nav.checklist, icon: CheckSquare },
    { to: '/reports', label: t.nav.reports, icon: BarChart3 },
    { to: '/smartscan', label: t.nav.smartscan, icon: ScanLine },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-64 bg-ivory border-r border-gold/30 min-h-screen sticky top-0 h-screen overflow-y-auto select-none"
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-gold/25 bg-ivory-light">
        <NavLink to="/welcome" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-burgundy flex items-center justify-center text-gold shadow-md group-hover:scale-105 transition-transform duration-200 border border-gold/40">
            <Crown className="w-5 h-5 text-gold-light" />
          </div>
          <div>
            <span className="text-xl font-bold font-royal text-burgundy tracking-wide block leading-none">
              {t.appName}
            </span>
            <span className="text-[10px] text-charcoal-muted tracking-wider uppercase font-semibold mt-1 block">
              {language === 'hi' ? 'विवाह प्रबंधन' : 'Royal Wedding PWA'}
            </span>
          </div>
        </NavLink>

        {/* Couple & Date Banner */}
        <div className="mt-4 p-2.5 rounded-xl bg-rose/30 border border-gold/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-burgundy">
            <Heart className="w-3.5 h-3.5 text-burgundy fill-burgundy" />
            <span className="truncate">{summary.brideName} & {summary.groomName}</span>
          </div>
          <div className="text-[11px] text-charcoal-muted mt-1 flex items-center justify-between">
            <span>{summary.weddingDate}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-gold/20 text-gold-dark font-semibold text-[10px]">
              48 {language === 'hi' ? 'दिन शेष' : 'days to go'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-burgundy text-ivory shadow-xs border-l-4 border-gold'
                    : 'text-charcoal hover:bg-rose/40 hover:text-burgundy'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-gold-light' : 'text-charcoal-muted'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.highlight && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                        isActive
                          ? 'bg-gold text-burgundy-dark'
                          : 'bg-rose text-burgundy'
                      }`}
                    >
                      {language === 'hi' ? 'पवित्र' : 'Sacred'}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Invitation Info */}
      <div className="p-4 border-t border-gold/20 bg-ivory-light/70 text-xs">
        <div className="flex items-center gap-2 text-charcoal-muted mb-2">
          <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
          <span className="font-semibold text-burgundy text-[11px] uppercase tracking-wider">
            {t.common.invitationOnly}
          </span>
        </div>
        <p className="text-[11px] text-charcoal-muted/90 leading-tight">
          {language === 'hi'
            ? 'गोपनीय पारिवारिक वास्तुकला। शून्य सार्वजनिक पंजीकरण।'
            : 'Confidential family architecture. Zero public signups.'}
        </p>
      </div>
    </aside>
  );
};
