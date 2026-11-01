import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        setRegistration(reg);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 p-4 rounded-2xl bg-burgundy text-ivory border border-gold/50 shadow-xl max-w-sm animate-bounce-short"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold-light flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs">
          <strong className="block font-bold text-sm font-royal text-gold-light mb-0.5">
            ShaadiSaathi Update
          </strong>
          <p className="text-ivory/90 leading-tight mb-2">
            {t.sync.pwaUpdateAvailable}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-light text-burgundy font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.sync.pwaReloadBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => setUpdateAvailable(false)}
              className="p-1 rounded-md text-ivory/70 hover:text-ivory cursor-pointer"
              aria-label="Dismiss update notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
