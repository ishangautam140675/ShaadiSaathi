import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/useAuth';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import {
  Crown,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Smartphone,
} from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, error, clearError, isLoading, setupRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await signIn(email, password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-rose selection:text-burgundy">
      {/* Top Bar */}
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
              {t.appSubtitle}
            </span>
          </div>
        </NavLink>

        <LanguageSwitcher />
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-10 flex flex-col justify-center animate-fadeIn">
        <div className="bg-ivory-light border border-gold/40 rounded-3xl p-6 sm:p-8 card-shadow shadow-xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-rose/60 border border-gold/40 flex items-center justify-center text-burgundy mx-auto mb-2 shadow-2xs">
              <Lock className="w-6 h-6 text-burgundy" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-royal text-burgundy">
              {t.auth.signInTitle}
            </h1>
            <p className="text-xs text-charcoal-muted">
              {t.auth.signInSubtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* First Time Setup Banner if DB has no admin */}
          {setupRequired && (
            <div className="p-3.5 rounded-xl bg-gold/15 border border-gold/40 text-xs text-charcoal space-y-2">
              <div className="flex items-center gap-2 font-bold text-burgundy">
                <Sparkles className="w-4 h-4 text-gold-dark" />
                <span>{t.auth.firstTimeSetupNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/setup')}
                className="w-full py-2 px-3 rounded-lg bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark transition-colors cursor-pointer"
              >
                {t.auth.initSetupBtn}
              </button>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-charcoal mb-1">
                {t.auth.emailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajesh@sharmafamily.org"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-charcoal mb-1">
                {t.auth.passwordLabel}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-burgundy hover:bg-burgundy-dark disabled:opacity-60 text-ivory text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? t.auth.signingIn : t.auth.signInBtn}</span>
              <ArrowRight className="w-4 h-4 text-gold-light" />
            </button>
          </form>

          {/* Multi-Device Session Isolation Notice */}
          <div className="pt-2 border-t border-gold/20 flex items-start gap-2 text-[11px] text-charcoal-muted leading-relaxed">
            <Smartphone className="w-3.5 h-3.5 text-gold-dark flex-shrink-0 mt-0.5" />
            <span>{t.auth.deviceSessionNotice}</span>
          </div>

          {/* Invitation Notice */}
          <div className="text-center pt-2">
            <p className="text-xs text-charcoal-muted mb-2">
              {t.auth.noPublicSignupNotice}
            </p>
            <NavLink
              to="/welcome"
              className="text-xs font-semibold text-burgundy hover:text-gold-dark underline"
            >
              {t.auth.haveInviteLink}
            </NavLink>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-charcoal-muted">
        <div className="flex items-center justify-center gap-1.5 text-burgundy font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ShaadiSaathi &bull; Zero Subscription Cost &bull; Invitation-Only</span>
        </div>
      </footer>
    </div>
  );
};
