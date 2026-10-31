import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { Badge } from '../components/common/Badge';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import {
  Languages,
  Heart,
  Users,
  Cpu,
  Database,
  Download,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { summary } = useWedding();
  const { user, isAuthenticated } = useAuth();

  const [isBackupNoticeOpen, setIsBackupNoticeOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-gold/25">
        <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
          {t.settings.title}
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      {/* 1. Language Preference Section */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-burgundy/10 text-burgundy mt-0.5">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-burgundy">
                {t.settings.languageSection}
              </h2>
              <p className="text-xs text-charcoal-muted mt-0.5 max-w-lg">
                {t.settings.languageDesc}
              </p>
            </div>
          </div>
          <LanguageSwitcher variant="pill" />
        </div>

        <div className="p-3 rounded-xl bg-rose-light/50 border border-gold/20 text-xs text-charcoal-muted">
          ℹ️ {language === 'hi'
            ? 'वर्तमान चयन: हिन्दी (Devanagari)। उपयोगकर्ता द्वारा प्रविष्ट किए गए नाम और विवरण मूल भाषा में सुरक्षित रहते हैं।'
            : 'Current choice: English. User-entered vendor names and custom descriptions remain in their original form.'}
        </div>
      </section>

      {/* 2. Wedding Profile Details */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-gold/20 text-gold-dark mt-0.5">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-burgundy">
              {t.settings.weddingDetailsSection}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {t.settings.weddingDetailsDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-ivory border border-gold/25">
            <span className="text-[11px] font-semibold text-charcoal-muted block">
              {t.settings.coupleNames}
            </span>
            <span className="text-sm font-bold text-burgundy mt-1 block">
              {summary.brideName} & {summary.groomName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory border border-gold/25">
            <span className="text-[11px] font-semibold text-charcoal-muted block">
              {t.settings.weddingDate}
            </span>
            <span className="text-sm font-bold text-charcoal mt-1 block">
              {summary.weddingDate}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory border border-gold/25">
            <span className="text-[11px] font-semibold text-charcoal-muted block">
              {t.settings.totalBudget}
            </span>
            <span className="text-sm font-bold text-burgundy mt-1 block">
              ₹{summary.totalBudget.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Family Access & Roles (Phase 2 Real RBAC) */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sage/20 text-sage-dark mt-0.5">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-burgundy">
                {t.settings.familyRolesSection}
              </h2>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {t.settings.familyRolesDesc}
              </p>
            </div>
          </div>
          <NavLink
            to="/family"
            className="px-3 py-1.5 rounded-xl bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark transition-colors"
          >
            {language === 'hi' ? 'परिवार प्रबंधन' : 'Manage Family'}
          </NavLink>
        </div>

        {isAuthenticated && user && (
          <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-charcoal-muted block text-[11px]">Current Session User:</span>
              <span className="font-bold text-burgundy text-sm">{user.name}</span>
            </div>
            <Badge
              variant={user.role === 'OWNER' ? 'burgundy' : user.role === 'FAMILY_MEMBER' ? 'gold' : 'outline'}
              size="sm"
            >
              {user.role === 'OWNER' ? t.family.roleOwner : user.role === 'FAMILY_MEMBER' ? t.family.roleMember : t.family.roleViewer}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-ivory border border-gold/25 space-y-1">
            <Badge variant="burgundy" size="sm">Admin</Badge>
            <p className="text-xs font-semibold text-charcoal mt-1">
              {t.settings.adminRole}
            </p>
            <p className="text-[11px] text-charcoal-muted leading-tight">
              Full budget control, invite code generator, transaction verification.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-ivory border border-gold/25 space-y-1">
            <Badge variant="gold" size="sm">Member</Badge>
            <p className="text-xs font-semibold text-charcoal mt-1">
              {t.settings.editorRole}
            </p>
            <p className="text-[11px] text-charcoal-muted leading-tight">
              Log shopping items, check tasks, record Shagun envelopes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-ivory border border-gold/25 space-y-1">
            <Badge variant="outline" size="sm">Viewer</Badge>
            <p className="text-xs font-semibold text-charcoal mt-1">
              {t.settings.viewerRole}
            </p>
            <p className="text-[11px] text-charcoal-muted leading-tight">
              Read-only itinerary and checklist access for outstation guests.
            </p>
          </div>
        </div>
      </section>

      {/* 4. System Architecture & Zero-Cost Status */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose text-burgundy mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-burgundy">
              {t.settings.systemSection}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Verified free-tier boundaries and technology stack details.
            </p>
          </div>
        </div>

        <div className="divide-y divide-gold/15 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{t.settings.appVersion}</span>
            <span className="font-mono text-burgundy font-bold">v1.0.0 (Phase 1 Build)</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{t.settings.buildPhase}</span>
            <Badge variant="gold" size="sm">Phase 1 Complete</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{t.settings.pwaStatus}</span>
            <span className="inline-flex items-center gap-1 text-sage-dark font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
              {t.settings.pwaActive}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{t.settings.storageStatus}</span>
            <span className="inline-flex items-center gap-1 text-charcoal font-medium">
              <HardDrive className="w-3.5 h-3.5 text-gold-dark" />
              {t.settings.storageActive}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{t.settings.hostingTier}</span>
            <span className="text-charcoal-muted font-medium">
              {t.settings.hostingTierValue}
            </span>
          </div>
        </div>
      </section>

      {/* 5. Data Portability & Backup (Phase 6 Preview) */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-burgundy/10 text-burgundy mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-burgundy">
                {t.settings.backupSection}
              </h2>
              <p className="text-xs text-charcoal-muted mt-0.5 max-w-lg">
                {t.settings.backupDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBackupNoticeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gold/50 bg-ivory text-burgundy text-xs font-semibold hover:bg-rose/40 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-burgundy" />
            <span>{t.settings.exportBackupBtn}</span>
          </button>
        </div>
      </section>

      {/* Backup Roadmap Modal */}
      <PhaseNoticeModal
        isOpen={isBackupNoticeOpen}
        onClose={() => setIsBackupNoticeOpen(false)}
        featureName="Data Portability Engine"
        targetPhase="Phase 6"
        description={
          language === 'hi'
            ? 'शादीसाथी डेटा पोर्टेबिलिटी को एक मूल अधिकार मानता है। फेज़ 6 में आप एक क्लिक में पूरा डेटा (खर्च, शगुन बही, बिल, संपर्क) बिना किसी रुकावट के डाउनलोड कर सकेंगे।'
            : 'ShaadiSaathi treats data portability as an inviolable guarantee. In Phase 6, you will be able to export your complete wedding repository as raw JSON or zipped CSV workbooks with zero vendor lock-in.'
        }
        checklistItems={[
          'One-click JSON master wedding archive download',
          'Portable schema that can be restored into any SQLite or PostgreSQL database',
          'Export of Shagun blessings register for family memory album',
          'Zero paid cloud storage dependency',
        ]}
      />
    </div>
  );
};
