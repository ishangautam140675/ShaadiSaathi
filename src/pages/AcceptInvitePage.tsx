import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import {
  Crown,
  Heart,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t, language } = useTranslation();
  const { acceptInvitation, isLoading } = useAuth();
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setVerificationError('No invitation token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        setIsVerifying(true);
        const res = await fetch(`/api/invitations/verify/${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setVerificationError(data.message || 'Invitation is invalid or has expired.');
        } else {
          setInvitationData(data.invitation);
          setFamilyData(data.family);
          setName(data.invitation.name || '');
        }
      } catch {
        setVerificationError('Failed to connect to verification service.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError(t.acceptInvite.passwordsDoNotMatch);
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    const success = await acceptInvitation({
      token: token!,
      name,
      password,
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
              {t.acceptInvite.title}
            </span>
          </div>
        </NavLink>

        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-10 flex flex-col justify-center animate-fadeIn">
        {isVerifying ? (
          <div className="bg-ivory-light border border-gold/40 rounded-3xl p-8 card-shadow text-center space-y-3">
            <div className="w-10 h-10 border-2 border-burgundy border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-burgundy">
              {t.acceptInvite.verifyingToken}
            </p>
          </div>
        ) : verificationError ? (
          <div className="bg-ivory-light border border-gold/40 rounded-3xl p-8 card-shadow text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-burgundy/10 border border-burgundy/30 text-burgundy flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold font-royal text-burgundy">
              {t.acceptInvite.invalidTitle}
            </h1>
            <p className="text-xs text-charcoal-muted max-w-sm mx-auto leading-relaxed">
              {verificationError}
            </p>
            <div className="pt-2">
              <NavLink
                to="/welcome"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark transition-colors"
              >
                <span>{t.acceptInvite.returnToWelcome}</span>
              </NavLink>
            </div>
          </div>
        ) : (
          <div className="bg-ivory-light border border-gold/40 rounded-3xl p-6 sm:p-8 card-shadow shadow-xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-rose/60 border border-gold/40 flex items-center justify-center text-burgundy mx-auto mb-2 shadow-2xs">
                <Heart className="w-6 h-6 text-burgundy fill-burgundy" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-dark block font-royal">
                {t.acceptInvite.welcomeToWedding}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-royal text-burgundy">
                {familyData?.bride_name} & {familyData?.groom_name}
              </h1>
              <p className="text-xs text-charcoal-muted">
                {familyData?.name} &bull; {familyData?.wedding_date}
              </p>
            </div>

            {/* Assigned Role & Email Badge Card */}
            <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-charcoal-muted block">
                  {t.acceptInvite.yourRoleLabel}:
                </span>
                <Badge
                  variant={invitationData?.role === 'FAMILY_MEMBER' ? 'gold' : 'outline'}
                  size="sm"
                  className="mt-1"
                >
                  {invitationData?.role === 'FAMILY_MEMBER'
                    ? t.family.roleMember
                    : t.family.roleViewer}
                </Badge>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-charcoal-muted block">
                  {t.acceptInvite.yourEmailLabel}:
                </span>
                <span className="font-semibold text-charcoal font-mono mt-1 block">
                  {invitationData?.email}
                </span>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="accept-name" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.acceptInvite.fullNameLabel} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                  <input
                    id="accept-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="accept-password" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.acceptInvite.passwordLabel} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                  <input
                    id="accept-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="accept-confirm-password" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.acceptInvite.confirmPasswordLabel} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gold-dark absolute left-3 top-3" />
                  <input
                    id="accept-confirm-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-burgundy hover:bg-burgundy-dark disabled:opacity-60 text-ivory text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isLoading ? t.acceptInvite.accepting : t.acceptInvite.acceptAndJoinBtn}</span>
                <ArrowRight className="w-4 h-4 text-gold-light" />
              </button>
            </form>

            <div className="p-3 rounded-xl bg-sage/15 border border-sage/40 text-sage-dark text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
              <span>
                {language === 'hi'
                  ? 'यह आमंत्रण सुरक्षित और केवल एक बार उपयोग के लिए है। खाता बनने के बाद आपकी भूमिका सुरक्षित रूप से लागू होगी।'
                  : 'This invitation is single-use and cryptographically signed. Your permissions will be enforced automatically.'}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
