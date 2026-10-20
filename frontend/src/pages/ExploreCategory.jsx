import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { getPlaces, getUser, getImageUrl } from '../services/api';
import { useTrip } from '../context/TripContext';

/**
 * Solvane - Explore Category Destinations Page ("/explore/:category")
 * 
 * Reuses the Destinations card grid, real-time search, and Add to Trip feature,
 * filtered specifically by the chosen category or subtype.
 */

// Category metadata definitions
const CATEGORY_META = {
  temple: {
    title: 'Temples & Sacred Shrines',
    icon: '🛕',
    filterType: 'category',
    filterValue: 'temple',
    description: 'Explore the twelve sacred Jyotirlinga corridors, coastal theerthams, and epic Ramayana shrines.',
  },
  church: {
    title: 'Historic Churches & Shrines',
    icon: '⛪',
    filterType: 'subtype',
    filterValue: 'church',
    description: 'Revered Portuguese basilicas, historical red-sand martyrdom shrines, and coastal cyclone ruins.',
  },
  mosque_dargah: {
    title: 'Mosques & Holy Dargahs',
    icon: '🕌',
    filterType: 'subtype',
    filterValue: 'mosque_dargah',
    description: 'Centuries-old Islamic pilgrimage centers and spiritual Sufi dargahs of mental peace and unity.',
  },
  beach: {
    title: 'Beaches & Coastal Seashores',
    icon: '🏖️',
    filterType: 'category',
    filterValue: 'beach',
    description: 'Pristine ocean tips where two seas merge, calm shallow swimming bays, and casuarina picnic shores.',
  },
  heritage: {
    title: 'Historic Heritage & Monuments',
    icon: '🏛️',
    filterType: 'category',
    filterValue: 'heritage',
    description: 'Iconic century-old engineering sea bridges, Sethupathi royal palaces, and presidential memorials.',
  },
  nature: {
    title: 'Nature & Wildlife Sanctuaries',
    icon: '🌴',
    filterType: 'category',
    filterValue: 'nature',
    description: 'Ramsar wetland migratory bird sanctuaries and marine biosphere interpretation centers.',
  },
};

export default function ExploreCategory() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { trip, togglePlace } = useTrip();

  const user = getUser();
  const isAdmin = Boolean(user && user.is_admin);

  const currentCategoryKey = (category || 'temple').toLowerCase();
  const meta = CATEGORY_META[currentCategoryKey] || {
    title: 'Destinations in Ramanathapuram',
    icon: '📍',
    filterType: 'all',
    filterValue: 'all',
    description: 'Browse all popular tourist attractions and landmarks across Ramanathapuram district.',
  };

  // Data fetching state
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState({});

  // Fetch places dataset on mount
  const fetchPlaces = async () => {
    setLoading(true);
    setError('');

    const res = await getPlaces();
    if (res.success && Array.isArray(res.data)) {
      setPlaces(res.data);
    } else {
      setError(res.error || 'Failed to load destinations. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaces();
  }, [category]);

  const handleImageError = (imageSrc) => {
    setFailedImages((prev) => ({ ...prev, [imageSrc]: true }));
  };

  // Filter places by current category/subtype & search query
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // Category / Subtype match
      let matchesCategory = true;
      if (meta.filterType === 'category') {
        matchesCategory = place.category === meta.filterValue;
      } else if (meta.filterType === 'subtype') {
        const sub = (place.subtype || '').toLowerCase();
        if (meta.filterValue === 'mosque_dargah') {
          matchesCategory = sub === 'mosque_dargah' || sub === 'morque_dargah';
        } else {
          matchesCategory = sub === meta.filterValue;
        }
      }

      // Search match
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        place.name_en?.toLowerCase().includes(q) ||
        place.name_ta?.toLowerCase().includes(q) ||
        place.short_description?.toLowerCase().includes(q) ||
        (Array.isArray(place.tags) && place.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [places, meta, searchQuery]);

  const selectedPlaces = trip?.selectedPlaces || [];
  const selectedCount = selectedPlaces.length;

  const getCategoryBadge = (catKey, subKey) => {
    if (subKey === 'church') {
      return { label: 'Church', class: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
    }
    if (subKey === 'mosque_dargah' || subKey === 'morque_dargah') {
      return { label: 'Dargah', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
    }
    switch (catKey) {
      case 'temple':
        return { label: 'Temple', class: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
      case 'beach':
        return { label: 'Beach', class: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' };
      case 'heritage':
        return { label: 'Heritage', class: 'bg-orange-500/20 text-orange-300 border-orange-400/30' };
      case 'nature':
        return { label: 'Nature', class: 'bg-lime-500/20 text-lime-300 border-lime-400/30' };
      default:
        return { label: 'Attraction', class: 'bg-slate-700/40 text-slate-300 border-white/10' };
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden pb-24">
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
        {/* Back navigation & Category switcher pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full transition-colors self-start cursor-pointer"
          >
            <span>←</span>
            <span>All Explore Categories</span>
          </button>

          {/* Category Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {Object.keys(CATEGORY_META).map((catKey) => {
              const item = CATEGORY_META[catKey];
              const isSelected = catKey === currentCategoryKey;
              return (
                <button
                  key={catKey}
                  onClick={() => navigate(`/explore/${catKey}`)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  <span>{item.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Heading & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 border-b border-white/10 pb-6">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
              <span>{meta.icon}</span>
              <span>{meta.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {meta.description}
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or tag..."
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

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden h-96 flex flex-col justify-between p-4"
              >
                <div className="w-full h-48 bg-slate-800 rounded-2xl" />
                <div className="space-y-2 mt-4">
                  <div className="w-2/3 h-5 bg-slate-800 rounded" />
                  <div className="w-1/2 h-3 bg-slate-850 rounded" />
                  <div className="w-full h-10 bg-slate-850 rounded" />
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
            <h3 className="text-lg font-bold text-white">Failed to Load Destinations</h3>
            <p className="text-xs text-slate-300">{error}</p>
            <button
              onClick={fetchPlaces}
              className="px-6 py-2 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPlaces.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-white/10 max-w-md mx-auto space-y-3">
            <span className="text-4xl block">🔍</span>
            <h3 className="text-lg font-bold text-white">No Matching Destinations</h3>
            <p className="text-xs text-slate-400">
              No places found in this category matching "{searchQuery}". Try clearing your search term.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Places Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
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
              const isImgFailed = !place.image || failedImages[place.image];
              const badge = getCategoryBadge(place.category, place.subtype);

              return (
                <div
                  key={place.id}
                  className="group bg-slate-900/85 hover:bg-slate-850 border border-white/10 hover:border-orange-400/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Clickable Image Section */}
                  <div
                    onClick={() => navigate(`/place/${place.id}`)}
                    className="relative w-full h-52 overflow-hidden bg-slate-950 cursor-pointer"
                  >
                    {!isImgFailed ? (
                      <img
                        src={getImageUrl(place.image)}
                        alt={place.name_en}
                        onError={() => handleImageError(place.image)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <span className="text-3xl mb-1">🌊</span>
                        <span className="text-[11px] font-medium tracking-wide">
                          {place.name_en}
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay on image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                    {/* Category badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Visit Duration */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <span>⏱️</span>
                      <span>{place.estimated_visit_hours} hours</span>
                    </div>

                    {/* Admin Missing Image Badge */}
                    {isAdmin && isImgFailed && (
                      <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-md">
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

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div
                      onClick={() => navigate(`/place/${place.id}`)}
                      className="cursor-pointer space-y-1.5"
                    >
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                        {place.name_en}
                      </h3>
                      {place.name_ta && (
                        <p className="text-xs text-orange-300/80 font-medium">
                          {place.name_ta}
                        </p>
                      )}
                      <p className="text-xs text-slate-300/80 leading-relaxed line-clamp-2 pt-1">
                        {place.short_description}
                      </p>
                    </div>

                    {/* Tags */}
                    {Array.isArray(place.tags) && place.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {place.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] text-slate-400 bg-slate-800/80 border border-white/5 px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Button: Add to Trip */}
                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlace(place.id);
                        }}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                            : 'bg-white/10 hover:bg-orange-500 hover:text-white text-slate-200 border border-white/15 hover:border-orange-500 hover:shadow-md hover:shadow-orange-500/20'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <span>✓</span>
                            <span>Added to Trip Bag</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Add to Trip</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur-md border-t border-white/10 py-3.5 px-4 sm:px-12 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-xs font-bold text-orange-400">
            {selectedCount}
          </div>
          <div className="text-xs sm:text-sm">
            <span className="text-white font-bold">{selectedCount} destinations</span>
            <span className="text-slate-400 hidden sm:inline"> in your trip bag</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/destinations')}
            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer hidden sm:inline-block"
          >
            All Destinations
          </button>
          <button
            onClick={() => navigate('/plan')}
            className="px-5 sm:px-6 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-md shadow-orange-500/30 transition-all cursor-pointer whitespace-nowrap"
          >
            Generate Trip Plan →
          </button>
        </div>
      </div>
    </div>
  );
}
