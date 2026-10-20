import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPlaces, clearSession, getUser, getImageUrl } from '../services/api';
import { useTrip } from '../context/TripContext';
import TopBar from '../components/TopBar';
import FloatingChatButton from '../components/FloatingChatButton';

/**
 * Solvane - Famous Destinations Page ("/destinations")
 * 
 * Features:
 * 1. Heading "Famous Destinations in Ramanathapuram" and real-time search box.
 * 2. Category filter chips (All, Temples, Beaches, Heritage, Nature, Churches & Dargahs).
 *    If user chose interests on the time page, shows matching categories first (without hiding others).
 * 3. Responsive grid of cards (1 col phone, 2 col tablet, 3 col desktop).
 * 4. Image with graceful sea-blue gradient fallback for missing images.
 * 5. English name, Tamil name, category badge, short description, visit duration, tags.
 * 6. "Add to Trip" / "Added" toggle button.
 * 7. Selected places saved to shared trip state (TripContext) & localStorage ("Solvane_trip").
 * 8. Sticky bottom bar with selected count and Continue button navigating to /plan.
 * 9. Loading skeleton while fetching and friendly error state.
 */

// Master list of destination categories
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'temple', label: 'Temples', icon: '🛕' },
  { id: 'beach', label: 'Beaches', icon: '🏖️' },
  { id: 'heritage', label: 'Heritage', icon: '🏛️' },
  { id: 'nature', label: 'Nature', icon: '🌴' },
  { id: 'church_dargah', label: 'Churches and Dargahs', icon: '🕌' }
];

export default function Destinations() {
  const navigate = useNavigate();
  const { trip, togglePlace } = useTrip();

  const user = getUser();
  const isAdmin = Boolean(user && user.is_admin);

  // Data fetching state
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Track images that failed to load to display the sea-blue gradient fallback
  const [failedImages, setFailedImages] = useState({});

  // Fetch places from FastAPI backend on mount
  const fetchPlaces = async () => {
    setLoading(true);
    setError('');

    const result = await getPlaces();
    if (result.success) {
      setPlaces(result.data || []);
    } else {
      setError(result.error || 'Failed to load destinations. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleImageError = (placeId) => {
    setFailedImages((prev) => ({ ...prev, [placeId]: true }));
  };

  // Dynamically reorder category chips:
  // 'all' is always first. Then categories matching user's trip interests, then the rest.
  const orderedCategories = useMemo(() => {
    const userInterests = Array.isArray(trip?.interests)
      ? trip.interests.map((i) => String(i).toLowerCase().trim())
      : [];

    if (userInterests.length === 0) {
      return CATEGORIES;
    }

    const allChip = CATEGORIES.find((c) => c.id === 'all');
    const remaining = CATEGORIES.filter((c) => c.id !== 'all');

    const matching = [];
    const nonMatching = [];

    remaining.forEach((cat) => {
      // Check if user's saved interests include this category or match keyword
      const isMatch = userInterests.some((interest) =>
        cat.id.includes(interest) || interest.includes(cat.id)
      );
      if (isMatch) {
        matching.push(cat);
      } else {
        nonMatching.push(cat);
      }
    });

    return [allChip, ...matching, ...nonMatching];
  }, [trip?.interests]);

  // Filter places by search term and category
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || place.category === selectedCategory;

      // Search filter (English name, Tamil name, or tags)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        place.name_en?.toLowerCase().includes(q) ||
        place.name_ta?.toLowerCase().includes(q) ||
        place.short_description?.toLowerCase().includes(q) ||
        (Array.isArray(place.tags) && place.tags.some((tag) => tag.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [places, selectedCategory, searchQuery]);

  const selectedPlaces = trip?.selectedPlaces || [];
  const selectedCount = selectedPlaces.length;

  // Category badge styling helper
  const getCategoryBadge = (categoryKey) => {
    switch (categoryKey) {
      case 'temple':
        return { label: 'Temple', class: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
      case 'beach':
        return { label: 'Beach', class: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
      case 'heritage':
        return { label: 'Heritage', class: 'bg-orange-500/20 text-orange-300 border-orange-400/30' };
      case 'nature':
        return { label: 'Nature', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'church_dargah':
        return { label: 'Church & Dargah', class: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
      default:
        return { label: 'Destination', class: 'bg-slate-700/40 text-slate-300 border-white/10' };
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden bg-slate-950 pb-24">
      
      {/* Blurred Ramanathapuram Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 opacity-30 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/90 pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BAR */}
      {/* ========================================================================= */}
      <TopBar active="destinations" />

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">
            Step 3 of 4 • Select Attractions
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Famous Destinations in Ramanathapuram
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto leading-relaxed">
            Discover iconic temples, serene beaches, and historic landmarks. Choose your favorite spots to build your custom itinerary.
          </p>
        </div>

        {/* Search Bar & Category Filter Controls */}
        <div className="mb-8 space-y-4 max-w-3xl mx-auto">
          
          {/* Real-time Search Box */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations by name or tags (e.g. Dhanushkodi, Temple, Sunset)..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm bg-slate-900/90 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 backdrop-blur-md transition-all shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-white/10 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            {orderedCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                      : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-orange-400/50 hover:bg-slate-800'
                  }`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ERROR BANNER */}
        {/* ========================================================================= */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-2xl bg-red-500/20 border border-red-400/50 text-center animate-fade-in">
            <p className="text-xs font-semibold text-red-300 mb-2">⚠️ {error}</p>
            <button
              onClick={fetchPlaces}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. LOADING SKELETON */}
        {/* ========================================================================= */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-slate-900/70 border border-white/10 rounded-3xl overflow-hidden h-96 flex flex-col"
              >
                <div className="h-48 bg-slate-800/80" />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                  </div>
                  <div className="h-8 bg-slate-800 rounded-full w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. RESPONSIVE GRID OF DESTINATION CARDS */}
        {/* ========================================================================= */}
        {!loading && !error && (
          <>
            {filteredPlaces.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-white/10 max-w-lg mx-auto">
                <span className="text-4xl block mb-2">🏖️</span>
                <h3 className="text-base font-bold text-white">No destinations found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search keyword or selecting a different category filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/30 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Admin-only "Add New Destination" Card */}
                {isAdmin && (
                  <div
                    onClick={() => navigate('/admin/places/new')}
                    className="group bg-slate-900/60 hover:bg-slate-900/90 border-2 border-dashed border-orange-500/40 hover:border-orange-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[360px] shadow-lg hover:shadow-orange-500/15"
                  >
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 border border-orange-400/40 flex items-center justify-center text-3xl text-orange-400 mb-4 transition-transform group-hover:scale-110">
                      +
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors">
                      Add New Destination
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                      Upload high-resolution photos, add Ramanathapuram GPS coordinates, and write visiting rules.
                    </p>
                    <span className="mt-4 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30">
                      Admin Action
                    </span>
                  </div>
                )}

                {filteredPlaces.map((place) => {
                  const isAdded = selectedPlaces.includes(place.id);
                  const isMissingImage = !place.image || failedImages[place.id];
                  const badge = getCategoryBadge(place.category);

                  return (
                    <div
                      key={place.id}
                      className="group bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:border-orange-400/40 hover:shadow-orange-500/10 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Card Media Header - Clickable to Place Detail */}
                      <div
                        onClick={() => navigate(`/place/${place.id}`)}
                        className="relative h-48 w-full overflow-hidden bg-slate-950 cursor-pointer"
                        title={`View details for ${place.name_en}`}
                      >
                        {!isMissingImage ? (
                          <img
                            src={getImageUrl(place.image)}
                            alt={place.name_en}
                            onError={() => handleImageError(place.id)}
                            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          /* Sea-Blue Gradient Fallback */
                          <div className="w-full h-full bg-gradient-to-br from-sky-900 via-cyan-800 to-blue-950 flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-3xl mb-1">🌊</span>
                            <span className="text-xs font-bold text-sky-100">
                              {place.name_en}
                            </span>
                            <span className="text-[10px] text-sky-200/70 mt-0.5">
                              Ramanathapuram District
                            </span>
                          </div>
                        )}

                        {/* Top Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40 pointer-events-none" />

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md ${badge.class}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Estimated Visit Hours Badge */}
                        {place.estimated_visit_hours && (
                          <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-slate-200 font-semibold flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{place.estimated_visit_hours} hrs</span>
                          </div>
                        )}

                        {/* Admin Missing Image Badge */}
                        {isAdmin && isMissingImage && (
                          <div className="absolute bottom-3 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-md">
                            Missing image
                          </div>
                        )}

                        {/* Admin Edit Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/places/${place.id}/edit`);
                            }}
                            className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-950/90 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-400/40 shadow-lg transition-all flex items-center gap-1 cursor-pointer"
                            title="Edit this destination"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* English and Tamil Names - Clickable */}
                          <div
                            onClick={() => navigate(`/place/${place.id}`)}
                            className="mb-2 cursor-pointer"
                            title={`View details for ${place.name_en}`}
                          >
                            <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-sky-300 transition-colors">
                              {place.name_en}
                            </h3>
                            {place.name_ta && (
                              <p className="text-xs text-orange-300/90 font-medium mt-0.5">
                                {place.name_ta}
                              </p>
                            )}
                          </div>

                          {/* Short Description */}
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
                            {place.short_description}
                          </p>

                          {/* Tags */}
                          {Array.isArray(place.tags) && place.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {place.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* "Add to Trip" / "Added ✓" Toggle Button */}
                        <div className="pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlace(place.id);
                            }}
                            className={`w-full py-2.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 shadow-md shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95'
                            }`}
                          >
                            {isAdded ? (
                              <span>Added ✓</span>
                            ) : (
                              <span>Add to Trip</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 6. STICKY BOTTOM BAR */}
      {/* ========================================================================= */}
      <aside className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/15 px-4 sm:px-12 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Selected Count Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-sm font-bold text-orange-400">
              {selectedCount}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">
                {selectedCount} {selectedCount === 1 ? 'place' : 'places'} selected
              </p>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Saved in your trip planner
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => navigate('/plan')}
            disabled={selectedCount === 0}
            className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              selectedCount > 0
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Continue</span>
            <span>→</span>
          </button>
        </div>
      </aside>

      {/* Floating Solvane AI Chat Launcher */}
      <FloatingChatButton className="bottom-20 right-4 sm:bottom-20 sm:right-6" />
    </div>
  );
}
