import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../components/TopBar';
import Mascot from '../components/Mascot';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getUser } from '../services/api';

/**
 * About Solvane Page ("/about")
 * Explains project purpose, features, and technology stack.
 * Fully translated in English and Tamil.
 */
export default function About() {
  const { t } = useTranslation();
  const user = getUser();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white bg-slate-950 select-none overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 pointer-events-none opacity-90" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/15 via-transparent to-transparent pointer-events-none" />

      {/* Navigation: use TopBar if authenticated, otherwise simple header */}
      {user ? (
        <TopBar active="about" />
      ) : (
        <header className="relative z-10 pt-4 pb-3 px-4 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
              SOLVANE
            </span>
            <span className="text-[10px] font-semibold text-sky-200/70 border border-sky-400/20 px-2 py-0.5 rounded-full hidden sm:inline">
              Ramanathapuram
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              ← {t('common.back', 'Back')}
            </Link>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
        
        {/* Hero Header with Mascot */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center mb-2">
            <Mascot pose="wave" size={80} animate={true} />
          </div>

          <div className="inline-block px-3.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-bold text-sky-300 tracking-wide">
            🎓 {t('about.badge', 'College Hackathon Project')}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {t('about.title', 'About Solvane')}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('about.subtitle', 'An Intelligent Coastal & Cultural Companion for Ramanathapuram District')}
          </p>
        </div>

        {/* Mission Card */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            <span>{t('about.missionTitle', 'Our Mission')}</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t('about.missionText', 'Solvane was created to make traveling across Ramanathapuram district seamless, enjoyable, and culturally enriching. From the sacred Ramanathaswamy Temple corridors and the engineering marvel of Pamban Bridge to the ghost town of Dhanushkodi, Solvane provides accurate timings, cluster-optimized day plans, and instant answers in both English and Tamil.')}
          </p>
        </section>

        {/* Technologies Grid */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 px-1">
            <span>⚡</span>
            <span>{t('about.techTitle', 'Technologies Used')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tech 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
                <span>⚛️</span>
                <span>Frontend Architecture</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('about.techFrontend', 'Modern React 19, Tailwind CSS, Vite, and responsive mobile-first UI.')}
              </p>
            </div>

            {/* Tech 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <span>🚀</span>
                <span>High-Performance Backend</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('about.techBackend', 'FastAPI (Python), SQLite database, and JWT authentication.')}
              </p>
            </div>

            {/* Tech 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                <span>🗺️</span>
                <span>Interactive Mapping & GIS</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('about.techMapping', 'OpenStreetMap & Leaflet with live GPS geolocation and distance calculations.')}
              </p>
            </div>

            {/* Tech 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-orange-400 text-sm">
                <span>🤖</span>
                <span>AI Guidance & Optimization</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('about.techAi', 'Hybrid rule-based itinerary optimization combined with Google AI-powered RAG assistance.')}
              </p>
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all shadow-sm"
          >
            <span>←</span>
            <span>{t('about.backHome', 'Back to Home')}</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400 border-t border-white/10 bg-slate-950/80 space-y-1">
        <p className="font-semibold text-slate-300">{t('footer.madeFor', 'Solvane • Made for Ramanathapuram')}</p>
        <p className="text-[11px] text-slate-500 italic max-w-md mx-auto px-4">{t('footer.disclaimer', 'Information may change. Please verify timings and prices locally.')}</p>
      </footer>
    </div>
  );
}
