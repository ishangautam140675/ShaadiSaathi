import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import {
  Crown,
  Heart,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Lock,
  Gift,
  CloudOff,
  Coins,
  FileCheck,
} from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const handleVerifyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      navigate(`/invite/${encodeURIComponent(inviteCode.trim())}`);
    } else {
      setIsInviteModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col justify-between selection:bg-rose selection:text-burgundy">
      {/* Top Bar with Language Switcher */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gold/30 bg-ivory/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy flex items-center justify-center text-gold border border-gold/40 shadow-sm">
            <Crown className="w-5 h-5 text-gold-light" />
          </div>
          <div>
            <h1 className="font-royal text-xl font-bold text-burgundy tracking-wide leading-none">
              {t.appName}
            </h1>
            <p className="text-[11px] text-charcoal-muted tracking-wider uppercase font-semibold mt-0.5">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Invitation Only Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose/60 border border-gold/40 text-burgundy font-semibold text-xs mb-6 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-gold-dark" />
          <span>{t.welcome.inviteOnlyBadge}</span>
        </div>

        {/* Tagline & Hero Title */}
        <h2 className="font-royal text-3xl sm:text-5xl lg:text-6xl font-bold text-burgundy max-w-4xl tracking-tight leading-tight mb-4">
          {t.welcome.heroTitle}
        </h2>

        <p className="font-serif italic text-lg sm:text-xl text-gold-dark font-medium mb-3">
          "{t.appTagline}"
        </p>

        <p className="text-sm sm:text-base text-charcoal-muted max-w-2xl mb-10 leading-relaxed">
          {t.welcome.heroDesc}
        </p>

        {/* Entry Actions Box */}
        <div className="w-full max-w-md bg-ivory-light border border-gold/40 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Direct Demo / Shell Entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{t.welcome.enterApp}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-light group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/sign-in')}
              className="w-full py-3 px-4 rounded-xl border border-gold/50 bg-ivory text-burgundy hover:bg-rose/40 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-gold-dark" />
              <span>{t.nav.signIn}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-gold/30 w-full" />
            <span className="bg-ivory-light px-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
              {language === 'hi' ? 'अथवा निमंत्रण कोड' : 'Or with invite code'}
            </span>
            <div className="border-t border-gold/30 w-full" />
          </div>

          {/* Invitation Code Simulation */}
          <form onSubmit={handleVerifyInvite} className="space-y-3">
            <div className="text-left">
              <label htmlFor="invite-code" className="block text-xs font-semibold text-charcoal mb-1">
                {t.welcome.enterInviteCode}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={t.welcome.inviteCodePlaceholder}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm uppercase tracking-wider font-mono placeholder:text-charcoal-muted/60 focus:border-burgundy"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl border border-gold/50 bg-rose/40 hover:bg-rose text-burgundy font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t.welcome.verifyCode}
            </button>
          </form>

          {/* Insecure Signup Prohibition Notice */}
          <div className="p-3 rounded-xl bg-rose-light border border-rose-dark/30 text-[11px] text-charcoal-muted text-left flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
            <span>{t.welcome.inviteOnlyNotice}</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 w-full max-w-4xl">
          <h3 className="text-xs uppercase tracking-widest font-bold text-gold-dark mb-6">
            {t.welcome.featuresTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center mb-3">
                <CloudOff className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-burgundy mb-1">
                {t.welcome.feature1Title}
              </h4>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {t.welcome.feature1Desc}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold-dark flex items-center justify-center mb-3">
                <Gift className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-burgundy mb-1">
                {t.welcome.feature2Title}
              </h4>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {t.welcome.feature2Desc}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center mb-3">
                <Coins className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-burgundy mb-1">
                {t.welcome.feature3Title}
              </h4>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {t.welcome.feature3Desc}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-rose text-burgundy flex items-center justify-center mb-3">
                <FileCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-burgundy mb-1">
                {t.welcome.feature4Title}
              </h4>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {t.welcome.feature4Desc}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gold/25 bg-ivory-light text-center text-xs text-charcoal-muted">
        <div className="flex items-center justify-center gap-1.5 mb-1 font-semibold text-burgundy">
          <Heart className="w-3.5 h-3.5 fill-burgundy" />
          <span>{t.appName} &bull; {t.appTagline}</span>
        </div>
        <p className="text-[11px] text-charcoal-muted/70">
          Phase 1 Foundation &bull; Zero Subscription Cost Architecture &bull; Built with React & Vite PWA
        </p>
      </footer>

      {/* Invite Code Roadmap Notice */}
      <PhaseNoticeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        featureName={language === 'hi' ? 'पारिवारिक निमंत्रण टोकन' : 'Family Invitation Tokens'}
        targetPhase="Phase 2"
        description={
          language === 'hi'
            ? 'सार्वजनिक असुरक्षित खातों के बजाय, शादीसाथी परिवार के मुखिया द्वारा जारी गुप्त टोकन का उपयोग करेगा। यह सुरक्षा वास्तुकला फेज़ 2 बैकएंड में लागू होगी।'
            : 'Rather than insecure public accounts, ShaadiSaathi uses cryptographically signed family tokens generated by the wedding host. This security architecture will be connected in Phase 2.'
        }
        checklistItems={[
          'Host-generated time-bound invite links (WhatsApp/SMS ready)',
          'Role-based permissions (Family Admin, Editor, Viewer)',
          'Complete isolation between unrelated wedding accounts',
          'Offline validation and token rotation support',
        ]}
      />
    </div>
  );
};
