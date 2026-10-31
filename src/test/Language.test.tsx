import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';

const TestComponent = () => {
  const { t, language, toggleLanguage } = useTranslation();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="app-title">{t.appName}</span>
      <span data-testid="tagline">{t.appTagline}</span>
      <button data-testid="toggle-btn" onClick={toggleLanguage}>
        Toggle
      </button>
      <LanguageSwitcher />
    </div>
  );
};

describe('Bilingual Localization System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders default English strings and updates document title', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('app-title')).toHaveTextContent('ShaadiSaathi');
    expect(screen.getByTestId('tagline')).toHaveTextContent(
      'Every Moment Special. Every Rupee Accounted For.'
    );
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to authentic Hindi when toggled and persists to localStorage', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-btn');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('current-lang')).toHaveTextContent('hi');
    expect(screen.getByTestId('app-title')).toHaveTextContent('शादीसाथी');
    expect(screen.getByTestId('tagline')).toHaveTextContent(
      'हर पल ख़ास, हर रुपये का हिसाब।'
    );
    expect(document.documentElement.lang).toBe('hi');
    expect(localStorage.getItem('shaadisaathi_language')).toBe('hi');
  });

  it('switches between EN and हिन्दी via LanguageSwitcher buttons', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const hindiBtn = screen.getByRole('button', { name: 'हिन्दी' });
    fireEvent.click(hindiBtn);

    expect(screen.getByTestId('app-title')).toHaveTextContent('शादीसाथी');
    expect(localStorage.getItem('shaadisaathi_language')).toBe('hi');

    const enBtn = screen.getByRole('button', { name: 'EN' });
    fireEvent.click(enBtn);

    expect(screen.getByTestId('app-title')).toHaveTextContent('ShaadiSaathi');
    expect(localStorage.getItem('shaadisaathi_language')).toBe('en');
  });
});
