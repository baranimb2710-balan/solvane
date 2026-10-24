import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getHotelById, createHotel, updateHotel, getImageUrl } from '../../services/api';

const HOTEL_CATEGORIES = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid_range', label: 'Mid-range' },
  { id: 'premium', label: 'Premium' },
  { id: 'lodge_dharamshala', label: 'Lodge & Dharamshala' },
];

export default function HotelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_ta: '',
    category: 'mid_range',
    area: '',
    price_range_per_night: '₹1,500 to ₹3,000',
    rating: '4.0',
    contact: '',
    lat: '9.2885',
    lng: '79.3148',
    amenities: '',
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
    const fetchHotel = async () => {
      setLoading(true);
      setError('');
      const res = await getHotelById(id);
      if (!isMounted) return;

      if (res.success && res.data) {
        const h = res.data;
        setFormData({
          name: h.name || '',
          name_ta: h.name_ta || '',
          category: h.category || 'mid_range',
          area: h.area || '',
          price_range_per_night: h.price_range_per_night || '',
          rating: String(h.rating || 4.0),
          contact: h.contact || '',
          lat: String(h.lat ?? 9.2885),
          lng: String(h.lng ?? 79.3148),
          amenities: Array.isArray(h.amenities) ? h.amenities.join(', ') : '',
          nearby_place_ids: Array.isArray(h.nearby_place_ids) ? h.nearby_place_ids.join(', ') : '',
          map_link: h.map_link || '',
          verified: Boolean(h.verified),
        });
        if (h.image) {
          setExistingImage(h.image);
        }
      } else {
        setError(res.error || 'Failed to load hotel details.');
      }
      setLoading(false);
    };

    fetchHotel();
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
      setError('Hotel name is required.');
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('name_ta', formData.name_ta.trim());
    payload.append('category', formData.category);
    payload.append('area', formData.area.trim());
    payload.append('price_range_per_night', formData.price_range_per_night.trim());
    payload.append('rating', formData.rating || '4.0');
    payload.append('contact', formData.contact.trim());
    payload.append('lat', formData.lat || '9.2885');
    payload.append('lng', formData.lng || '79.3148');
    payload.append('amenities', formData.amenities.trim());
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
      res = await updateHotel(id, payload);
    } else {
      res = await createHotel(payload);
    }
    setSubmitting(false);

    if (res.success) {
      navigate('/admin/hotels');
    } else {
      setError(res.error || 'Failed to save hotel.');
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
          <Link to="/admin/hotels" className="hover:text-white transition-colors">Hotels</Link>
          <span>/</span>
          <span className="text-orange-400 font-semibold">{isEditMode ? 'Edit Hotel' : 'New Hotel'}</span>
        </div>

        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4">
          <h1 className="text-2xl font-black text-white">
            {isEditMode ? `Edit Hotel: ${formData.name || id}` : 'Add New Hotel or Stay'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fill in the accommodation details, room tariffs, pilgrim amenities, and upload an official photo.
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
            <p className="text-xs text-slate-400">Loading hotel record...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                1. Basic Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hotel Name (EN) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hotel Name (English) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Hotel Tamil Nadu (TTDC)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Hotel Name (TA) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hotel Name (Tamil Script)
                  </label>
                  <input
                    type="text"
                    name="name_ta"
                    value={formData.name_ta}
                    onChange={handleChange}
                    placeholder="எ.கா. ஹோட்டல் தமிழ்நாடு"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400"
                  >
                    {HOTEL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
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
                    placeholder="e.g. Agni Theertham Beachfront, Middle Street"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price Range */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Price Range / Night
                  </label>
                  <input
                    type="text"
                    name="price_range_per_night"
                    value={formData.price_range_per_night}
                    onChange={handleChange}
                    placeholder="e.g. ₹1,800 to ₹3,500"
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
                    placeholder="e.g. +91 4573 221066"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>

            {/* Location & Details Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                2. Location Coordinates & Amenities
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
                    placeholder="9.2895"
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
                    placeholder="79.3198"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  name="amenities"
                  value={formData.amenities}
                  onChange={handleChange}
                  placeholder="e.g. Air Conditioning, Free Parking, Restaurant, Beach View, 24-Hour Hot Water"
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
                  placeholder="e.g. agni-theertham, ramanathaswamy-temple, kalam-house"
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
                  Mark as Officially Verified Information
                </label>
              </div>
            </div>

            {/* Photo Upload Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                3. Hotel Photo
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
                onClick={() => navigate('/admin/hotels')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-slate-300 hover:bg-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : isEditMode ? 'Update Hotel' : 'Create Hotel'}
              </button>
            </div>

          </form>
        )}

      </main>
    </div>
  );
}
