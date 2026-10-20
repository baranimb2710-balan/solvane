import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { getPlaces, getHotels, getFood } from '../services/api';

/**
 * Solvane - Explore Categories Hub ("/explore")
 * 
 * Features:
 * 1. Heading "Explore Ramanathapuram".
 * 2. Grid of 8 large category tiles with icons and live item counts:
 *    - Temples (🛕)
 *    - Churches (⛪)
 *    - Mosques and Dargahs (🕌)
 *    - Beaches (🏖️)
 *    - Heritage (🏛️)
 *    - Nature (🌴)
 *    - Hotels (🏨)
 *    - Food (🍽️)
 * 3. Tiles open corresponding explore routes (/explore/:category, /explore/hotels, /explore/food).
 * 4. Responsive design (1 col mobile, 2 col tablet, 4 col desktop).
 * 5. Sea-blue and temple-orange styling with smooth hover transitions.
 */

export default function Explore() {
  const navigate = useNavigate();

  // Counts state for all 8 categories
  const [counts, setCounts] = useState({
    temples: null,
    churches: null,
    mosques_dargahs: null,
    beaches: null,
    heritage: null,
    nature: null,
    hotels: null,
    food: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all datasets concurrently on mount to compute live item counts
  const fetchCategoryCounts = async () => {
    setLoading(true);
    setError('');

    try {
      const [placesRes, hotelsRes, foodRes] = await Promise.all([
        getPlaces(),
        getHotels(),
        getFood(),
      ]);

      const places = placesRes.success && Array.isArray(placesRes.data) ? placesRes.data : [];
      const hotels = hotelsRes.success && Array.isArray(hotelsRes.data) ? hotelsRes.data : [];
      const food = foodRes.success && Array.isArray(foodRes.data) ? foodRes.data : [];

      // Calculate counts based on category and subtype
      const templeCount = places.filter((p) => p.category === 'temple').length;
      const churchCount = places.filter((p) => p.subtype === 'church').length;
      const mosqueDargahCount = places.filter(
        (p) => p.subtype === 'mosque_dargah' || p.subtype === 'morque_dargah'
      ).length;
      const beachCount = places.filter((p) => p.category === 'beach').length;
      const heritageCount = places.filter((p) => p.category === 'heritage').length;
      const natureCount = places.filter((p) => p.category === 'nature').length;

      setCounts({
        temples: templeCount,
        churches: churchCount,
        mosques_dargahs: mosqueDargahCount,
        beaches: beachCount,
        heritage: heritageCount,
        nature: natureCount,
        hotels: hotels.length,
        food: food.length,
      });
    } catch (err) {
      console.error('Failed to load explore counts:', err);
      setError('Unable to load some category counts. You can still explore each category.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  // Category tiles configuration
  const CATEGORY_TILES = [
    {
      id: 'temple',
      title: 'Temples',
      icon: '🛕',
      subtitle: 'Sacred Jyotirlinga, theerthams & ancient shrines',
      route: '/explore/temple',
      countKey: 'temples',
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'hover:border-amber-400/50',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    },
    {
      id: 'church',
      title: 'Churches',
      icon: '⛪',
      subtitle: 'Portuguese pilgrimage shrines & historical ruins',
      route: '/explore/church',
      countKey: 'churches',
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderColor: 'hover:border-sky-400/50',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    },
    {
      id: 'mosque_dargah',
      title: 'Mosques & Dargahs',
      icon: '🕌',
      subtitle: 'Centuries-old Sufi shrines & holy spiritual centers',
      route: '/explore/mosque_dargah',
      countKey: 'mosques_dargahs',
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'hover:border-emerald-400/50',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    },
    {
      id: 'beach',
      title: 'Beaches',
      icon: '🏖️',
      subtitle: 'Pristine coastal tips, ghost towns & water activities',
      route: '/explore/beach',
      countKey: 'beaches',
      gradient: 'from-cyan-500/20 via-sky-500/10 to-transparent',
      borderColor: 'hover:border-cyan-400/50',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    },
    {
      id: 'heritage',
      title: 'Heritage',
      icon: '🏛️',
      subtitle: 'Iconic sea bridges, royal palaces & memorials',
      route: '/explore/heritage',
      countKey: 'heritage',
      gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
      borderColor: 'hover:border-orange-400/50',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    },
    {
      id: 'nature',
      title: 'Nature',
      icon: '🌴',
      subtitle: 'Marine biosphere parks & migratory bird sanctuaries',
      route: '/explore/nature',
      countKey: 'nature',
      gradient: 'from-lime-500/20 via-emerald-500/10 to-transparent',
      borderColor: 'hover:border-lime-400/50',
      badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-400/30',
    },
    {
      id: 'hotels',
      title: 'Hotels & Stays',
      icon: '🏨',
      subtitle: 'Pilgrim lodges, budget stays & comfortable hotels',
      route: '/explore/hotels',
      countKey: 'hotels',
      gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
      borderColor: 'hover:border-indigo-400/50',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    },
    {
      id: 'food',
      title: 'Food & Dining',
      icon: '🍽️',
      subtitle: 'Fresh coastal seafood, pure veg thalis & sweets',
      route: '/explore/food',
      countKey: 'food',
      gradient: 'from-rose-500/20 via-orange-500/10 to-transparent',
      borderColor: 'hover:border-rose-400/50',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden pb-16">
      {/* Background Ambience */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 opacity-25 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/90 pointer-events-none" />

      {/* Shared Top Navigation Bar */}
      <TopBar active="explore" />

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Header Title & Subtext */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-400/30 px-3.5 py-1 rounded-full uppercase tracking-wider">
            <span>✨</span>
            <span>Discover the District</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-orange-400 tracking-tight">
            Explore Ramanathapuram
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse through sacred landmarks, scenic ocean coasts, rich history, authentic dining, and peaceful accommodations across Ramanathapuram district and Rameswaram Island.
          </p>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs text-center">
            {error}
          </div>
        )}

        {/* 8 Large Category Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-4">
          {CATEGORY_TILES.map((tile) => {
            const countValue = counts[tile.countKey];

            return (
              <div
                key={tile.id}
                onClick={() => navigate(tile.route)}
                className={`group relative bg-slate-900/80 hover:bg-slate-850 backdrop-blur-xl border border-white/10 ${tile.borderColor} rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1`}
              >
                {/* Subtle gradient background glow on card */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none`}
                />

                <div className="relative z-10 space-y-4">
                  {/* Top row: Icon & Count pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-300">
                      {tile.icon}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${tile.badgeColor} shadow-sm`}
                    >
                      {loading ? (
                        <span className="inline-block w-8 h-3 bg-white/20 rounded animate-pulse" />
                      ) : (
                        `${countValue ?? 0} places`
                      )}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-sky-300 transition-colors flex items-center justify-between">
                      <span>{tile.title}</span>
                      <span className="text-xs text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-2">
                      {tile.subtitle}
                    </p>
                  </div>
                </div>

                {/* Bottom subtle indicator */}
                <div className="relative z-10 pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-sky-300 transition-colors">
                  <span>Explore directory</span>
                  <span>View all</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Helpful Navigation Banner */}
        <div className="mt-8 p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="text-sm font-bold text-white">Looking to plan your complete trip?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Select destinations into your trip bag and generate a timed, budget-optimized daily itinerary.
            </p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
            className="px-6 py-2.5 rounded-full font-bold text-xs text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md shadow-sky-500/25 transition-all cursor-pointer whitespace-nowrap"
          >
            All Destinations & Trip Bag →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400 border-t border-white/5">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>
    </div>
  );
}
