import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'subtle' | 'pill' | 'header';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'pill',
}) => {
  const { language, setLanguage } = useTranslation();

  if (variant === 'subtle') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 rounded transition-colors ${
            language === 'en'
              ? 'bg-burgundy text-ivory font-semibold'
              : 'text-charcoal-muted hover:text-burgundy'
          }`}
          aria-label="Switch to English"
        >
          English
        </button>
        <span className="text-gold">|</span>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-2 py-1 rounded transition-colors ${
            language === 'hi'
              ? 'bg-burgundy text-ivory font-semibold'
              : 'text-charcoal-muted hover:text-burgundy'
          }`}
          aria-label="हिंदी में बदलें"
        >
          हिन्दी
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center bg-ivory-dark/70 border border-gold/40 rounded-full p-1 shadow-xs ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <Languages className="w-3.5 h-3.5 text-gold-dark ml-2 mr-1" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
          language === 'en'
            ? 'bg-burgundy text-ivory shadow-xs'
            : 'text-charcoal-muted hover:text-burgundy'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
          language === 'hi'
            ? 'bg-burgundy text-ivory shadow-xs'
            : 'text-charcoal-muted hover:text-burgundy'
        }`}
        aria-pressed={language === 'hi'}
      >
        हिन्दी
      </button>
    </div>
  );
};
