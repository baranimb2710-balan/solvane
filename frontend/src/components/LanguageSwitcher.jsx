import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Solvane Language Switcher Component
 * Allows one-click instant toggling between English and Tamil (தமிழ்).
 * Saves to localStorage, updates document.documentElement.lang, and causes
 * immediate component re-render without reloading the page.
 */
export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === 'ta' ? 'ta' : 'en';

  const switchLanguage = (lng) => {
    if (currentLang !== lng) {
      i18n.changeLanguage(lng);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-full bg-slate-900/80 p-0.5 border border-white/15 text-xs backdrop-blur-md shadow-sm select-none ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => switchLanguage('en')}
        className={`px-2.5 py-1 rounded-full font-bold transition-all duration-200 cursor-pointer text-[11px] whitespace-nowrap ${
          currentLang === 'en'
            ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        aria-pressed={currentLang === 'en'}
      >
        English
      </button>

      <span className="text-white/20 text-[10px] px-0.5 pointer-events-none">|</span>

      <button
        type="button"
        onClick={() => switchLanguage('ta')}
        className={`px-2.5 py-1 rounded-full font-bold transition-all duration-200 cursor-pointer text-[11px] whitespace-nowrap font-tamil ${
          currentLang === 'ta'
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        aria-pressed={currentLang === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  );
}
