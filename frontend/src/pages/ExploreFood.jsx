import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../components/TopBar';
import Mascot from '../components/Mascot';
import { getFood, getPlaces } from '../services/api';

/**
 * Solvane - Explore Food & Dining Page ("/explore/food")
 * 
 * Features:
 * 1. Filter chips by culinary type (All, Seafood, Tiffin, Meals, Snacks & Sweets, Cafe).
 * 2. Filter chips by diet (All, Pure Veg, Non-Veg, Both).
 * 3. Real-time search by eatery name, dish, or area.
 * 4. Cards showing:
 *    - Image with sea-blue/orange gradient fallback
 *    - Name, area, type badge, dietary badge
 *    - Famous dishes list
 *    - Price range and timings
 *    - Rating star
 *    - "View on Map" external link
 *    - "Information Not Verified" badge (if verified: false)
 *    - Note: "Prices and timings may change. Please confirm before visiting."
 * 5. Shimmer loading skeletons, empty state, and error handling with retry.
 */

const FOOD_TYPES = [
  { id: 'all', label: 'All Eateries', icon: '🍽️' },
  { id: 'seafood', label: 'Coastal Seafood', icon: '🐟' },
  { id: 'tiffin', label: 'Tiffin & Breakfast', icon: '☕' },
  { id: 'meals', label: 'South Indian Meals', icon: '🍛' },
  { id: 'snacks_sweets', label: 'Snacks & Halwa', icon: '🍬' },
  { id: 'cafe', label: 'Cafes & Beverages', icon: '🥤' },
];

const DIET_FILTERS = [
  { id: 'all', label: 'All Diets' },
  { id: 'veg', label: 'Pure Veg 🌱' },
  { id: 'non-veg', label: 'Non-Veg 🍗' },
  { id: 'both', label: 'Veg & Non-Veg 🍽️' },
];

export default function ExploreFood() {
  const { t, i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';
  const navigate = useNavigate();

  // Data fetching states
  const [foodItems, setFoodItems] = useState([]);
  const [placesMap, setPlacesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState({});

  const handleImageError = (imageSrc) => {
    setFailedImages((prev) => ({ ...prev, [imageSrc]: true }));
  };

  // Fetch food and places on mount
  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [foodRes, placesRes] = await Promise.all([getFood(), getPlaces()]);

      if (foodRes.success && Array.isArray(foodRes.data)) {
        setFoodItems(foodRes.data);
      } else {
        setError(foodRes.error || 'Failed to load food spots. Please try again.');
      }

      if (placesRes.success && Array.isArray(placesRes.data)) {
        const pMap = {};
        placesRes.data.forEach((p) => {
          pMap[p.id] = p.name_en;
        });
        setPlacesMap(pMap);
      }
    } catch (err) {
      console.error('Failed to load food data:', err);
      setError('Cannot reach server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredFood = useMemo(() => {
    return foodItems.filter((item) => {
      // Type filter
      const matchesType =
        selectedType === 'all' ||
        (item.type || '').toLowerCase() === selectedType.toLowerCase();

      // Diet filter
      const matchesDiet =
        selectedDiet === 'all' ||
        (item.veg_or_nonveg || '').toLowerCase() === selectedDiet.toLowerCase();

      // Search filter
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.area?.toLowerCase().includes(q) ||
        (Array.isArray(item.famous_for) &&
          item.famous_for.some((dish) => dish.toLowerCase().includes(q)));

      return matchesType && matchesDiet && matchesSearch;
    });
  }, [foodItems, selectedType, selectedDiet, searchQuery]);

  const getDietBadge = (diet) => {
    switch (diet) {
      case 'veg':
        return { label: 'Pure Veg', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'non-veg':
        return { label: 'Non-Veg', class: 'bg-rose-500/20 text-rose-300 border-rose-400/30' };
      case 'both':
      default:
        return { label: 'Veg & Non-Veg', class: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'seafood':
        return 'Seafood';
      case 'tiffin':
        return 'Tiffin';
      case 'meals':
        return 'Thali / Meals';
      case 'snacks_sweets':
        return 'Snacks & Sweets';
      case 'cafe':
        return 'Cafe';
      default:
        return 'Eatery';
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
                <span>🍽️</span>
                <span>Food & Dining Guide</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Enjoy authentic regional flavors: fresh Gulf of Mannar fish curry, crispy ghee podi dosas, traditional banana leaf meals, and warm Tirunelveli-style halwa.
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
                  placeholder="Search by dish, spot, or area..."
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

        {/* Filter Section: Type & Diet */}
        <div className="space-y-3">
          {/* Type Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FOOD_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Diet Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">
              Diet:
            </span>
            {DIET_FILTERS.map((diet) => {
              const isSelected = selectedDiet === diet.id;
              return (
                <button
                  key={diet.id}
                  onClick={() => setSelectedDiet(diet.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {diet.label}
                </button>
              );
            })}
          </div>
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
            <h3 className="text-lg font-bold text-white">Failed to Load Food Spots</h3>
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
        {!loading && !error && filteredFood.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-white/10 max-w-md mx-auto space-y-3">
            <div className="flex justify-center mb-1">
              <Mascot pose="pointing" size={68} animate={true} />
            </div>
            <h3 className="text-lg font-bold text-white">No Eateries Found</h3>
            <p className="text-xs text-slate-400">
              No food spots match your selected dietary or cuisine filters. Try choosing "All Eateries" or clear your search term.
            </p>
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedDiet('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Food Cards Grid */}
        {!loading && !error && filteredFood.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredFood.map((food) => {
              const isImgFailed = failedImages[food.image];
              const dietBadge = getDietBadge(food.veg_or_nonveg);

              return (
                <div
                  key={food.id}
                  className="group bg-slate-900/85 hover:bg-slate-850 border border-white/10 hover:border-orange-400/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Food Image with Gradient Fallback */}
                  <div className="relative w-full h-48 overflow-hidden bg-slate-950">
                    {!isImgFailed && food.image ? (
                      <img
                        src={food.image}
                        alt={food.name}
                        onError={() => handleImageError(food.image)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 flex flex-col items-center justify-center text-slate-300 p-4 text-center">
                        <span className="text-3xl mb-1">🍲</span>
                        <span className="text-xs font-semibold tracking-wide">
                          {food.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                    {/* Category & Diet Badges */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-900/80 text-white border-white/20 backdrop-blur-md shadow-sm">
                        {getTypeLabel(food.type)}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${dietBadge.class}`}
                      >
                        {dietBadge.label}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    {food.rating && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/30">
                        <span>⭐</span>
                        <span>{food.rating}</span>
                      </div>
                    )}

                    {/* Price Range */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-xs font-bold text-emerald-300 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-400/30">
                      <span>💰</span>
                      <span>{food.price_range || 'Affordable'}</span>
                    </div>
                  </div>

                  {/* Eatery Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                        {(isTamil && food.name_ta) ? food.name_ta : food.name}
                      </h3>
                      {food.name_ta && (
                        <p className="text-xs text-orange-400/80 font-medium">
                          {isTamil ? food.name : food.name_ta}
                        </p>
                      )}
                      <p className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span className="text-orange-400">📍</span>
                        <span>{food.area}</span>
                      </p>
                      {food.timings && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>🕒</span>
                          <span>{food.timings}</span>
                        </p>
                      )}
                    </div>

                    {/* Famous Dishes Chips */}
                    {Array.isArray(food.famous_for) && food.famous_for.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Famous For:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {food.famous_for.map((dish, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium text-amber-200 bg-amber-500/10 border border-amber-400/25 px-2.5 py-0.5 rounded-md"
                            >
                              ★ {dish}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nearby Attractions */}
                    {Array.isArray(food.nearby_place_ids) && food.nearby_place_ids.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Close to:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {food.nearby_place_ids.map((placeId) => {
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
                    {!food.verified && (
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
                        href={food.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-full text-xs font-bold bg-white/10 hover:bg-orange-500 hover:text-white text-slate-200 border border-white/15 hover:border-orange-500 hover:shadow-md hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
