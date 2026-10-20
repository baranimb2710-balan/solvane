import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getPlaceById, createPlace, updatePlace, deletePlace } from '../../services/api';

const CATEGORIES = [
  { id: 'temple', label: 'Temple' },
  { id: 'beach', label: 'Beach' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'nature', label: 'Nature' },
  { id: 'church_dargah', label: 'Church & Dargah' },
];

const ZONES = [
  { id: 'rameswaram_town', label: 'Rameswaram Town' },
  { id: 'pamban', label: 'Pamban' },
  { id: 'dhanushkodi_side', label: 'Dhanushkodi Side' },
  { id: 'mainland', label: 'Mainland' },
];

export default function PlaceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    name_en: '',
    name_ta: '',
    category: 'temple',
    subtype: 'temple',
    short_description: '',
    description: '',
    timings: 'Open 24 hours',
    entry_fee: 'Free',
    best_season: 'October to March',
    lat: '',
    lng: '',
    estimated_visit_hours: '1.5',
    zone: 'rameswaram_town',
    dress_code: '',
    photography_rules: '',
    how_to_reach: '',
    tags: '',
    nearby_places: '',
  });

  const [tipsList, setTipsList] = useState(['']);
  const [newTipInput, setNewTipInput] = useState('');

  // Image Upload State
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [existingMainImage, setExistingMainImage] = useState('');

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);
  const [removedGalleryUrls, setRemovedGalleryUrls] = useState([]);

  // UI state
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load existing data in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    const loadPlace = async () => {
      setLoading(true);
      setError('');
      const res = await getPlaceById(id);
      if (!isMounted) return;

      if (res.success && res.data) {
        const p = res.data;
        setFormData({
          name_en: p.name_en || '',
          name_ta: p.name_ta || '',
          category: p.category || 'temple',
          subtype: p.subtype || p.category || 'temple',
          short_description: p.short_description || '',
          description: p.description || '',
          timings: p.timings || 'Open 24 hours',
          entry_fee: p.entry_fee || 'Free',
          best_season: p.best_season || 'October to March',
          lat: p.lat ? String(p.lat) : '',
          lng: p.lng ? String(p.lng) : '',
          estimated_visit_hours: p.estimated_visit_hours ? String(p.estimated_visit_hours) : '1.5',
          zone: p.zone || 'rameswaram_town',
          dress_code: p.dress_code || '',
          photography_rules: p.photography_rules || '',
          how_to_reach: p.how_to_reach || '',
          tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
          nearby_places: Array.isArray(p.nearby_places) ? p.nearby_places.join(', ') : '',
        });

        if (Array.isArray(p.tips) && p.tips.length > 0) {
          setTipsList(p.tips);
        }

        if (p.image) {
          setExistingMainImage(p.image);
        }

        if (Array.isArray(p.gallery)) {
          setExistingGallery(p.gallery);
        }
      } else {
        setError(res.error || 'Destination not found.');
      }
      setLoading(false);
    };

    loadPlace();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // When category changes, provide a sensible default subtype
      if (name === 'category' && !isEditMode) {
        if (value === 'church_dargah') {
          updated.subtype = 'church';
        } else {
          updated.subtype = value;
        }
      }
      return updated;
    });
  };

  // Tips handlers
  const handleAddTip = () => {
    if (!newTipInput.trim()) return;
    setTipsList((prev) => [...prev, newTipInput.trim()]);
    setNewTipInput('');
  };

  const handleRemoveTip = (index) => {
    setTipsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Cover Image Selection
  const handleMainImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image file exceeds 5 MB limit. Please select a smaller photo.');
      return;
    }

    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
    setError('');
  };

  // Gallery Images Selection
  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check size & max total gallery images
    const currentTotal = (existingGallery.length - removedGalleryUrls.length) + galleryFiles.length;
    if (currentTotal + files.length > 6) {
      setError(`Maximum 6 gallery images allowed. You already have ${currentTotal}.`);
      return;
    }

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        setError(`File ${f.name} exceeds 5 MB limit.`);
        return;
      }
    }

    const newFiles = [...galleryFiles, ...files];
    setGalleryFiles(newFiles);
    setGalleryPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  const handleRemoveGalleryFile = (index) => {
    const updatedFiles = galleryFiles.filter((_, i) => i !== index);
    setGalleryFiles(updatedFiles);
    setGalleryPreviews(updatedFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleRemoveExistingGallery = (url) => {
    setRemovedGalleryUrls((prev) => [...prev, url]);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name_en.trim()) {
      setError('Please provide an English name for the destination.');
      return;
    }
    if (!formData.lat || !formData.lng) {
      setError('Both latitude and longitude coordinates are required.');
      return;
    }

    const latNum = parseFloat(formData.lat);
    const lngNum = parseFloat(formData.lng);

    if (isNaN(latNum) || latNum < 8.5 || latNum > 10.5) {
      setError('Latitude must be a valid number between 8.5 and 10.5 (Ramanathapuram region).');
      return;
    }
    if (isNaN(lngNum) || lngNum < 78.0 || lngNum > 80.0) {
      setError('Longitude must be a valid number between 78.0 and 80.0 (Ramanathapuram region).');
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('name_en', formData.name_en.trim());
      payload.append('name_ta', formData.name_ta.trim());
      payload.append('category', formData.category);
      payload.append('subtype', formData.subtype.trim() || formData.category);
      payload.append('short_description', formData.short_description.trim());
      payload.append('description', formData.description.trim());
      payload.append('timings', formData.timings.trim());
      payload.append('entry_fee', formData.entry_fee.trim());
      payload.append('best_season', formData.best_season.trim());
      payload.append('lat', String(latNum));
      payload.append('lng', String(lngNum));
      payload.append('estimated_visit_hours', formData.estimated_visit_hours || '1.5');
      payload.append('zone', formData.zone);
      payload.append('dress_code', formData.dress_code.trim());
      payload.append('photography_rules', formData.photography_rules.trim());
      payload.append('how_to_reach', formData.how_to_reach.trim());
      payload.append('tags', formData.tags.trim());
      payload.append('tips', JSON.stringify(tipsList.filter((t) => t.trim())));
      payload.append('nearby_places', formData.nearby_places.trim());

      if (mainImageFile) {
        payload.append('main_image', mainImageFile);
      }

      galleryFiles.forEach((file) => {
        payload.append('gallery_images', file);
      });

      let res;
      if (isEditMode) {
        payload.append('existing_image', existingMainImage);
        if (removedGalleryUrls.length > 0) {
          payload.append('remove_gallery', JSON.stringify(removedGalleryUrls));
        }
        res = await updatePlace(id, payload);
      } else {
        res = await createPlace(payload);
      }

      if (res.success && res.data) {
        const targetId = res.data.id || id;
        navigate(`/place/${targetId}`);
      } else {
        setError(res.error || 'Failed to save destination. Please verify the form inputs.');
      }
    } catch (err) {
      setError('An unexpected error occurred while communicating with the server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    const res = await deletePlace(id);
    setDeleting(false);
    if (res.success) {
      navigate('/admin/places');
    } else {
      setError(res.error || 'Failed to delete destination.');
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <TopBar active="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading destination details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
      <TopBar active="admin" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link to="/admin/places" className="hover:text-white transition-colors">
            Manage Places
          </Link>
          <span>/</span>
          <span className="text-orange-400 font-medium">
            {isEditMode ? 'Edit Destination' : 'Add New Destination'}
          </span>
        </div>

        {/* Page Title */}
        <div className="mb-8 border-b border-white/10 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{isEditMode ? '✏️ Edit Destination' : '✨ Add New Destination'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {isEditMode
                ? 'Update attraction information, manage photos, and review coordinates.'
                : 'Create a new Ramanathapuram tourist spot with coordinates and photo uploads.'}
            </p>
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 transition-all cursor-pointer self-start sm:self-auto"
            >
              Delete Destination
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-400/50 flex items-start gap-3 text-red-200 text-xs">
            <span className="text-base">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Error saving destination</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-300 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION 1: BASIC INFORMATION */}
          <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-orange-400 flex items-center gap-2">
                <span>📍</span> Basic Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Names and primary classifications for the tourist attraction.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* English Name */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  English Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name_en"
                  required
                  value={formData.name_en}
                  onChange={handleInputChange}
                  placeholder="e.g. Sri Ramanathaswamy Temple"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                />
              </div>

              {/* Tamil Name */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Tamil Name (Optional)
                </label>
                <input
                  type="text"
                  name="name_ta"
                  value={formData.name_ta}
                  onChange={handleInputChange}
                  placeholder="e.g. ஸ்ரீ ராமநாதசுவாமி திருக்கோயில்"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtype */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Subtype
                </label>
                {formData.category === 'church_dargah' ? (
                  <select
                    name="subtype"
                    value={formData.subtype}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="church">Church</option>
                    <option value="mosque_dargah">Mosque / Dargah</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    name="subtype"
                    value={formData.subtype}
                    onChange={handleInputChange}
                    placeholder="e.g. temple, beach, heritage, nature"
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                )}
              </div>

              {/* Geographic Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Island / District Zone <span className="text-red-400">*</span>
                </label>
                <select
                  name="zone"
                  value={formData.zone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Visit Hours */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Estimated Visit Duration (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  name="estimated_visit_hours"
                  value={formData.estimated_visit_hours}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Short Description (1 sentence for cards)
              </label>
              <textarea
                rows={2}
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                placeholder="Ancient Shiva temple renowned for its majestic corridors and 22 sacred theerthams."
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Full Description (Detailed history and overview)
              </label>
              <textarea
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed paragraphs explaining the architecture, mythology, and tourist significance..."
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </section>

          {/* SECTION 2: GEOGRAPHIC COORDINATES */}
          <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-sky-400 flex items-center gap-2">
                <span>🗺️</span> GPS Location Coordinates
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Required for distance calculation, itinerary routing, and the interactive map.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Latitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="lat"
                  required
                  value={formData.lat}
                  onChange={handleInputChange}
                  placeholder="e.g. 9.2881"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be between 8.5 and 10.5
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Longitude <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="lng"
                  required
                  value={formData.lng}
                  onChange={handleInputChange}
                  placeholder="e.g. 79.3174"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be between 78.0 and 80.0
                </span>
              </div>
            </div>

            <div className="p-3 bg-sky-500/10 border border-sky-400/20 rounded-xl text-[11px] text-sky-200 leading-relaxed">
              💡 <strong>Tip:</strong> You can right-click any spot on Google Maps and click the top numbers to copy exact latitude and longitude coordinates.
            </div>
          </section>

          {/* SECTION 3: VISITOR INFORMATION */}
          <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <span>ℹ️</span> Visitor Guidelines & Timings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Practical information to help tourists plan their arrival.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Operating Timings
                </label>
                <input
                  type="text"
                  name="timings"
                  value={formData.timings}
                  onChange={handleInputChange}
                  placeholder="e.g. 5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Entry Fee
                </label>
                <input
                  type="text"
                  name="entry_fee"
                  value={formData.entry_fee}
                  onChange={handleInputChange}
                  placeholder="e.g. Free (Special darshan available)"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Best Season
                </label>
                <input
                  type="text"
                  name="best_season"
                  value={formData.best_season}
                  onChange={handleInputChange}
                  placeholder="e.g. October to March"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Dress Code
                </label>
                <input
                  type="text"
                  name="dress_code"
                  value={formData.dress_code}
                  onChange={handleInputChange}
                  placeholder="e.g. Traditional Hindu attire required (dhoti/kurta, saree)"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Photography Rules
                </label>
                <input
                  type="text"
                  name="photography_rules"
                  value={formData.photography_rules}
                  onChange={handleInputChange}
                  placeholder="e.g. Prohibited inside sanctum; permitted in outer corridor"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Search Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. spiritual, jyotirlinga, architecture"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                How to Reach (Transit Directions)
              </label>
              <textarea
                rows={2}
                name="how_to_reach"
                value={formData.how_to_reach}
                onChange={handleInputChange}
                placeholder="Accessible via public buses from Rameswaram bus stand or local autorickshaws."
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Travel Tips Repeater */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Local Travel Tips & Advice
              </label>
              <div className="space-y-2 mb-2">
                {tipsList.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-orange-400 font-bold w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTipsList((prev) => prev.map((t, i) => (i === idx ? val : t)));
                      }}
                      placeholder="e.g. Early morning darshan (5:30 AM) is recommended."
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTip(idx)}
                      className="px-2.5 py-1 rounded-lg text-xs text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/25 border border-red-500/20"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTipInput}
                  onChange={(e) => setNewTipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTip();
                    }
                  }}
                  placeholder="Type a new tip and click Add..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950 border border-white/15 text-white"
                />
                <button
                  type="button"
                  onClick={handleAddTip}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                >
                  + Add Tip
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 4: IMAGERY & PHOTO UPLOAD */}
          <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <span>📸</span> Image Uploads (Cover & Gallery)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload JPG, PNG, or WebP photos up to 5 MB each. Images are automatically compressed and resized up to 1600px.
              </p>
            </div>

            {/* Primary Cover Image */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-2">
                Primary Cover Image
              </label>

              {(mainImagePreview || existingMainImage) && (
                <div className="relative w-full max-w-sm h-48 rounded-2xl overflow-hidden mb-3 border border-white/15 bg-slate-950">
                  <img
                    src={mainImagePreview || existingMainImage}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-400/30">
                    {mainImagePreview ? 'New Image Selected' : 'Current Cover Image'}
                  </div>
                </div>
              )}

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleMainImageChange}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30 file:cursor-pointer cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Recommended aspect ratio: 16:9 or 4:3. Max file size: 5 MB.
              </span>
            </div>

            {/* Additional Gallery Images */}
            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-200 mb-2">
                Gallery Images (Up to 6 total)
              </label>

              {/* Existing Gallery Images in Edit Mode */}
              {existingGallery.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] text-slate-400 mb-2">Existing Gallery Photos:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {existingGallery.map((url, idx) => {
                      const isMarkedForRemoval = removedGalleryUrls.includes(url);
                      return (
                        <div
                          key={idx}
                          className={`relative h-28 rounded-xl overflow-hidden border ${
                            isMarkedForRemoval ? 'border-red-500/60 opacity-40' : 'border-white/15'
                          }`}
                        >
                          <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              isMarkedForRemoval
                                ? setRemovedGalleryUrls((prev) => prev.filter((u) => u !== url))
                                : handleRemoveExistingGallery(url)
                            }
                            className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                              isMarkedForRemoval
                                ? 'bg-emerald-500 text-white'
                                : 'bg-red-600/80 text-white hover:bg-red-600'
                            }`}
                          >
                            {isMarkedForRemoval ? 'Undo' : 'Remove'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Newly Selected Gallery Previews */}
              {galleryPreviews.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] text-slate-400 mb-2">Newly Added Photos:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {galleryPreviews.map((previewUrl, idx) => (
                      <div key={idx} className="relative h-28 rounded-xl overflow-hidden border border-amber-400/40">
                        <img src={previewUrl} alt={`New Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryFile(idx)}
                          className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600/80 text-white hover:bg-red-600 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleGalleryChange}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 file:cursor-pointer cursor-pointer"
              />
            </div>
          </section>

          {/* FORM ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(isEditMode ? `/place/${id}` : '/admin/places')}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`w-full sm:w-auto px-8 py-3 rounded-full text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditMode ? 'Save Changes' : 'Create Destination'}</span>
            </button>
          </div>
        </form>
      </main>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <span className="text-3xl block mb-2">🗑️</span>
            <h3 className="text-lg font-bold text-white">Delete Destination?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong>{formData.name_en}</strong>? This action cannot be undone and will remove all uploaded images for this place.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
              >
                {deleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
