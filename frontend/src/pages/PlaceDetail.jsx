import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaceById, getPlaces, getHotels, getFood, clearSession, getUser, getImageUrl } from '../services/api';
import { useTrip } from '../context/TripContext';
import TopBar from '../components/TopBar';

// Leaflet and React-Leaflet integration
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconMarker2x from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure default Leaflet marker icon in Vite bundler
const DefaultMarkerIcon = L.icon({
  iconUrl: iconMarker,
  iconRetinaUrl: iconMarker2x,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultMarkerIcon;

/**
 * Solvane - Place Detail Page ("/place/:id")
 * 
 * Features:
 * 1. Image gallery with large main image, clickable thumbnails, swipe & arrow navigation,
 *    and full-screen lightbox modal with fallback to sea-blue gradient.
 * 2. Title with English and Tamil names, category badge, and synced "Add to Trip" / "Added ✓" button.
 * 3. "About" section with full description and tags.
 * 4. "Visitor Information" info tiles: Timings, Entry fee, Best season, Visit hours, Dress code, Photography.
 * 5. "How to reach" transit guide.
 * 6. "Tips" bulleted advice list.
 * 7. "Information not yet verified" notice if verified is false.
 * 8. "Location" section with interactive Leaflet map & "Navigate" Google Maps direction button.
 * 9. "Nearby places" section with small clickable destination cards.
 * 10. Shimmering loading skeleton and friendly "Place not found" fallback.
 */

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trip, togglePlace } = useTrip();

  const user = getUser();
  const isAdmin = Boolean(user && user.is_admin);

  // Destination data states
  const [place, setPlace] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [allHotels, setAllHotels] = useState([]);
  const [allFood, setAllFood] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Gallery states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  // Touch swipe ref for mobile gallery
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Fetch place details, places, hotels, and food
  useEffect(() => {
    let isMounted = true;
    window.scrollTo(0, 0);

    const loadData = async () => {
      setLoading(true);
      setNotFound(false);
      setCurrentImageIndex(0);

      try {
        const [placeRes, allRes, hotelsRes, foodRes] = await Promise.all([
          getPlaceById(id),
          getPlaces(),
          getHotels(),
          getFood(),
        ]);

        if (!isMounted) return;

        if (placeRes.success && placeRes.data) {
          setPlace(placeRes.data);
        } else {
          setNotFound(true);
        }

        if (allRes.success && Array.isArray(allRes.data)) {
          setAllPlaces(allRes.data);
        }

        if (hotelsRes.success && Array.isArray(hotelsRes.data)) {
          setAllHotels(hotelsRes.data);
        }

        if (foodRes.success && Array.isArray(foodRes.data)) {
          setAllFood(foodRes.data);
        }
      } catch (err) {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Gallery image list (main image + gallery array)
  const galleryImages = useMemo(() => {
    if (!place) return [];
    const list = [];
    if (place.image) list.push(getImageUrl(place.image));
    if (Array.isArray(place.gallery)) {
      place.gallery.forEach((img) => {
        const url = getImageUrl(img);
        if (!list.includes(url)) list.push(url);
      });
    }
    return list.length > 0 ? list : ['/images/placeholder.jpg'];
  }, [place]);

  // Handle image loading error
  const handleImageError = (imgSrc) => {
    setFailedImages((prev) => ({ ...prev, [imgSrc]: true }));
  };

  // Gallery Navigation Handlers
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
  };

  // Keyboard support for fullscreen viewer (Escape to close, arrows to cycle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isViewerOpen) return;
      if (e.key === 'Escape') setIsViewerOpen(false);
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, galleryImages.length]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

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

  // Lookup nearby destination objects
  const nearbyPlacesList = useMemo(() => {
    if (!place || !Array.isArray(place.nearby_places)) return [];
    return place.nearby_places
      .map((nearbyId) => allPlaces.find((p) => p.id === nearbyId))
      .filter(Boolean);
  }, [place, allPlaces]);

  // Lookup nearby hotels whose nearby_place_ids include this place
  const nearbyHotels = useMemo(() => {
    if (!place) return [];
    return allHotels.filter(
      (h) => Array.isArray(h.nearby_place_ids) && h.nearby_place_ids.includes(place.id)
    );
  }, [place, allHotels]);

  // Lookup nearby food spots whose nearby_place_ids include this place
  const nearbyFood = useMemo(() => {
    if (!place) return [];
    return allFood.filter(
      (f) => Array.isArray(f.nearby_place_ids) && f.nearby_place_ids.includes(place.id)
    );
  }, [place, allFood]);

  // Selected state from trip
  const isAdded = place ? (trip?.selectedPlaces || []).includes(place.id) : false;

  // =========================================================================
  // 1. LOADING SKELETON
  // =========================================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white select-none pb-24">
        {/* Top Bar */}
        <header className="pt-4 pb-3 px-6 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <Link to="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">
            SOLVANE
          </Link>
          <div className="h-6 w-24 bg-slate-800 rounded-full animate-pulse" />
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-8">
          <div className="h-6 w-36 bg-slate-800 rounded-full" />
          <div className="h-80 sm:h-96 w-full bg-slate-900 rounded-3xl border border-white/10" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 bg-slate-800 rounded-xl" />
            <div className="h-4 w-1/3 bg-slate-850 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-slate-900 rounded-2xl border border-white/5" />
            ))}
          </div>
          <div className="h-40 bg-slate-900 rounded-3xl" />
        </main>
      </div>
    );
  }

  // =========================================================================
  // 2. PLACE NOT FOUND PAGE
  // =========================================================================
  if (notFound || !place) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
        <header className="pt-4 pb-3 px-6 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/80">
          <Link to="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">
            SOLVANE
          </Link>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 border border-white/15"
          >
            Logout
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900/90 border border-white/15 rounded-3xl p-8 shadow-2xl animate-fade-in">
            <span className="text-5xl block mb-4">🔍</span>
            <h1 className="text-2xl font-black text-white mb-2">
              Destination Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              We couldn't find the requested place in our Ramanathapuram guide. It may have been removed or the link is incorrect.
            </p>
            <button
              onClick={() => navigate('/destinations')}
              className="w-full py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:scale-[1.02] cursor-pointer transition-all"
            >
              ← Back to Destinations
            </button>
          </div>
        </main>

        <footer className="py-4 text-center text-[11px] text-slate-400">
          Ramanathapuram AI Heritage Companion • Solvane
        </footer>
      </div>
    );
  }

  const currentImageSrc = galleryImages[currentImageIndex];
  const isCurrentImgMissing = failedImages[currentImageSrc];
  const badge = getCategoryBadge(place.category);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden pb-16">
      
      {/* Background Ambience */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${place.image})` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/90 pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP BAR */}
      {/* ========================================================================= */}
      <TopBar active="destinations" />

      {/* ========================================================================= */}
      {/* MAIN CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <main className="relative z-20 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-fade-in">
        
        {/* Back Button Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/destinations')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
          >
            <span>←</span>
            <span>Back to Destinations</span>
          </button>

          <span className="text-xs text-slate-400 hidden sm:inline">
            📍 Ramanathapuram District
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 1. IMAGE GALLERY */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          {/* Main Large Image Container */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsViewerOpen(true)}
            className="relative h-72 sm:h-96 md:h-[460px] w-full rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl cursor-pointer group select-none"
            title="Click to view full screen"
          >
            {!isCurrentImgMissing ? (
              <img
                src={currentImageSrc}
                alt={place.name_en}
                onError={() => handleImageError(currentImageSrc)}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-102"
              />
            ) : (
              /* Sea-Blue Gradient Fallback */
              <div className="w-full h-full bg-gradient-to-br from-sky-900 via-cyan-800 to-blue-950 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-5xl mb-2">🌊</span>
                <span className="text-lg font-bold text-sky-100">{place.name_en}</span>
                <span className="text-xs text-sky-200/70 mt-1">Scenic Ramanathapuram Destination</span>
              </div>
            )}

            {/* Dark gradient for controls contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

            {/* Fullscreen Hint Badge */}
            <div className="absolute top-4 right-4 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs text-white font-medium flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <span>🔍</span>
              <span>Click to Expand</span>
            </div>

            {/* Left / Right Arrow Buttons (Only if > 1 image) */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
                  aria-label="Previous Image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
                  aria-label="Next Image"
                >
                  ›
                </button>
              </>
            )}

            {/* Counter Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-xs text-slate-200 font-semibold">
              {currentImageIndex + 1} / {galleryImages.length}
            </div>
          </div>

          {/* Clickable Thumbnails Row */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
              {galleryImages.map((imgSrc, idx) => {
                const isActive = idx === currentImageIndex;
                const isThumbFailed = failedImages[imgSrc];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-20 h-16 sm:w-24 sm:h-18 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-orange-400 scale-105 shadow-md shadow-orange-500/30'
                        : 'border-white/15 opacity-60 hover:opacity-100 hover:border-sky-400'
                    }`}
                  >
                    {!isThumbFailed ? (
                      <img
                        src={imgSrc}
                        alt={`Thumbnail ${idx + 1}`}
                        onError={() => handleImageError(imgSrc)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-900 to-blue-950 flex items-center justify-center text-xs">
                        🌊
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 2. TITLE HEADER & ADD TO TRIP ACTION */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${badge.class}`}>
                {badge.label}
              </span>
              {place.estimated_visit_hours && (
                <span className="bg-slate-800/80 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/10 font-semibold">
                  ⏱️ {place.estimated_visit_hours} hrs visit
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {place.name_en}
            </h1>
            {place.name_ta && (
              <p className="text-sm sm:text-base text-orange-400 font-semibold">
                {place.name_ta}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl pt-1">
              {place.short_description}
            </p>
          </div>

          {/* Actions: Add to Trip and Admin Edit */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(`/admin/places/${place.id}/edit`)}
                className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-bold text-orange-400 hover:text-white bg-orange-500/15 hover:bg-orange-500/30 border border-orange-400/40 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✏️</span>
                <span>Edit Destination</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => togglePlace(place.id)}
              className={`w-full sm:w-auto px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                isAdded
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95'
              }`}
            >
              {isAdded ? (
                <>
                  <span>✓</span>
                  <span>Added to Trip</span>
                </>
              ) : (
                <>
                  <span>+</span>
                  <span>Add to Trip</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. ABOUT SECTION */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>📖</span>
            <span>About {place.name_en}</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {place.description}
          </p>

          {/* Tags */}
          {Array.isArray(place.tags) && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold text-sky-200 bg-sky-950/60 border border-sky-400/20 px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 4. VISITOR INFORMATION TILES */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Visitor Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tile 1: Timings */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>🕒</span> Timings
              </span>
              <p className="text-sm font-semibold text-white">{place.timings || 'Check locally'}</p>
            </div>

            {/* Tile 2: Entry Fee */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>🎟️</span> Entry Fee
              </span>
              <p className="text-sm font-semibold text-white">{place.entry_fee || 'Check locally'}</p>
            </div>

            {/* Tile 3: Best Season */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>⛅</span> Best Season
              </span>
              <p className="text-sm font-semibold text-white">{place.best_season || 'Check locally'}</p>
            </div>

            {/* Tile 4: Recommended Visit Time */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>⏱️</span> Recommended Visit
              </span>
              <p className="text-sm font-semibold text-white">
                {place.estimated_visit_hours ? `${place.estimated_visit_hours} hours` : 'Check locally'}
              </p>
            </div>

            {/* Tile 5: Dress Code */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>👕</span> Dress Code
              </span>
              <p className="text-xs text-slate-200 font-medium leading-snug">
                {place.dress_code || 'Check locally'}
              </p>
            </div>

            {/* Tile 6: Photography Rules */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1 flex items-center gap-1.5">
                <span>📷</span> Photography Rules
              </span>
              <p className="text-xs text-slate-200 font-medium leading-snug">
                {place.photography_rules || 'Check locally'}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. HOW TO REACH SECTION */}
        {/* ========================================================================= */}
        {place.how_to_reach && (
          <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>🚗</span>
              <span>How to Reach</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {place.how_to_reach}
            </p>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 6. VISITOR TIPS SECTION */}
        {/* ========================================================================= */}
        {Array.isArray(place.tips) && place.tips.length > 0 && (
          <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>💡</span>
              <span>Visitor Tips</span>
            </h2>
            <ul className="space-y-2.5">
              {place.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="text-orange-400 font-bold mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 7. NOT VERIFIED NOTICE */}
        {/* ========================================================================= */}
        {!place.verified && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3 text-xs text-amber-200">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-bold text-amber-300">Information not yet verified</p>
              <p className="mt-0.5 text-amber-200/80 leading-relaxed">
                Specific details such as timings, fees, and photography guidelines are gathered from local travel references and may vary seasonally. Please check locally during your visit.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. INTERACTIVE LEAFLET MAP & NAVIGATE */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>📍</span>
                <span>Location & Map</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Coordinates: {place.lat}° N, {place.lng}° E
              </p>
            </div>

            {/* Navigate in Google Maps button */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 shadow-md shadow-sky-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>🧭</span>
              <span>Navigate in Google Maps</span>
              <span>↗</span>
            </a>
          </div>

          {/* Leaflet OpenStreetMap Container */}
          <div className="h-72 sm:h-96 w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner">
            <MapContainer
              center={[place.lat, place.lng]}
              zoom={14}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[place.lat, place.lng]}>
                <Popup>
                  <div className="text-slate-900">
                    <p className="font-bold text-sm">{place.name_en}</p>
                    <p className="text-xs text-slate-600">{place.name_ta}</p>
                    <p className="text-[11px] text-slate-700 mt-1">{place.short_description}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. NEARBY PLACES SECTION */}
        {/* ========================================================================= */}
        {nearbyPlacesList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>🗺️</span>
              <span>Nearby Places</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nearbyPlacesList.map((nearby) => {
                const isNearbyFailed = failedImages[nearby.image];
                const nearbyBadge = getCategoryBadge(nearby.category);

                return (
                  <div
                    key={nearby.id}
                    onClick={() => navigate(`/place/${nearby.id}`)}
                    className="group bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-orange-400/40 rounded-2xl p-3 shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-3.5"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 relative">
                      {!isNearbyFailed ? (
                        <img
                          src={nearby.image}
                          alt={nearby.name_en}
                          onError={() => handleImageError(nearby.image)}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-sky-900 to-blue-950 flex items-center justify-center text-lg">
                          🌊
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${nearbyBadge.class}`}>
                        {nearbyBadge.label}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                        {nearby.name_en}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ⏱️ {nearby.estimated_visit_hours} hrs
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 10. STAY AND EAT NEARBY SECTION */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>🏨</span>
                <span>Stay and Eat Nearby</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Accommodations and dining spots located right next to {place.name_en}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link to="/explore/hotels" className="text-sky-300 hover:text-white transition-colors">
                All Stays →
              </Link>
              <span className="text-slate-600">•</span>
              <Link to="/explore/food" className="text-orange-300 hover:text-white transition-colors">
                All Food →
              </Link>
            </div>
          </div>

          {nearbyHotels.length === 0 && nearbyFood.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
              <span className="text-3xl block">📍</span>
              <p className="text-sm font-semibold text-slate-300">
                No data yet
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No verified hotels or eateries are listed directly adjacent to {place.name_en} yet. Check our explore directories for options across Rameswaram and Ramanathapuram.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => navigate('/explore/hotels')}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  Explore Stays
                </button>
                <button
                  onClick={() => navigate('/explore/food')}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  Explore Food
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Nearby Stays */}
              {nearbyHotels.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                    <span>🛏️</span>
                    <span>Places to Stay Nearby ({nearbyHotels.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nearbyHotels.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white">{hotel.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">📍 {hotel.area}</p>
                          </div>
                          {hotel.rating && (
                            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                              ⭐ {hotel.rating}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-emerald-300 font-semibold">
                          🏷️ {hotel.price_range_per_night || 'Check pricing'} / night
                        </div>

                        {!hotel.verified && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[10px] space-y-0.5 text-amber-200">
                            <p className="font-bold text-amber-300">ℹ️ Information Not Verified</p>
                            <p className="text-amber-200/80">Prices and timings may change. Please confirm before visiting.</p>
                          </div>
                        )}

                        <a
                          href={hotel.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-3 rounded-full text-xs font-bold text-center bg-white/10 hover:bg-sky-500 hover:text-white text-slate-200 border border-white/15 transition-all cursor-pointer"
                        >
                          View on Map ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby Food */}
              {nearbyFood.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                    <span>🍲</span>
                    <span>Places to Eat Nearby ({nearbyFood.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nearbyFood.map((food) => (
                      <div
                        key={food.id}
                        className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white">{food.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">📍 {food.area}</p>
                          </div>
                          {food.rating && (
                            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                              ⭐ {food.rating}
                            </span>
                          )}
                        </div>

                        {Array.isArray(food.famous_for) && food.famous_for.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {food.famous_for.slice(0, 3).map((dish, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded"
                              >
                                {dish}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-emerald-300 font-semibold">
                          💰 {food.price_range || 'Affordable'}
                        </div>

                        {!food.verified && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[10px] space-y-0.5 text-amber-200">
                            <p className="font-bold text-amber-300">ℹ️ Information Not Verified</p>
                            <p className="text-amber-200/80">Prices and timings may change. Please confirm before visiting.</p>
                          </div>
                        )}

                        <a
                          href={food.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-3 rounded-full text-xs font-bold text-center bg-white/10 hover:bg-orange-500 hover:text-white text-slate-200 border border-white/15 transition-all cursor-pointer"
                        >
                          View on Map ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 10. PHOTO CREDITS & LICENSING (ATTRIBUTION) */}
        {/* ========================================================================= */}
        {Array.isArray(place.image_credits) && place.image_credits.length > 0 && (
          <section className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <span>📷</span>
              <span>Photo Credits & Licensing</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Images sourced under open licenses from Wikimedia Commons contributors. Attribution is provided in accordance with Creative Commons licensing requirements.
            </p>
            <div className="divide-y divide-white/5 pt-1">
              {place.image_credits.map((credit, idx) => (
                <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                    <a
                      href={credit.commons_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:text-white font-medium hover:underline line-clamp-1"
                    >
                      {credit.title || `Photo ${idx + 1}`} ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] pl-5 sm:pl-0">
                    <span>By: <strong className="text-slate-200">{credit.author || 'Wikimedia Contributor'}</strong></span>
                    <span>•</span>
                    {credit.license_url ? (
                      <a
                        href={credit.license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:underline font-semibold"
                      >
                        {credit.license}
                      </a>
                    ) : (
                      <span className="text-orange-400 font-semibold">{credit.license}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 10. FULLSCREEN LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {isViewerOpen && (
        <div 
          onClick={() => setIsViewerOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 animate-fade-in"
        >
          {/* Header Controls */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-4">
            <div>
              <p className="text-sm font-bold">{place.name_en}</p>
              <p className="text-xs text-slate-400">
                Image {currentImageIndex + 1} of {galleryImages.length}
              </p>
            </div>

            <button
              onClick={() => setIsViewerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-lg font-bold flex items-center justify-center transition-all cursor-pointer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Fullscreen Image View */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 flex items-center justify-center max-w-5xl w-full"
          >
            {!isCurrentImgMissing ? (
              <img
                src={currentImageSrc}
                alt={place.name_en}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="h-80 w-full max-w-lg bg-gradient-to-br from-sky-900 to-blue-950 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                <span className="text-5xl mb-2">🌊</span>
                <span className="text-lg font-bold">{place.name_en}</span>
              </div>
            )}

            {/* Lightbox Prev / Next Controls */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Footer hint */}
          <p className="text-xs text-slate-400 pt-3">
            Click outside or press <span className="font-bold text-white">Esc</span> to close • Use <span className="font-bold text-white">← →</span> arrow keys to navigate
          </p>
        </div>
      )}

      {/* Footer Watermark */}
      <footer className="relative z-20 py-4 text-center text-[11px] text-slate-400">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>
    </div>
  );
}
