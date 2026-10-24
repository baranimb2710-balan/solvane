import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getFoodById, createFood, updateFood, getImageUrl } from '../../services/api';

const FOOD_TYPES = [
  { id: 'seafood', label: 'Coastal Seafood' },
  { id: 'tiffin', label: 'Tiffin & Breakfast' },
  { id: 'meals', label: 'South Indian Meals' },
  { id: 'snacks_sweets', label: 'Snacks & Sweets' },
  { id: 'cafe', label: 'Cafe & Beverages' },
];

const DIET_OPTIONS = [
  { id: 'veg', label: 'Pure Veg 🌱' },
  { id: 'non-veg', label: 'Non-Veg 🍗' },
  { id: 'both', label: 'Veg & Non-Veg 🍽️' },
];

export default function FoodForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_ta: '',
    type: 'tiffin',
    veg_or_nonveg: 'veg',
    area: '',
    price_range: '₹80 to ₹180 per person',
    timings: '6:00 AM - 10:30 PM',
    rating: '4.2',
    contact: '',
    lat: '9.2885',
    lng: '79.3148',
    famous_for: '',
    nearby_place_ids: '',
    map_link: '',
    verified: true,
  });

  // Image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState('');

  // UI state
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load existing data in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    const fetchFood = async () => {
      setLoading(true);
      setError('');
      const res = await getFoodById(id);
      if (!isMounted) return;

      if (res.success && res.data) {
        const f = res.data;
        setFormData({
          name: f.name || '',
          name_ta: f.name_ta || '',
          type: f.type || 'tiffin',
          veg_or_nonveg: f.veg_or_nonveg || 'both',
          area: f.area || '',
          price_range: f.price_range || '',
          timings: f.timings || '',
          rating: String(f.rating || 4.0),
          contact: f.contact || '',
          lat: String(f.lat ?? 9.2885),
          lng: String(f.lng ?? 79.3148),
          famous_for: Array.isArray(f.famous_for) ? f.famous_for.join(', ') : '',
          nearby_place_ids: Array.isArray(f.nearby_place_ids) ? f.nearby_place_ids.join(', ') : '',
          map_link: f.map_link || '',
          verified: Boolean(f.verified),
        });
        if (f.image) {
          setExistingImage(f.image);
        }
      } else {
        setError(res.error || 'Failed to load food spot details.');
      }
      setLoading(false);
    };

    fetchFood();
    return () => { isMounted = false; };
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setExistingImage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Food spot name is required.');
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('name_ta', formData.name_ta.trim());
    payload.append('type', formData.type);
    payload.append('veg_or_nonveg', formData.veg_or_nonveg);
    payload.append('area', formData.area.trim());
    payload.append('price_range', formData.price_range.trim());
    payload.append('timings', formData.timings.trim());
    payload.append('rating', formData.rating || '4.0');
    payload.append('contact', formData.contact.trim());
    payload.append('lat', formData.lat || '9.2885');
    payload.append('lng', formData.lng || '79.3148');
    payload.append('famous_for', formData.famous_for.trim());
    payload.append('nearby_place_ids', formData.nearby_place_ids.trim());
    payload.append('map_link', formData.map_link.trim());
    payload.append('verified', String(formData.verified));

    if (imageFile) {
      payload.append('image_file', imageFile);
    } else {
      payload.append('image_url', existingImage);
    }

    setSubmitting(true);
    let res;
    if (isEditMode) {
      res = await updateFood(id, payload);
    } else {
      res = await createFood(payload);
    }
    setSubmitting(false);

    if (res.success) {
      navigate('/admin/food');
    } else {
      setError(res.error || 'Failed to save food spot.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-24">
      <TopBar active="admin" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Link to="/admin" className="hover:text-white transition-colors">Admin Portal</Link>
          <span>/</span>
          <Link to="/admin/food" className="hover:text-white transition-colors">Food & Dining</Link>
          <span>/</span>
          <span className="text-orange-400 font-semibold">{isEditMode ? 'Edit Food Spot' : 'New Food Spot'}</span>
        </div>

        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4">
          <h1 className="text-2xl font-black text-white">
            {isEditMode ? `Edit Food Spot: ${formData.name || id}` : 'Add New Food Spot'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fill in the culinary specialty, dietary category, timings, price range, and upload an official photo.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-slate-400">Loading food record...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                1. Basic Information & Cuisine
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Food Name (EN) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Establishment Name (English) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Sri Saravana Bhavan (Pure Veg)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Food Name (TA) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Establishment Name (Tamil Script)
                  </label>
                  <input
                    type="text"
                    name="name_ta"
                    value={formData.name_ta}
                    onChange={handleChange}
                    placeholder="எ.கா. ஸ்ரீ சரவண பவன்"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Culinary Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Culinary Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                  >
                    {FOOD_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Diet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dietary Classification <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="veg_or_nonveg"
                    value={formData.veg_or_nonveg}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                  >
                    {DIET_OPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Area / Neighborhood */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="e.g. West Gate, Pamban Shore Road"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price Range */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Average Cost
                  </label>
                  <input
                    type="text"
                    name="price_range"
                    value={formData.price_range}
                    onChange={handleChange}
                    placeholder="e.g. ₹100 to ₹250 per person"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Operating Timings */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Operating Timings
                  </label>
                  <input
                    type="text"
                    name="timings"
                    value={formData.timings}
                    onChange={handleChange}
                    placeholder="e.g. 6:30 AM - 10:30 PM"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Rating (1.0 to 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="e.g. +91 4573 221777"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Specialties & Coordinates Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                2. Specialties & Coordinates
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Latitude */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    value={formData.lat}
                    onChange={handleChange}
                    placeholder="9.2884"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                {/* Longitude */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    value={formData.lng}
                    onChange={handleChange}
                    placeholder="79.3149"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              {/* Famous Dishes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Famous For / Signature Dishes (comma-separated)
                </label>
                <input
                  type="text"
                  name="famous_for"
                  value={formData.famous_for}
                  onChange={handleChange}
                  placeholder="e.g. Ghee Podi Dosa, Filter Coffee, Crab Sukka, Tirunelveli Halwa"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Nearby Place IDs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nearby Destination IDs (comma-separated slug IDs)
                </label>
                <input
                  type="text"
                  name="nearby_place_ids"
                  value={formData.nearby_place_ids}
                  onChange={handleChange}
                  placeholder="e.g. ramanathaswamy-temple, agni-theertham, pamban-bridge"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              {/* Map Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  name="map_link"
                  value={formData.map_link}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Verified Status */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="verified"
                  name="verified"
                  checked={formData.verified}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-white/20 focus:ring-orange-400"
                />
                <label htmlFor="verified" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  Mark as Officially Verified Establishment
                </label>
              </div>
            </div>

            {/* Photo Upload Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                3. Establishment Photo
              </h2>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Current / Preview Image */}
                <div className="w-40 h-28 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : existingImage ? (
                    <img src={getImageUrl(existingImage)} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">No Image</span>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-500/15 file:text-orange-400 hover:file:bg-orange-500/25 file:cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports JPG, PNG, or WebP up to 5 MB. Images will be automatically resized and optimized.
                  </p>
                  {(imagePreview || existingImage) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-400/30 hover:bg-rose-500/25"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/food')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-slate-300 hover:bg-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : isEditMode ? 'Update Food Spot' : 'Create Food Spot'}
              </button>
            </div>

          </form>
        )}

      </main>
    </div>
  );
}
