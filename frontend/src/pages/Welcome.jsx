import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Solvane - Welcome Page
 * College Hackathon Project: AI Tourist Guide for Ramanathapuram District, Tamil Nadu
 * 
 * Features:
 * - Full-screen background slideshow rotating every 4 seconds.
 * - Dark gradient overlay for readability.
 * - Sea-blue gradient fallback for missing images.
 * - Large stylish "Solvane" title with tagline "Your guide is here!".
 * - Reserved cartoon mascot space.
 * - "Get Started" button navigating to "/login".
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  // Slide transition effect: change slide every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleImageError = (index) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  // Navigates directly to the login page
  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between text-white select-none">
      
      {/* 1. BACKGROUND SLIDESHOW WITH SMOOTH CROSS-FADE AND FALLBACK */}
      <div className="absolute inset-0 z-0">
        {SLIDESHOW_IMAGES.map((image, index) => {
          const isCurrent = index === currentSlide;
          const isMissing = failedImages[index];

          return (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {!isMissing ? (
                <img
                  src={image.src}
                  alt={image.title}
                  onError={() => handleImageError(index)}
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-10000"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-900 via-cyan-800 to-blue-950 flex items-center justify-center">
                  <div className="text-sky-200/40 text-sm font-semibold tracking-widest uppercase">
                    Sea-Blue Scenic Placeholder ({image.location})
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/70" />
      </div>

      {/* 2. TOP HEADER */}
      <header className="relative z-30 pt-6 px-6 sm:px-12 flex items-center justify-between animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-sky-200">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span>Ramanathapuram District, Tamil Nadu</span>
        </div>

        <div className="text-xs text-slate-300 hidden sm:block bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          📍 {SLIDESHOW_IMAGES[currentSlide].location}
        </div>
      </header>

      {/* 3. CENTER CONTENT */}
      <main className="relative z-30 px-6 sm:px-12 flex flex-col items-center justify-center text-center my-auto">
        
        {/* CARTOON MASCOT PLACEHOLDER: Space reserved for mascot illustration */}
        <div 
          id="mascot-placeholder"
          className="w-32 h-32 sm:w-40 sm:h-40 mb-4 rounded-3xl border-2 border-dashed border-sky-400/30 bg-sky-950/20 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 animate-fade-in transition-all duration-300 hover:border-orange-400/50"
        >
          <span className="text-2xl sm:text-3xl mb-1">🧭</span>
          <span className="text-[11px] sm:text-xs font-medium text-sky-200/80">
            [Mascot Space]
          </span>
          <span className="text-[9px] text-slate-400">
            Cartoon guide character to be added here later
          </span>
        </div>

        {/* Website Name: "Solvane" */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight drop-shadow-2xl animate-fade-in-delayed">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
            Solvane
          </span>
        </h1>

        {/* Tagline: "Your guide is here!" */}
        <p className="mt-2 sm:mt-3 text-lg sm:text-2xl md:text-3xl font-semibold tracking-wide text-orange-400 drop-shadow-md animate-fade-in-delayed">
          Your guide is here!
        </p>

        {/* Cultural District Subtitle */}
        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md drop-shadow animate-fade-in-delayed">
          Explore Rameswaram, Dhanushkodi & Pamban Bridge with your personal AI tourist companion.
        </p>

        {/* Slideshow Progress Dots */}
        <div className="flex items-center gap-2 mt-6 animate-fade-in-delayed">
          {SLIDESHOW_IMAGES.map((_, dotIndex) => (
            <button
              key={dotIndex}
              onClick={() => setCurrentSlide(dotIndex)}
              aria-label={`Go to slide ${dotIndex + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                dotIndex === currentSlide
                  ? 'w-7 bg-orange-400'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </main>

      {/* 4. CENTRE-BOTTOM ACTION BUTTON */}
      <footer className="relative z-30 pb-8 sm:pb-12 px-6 flex flex-col items-center justify-center animate-fade-in-button">
        <button
          onClick={handleGetStarted}
          className="group relative inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 hover:scale-102 active:scale-95 transition-all duration-200 border border-orange-400/40 cursor-pointer"
        >
          <span>Get Started</span>
          <span className="transform group-hover:translate-x-1 transition-transform duration-200">
            →
          </span>
        </button>

        <p className="text-[11px] text-slate-400 mt-3 tracking-wide">
          Click above to begin your journey
        </p>
      </footer>
    </div>
  );
}
