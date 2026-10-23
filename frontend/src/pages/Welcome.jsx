import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Mascot from '../components/Mascot';
import { getUser } from '../services/api';
import {
  isAudioMuted,
  setAudioMuted,
  playVoiceGreeting
} from '../utils/greetingAudio';

/**
 * Solvane - Welcome Page with "Tap to Enter" Splash and Voice Greeting
 * College Hackathon Project: AI Tourist Guide for Ramanathapuram District, Tamil Nadu
 * 
 * Features:
 * - "Tap to enter" splash screen shown once per browser session.
 * - On splash tap, auto-plays greeting in current language (or speech synthesis fallback).
 * - Full-screen background slideshow with soft dark gradient.
 * - Friendly waving Solvane mascot.
 * - Replay speaker button and persistent mute toggle (localStorage).
 * - "What Solvane does" row of 3 cards (Plan your trip, Discover places, Ask Solvane).
 * - If already logged in, button says "Continue" and routes to "/budget".
 * - Small footer with disclaimer and link to "/about".
 */

const SLIDESHOW_IMAGES = [
  {
    id: 1,
    src: '/images/slide1.jpg',
    title: 'Historic Pamban Sea Bridge',
    location: 'Pamban Strait'
  },
  {
    id: 2,
    src: '/images/slide2.jpg',
    title: 'Sri Ramanathaswamy Temple',
    location: 'Rameswaram'
  },
  {
    id: 3,
    src: '/images/slide3.jpg',
    title: 'Dhanushkodi Ghost Town & Beach',
    location: "Arichal Munai (Land's End)"
  }
];

export default function Welcome() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Session-based splash check
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('solvane_splash_seen');
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const [muted, setMutedState] = useState(() => isAudioMuted());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Check if user is logged in
  const user = getUser();
  const isLoggedIn = Boolean(user && user.email);

  // Background slideshow interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const handleImageError = (index) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  // Handler for tapping splash screen
  const handleEnterFromSplash = async () => {
    sessionStorage.setItem('solvane_splash_seen', 'true');
    setShowSplash(false);

    // Play welcome greeting on the first user interaction
    if (!muted) {
      setIsPlayingAudio(true);
      await playVoiceGreeting(i18n.language);
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }
  };

  // Replay voice greeting button
  const handleReplayGreeting = async () => {
    setIsPlayingAudio(true);
    await playVoiceGreeting(i18n.language, { force: true });
    setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  // Toggle mute button
  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMutedState(nextMuted);
    setAudioMuted(nextMuted);
  };

  // Action button: navigate to /budget if logged in, else /login
  const handleMainAction = () => {
    if (isLoggedIn) {
      navigate('/budget');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 1. BACKGROUND SLIDESHOW WITH SOFT DARK GRADIENT */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {SLIDESHOW_IMAGES.map((image, index) => {
          const isCurrent = index === currentSlide;
          const isMissing = failedImages[index];

          return (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isCurrent ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {!isMissing ? (
                <img
                  src={image.src}
                  alt={image.title}
                  loading="lazy"
                  onError={() => handleImageError(index)}
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-10000"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-950 via-slate-900 to-blue-950 flex items-center justify-center">
                  <div className="text-sky-200/30 text-xs font-semibold tracking-widest uppercase">
                    Ramanathapuram Coastal Sanctuary
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Soft, readable dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/80" />
      </div>

      {/* ========================================================================= */}
      {/* 2. SPLASH OVERLAY ("Tap to enter" - Shown Once Per Session) */}
      {/* ========================================================================= */}
      {showSplash && (
        <div
          onClick={handleEnterFromSplash}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-opacity duration-500 animate-fade-in"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleEnterFromSplash();
          }}
          aria-label="Tap to enter Solvane"
        >
          <div className="max-w-md w-full space-y-6 flex flex-col items-center">
            {/* Waving Mascot */}
            <div className="transform hover:scale-110 transition-transform">
              <Mascot pose="wave" size={110} animate={true} />
            </div>

            {/* Solvane Brand */}
            <div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
                SOLVANE
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-orange-400 mt-1 uppercase tracking-widest">
                {t('splash.subtitle', 'Sacred Shores • Living Heritage')}
              </p>
            </div>

            {/* Pulsing "Tap to enter" Button */}
            <div className="pt-4">
              <button
                type="button"
                className="px-8 py-3.5 rounded-full font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-xl shadow-orange-500/40 hover:shadow-orange-500/60 animate-pulse border border-white/20 flex items-center gap-3 cursor-pointer"
              >
                <span>✨</span>
                <span>{t('splash.tapToEnter', 'Tap to enter')}</span>
                <span>→</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              {t('splash.prompt', 'Click anywhere to begin your journey')}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TOP HEADER */}
      {/* ========================================================================= */}
      <header className="relative z-30 pt-4 sm:pt-6 px-4 sm:px-12 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-sky-200">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span>
              {t('common.district', 'Ramanathapuram')}, {i18n.language === 'ta' ? 'தமிழ்நாடு' : 'Tamil Nadu'}
            </span>
          </div>

          <Link
            to="/about"
            className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 transition-all hidden sm:inline"
          >
            {t('about.navTitle', 'About')}
          </Link>
        </div>

        {/* Language Switcher, Audio Controls & Location */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Replay voice greeting button */}
          <button
            type="button"
            onClick={handleReplayGreeting}
            className={`p-2 rounded-full border border-white/15 bg-slate-900/80 hover:bg-slate-800 text-xs text-sky-300 hover:text-white transition-all cursor-pointer shadow-sm ${
              isPlayingAudio ? 'ring-2 ring-orange-400 animate-pulse' : ''
            }`}
            title={t('welcome.replayGreeting', 'Listen to greeting')}
            aria-label="Replay voice greeting"
          >
            <span>🗣️</span>
          </button>

          {/* Mute/Unmute audio button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-full border border-white/15 bg-slate-900/80 hover:bg-slate-800 text-xs transition-all cursor-pointer shadow-sm ${
              muted ? 'text-red-400' : 'text-emerald-400'
            }`}
            title={muted ? t('welcome.unmuteGreeting', 'Unmute voice greeting') : t('welcome.muteGreeting', 'Mute voice greeting')}
            aria-label="Toggle greeting audio mute"
          >
            <span>{muted ? '🔇' : '🔊'}</span>
          </button>

          <LanguageSwitcher />

          <div className="text-xs text-slate-300 hidden md:block bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            📍 {SLIDESHOW_IMAGES[currentSlide].location}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 4. MAIN HERO CONTENT */}
      {/* ========================================================================= */}
      <main className="relative z-20 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center justify-center text-center my-auto max-w-4xl mx-auto space-y-6">
        
        {/* Solvane Waving Mascot beside title */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 animate-fade-in">
          <div className="hidden sm:block">
            <Mascot pose="wave" size={76} animate={true} />
          </div>
          <div className="sm:hidden">
            <Mascot pose="wave" size={56} animate={true} />
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight drop-shadow-2xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
              Solvane
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-base sm:text-2xl md:text-3xl font-semibold tracking-wide text-orange-400 drop-shadow-md animate-fade-in-delayed">
          {t('welcome.heroTagline', 'Sacred Shores • Living Heritage')}
        </p>

        {/* Cultural District Subtitle */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg drop-shadow animate-fade-in-delayed leading-relaxed mx-auto">
          {t('welcome.heroSubtitle', 'Plan your trip with honest local timings, smart coastal routing, and budget estimates from the sacred temples to Dhanushkodi.')}
        </p>

        {/* Slideshow Progress Dots */}
        <div className="flex items-center gap-2 animate-fade-in-delayed pt-1">
          {SLIDESHOW_IMAGES.map((_, dotIndex) => (
            <button
              key={dotIndex}
              onClick={() => setCurrentSlide(dotIndex)}
              aria-label={`Go to slide ${dotIndex + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                dotIndex === currentSlide
                  ? 'w-7 bg-orange-400'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Main CTA Button */}
        <div className="pt-2 animate-fade-in-button">
          <button
            onClick={handleMainAction}
            className="group relative inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-orange-400/40 cursor-pointer"
          >
            <span>
              {isLoggedIn
                ? t('welcome.continueButton', 'Continue to Trip Planner')
                : t('welcome.getStarted', 'Start Planning Your Trip')}
            </span>
            <span className="transform group-hover:translate-x-1.5 transition-transform duration-200">
              →
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 5. "WHAT SOLVANE DOES" ROW OF 3 ICON CARDS */}
        {/* ========================================================================= */}
        <div className="w-full pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-fade-in-delayed text-left">
          {/* Card 1: Plan your trip */}
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-sky-400/30 transition-all space-y-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {t('welcome.cardPlanTitle', 'Plan your trip')}
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('welcome.cardPlanDesc', 'Smart, zone-optimized itineraries tailored to your budget and travel duration.')}
            </p>
          </div>

          {/* Card 2: Discover places */}
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-orange-400/30 transition-all space-y-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏝️</span>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {t('welcome.cardDiscoverTitle', 'Discover places')}
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('welcome.cardDiscoverDesc', 'Verified darshan timings, dress codes, entry fees, and coastal guides.')}
            </p>
          </div>

          {/* Card 3: Ask Solvane */}
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-emerald-400/30 transition-all space-y-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {t('welcome.cardAskTitle', 'Ask Solvane')}
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('welcome.cardAskDesc', 'Friendly bilingual AI companion for honest local advice and instant answers.')}
            </p>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 6. POLISHED FOOTER */}
      {/* ========================================================================= */}
      <footer className="relative z-30 py-5 px-4 sm:px-12 text-center text-xs text-slate-400 border-t border-white/10 bg-slate-950/80 backdrop-blur-md space-y-1">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="font-semibold text-slate-300">
            {t('footer.madeFor', 'Solvane • Made for Ramanathapuram')}
          </p>
          <span className="text-white/20 hidden sm:inline">•</span>
          <Link to="/about" className="text-sky-400 hover:text-sky-300 underline font-medium">
            {t('about.navTitle', 'About Solvane')}
          </Link>
        </div>
        <p className="text-[11px] text-slate-500 italic max-w-lg mx-auto">
          {t('footer.disclaimer', 'Information may change. Please verify timings and prices locally.')}
        </p>
      </footer>
    </div>
  );
}
