import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { Crown, WifiOff, RefreshCw, Home } from 'lucide-react';

export const OfflineFallbackPage: React.FC = () => {
  const { language } = useTranslation();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      <div className="max-w-md w-full p-8 rounded-3xl bg-ivory-light border border-gold/40 shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-burgundy flex items-center justify-center mx-auto text-gold shadow-md border border-gold/40">
          <WifiOff className="w-8 h-8 text-gold-light" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-royal text-burgundy">
            {language === 'hi' ? 'आप ऑफ़लाइन हैं' : 'You are Currently Offline'}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
            {language === 'hi'
              ? 'शादीसाथी आपके पहले से लोड किए गए विवाह डेटा और नए ड्राफ्ट को सुरक्षित रखता है। आप खर्च, खरीदारी और चेकलिस्ट का हिसाब जारी रख सकते हैं।'
              : 'ShaadiSaathi keeps your previously loaded wedding data and new drafts safe in local storage. You can continue recording expenses, shopping items, and checklist duties.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gold/15 border border-gold/30 text-xs text-charcoal text-left space-y-1">
          <div className="flex items-center gap-2 font-bold text-burgundy">
            <Crown className="w-4 h-4 text-gold-dark" />
            <span>{language === 'hi' ? 'सुरक्षित ऑफ़लाइन बही' : 'Protected Offline Ledger'}</span>
          </div>
          <p className="text-[11px] text-charcoal-muted">
            {language === 'hi'
              ? 'जैसे ही आपका इंटरनेट पुनः जुड़ेगा, सभी प्रविष्टियां पारिवारिक सर्वर से स्वतः सिंक हो जाएंगी।'
              : 'All pending additions will synchronize automatically as soon as your device reconnects.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center pt-2">
          <button
            type="button"
            onClick={handleRetry}
            className="flex-1 py-2.5 px-4 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-gold-light" />
            <span>{language === 'hi' ? 'पुनः प्रयास करें' : 'Retry Connection'}</span>
          </button>

          <NavLink
            to="/"
            className="py-2.5 px-4 rounded-xl border border-gold/40 text-charcoal hover:bg-rose/30 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-burgundy" />
            <span>{language === 'hi' ? 'डैशबोर्ड खोलें' : 'Open Dashboard'}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
