import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import TopBar from '../components/TopBar';
import { getPlaces, getHotels, getFood, getImageUrl } from '../services/api';
import { useTrip } from '../context/TripContext';

// Default center of Ramanathapuram district / Rameswaram island
const DISTRICT_CENTER = [9.2876, 79.3129];
const RAMANATHAPURAM_CENTER_COORDS = { lat: 9.3639, lng: 78.8395 };

// Category metadata: colors, icons, and labels
const CATEGORY_META = {
  temple: {
    label: 'Temples',
    color: '#f97316',
    border: '#c2410c',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: '🛕',
  },
  church_mosque: {
    label: 'Churches & Dargahs',
    color: '#8b5cf6',
    border: '#6d28d9',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: '🕌',
  },
  beach: {
    label: 'Beaches',
    color: '#06b6d4',
    border: '#0891b2',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: '🏖️',
  },
  heritage: {
    label: 'Heritage & Memorials',
    color: '#eab308',
    border: '#ca8a04',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: '🏛️',
  },
  nature: {
    label: 'Nature & Sanctuaries',
    color: '#10b981',
    border: '#059669',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: '🌿',
  },
  hotel: {
    label: 'Hotels & Stays',
    color: '#6366f1',
    border: '#4338ca',
    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: '🏨',
  },
  food: {
    label: 'Food & Dining',
    color: '#f43f5e',
    border: '#be123c',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: '🍽️',
  },
};

// Haversine distance helper (km)
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel duration assuming 30 km/h average local speed
function estimateTravelTimeMinutes(distKm) {
  if (distKm <= 0.15) return 'Within walking distance';
  const minutes = Math.max(1, Math.round((distKm / 30) * 60));
  if (minutes < 60) return `~${minutes} mins drive`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `~${hrs}h ${rem > 0 ? rem + 'm' : ''} drive`;
}

// Generate custom Leaflet DivIcon with category style
function createCustomMarkerIcon(type, options = {}) {
  const meta = CATEGORY_META[type] || CATEGORY_META.heritage;
  const { isRouteStop = false, stopIndex = 0, isHighlighted = false } = options;

  if (isRouteStop) {
    return L.divIcon({
      className: 'custom-route-pin',
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42],
      html: `
        <div style="position: relative; width: 36px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
          <svg viewBox="0 0 36 42" width="36" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.05887 0 0 8.05887 0 18C0 28.5 18 42 18 42C18 42 36 28.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#ea580c" stroke="#fed7aa" stroke-width="2"/>
          </svg>
          <span style="position: absolute; top: 7px; color: #ffffff; font-weight: 900; font-size: 13px; font-family: ui-sans-serif, system-ui, sans-serif;">
            ${stopIndex + 1}
          </span>
        </div>
      `,
    });
  }

  const pulseRing = isHighlighted
    ? `<span style="position: absolute; inset: -4px; border-radius: 9999px; background: ${meta.color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
    : '';

  return L.divIcon({
    className: 'custom-map-pin',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
    html: `
      <div style="position: relative; width: 32px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.45));">
        ${pulseRing}
        <svg viewBox="0 0 32 38" width="32" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16344 0 0 7.16344 0 16C0 25.5 16 38 16 38C16 38 32 25.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="${meta.color}" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="16" cy="15" r="11" fill="#0f172a"/>
        </svg>
        <span style="position: absolute; top: 6px; font-size: 12px; line-height: 1;">
          ${meta.icon}
        </span>
      </div>
    `,
  });
}

// User location pulsating blue dot
const userLocationPin = L.divIcon({
  className: 'user-location-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #38bdf8; opacity: 0.6; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="width: 14px; height: 14px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 0 8px rgba(2,132,199,0.8);"></span>
    </div>
  `,
});

// Map Controller for zooming and programmatic camera movements
function MapController({ flyTarget, fitBoundsList, isRouteMode }) {
  const map = useMap();

  useEffect(() => {
    if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 16, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [flyTarget, map]);

  useEffect(() => {
    if (fitBoundsList && fitBoundsList.length > 0) {
      const bounds = L.latLngBounds(fitBoundsList.map((item) => [item.lat, item.lng]));
      map.fitBounds(bounds, {
        padding: isRouteMode ? [70, 70] : [40, 40],
        maxZoom: isRouteMode ? 14 : 13,
      });
    }
  }, [fitBoundsList, isRouteMode, map]);

  return null;
}

export default function MapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trip, togglePlace } = useTrip();

  // Route mode state if coming from Plan page
  const routeState = location.state;
  const [activeRoute, setActiveRoute] = useState(
    routeState?.routeStops ? { stops: routeState.routeStops, day: routeState.dayNumber, title: routeState.dayTitle } : null
  );

  // Data states
  const [places, setPlaces] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [food, setFood] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    temple: true,
    church_mosque: true,
    beach: true,
    heritage: true,
    nature: true,
    hotel: false, // Hidden by default to avoid clutter
    food: false,  // Hidden by default to avoid clutter
  });

  // User Geolocation states
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isFarFromDistrict, setIsFarFromDistrict] = useState(false);
  const [nearbyTab, setNearbyTab] = useState('places'); // 'places' | 'hotels' | 'food'
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);

  // Interactive camera / selection states
  const [flyTarget, setFlyTarget] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const markerRefs = useRef({});

  // 1. Fetch places, hotels, and food datasets
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [placesRes, hotelsRes, foodRes] = await Promise.all([
        getPlaces(),
        getHotels(),
        getFood(),
      ]);

      if (placesRes.success) setPlaces(placesRes.data || []);
      if (hotelsRes.success) setHotels(hotelsRes.data || []);
      if (foodRes.success) setFood(foodRes.data || []);

      if (!placesRes.success && !hotelsRes.success && !foodRes.success) {
        setError('Failed to load map data. Please check your connection and retry.');
      }
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 2. Normalize items into a unified marker array with valid coordinates
  const allMarkers = useMemo(() => {
    const list = [];

    // Add places
    places.forEach((p) => {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        // Categorize churches/dargahs
        let markerCategory = p.category;
        if (p.category === 'church_dargah' || p.subtype === 'mosque_dargah' || p.subtype === 'church') {
          markerCategory = 'church_mosque';
        }
        if (!CATEGORY_META[markerCategory]) {
          markerCategory = 'heritage';
        }

        list.push({
          id: p.id,
          sourceType: 'place',
          category: markerCategory,
          name: p.name_en,
          name_ta: p.name_ta || '',
          lat,
          lng,
          image: p.image,
          info: p.timings || p.short_description || 'Open for visitors',
          fee: p.entry_fee || 'Free / Standard',
          raw: p,
        });
      }
    });

    // Add hotels
    hotels.forEach((h) => {
      const lat = parseFloat(h.lat);
      const lng = parseFloat(h.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        list.push({
          id: h.id,
          sourceType: 'hotel',
          category: 'hotel',
          name: h.name,
          name_ta: '',
          lat,
          lng,
          image: h.image,
          info: h.price_range_per_night ? `Stay: ${h.price_range_per_night}` : 'Comfortable stay',
          rating: h.rating,
          raw: h,
        });
      }
    });

    // Add food spots
    food.forEach((f) => {
      const lat = parseFloat(f.lat);
      const lng = parseFloat(f.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const famous = Array.isArray(f.famous_for) ? f.famous_for.slice(0, 2).join(', ') : '';
        list.push({
          id: f.id,
          sourceType: 'food',
          category: 'food',
          name: f.name,
          name_ta: '',
          lat,
          lng,
          image: f.image,
          info: f.price_range || famous || 'Local Ramanathapuram specialty',
          raw: f,
        });
      }
    });

    return list;
  }, [places, hotels, food]);

  // 3. Filter markers by category filters and search text
  const filteredMarkers = useMemo(() => {
    return allMarkers.filter((item) => {
      // Category filter check
      if (!activeFilters[item.category]) return false;

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesTa = item.name_ta?.toLowerCase().includes(q);
        if (!matchesName && !matchesTa) return false;
      }

      return true;
    });
  }, [allMarkers, activeFilters, searchQuery]);

  // 4. Build sequence for Route Mode if active
  const routeStopsList = useMemo(() => {
    if (!activeRoute || !activeRoute.stops) return [];

    return activeRoute.stops
      .map((stop, idx) => {
        // Find matching coordinate from allMarkers or stop data
        const match = allMarkers.find((m) => m.id === stop.place_id);
        const lat = stop.lat || match?.lat;
        const lng = stop.lng || match?.lng;

        if (!lat || !lng) return null;
        return {
          ...stop,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          stopIndex: idx,
          fullItem: match,
        };
      })
      .filter(Boolean);
  }, [activeRoute, allMarkers]);

  // 5. Geolocation Handler ("Near me")
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const userPos = { lat: latitude, lng: longitude, accuracy: Math.round(accuracy) };
        setUserLocation(userPos);
        setShowNearbyPanel(true);

        // Check distance to Ramanathapuram center
        const distFromCenter = haversineDistanceKm(
          latitude,
          longitude,
          RAMANATHAPURAM_CENTER_COORDS.lat,
          RAMANATHAPURAM_CENTER_COORDS.lng
        );

        setIsFarFromDistrict(distFromCenter > 150);

        // Fly camera to user position
        setFlyTarget(userPos);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setLocationError(
            'Location access was blocked. You can still browse the map or turn on location in your browser settings.'
          );
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setLocationError('Your location could not be determined. Please check your GPS or internet connection.');
        } else if (err.code === 3) {
          // TIMEOUT
          setLocationError('Location request timed out. Please try again.');
        } else {
          setLocationError('An error occurred while retrieving your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleStopLocation = () => {
    setUserLocation(null);
    setShowNearbyPanel(false);
    setLocationError(null);
    setIsFarFromDistrict(false);
  };

  // 6. Top 5 Nearest Items calculation
  const nearbyItems = useMemo(() => {
    if (!userLocation) return [];

    let targetItems = [];
    if (nearbyTab === 'places') {
      targetItems = allMarkers.filter((m) => m.sourceType === 'place');
    } else if (nearbyTab === 'hotels') {
      targetItems = allMarkers.filter((m) => m.sourceType === 'hotel');
    } else if (nearbyTab === 'food') {
      targetItems = allMarkers.filter((m) => m.sourceType === 'food');
    }

    return targetItems
      .map((item) => {
        const distKm = haversineDistanceKm(userLocation.lat, userLocation.lng, item.lat, item.lng);
        return {
          ...item,
          distanceKm: distKm,
          distanceFormatted: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
          travelTimeFormatted: estimateTravelTimeMinutes(distKm),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [userLocation, allMarkers, nearbyTab]);

  // 7. Toggle filter helpers
  const toggleFilter = (key) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllPlaces = () => {
    const placeKeys = ['temple', 'church_mosque', 'beach', 'heritage', 'nature'];
    const anyPlaceActive = placeKeys.some((k) => activeFilters[k]);

    setActiveFilters((prev) => {
      const next = { ...prev };
      placeKeys.forEach((k) => {
        next[k] = !anyPlaceActive;
      });
      return next;
    });
  };

  // Handle image error for fallback gradient
  const handleImgError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Fly and open popup for an item
  const focusItem = (item) => {
    setFlyTarget({ lat: item.lat, lng: item.lng });
    setSelectedItem(item);
    // Open popup after fly animation
    setTimeout(() => {
      const marker = markerRefs.current[item.id];
      if (marker) {
        marker.openPopup();
      }
    }, 400);
  };

  // Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const match = filteredMarkers[0] || allMarkers.find((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    if (match) {
      focusItem(match);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* TopBar with active tab set to 'map' */}
      <TopBar active="map" />

      {/* Main Map View Area */}
      <div className="relative flex-1 w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 61px)' }}>
        
        {/* ========================================================================= */}
        {/* TOP CONTROLS & FILTER BAR */}
        {/* ========================================================================= */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
          
          {/* Top Row: Search Box, Near Me, & Route banner */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places, temples, beaches..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 shadow-xl transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-white/10 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </form>

            {/* "Near Me" GPS Button */}
            {!userLocation ? (
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-sky-400/40 text-sky-300 hover:bg-sky-500/20 text-xs font-bold shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span className={locating ? 'animate-spin' : ''}>🎯</span>
                <span>{locating ? 'Locating...' : 'Near Me'}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  onClick={() => setShowNearbyPanel(!showNearbyPanel)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-sky-600/90 text-white border border-sky-300 text-xs font-bold shadow-xl transition-all cursor-pointer"
                >
                  <span>📍</span>
                  <span>Nearby ({nearbyItems.length})</span>
                </button>
                <button
                  onClick={handleStopLocation}
                  title="Stop using location"
                  className="px-2.5 py-2.5 rounded-2xl bg-slate-900/90 text-slate-300 hover:text-white border border-white/15 text-xs cursor-pointer shadow-xl"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Legend Toggle Button */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="px-3 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white text-xs font-semibold shadow-xl cursor-pointer"
            >
              🏷️ Legend
            </button>
          </div>

          {/* Route Mode Banner (if viewed from Day Tour) */}
          {activeRoute && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-orange-600/95 to-amber-600/95 text-white text-xs shadow-2xl backdrop-blur-md border border-orange-400/50 animate-fade-in max-w-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺️</span>
                <div>
                  <p className="font-bold">
                    Day {activeRoute.day} Tour: {activeRoute.title || 'Curated Route'}
                  </p>
                  <p className="text-[10px] text-orange-100">
                    {routeStopsList.length} numbered stops in planned visiting sequence
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveRoute(null)}
                className="px-2.5 py-1 rounded-xl bg-black/20 hover:bg-black/30 text-white font-bold text-[11px] border border-white/20 transition-all cursor-pointer"
              >
                Clear Route
              </button>
            </div>
          )}

          {/* Location Error / Warning Alerts */}
          {locationError && (
            <div className="pointer-events-auto p-3 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs shadow-xl backdrop-blur-md flex items-center justify-between gap-2 max-w-md animate-fade-in">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{locationError}</span>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="text-amber-300 hover:text-white font-bold px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {isFarFromDistrict && (
            <div className="pointer-events-auto p-2.5 rounded-2xl bg-sky-950/90 border border-sky-400/40 text-sky-200 text-xs shadow-xl backdrop-blur-md flex items-center justify-between gap-2 max-w-md">
              <div className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>You seem to be far from Ramanathapuram. Distances are calculated from your current location.</span>
              </div>
              <button
                onClick={() => setIsFarFromDistrict(false)}
                className="text-sky-300 hover:text-white font-bold px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter Chips Horizontal Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto pt-0.5">
            {/* Toggle All Places */}
            <button
              onClick={toggleAllPlaces}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer bg-slate-900/90 backdrop-blur-md text-slate-200 border-white/20 hover:border-orange-400 shadow-md"
            >
              All Places
            </button>

            {/* Individual category chips */}
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const isActive = activeFilters[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1.5 shadow-md ${
                    isActive
                      ? `${meta.bg} scale-102`
                      : 'bg-slate-900/80 backdrop-blur-md text-slate-400 border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAP LEGEND POPUP OVERLAY */}
        {/* ========================================================================= */}
        {showLegend && (
          <div className="absolute top-28 right-3 z-[1000] w-64 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white">Map Categories</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <div key={key} className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span>{meta.label}</span>
                  </div>
                  <span className="text-sm">{meta.icon}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NEARBY ITEMS PANEL (Bottom sheet on mobile, floating panel on desktop) */}
        {/* ========================================================================= */}
        {userLocation && showNearbyPanel && (
          <div className="absolute z-[1000] bottom-4 left-3 right-3 sm:right-auto sm:w-96 max-h-[55vh] sm:max-h-[70vh] flex flex-col rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-sky-400/40 shadow-2xl overflow-hidden animate-slide-up">
            {/* Panel Header */}
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-bold text-white">Nearest to You</span>
              </div>
              <button
                onClick={() => setShowNearbyPanel(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/40 border-b border-white/5">
              {[
                { id: 'places', label: 'Places 🏛️' },
                { id: 'hotels', label: 'Hotels 🏨' },
                { id: 'food', label: 'Food 🍽️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setNearbyTab(tab.id)}
                  className={`py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                    nearbyTab === tab.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Nearby List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {nearbyItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No {nearbyTab} found with valid coordinates.
                </div>
              ) : (
                nearbyItems.map((item, idx) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.heritage;
                  return (
                    <div
                      key={item.id}
                      onClick={() => focusItem(item)}
                      className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-sky-400/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border"
                          style={{ backgroundColor: `${meta.color}20`, borderColor: `${meta.color}40` }}
                        >
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                            {idx + 1}. {item.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.travelTimeFormatted}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                          {item.distanceFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEAFLET MAP CONTAINER */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-300">Loading Ramanathapuram map & attractions...</p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-red-300">⚠️ {error}</p>
            <button
              onClick={fetchAllData}
              className="px-5 py-2 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all cursor-pointer shadow-lg"
            >
              Retry Loading Map
            </button>
          </div>
        ) : (
          <MapContainer
            center={DISTRICT_CENTER}
            zoom={11}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            style={{ backgroundColor: '#0f172a' }}
          >
            {/* OpenStreetMap Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Camera Controller */}
            <MapController
              flyTarget={flyTarget}
              fitBoundsList={activeRoute ? routeStopsList : filteredMarkers}
              isRouteMode={Boolean(activeRoute)}
            />

            {/* Route Polyline when Day Tour is active */}
            {activeRoute && routeStopsList.length > 1 && (
              <Polyline
                positions={routeStopsList.map((s) => [s.lat, s.lng])}
                pathOptions={{
                  color: '#ea580c',
                  weight: 4,
                  dashArray: '8, 8',
                  opacity: 0.9,
                }}
              />
            )}

            {/* User GPS Location Marker & Accuracy Circle */}
            {userLocation && (
              <>
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={userLocation.accuracy || 100}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.15,
                    weight: 1.5,
                  }}
                />
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationPin}>
                  <Popup className="custom-popup">
                    <div className="text-slate-900 p-1 text-xs">
                      <p className="font-bold text-sky-700">📍 You Are Here</p>
                      <p className="text-[11px] text-slate-500">Accuracy: ~{userLocation.accuracy}m</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Render Category Markers */}
            {filteredMarkers.map((item) => {
              // Check if item is part of the active route
              const routeStopMatch = activeRoute
                ? routeStopsList.find((s) => s.place_id === item.id)
                : null;

              const isRouteStop = Boolean(routeStopMatch);
              const stopIndex = routeStopMatch ? routeStopMatch.stopIndex : 0;
              const isSelected = selectedItem?.id === item.id;

              const customIcon = createCustomMarkerIcon(item.category, {
                isRouteStop,
                stopIndex,
                isHighlighted: isSelected,
              });

              const isPlace = item.sourceType === 'place';
              const isAddedToTrip = isPlace && trip.selectedPlaces?.includes(item.id);
              const meta = CATEGORY_META[item.category] || CATEGORY_META.heritage;
              const hasImgFailed = failedImages[item.id];
              const imageUrl = getImageUrl(item.image);

              return (
                <Marker
                  key={`${item.sourceType}-${item.id}`}
                  position={[item.lat, item.lng]}
                  icon={customIcon}
                  ref={(ref) => {
                    if (ref) markerRefs.current[item.id] = ref;
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedItem(item);
                    },
                  }}
                >
                  <Popup className="custom-solvane-popup" maxWidth={300} minWidth={260}>
                    <div className="p-1 text-slate-900 font-sans">
                      {/* Popup Thumbnail */}
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gradient-to-tr from-sky-900 to-indigo-950 mb-2.5">
                        {imageUrl && !hasImgFailed ? (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            onError={() => handleImgError(item.id)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-white">
                            <span className="text-2xl mb-1">{meta.icon}</span>
                            <span className="text-[11px] font-bold text-sky-200">Solvane Heritage</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                          {meta.label}
                        </span>
                      </div>

                      {/* Header & Tamil Title */}
                      <div className="mb-2">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.name}
                        </h3>
                        {item.name_ta && (
                          <p className="text-[11px] text-slate-500">{item.name_ta}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.info}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {/* View Details Link */}
                          {isPlace ? (
                            <Link
                              to={`/place/${item.id}`}
                              className="flex-1 py-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              View Details
                            </Link>
                          ) : item.sourceType === 'hotel' ? (
                            <Link
                              to="/explore/hotels"
                              className="flex-1 py-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Explore Stays
                            </Link>
                          ) : (
                            <Link
                              to="/explore/food"
                              className="flex-1 py-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Explore Food
                            </Link>
                          )}

                          {/* Navigate with Google Maps */}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold transition-colors border border-sky-200 cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>🧭</span>
                            <span>Navigate</span>
                          </a>
                        </div>

                        {/* Add to Trip Toggle (For Places Only) */}
                        {isPlace && (
                          <button
                            type="button"
                            onClick={() => togglePlace(item.id)}
                            className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                              isAddedToTrip
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
                            }`}
                          >
                            <span>{isAddedToTrip ? '✓ Added to Trip' : '+ Add to Trip'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
