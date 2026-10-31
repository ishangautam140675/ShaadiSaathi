import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Badge } from '../components/common/Badge';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import {
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const SmartScanPage: React.FC = () => {
  const { t, language } = useTranslation();
  const [isSimulationNoticeOpen, setIsSimulationNoticeOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0].name);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
              {t.smartscan.title}
            </h1>
            <Badge variant="rose" size="sm">
              Phase 5 Architecture Preview
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.smartscan.subtitle}
          </p>
        </div>
      </div>

      {/* Honest Architecture Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-ivory-light border border-gold/40 text-xs text-charcoal flex items-start gap-3 card-shadow">
        <ShieldCheck className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-burgundy block mb-0.5">
            {language === 'hi' ? 'ईमानदार वास्तुकला नियम: कोई फर्जी AI दावा नहीं' : 'Engineering Principle: Zero Fake AI Claims'}
          </strong>
          <span>{t.smartscan.honestNotice}</span>
        </div>
      </div>

      {/* 4-Step Verification Workflow Visualizer */}
      <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <h2 className="text-sm font-bold font-royal text-burgundy">
          {t.smartscan.workflowTitle}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-burgundy">{t.smartscan.step1Title}</h3>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              {t.smartscan.step1Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold-dark flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-burgundy">{t.smartscan.step2Title}</h3>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              {t.smartscan.step2Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-burgundy">{t.smartscan.step3Title}</h3>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              {t.smartscan.step3Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory border border-gold/30 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-rose text-burgundy flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xs font-bold text-burgundy">{t.smartscan.step4Title}</h3>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              {t.smartscan.step4Desc}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-gold/50 bg-ivory-light/70 p-8 sm:p-12 text-center flex flex-col items-center justify-center card-shadow hover:border-gold transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-rose/60 border border-gold/30 flex items-center justify-center text-burgundy mb-4 shadow-xs">
          <Upload className="w-8 h-8 text-burgundy" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-burgundy mb-1">
          {t.smartscan.uploadZoneTitle}
        </h3>

        <p className="text-xs text-charcoal-muted max-w-md mb-4 leading-relaxed">
          {t.smartscan.uploadZoneDesc}
        </p>

        <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-sm">
          <FileText className="w-4 h-4 text-gold-light" />
          <span>{t.smartscan.browseFiles}</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleSimulateUpload}
          />
        </label>

        {selectedFile && (
          <div className="mt-4 p-2.5 rounded-xl bg-sage/15 border border-sage/40 text-sage-dark text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Uploaded: {selectedFile} (Staged for Phase 5 OCR)</span>
          </div>
        )}

        <span className="text-[11px] text-charcoal-muted mt-3">
          {t.smartscan.supportedFormats}
        </span>
      </div>

      {/* Sample Verification Interface Preview */}
      <div className="bg-ivory-light rounded-2xl p-5 sm:p-6 border border-gold/30 card-shadow space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gold/20">
          <div>
            <h2 className="text-sm font-bold font-royal text-burgundy">
              {t.smartscan.samplePreviewTitle}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Side-by-side human audit ensuring no phantom expense is ever committed.
            </p>
          </div>
          <Badge variant="gold" size="sm">
            Interactive Verification Demo
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Original Receipt Preview Box */}
          <div className="bg-ivory p-4 rounded-xl border border-gold/30 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gold/20 pb-2">
              <span className="font-bold text-charcoal uppercase">
                [Original Slip Scan]
              </span>
              <span className="text-[10px] text-charcoal-muted">Receipt #4819</span>
            </div>

            <div className="text-center py-2 border-b border-gold/20">
              <div className="font-bold text-sm text-burgundy font-sans">
                MARIGOLD WEDDING STYLISTS
              </div>
              <div className="text-[11px] text-charcoal-muted font-sans">
                Stage Floral & Lighting Advance
              </div>
            </div>

            <div className="space-y-1.5 py-1 text-charcoal-light">
              <div className="flex justify-between">
                <span>1. Mogra Mandap Arch</span>
                <span>₹35,000</span>
              </div>
              <div className="flex justify-between">
                <span>2. LED Amber Uplighting</span>
                <span>₹15,000</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gold/20 pt-1 text-charcoal">
                <span>Total Staged</span>
                <span>₹50,000</span>
              </div>
            </div>

            <div className="text-[10px] text-charcoal-muted pt-2 text-center">
              Date: 2026-10-30 &bull; Paid By NEFT
            </div>
          </div>

          {/* Right: Extracted Fields for Human Approval */}
          <div className="bg-ivory p-4 rounded-xl border border-gold/30 space-y-3 text-xs">
            <div className="font-bold text-burgundy uppercase text-xs tracking-wider pb-2 border-b border-gold/20">
              Audit Extracted Fields
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-charcoal-muted block">
                  {t.smartscan.vendorDetected}
                </label>
                <input
                  type="text"
                  readOnly
                  value="Marigold Floral & Stage Stylists"
                  className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-gold/30 bg-ivory-light text-charcoal font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-charcoal-muted block">
                    {t.smartscan.dateDetected}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="2026-10-30"
                    className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-gold/30 bg-ivory-light text-charcoal font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-charcoal-muted block">
                    {t.smartscan.totalDetected}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="₹50,000"
                    className="w-full mt-0.5 px-3 py-1.5 rounded-lg border border-gold/30 bg-ivory-light text-burgundy font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSimulationNoticeOpen(true)}
                className="w-full py-2 px-4 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-light" />
                <span>{t.smartscan.approveBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Modal */}
      <PhaseNoticeModal
        isOpen={isSimulationNoticeOpen}
        onClose={() => setIsSimulationNoticeOpen(false)}
        featureName="SmartScan Engine"
        targetPhase="Phase 5"
        description={
          language === 'hi'
            ? 'स्मार्ट स्कैन का वास्तविक OCR निष्कर्षण इंजन फेज़ 5 में सक्रिय किया जाएगा। इसमें Tesseract.js / WebAssembly का उपयोग होगा जो 100% निःशुल्क और क्लाइंट-साइड चलेगा।'
            : 'The real OCR extraction engine is slated for Phase 5 using open-source, client-side WebAssembly (such as Tesseract.js). This ensures zero server costs and zero data leakage to external paid AI services.'
        }
        checklistItems={[
          'Client-side offline image preprocessing & rotation',
          'Free-tier local text extraction',
          'Side-by-side human family verification interface',
          'Strict duplicate detection before writing to database',
        ]}
      />
    </div>
  );
};
