import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/useAuth';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import {
  Crown,
  Sparkles,
  Heart,
  Calendar,
  Wallet,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const SetupPage: React.FC = () => {
  const { t } = useTranslation();
  const { initializeSetup, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const [familyName, setFamilyName] = useState('Sharma & Verma Wedding');
  const [brideName, setBrideName] = useState('Kavya Sharma');
  const [groomName, setGroomName] = useState('Rohan Verma');
  const [weddingDate, setWeddingDate] = useState('2026-12-18');
  const [totalBudget, setTotalBudget] = useState('2500000');
  const [adminName, setAdminName] = useState('Rajesh Sharma');
  const [adminEmail, setAdminEmail] = useState('rajesh@sharmafamily.org');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSide, setAdminSide] = useState<'bride' | 'groom' | 'mutual'>('bride');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await initializeSetup({
      familyName,
      brideName,
      groomName,
      weddingDate,
      totalBudget: totalBudget ? parseFloat(totalBudget) : 2500000,
      adminName,
      adminEmail,
      adminPassword,
      adminSide,
    });

    if (success) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-rose selection:text-burgundy">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gold/30 bg-ivory/80 backdrop-blur-md">
        <NavLink to="/welcome" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy flex items-center justify-center text-gold border border-gold/40 shadow-sm">
            <Crown className="w-5 h-5 text-gold-light" />
          </div>
          <div>
            <span className="font-royal text-xl font-bold text-burgundy tracking-wide leading-none block">
              {t.appName}
            </span>
            <span className="text-[11px] text-charcoal-muted tracking-wider uppercase font-semibold mt-0.5 block">
              {t.setup.title}
            </span>
          </div>
        </NavLink>

        <LanguageSwitcher />
      </header>

      {/* Main Setup Form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col justify-center animate-fadeIn">
        <div className="bg-ivory-light border border-gold/40 rounded-3xl p-6 sm:p-8 card-shadow shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold-dark mx-auto mb-2 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold font-royal text-burgundy">
              {t.setup.title}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted max-w-md mx-auto">
              {t.setup.subtitle}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Wedding Profile */}
            <div className="space-y-4 pt-2 border-t border-gold/25">
              <h2 className="text-xs font-bold uppercase tracking-wider text-burgundy flex items-center gap-1.5 font-royal">
                <Heart className="w-3.5 h-3.5 text-burgundy fill-burgundy" />
                {t.setup.weddingDetailsHeading}
              </h2>

              <div>
                <label htmlFor="setup-family-name" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.setup.familyNameLabel} *
                </label>
                <input
                  id="setup-family-name"
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder={t.setup.familyNamePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="setup-bride-name" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.brideNameLabel} *
                  </label>
                  <input
                    id="setup-bride-name"
                    type="text"
                    required
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    placeholder="e.g. Kavya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  />
                </div>

                <div>
                  <label htmlFor="setup-groom-name" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.groomNameLabel} *
                  </label>
                  <input
                    id="setup-groom-name"
                    type="text"
                    required
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    placeholder="e.g. Rohan Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="setup-wedding-date" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.weddingDateLabel} *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                    <input
                      id="setup-wedding-date"
                      type="date"
                      required
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-total-budget" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.totalBudgetLabel}
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                    <input
                      id="setup-total-budget"
                      type="number"
                      min="10000"
                      step="1000"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      placeholder="2500000"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Owner Administrator Details */}
            <div className="space-y-4 pt-4 border-t border-gold/25">
              <h2 className="text-xs font-bold uppercase tracking-wider text-burgundy flex items-center gap-1.5 font-royal">
                <Crown className="w-3.5 h-3.5 text-gold-dark" />
                {t.setup.adminDetailsHeading}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="setup-admin-name" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.adminNameLabel} *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                    <input
                      id="setup-admin-name"
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-admin-email" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.adminEmailLabel} *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                    <input
                      id="setup-admin-email"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. rajesh@sharmafamily.org"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="setup-admin-password" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.adminPasswordLabel} *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                    <input
                      id="setup-admin-password"
                      type="password"
                      required
                      minLength={8}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-admin-side" className="block text-xs font-semibold text-charcoal mb-1">
                    {t.setup.adminSideLabel}
                  </label>
                  <select
                    id="setup-admin-side"
                    value={adminSide}
                    onChange={(e) => setAdminSide(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  >
                    <option value="bride">{t.common.brideSide}</option>
                    <option value="groom">{t.common.groomSide}</option>
                    <option value="mutual">{t.common.mutual}</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-burgundy hover:bg-burgundy-dark disabled:opacity-60 text-ivory text-sm sm:text-base font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>{isLoading ? t.setup.initializing : t.setup.submitBtn}</span>
              <ArrowRight className="w-4 h-4 text-gold-light" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
