import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite Leaflet marker icon asset paths so default Leaflet pins never fail or 404
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import TopBar from '../components/TopBar';
import { getPlaces, getHotels, getFood, getImageUrl } from '../services/api';
import { useTrip } from '../context/TripContext';

// Default center of Ramanathapuram district / Rameswaram island
const DISTRICT_CENTER = [9.2876, 79.3129];
const RAMANATHAPURAM_CENTER_COORDS = { lat: 9.3639, lng: 78.8395 };

// Category metadata: colors, icons, and labels matching database category values
const CATEGORY_META = {
  temple: {
    label: 'Temples',
    labelTa: 'கோயில்கள்',
    color: '#f97316',
    border: '#c2410c',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    icon: '🛕',
  },
  church_dargah: {
    label: 'Churches & Dargahs',
    labelTa: 'தேவாலயங்கள் & தர்காக்கள்',
    color: '#8b5cf6',
    border: '#6d28d9',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: '🕌',
  },
  beach: {
    label: 'Beaches',
    labelTa: 'கடற்கரைகள்',
    color: '#06b6d4',
    border: '#0891b2',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: '🏖️',
  },
  heritage: {
    label: 'Heritage & Memorials',
    labelTa: 'பாரம்பரியம் & நினைவிடங்கள்',
    color: '#eab308',
    border: '#ca8a04',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🏛️',
  },
  nature: {
    label: 'Nature & Sanctuaries',
    labelTa: 'இயற்கை & சரணாலயங்கள்',
    color: '#10b981',
    border: '#059669',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: '🌿',
  },
  hotel: {
    label: 'Hotels & Stays',
    labelTa: 'விடுதிகள்',
    color: '#6366f1',
    border: '#4338ca',
    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: '🏨',
  },
  food: {
    label: 'Food & Dining',
    labelTa: 'உணவு & உணவகங்கள்',
    color: '#f43f5e',
    border: '#be123c',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: '🍽️',
  },
};

// Filter chips specification matching database categories and requirements
const CATEGORY_CHIPS = [
  { id: 'all', key: 'filterAll', labelEn: 'All Places', labelTa: 'அனைத்து இடங்கள்', icon: '🌟' },
  { id: 'temple', key: 'filterTemples', labelEn: 'Temples', labelTa: 'கோயில்கள்', icon: '🛕' },
  { id: 'church_dargah', key: 'filterChurchesDargahs', labelEn: 'Churches & Dargahs', labelTa: 'தேவாலயங்கள் & தர்காக்கள்', icon: '🕌' },
  { id: 'beach', key: 'filterBeaches', labelEn: 'Beaches', labelTa: 'கடற்கரைகள்', icon: '🏖️' },
  { id: 'heritage', key: 'filterHeritage', labelEn: 'Heritage & Memorials', labelTa: 'பாரம்பரியம் & நினைவிடங்கள்', icon: '🏛️' },
  { id: 'nature', key: 'filterNature', labelEn: 'Nature & Sanctuaries', labelTa: 'இயற்கை & சரணாலயங்கள்', icon: '🌿' },
  { id: 'hotel', key: 'filterHotels', labelEn: 'Hotels & Stays', labelTa: 'விடுதிகள்', icon: '🏨' },
  { id: 'food', key: 'filterFood', labelEn: 'Food & Dining', labelTa: 'உணவு & உணவகங்கள்', icon: '🍽️' },
];

// Common phonetic / search variations mapping for forgiving search
const SEARCH_ALIASES = {
  rameshwaram: ['ramanathaswamy_temple', 'temple'],
  rameswaram: ['ramanathaswamy_temple', 'temple'],
  rameswaramtemple: ['ramanathaswamy_temple'],
  rameshwaramtemple: ['ramanathaswamy_temple'],
  shivantemple: ['ramanathaswamy_temple'],
  shivatemple: ['ramanathaswamy_temple'],
  jyotirlinga: ['ramanathaswamy_temple'],
  dhanushkodi: ['dhanushkodi_beach', 'dhanushkodi_ruins'],
  danushkodi: ['dhanushkodi_beach', 'dhanushkodi_ruins'],
  ghosttown: ['dhanushkodi_ruins', 'dhanushkodi_beach'],
  arichalmunai: ['dhanushkodi_beach', 'arichal_munai'],
  arichal: ['dhanushkodi_beach', 'arichal_munai'],
  landsend: ['dhanushkodi_beach', 'arichal_munai'],
  pamban: ['pamban_bridge', 'pamban_rail_bridge'],
  pambanbridge: ['pamban_bridge', 'pamban_rail_bridge'],
  cantilever: ['pamban_bridge', 'pamban_rail_bridge'],
  seabridge: ['pamban_bridge'],
  kalam: ['kalam_memorial', 'kalam_house'],
  abdulkalam: ['kalam_memorial', 'kalam_house'],
  apj: ['kalam_memorial', 'kalam_house'],
  kalammemorial: ['kalam_memorial'],
  kalamhouse: ['kalam_house'],
  erwadi: ['erwadi_dargah'],
  ervadi: ['erwadi_dargah'],
  dargah: ['erwadi_dargah'],
  theertham: ['agni_theertham', 'villundi_theertham', 'ramanathaswamy_temple'],
  teertham: ['agni_theertham', 'villundi_theertham', 'ramanathaswamy_temple'],
  agni: ['agni_theertham'],
  agnitheertham: ['agni_theertham'],
  villundi: ['villundi_theertham'],
  vilundi: ['villundi_theertham'],
  freshwater: ['villundi_theertham'],
  kothandaramaswamy: ['kothandaramaswamy_temple'],
  kothandaramar: ['kothandaramaswamy_temple'],
  panchamukhi: ['panchamukhi_hanuman_temple'],
  panchmukhi: ['panchamukhi_hanuman_temple'],
  floatingstone: ['panchamukhi_hanuman_temple'],
  floatingstones: ['panchamukhi_hanuman_temple'],
  hanuman: ['panchamukhi_hanuman_temple'],
  gandhamadhana: ['gandhamadhana_parvatham'],
  ramarpadam: ['gandhamadhana_parvatham'],
  uthirakosamangai: ['uthirakosamangai_temple'],
  uttarakosamangai: ['uthirakosamangai_temple'],
  emerald: ['uthirakosamangai_temple'],
  maragatha: ['uthirakosamangai_temple'],
  ramanathapuram: ['ramalinga_vilasam_palace'],
  palace: ['ramalinga_vilasam_palace'],
  ramalingavilasam: ['ramalinga_vilasam_palace'],
  kurusadai: ['kurusadai_island'],
  crusadai: ['kurusadai_island'],
  coral: ['kurusadai_island'],
  sanctuary: ['chitrangudi_bird_sanctuary'],
  birds: ['chitrangudi_bird_sanctuary'],
  birdsanctuary: ['chitrangudi_bird_sanctuary'],
  chitrangudi: ['chitrangudi_bird_sanctuary'],
  ariyaman: ['ariyaman_beach'],
};

// Normalization helper: strips punctuation, extra spaces, and handles Tamil script
function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy transliteration key for common Indian English phonetic variations
function getFuzzyKey(str) {
  return normalizeSearchText(str)
    .replace(/sh/g, 's')
    .replace(/w/g, 'v')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u');
}

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

// Map Controller for zooming, invalidateSize, and automatic camera fitBounds
function MapController({
  flyTarget,
  markers,
  activeRoute,
  routeStopsList,
  selectedCategory,
  searchQuery,
  showNearbyPanel,
  onSingleMatch,
}) {
  const map = useMap();
  const lastFittedKey = useRef('');

  // 1. Invalidate map size after layout, bottom sheet change, or filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [map, selectedCategory, searchQuery, showNearbyPanel]);

  // 2. Programmatic camera flight
  useEffect(() => {
    if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 16, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [flyTarget, map]);

  // 3. Automatically fitBounds() visible markers when filters or search change
  useEffect(() => {
    if (activeRoute && routeStopsList.length > 0) {
      const bounds = L.latLngBounds(routeStopsList.map((s) => [s.lat, s.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
      return;
    }

    if (!markers || markers.length === 0) return;

    const currentKey = `${selectedCategory}_${searchQuery}_${markers.map((m) => m.id).join(',')}`;
    if (currentKey === lastFittedKey.current && !flyTarget) {
      return;
    }
    lastFittedKey.current = currentKey;

    if (markers.length === 1) {
      const single = markers[0];
      map.flyTo([single.lat, single.lng], 16, {
        animate: true,
        duration: 0.9,
      });
      if (onSingleMatch) {
        onSingleMatch(single);
      }
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
        });
      }
    }
  }, [markers, activeRoute, routeStopsList, map, selectedCategory, searchQuery, onSingleMatch]);

  return null;
}

export default function MapPage() {
  const { t, i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';
  const location = useLocation();
  const navigate = useNavigate();
  const { trip, togglePlace } = useTrip();

  // Route mode state if navigated from Plan page
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

  // Search & Filter state (single category selection)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // User Geolocation states
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isFarFromDistrict, setIsFarFromDistrict] = useState(false);
  const [nearbyTab, setNearbyTab] = useState('places');
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);

  // Interactive camera / selection states
  const [flyTarget, setFlyTarget] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const markerRefs = useRef({});

  // 1. Fetch places, hotels, and food datasets with proper auth and console logging
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [placesRes, hotelsRes, foodRes] = await Promise.all([
        getPlaces(),
        getHotels(),
        getFood(),
      ]);

      // Check for failure on places
      if (!placesRes.success) {
        console.error('Failed to load places for map:', placesRes.error, { status: placesRes.status });
        setError(placesRes.error || 'Failed to load destinations from the server.');
        setLoading(false);
        return;
      }

      const loadedPlaces = placesRes.data || [];
      const loadedHotels = hotelsRes.success ? (hotelsRes.data || []) : [];
      const loadedFood = foodRes.success ? (foodRes.data || []) : [];

      console.log('Map loaded items successfully:', {
        places: loadedPlaces.length,
        hotels: loadedHotels.length,
        food: loadedFood.length,
        total: loadedPlaces.length + loadedHotels.length + loadedFood.length,
      });

      setPlaces(loadedPlaces);
      setHotels(loadedHotels);
      setFood(loadedFood);

      if (loadedPlaces.length === 0 && loadedHotels.length === 0 && loadedFood.length === 0) {
        setError('No destinations or places found in the database.');
      }
    } catch (err) {
      console.error('Network or server error while loading map data:', err);
      setError('Unable to reach the server. Please check your internet connection and retry.');
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

    // Add places from SQLite
    places.forEach((p) => {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        let markerCategory = p.category;
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
          tags: p.tags || [],
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
          name_ta: h.name_ta || '',
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
          name_ta: f.name_ta || '',
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

  // 3. Filter markers with Single Select Category Chips and Forgiving / Fuzzy Search
  const filteredMarkers = useMemo(() => {
    // 1. Category filter
    let list = allMarkers;
    if (selectedCategory === 'all') {
      // By default "All Places" shows all tourist attractions in the district
      // When user searches something, we search across all items so hotels & food can be found
      if (!searchQuery.trim()) {
        list = allMarkers.filter((m) => m.sourceType === 'place');
      }
    } else if (selectedCategory === 'hotel') {
      list = allMarkers.filter((m) => m.sourceType === 'hotel');
    } else if (selectedCategory === 'food') {
      list = allMarkers.filter((m) => m.sourceType === 'food');
    } else {
      // Category matches DB values: temple, church_dargah, beach, heritage, nature
      list = allMarkers.filter((m) => m.category === selectedCategory);
    }

    // 2. Forgiving / Fuzzy search
    const rawQ = searchQuery.trim();
    if (!rawQ) return list;

    const normQ = normalizeSearchText(rawQ);
    const fuzzyQ = getFuzzyKey(rawQ);
    const compactQ = normQ.replace(/\s+/g, '');

    // Check alias list for match
    const aliasTargetIds = new Set();
    Object.entries(SEARCH_ALIASES).forEach(([aliasKey, targetIds]) => {
      const normAlias = normalizeSearchText(aliasKey);
      const fuzzyAlias = getFuzzyKey(aliasKey);
      if (
        normAlias.includes(normQ) ||
        normQ.includes(normAlias) ||
        fuzzyAlias.includes(fuzzyQ) ||
        fuzzyQ.includes(fuzzyAlias)
      ) {
        targetIds.forEach((id) => aliasTargetIds.add(id));
      }
    });

    return list.filter((item) => {
      // Direct alias match
      if (aliasTargetIds.has(item.id) || aliasTargetIds.has(item.category)) {
        return true;
      }

      // Prepare target strings
      const nameEn = item.name || '';
      const nameTa = item.name_ta || '';
      const categoryLabel = CATEGORY_META[item.category]?.label || '';
      const categoryLabelTa = CATEGORY_META[item.category]?.labelTa || '';
      const tags = Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || '');
      const subtype = item.raw?.subtype || '';
      const info = item.info || '';

      const combinedText = `${nameEn} ${nameTa} ${categoryLabel} ${categoryLabelTa} ${tags} ${subtype} ${info}`;
      const normText = normalizeSearchText(combinedText);
      const fuzzyText = getFuzzyKey(combinedText);
      const compactText = normText.replace(/\s+/g, '');

      if (normText.includes(normQ) || fuzzyText.includes(fuzzyQ) || compactText.includes(compactQ)) {
        return true;
      }

      // Check multi-word tokens
      const qTokens = normQ.split(' ').filter(Boolean);
      if (qTokens.length > 1 && qTokens.every((tok) => normText.includes(tok) || fuzzyText.includes(getFuzzyKey(tok)))) {
        return true;
      }

      return false;
    });
  }, [allMarkers, selectedCategory, searchQuery]);

  // 4. Build sequence for Route Mode if active
  const routeStopsList = useMemo(() => {
    if (!activeRoute || !activeRoute.stops) return [];

    return activeRoute.stops
      .map((stop, idx) => {
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
      setLocationError(t('map.locationErrors.unsupported') || 'Geolocation is not supported by your browser.');
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

        const distFromCenter = haversineDistanceKm(
          latitude,
          longitude,
          RAMANATHAPURAM_CENTER_COORDS.lat,
          RAMANATHAPURAM_CENTER_COORDS.lng
        );

        setIsFarFromDistrict(distFromCenter > 150);
        setFlyTarget(userPos);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError(t('map.locationErrors.denied'));
        } else if (err.code === 2) {
          setLocationError(t('map.locationErrors.unavailable'));
        } else if (err.code === 3) {
          setLocationError(t('map.locationErrors.timeout'));
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

  // Handle single category selection
  const handleSelectCategory = (catId) => {
    setSelectedCategory((prev) => (prev === catId ? 'all' : catId));
  };

  // Handle image error for fallback gradient
  const handleImgError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Fly and open popup for an item
  const focusItem = (item) => {
    setFlyTarget({ lat: item.lat, lng: item.lng });
    setSelectedItem(item);
    setTimeout(() => {
      const marker = markerRefs.current[item.id];
      if (marker) {
        marker.openPopup();
      }
    }, 450);
  };

  // Callback when exactly 1 search/filter match is visible
  const handleSingleMatch = useCallback((single) => {
    setSelectedItem(single);
    setTimeout(() => {
      const marker = markerRefs.current[single.id];
      if (marker) {
        marker.openPopup();
      }
    }, 450);
  }, []);

  // Search submit handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const match = filteredMarkers[0];
    if (match) {
      focusItem(match);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* TopBar with active tab set to 'map' */}
      <TopBar active="map" />

      {/* Main Map View Area with explicit height */}
      <div
        className="relative flex-1 w-full flex flex-col overflow-hidden"
        style={{ height: 'calc(100vh - 61px)', minHeight: '400px' }}
      >
        {/* ========================================================================= */}
        {/* TOP CONTROLS & FILTER BAR */}
        {/* ========================================================================= */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
          {/* Top Row: Search Box, Near Me, & Legend toggle */}
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
                placeholder={
                  isTamil
                    ? 'இடங்கள், கோயில்கள், கடற்கரைகளைத் தேடவும்...'
                    : 'Search places, temples, beaches...'
                }
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
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-sky-400/40 text-sky-300 hover:bg-sky-500/20 text-xs font-bold shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span className={locating ? 'animate-spin' : ''}>🎯</span>
                <span>
                  {locating
                    ? t('map.locating')
                    : t('map.nearMe')}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowNearbyPanel(!showNearbyPanel)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-sky-600/90 text-white border border-sky-300 text-xs font-bold shadow-xl transition-all cursor-pointer"
                >
                  <span>📍</span>
                  <span>
                    {isTamil ? 'அருகில்' : 'Nearby'} ({nearbyItems.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleStopLocation}
                  title={t('map.stopLocation')}
                  className="px-2.5 py-2.5 rounded-2xl bg-slate-900/90 text-slate-300 hover:text-white border border-white/15 text-xs cursor-pointer shadow-xl"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Legend Toggle Button */}
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="px-3 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white text-xs font-semibold shadow-xl cursor-pointer"
            >
              🏷️ {t('map.legendTitle')}
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
                type="button"
                onClick={() => setActiveRoute(null)}
                className="px-2.5 py-1 rounded-xl bg-black/20 hover:bg-black/30 text-white font-bold text-[11px] border border-white/20 transition-all cursor-pointer"
              >
                Clear Route
              </button>
            </div>
          )}

          {/* Location Alerts */}
          {locationError && (
            <div className="pointer-events-auto p-3 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs shadow-xl backdrop-blur-md flex items-center justify-between gap-2 max-w-md animate-fade-in">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{locationError}</span>
              </div>
              <button
                type="button"
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
                <span>{t('map.farFromDistrict')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFarFromDistrict(false)}
                className="text-sky-300 hover:text-white font-bold px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Category Filter Chips (Single Select matching DB categories) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto pt-0.5">
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCategory === chip.id;
              const meta = CATEGORY_META[chip.id];
              const chipLabel = isTamil ? chip.labelTa : chip.labelEn;

              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSelectCategory(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1.5 shadow-md ${
                    isActive
                      ? meta
                        ? `${meta.bg} scale-102 ring-2 ring-orange-400/40 font-extrabold`
                        : 'bg-orange-500 text-white border-orange-400 scale-102 ring-2 ring-orange-400/40'
                      : 'bg-slate-900/85 backdrop-blur-md text-slate-300 border-white/10 hover:text-white hover:border-white/25 hover:bg-slate-800/90'
                  }`}
                >
                  <span>{chip.icon}</span>
                  <span>{chipLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Results Count Banner */}
          <div className="flex items-center gap-2 pointer-events-auto self-start mt-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {t('map.placesShown', { count: filteredMarkers.length })}
              </span>
            </div>
          </div>

          {/* Empty Search Feedback Banner */}
          {searchQuery.trim() && filteredMarkers.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/30 text-center shadow-2xl max-w-md mx-auto pointer-events-auto space-y-2 animate-fade-in">
              <p className="text-sm font-bold text-white">
                {t('map.noPlacesFoundFor', { query: searchQuery })}
              </p>
              <p className="text-xs text-slate-300">
                {t('map.tryDifferentSpelling')}
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-1 px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>{t('map.clearSearch')}</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MAP LEGEND OVERLAY */}
        {/* ========================================================================= */}
        {showLegend && (
          <div className="absolute top-28 right-3 z-[1000] w-64 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white">{t('map.legendTitle')}</span>
              <button
                type="button"
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
                    <span>{isTamil ? meta.labelTa : meta.label}</span>
                  </div>
                  <span className="text-sm">{meta.icon}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NEARBY ITEMS PANEL (Bottom Sheet / Floating Drawer) */}
        {/* ========================================================================= */}
        {userLocation && showNearbyPanel && (
          <div className="absolute z-[1000] bottom-4 left-3 right-3 sm:right-auto sm:w-96 max-h-[55vh] sm:max-h-[70vh] flex flex-col rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-sky-400/40 shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-bold text-white">{t('map.nearbyTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNearbyPanel(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/40 border-b border-white/5">
              {[
                { id: 'places', label: isTamil ? 'இடங்கள் 🏛️' : 'Places 🏛️' },
                { id: 'hotels', label: isTamil ? 'விடுதிகள் 🏨' : 'Hotels 🏨' },
                { id: 'food', label: isTamil ? 'உணவு 🍽️' : 'Food 🍽️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {nearbyItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {isTamil ? 'அருகில் எதுவும் கிடைக்கவில்லை.' : `No ${nearbyTab} found with valid coordinates.`}
                </div>
              ) : (
                nearbyItems.map((item, idx) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.heritage;
                  const itemPrimary = (isTamil && item.name_ta) ? item.name_ta : item.name;
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
                            {idx + 1}. {itemPrimary}
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
        {/* LEAFLET MAP CONTAINER & TILES */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-300">
              {isTamil ? 'ராமநாதபுரம் வரைபடம் ஏற்றப்படுகிறது...' : 'Loading Ramanathapuram map & attractions...'}
            </p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 text-center space-y-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-2xl shadow-xl">
              ⚠️
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-bold text-white">
                {isTamil ? 'வரைபடத் தரவை ஏற்றுவதில் தோல்வி' : 'Unable to Load Map Data'}
              </h3>
              <p className="text-xs text-red-300">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAllData}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              🔄 {t('map.retry')}
            </button>
          </div>
        ) : (
          <MapContainer
            center={DISTRICT_CENTER}
            zoom={11}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
          >
            {/* Standard OpenStreetMap Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Camera & Bounds Controller */}
            <MapController
              flyTarget={flyTarget}
              markers={filteredMarkers}
              activeRoute={Boolean(activeRoute)}
              routeStopsList={routeStopsList}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              showNearbyPanel={showNearbyPanel}
              onSingleMatch={handleSingleMatch}
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
                    <div className="text-slate-900 p-1 text-xs font-sans">
                      <p className="font-bold text-sky-700">📍 {isTamil ? 'நீங்கள் இங்கே உள்ளீர்கள்' : 'You Are Here'}</p>
                      <p className="text-[11px] text-slate-500">Accuracy: ~{userLocation.accuracy}m</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Render Category Markers */}
            {filteredMarkers.map((item) => {
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
                            <span className="text-[11px] font-bold text-sky-200">Solvane Ramanathapuram</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                          {isTamil ? meta.labelTa : meta.label}
                        </span>
                      </div>

                      {/* Header & Tamil Title */}
                      <div className="mb-2">
                        {(() => {
                          const popupPrimary = (isTamil && item.name_ta) ? item.name_ta : item.name;
                          const popupSecondary = (isTamil && item.name_ta) ? item.name : item.name_ta;
                          return (
                            <>
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                {popupPrimary}
                              </h3>
                              {popupSecondary && (
                                <p className="text-[11px] text-slate-500">{popupSecondary}</p>
                              )}
                            </>
                          );
                        })()}
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
                              {t('common.viewDetails')}
                            </Link>
                          ) : item.sourceType === 'hotel' ? (
                            <Link
                              to="/explore/hotels"
                              className="flex-1 py-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {t('map.viewStays')}
                            </Link>
                          ) : (
                            <Link
                              to="/explore/food"
                              className="flex-1 py-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {t('map.viewFood')}
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
                            <span>{t('common.navigate')}</span>
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
                            <span>{isAddedToTrip ? t('common.addedToTrip') : t('common.addToTrip')}</span>
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
