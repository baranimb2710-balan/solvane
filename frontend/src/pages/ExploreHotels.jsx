import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../components/TopBar';
import Mascot from '../components/Mascot';
import { getHotels, getPlaces } from '../services/api';

/**
 * Solvane - Explore Hotels & Stays Page ("/explore/hotels")
 * 
 * Features:
 * 1. Filter chips: All, Budget, Mid-range, Premium, Lodge & Dharamshala.
 * 2. Real-time search by hotel name, area, or amenities.
 * 3. Cards showing:
 *    - Image with sea-blue/warm gradient fallback
 *    - Name, area, category badge
 *    - Price range per night
 *    - Rating star
 *    - Amenities chips
 *    - Nearby attractions (clickable link to /place/:id)
 *    - "View on Map" external link
 *    - "Information Not Verified" badge (if verified: false)
 *    - Note: "Prices and timings may change. Please confirm before visiting."
 * 4. Loading skeletons, empty state, and error handling with retry.
 */

const HOTEL_CATEGORIES = [
  { id: 'all', label: 'All Stays', icon: '🏨' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'mid_range', label: 'Mid-range', icon: '✨' },
  { id: 'premium', label: 'Premium', icon: '👑' },
  { id: 'lodge_dharamshala', label: 'Lodge & Dharamshala', icon: '🕉️' },
];

export default function ExploreHotels() {
  const { t, i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';
  const navigate = useNavigate();

  // Data fetching states
  const [hotels, setHotels] = useState([]);
  const [placesMap, setPlacesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState({});

  const handleImageError = (imageSrc) => {
    setFailedImages((prev) => ({ ...prev, [imageSrc]: true }));
  };

  // Fetch hotels & places mapping on mount
  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [hotelsRes, placesRes] = await Promise.all([getHotels(), getPlaces()]);

      if (hotelsRes.success && Array.isArray(hotelsRes.data)) {
        setHotels(hotelsRes.data);
      } else {
        setError(hotelsRes.error || 'Failed to load hotels. Please try again.');
      }

      if (placesRes.success && Array.isArray(placesRes.data)) {
        const pMap = {};
        placesRes.data.forEach((p) => {
          pMap[p.id] = p.name_en;
        });
        setPlacesMap(pMap);
      }
    } catch (err) {
      console.error('Failed to load hotel data:', err);
      setError('Cannot reach server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'all' ||
        (hotel.category || '').toLowerCase() === selectedCategory.toLowerCase();

      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        hotel.name?.toLowerCase().includes(q) ||
        hotel.area?.toLowerCase().includes(q) ||
        (Array.isArray(hotel.amenities) &&
          hotel.amenities.some((a) => a.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [hotels, selectedCategory, searchQuery]);

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'premium':
        return { label: 'Premium Stay', class: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
      case 'mid_range':
        return { label: 'Mid-range Hotel', class: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
      case 'budget':
        return { label: 'Budget Stay', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'lodge_dharamshala':
        return { label: 'Lodge & Dharamshala', class: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
      default:
        return { label: 'Accommodation', class: 'bg-slate-700/40 text-slate-300 border-white/10' };
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden pb-16">
      {/* Background Ambience */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 opacity-25 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/90 pointer-events-none" />

      {/* Shared TopBar */}
      <TopBar active="explore" />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>All Explore Categories</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1.5 max-w-2xl">
              <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
                <span>🏨</span>
                <span>Stays & Accommodations</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Comfortable pilgrim lodges, budget stays, mid-range hotels, and traditional dharamshalas near Rameswaram temple and the coastline.
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-80">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by hotel name or area..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-slate-900/90 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {HOTEL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden h-96 flex flex-col justify-between p-4"
              >
                <div className="w-full h-44 bg-slate-800 rounded-2xl" />
                <div className="space-y-2.5 mt-4">
                  <div className="w-2/3 h-5 bg-slate-800 rounded" />
                  <div className="w-1/2 h-3.5 bg-slate-850 rounded" />
                  <div className="w-full h-12 bg-slate-850 rounded" />
                </div>
                <div className="w-full h-10 bg-slate-800 rounded-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-red-500/30 text-center max-w-md mx-auto space-y-4">
            <span className="text-4xl block">⚠️</span>
            <h3 className="text-lg font-bold text-white">Failed to Load Accommodations</h3>
            <p className="text-xs text-slate-300">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-2 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredHotels.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-white/10 max-w-md mx-auto space-y-3">
            <div className="flex justify-center mb-1">
              <Mascot pose="pointing" size={68} animate={true} />
            </div>
            <h3 className="text-lg font-bold text-white">No Stays Found</h3>
            <p className="text-xs text-slate-400">
              No accommodations found matching your filter criteria. Try choosing "All Stays" or clear your search term.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Hotels Cards Grid */}
        {!loading && !error && filteredHotels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredHotels.map((hotel) => {
              const isImgFailed = failedImages[hotel.image];
              const badge = getCategoryBadge(hotel.category);

              return (
                <div
                  key={hotel.id}
                  className="group bg-slate-900/85 hover:bg-slate-850 border border-white/10 hover:border-sky-400/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Hotel Image with Gradient Fallback */}
                  <div className="relative w-full h-48 overflow-hidden bg-slate-950">
                    {!isImgFailed && hotel.image ? (
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        onError={() => handleImageError(hotel.image)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-sky-950 flex flex-col items-center justify-center text-slate-300 p-4 text-center">
                        <span className="text-3xl mb-1">🏨</span>
                        <span className="text-xs font-semibold tracking-wide">
                          {hotel.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    {hotel.rating && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/30">
                        <span>⭐</span>
                        <span>{hotel.rating}</span>
                      </div>
                    )}

                    {/* Price Range */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-xs font-bold text-emerald-300 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-400/30">
                      <span>🏷️</span>
                      <span>{hotel.price_range_per_night || 'Check pricing'} / night</span>
                    </div>
                  </div>

                  {/* Hotel Information */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                        {(isTamil && hotel.name_ta) ? hotel.name_ta : hotel.name}
                      </h3>
                      {hotel.name_ta && (
                        <p className="text-xs text-orange-400/80 font-medium">
                          {isTamil ? hotel.name : hotel.name_ta}
                        </p>
                      )}
                      <p className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span className="text-orange-400">📍</span>
                        <span>{hotel.area}</span>
                      </p>
                    </div>

                    {/* Amenities Chips */}
                    {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Key Amenities:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium text-slate-300 bg-slate-800/90 border border-white/10 px-2 py-0.5 rounded-md"
                            >
                              ✓ {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nearby Attractions (Clickable to /place/:id) */}
                    {Array.isArray(hotel.nearby_place_ids) && hotel.nearby_place_ids.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Close to:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {hotel.nearby_place_ids.map((placeId) => {
                            const placeName = placesMap[placeId] || placeId;
                            return (
                              <button
                                key={placeId}
                                onClick={() => navigate(`/place/${placeId}`)}
                                className="text-[10px] font-semibold text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer text-left"
                              >
                                📍 {placeName} →
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Unverified Badge & Visiting Note */}
                    {!hotel.verified && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 space-y-1 text-left">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                          <span>ℹ️</span>
                          <span>Information Not Verified</span>
                        </div>
                        <p className="text-[10px] text-amber-200/80 leading-tight">
                          Prices and timings may change. Please confirm before visiting.
                        </p>
                      </div>
                    )}

                    {/* Action Link: View on Maps */}
                    <div className="pt-2 border-t border-white/5">
                      <a
                        href={hotel.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-full text-xs font-bold bg-white/10 hover:bg-sky-500 hover:text-white text-slate-200 border border-white/15 hover:border-sky-500 hover:shadow-md hover:shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🧭</span>
                        <span>View on Map</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400 border-t border-white/5">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>
    </div>
  );
}
