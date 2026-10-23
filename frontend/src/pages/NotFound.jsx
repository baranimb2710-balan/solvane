import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Mascot from '../components/Mascot';
import LanguageSwitcher from '../components/LanguageSwitcher';

/**
 * Friendly 404 - Not Found Page
 * Displays the pointing Solvane mascot and a button to return home safely.
 */
export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white bg-slate-950 overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Header with logo & switcher */}
      <header className="relative z-10 pt-6 px-6 sm:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
            SOLVANE
          </span>
          <span className="text-[10px] font-semibold text-sky-200/70 border border-sky-400/20 px-2 py-0.5 rounded-full hidden sm:inline">
            Ramanathapuram
          </span>
        </Link>
        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-md w-full mx-auto px-6 py-12 flex flex-col items-center text-center my-auto animate-fade-in">
        {/* Mascot in pointing pose */}
        <div className="mb-6">
          <Mascot pose="pointing" size={110} animate={true} />
        </div>

        <span className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 mb-2">
          404
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">
          {t('notFound.title', 'Page Not Found')}
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed mb-8">
          {t('notFound.subtitle', "Looks like you have wandered off the map! The page you are looking for does not exist.")}
        </p>

        <Link
          to="/"
          className="px-8 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>🏝️</span>
          <span>{t('notFound.goHome', 'Go Home')}</span>
        </Link>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-slate-500 border-t border-white/5">
        {t('footer.madeFor', 'Solvane • Made for Ramanathapuram')}
      </footer>
    </div>
  );
}
