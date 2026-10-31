import React from 'react';
import { useWedding } from '../../context/WeddingContext';
import { useTranslation } from '../../context/LanguageContext';
import { Info, Sparkles, Database } from 'lucide-react';

export const DevPreviewBanner: React.FC = () => {
  const { isPreviewMode, togglePreviewMode, lastActionMessage, clearActionMessage } = useWedding();
  const { t, language } = useTranslation();

  return (
    <aside aria-label="Development status" className="w-full">
      {/* Dynamic Session Action Alert */}
      {lastActionMessage && (
        <div
          role="status"
          aria-live="polite"
          className="bg-sage/15 border-b border-sage/40 text-sage-dark px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sage flex-shrink-0" />
            <span>{lastActionMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearActionMessage}
            className="text-xs uppercase tracking-wider underline hover:text-burgundy ml-4 cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      )}

      {/* Honest Architecture & Preview Banner */}
      <div
        className={`px-3 sm:px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors duration-200 ${
          isPreviewMode
            ? 'bg-rose-light/80 border-rose text-charcoal'
            : 'bg-ivory-dark/60 border-gold/30 text-charcoal-muted'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
              isPreviewMode
                ? 'bg-burgundy text-ivory'
                : 'bg-sage text-ivory'
            }`}
          >
            {isPreviewMode ? (
              <>
                <Sparkles className="w-2.5 h-2.5 text-gold" />
                {t.common.demoMode}
              </>
            ) : (
              <>
                <Database className="w-2.5 h-2.5" />
                {language === 'hi' ? 'प्रारंभिक खाली स्थिति' : 'Clean Empty State'}
              </>
            )}
          </span>
          <span className="text-charcoal-light">
            {isPreviewMode
              ? language === 'hi'
                ? 'फेज़ 1 UI समीक्षा के लिए डमी डेटा सक्रिय है। कोई वास्तविक वित्तीय डेटा सहेजा नहीं जा रहा है।'
                : 'Sample wedding data loaded for UI review. No actual financial records are persisted until Phase 2.'
              : language === 'hi'
                ? 'शुद्ध खाली स्थिति सक्रिय है। नए खाते का पहला अनुभव देख रहे हैं।'
                : 'Clean first-time empty state active. Ready for live input.'}
          </span>
        </div>

        <button
          type="button"
          onClick={togglePreviewMode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-ivory border border-gold/50 text-burgundy hover:bg-rose/50 transition-colors cursor-pointer shadow-2xs"
          title={t.dashboard.emptyStateToggle}
        >
          <Info className="w-3 h-3 text-gold-dark" />
          <span>
            {isPreviewMode
              ? language === 'hi'
                ? 'खाली स्थिति देखें'
                : 'Switch to Empty State'
              : language === 'hi'
                ? 'सैंपल डेटा देखें'
                : 'Switch to Demo Data'}
          </span>
        </button>
      </div>
    </aside>
  );
};
