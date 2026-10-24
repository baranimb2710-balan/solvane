import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getHotels, deleteHotel, getImageUrl } from '../../services/api';

/**
 * AdminHotelsList Component
 * Administrative view for managing all hotels and accommodations.
 * Features:
 * - Filter by categories or "Missing Image"
 * - Instant search by name, area, or amenities
 * - Responsive table with image preview, category badge, rating, and actions
 * - Safe deletion with confirmation
 */
export default function AdminHotelsList() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'missing_image', or category slug
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadHotels = async () => {
    setLoading(true);
    setError('');
    const res = await getHotels();
    if (res.success && Array.isArray(res.data)) {
      setHotels(res.data);
    } else {
      setError(res.error || 'Failed to load accommodations.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHotels();
  }, []);

  const handleDelete = async (hotel) => {
    setDeletingId(hotel.id);
    const res = await deleteHotel(hotel.id);
    setDeletingId(null);
    setDeleteModalItem(null);
    if (res.success) {
      setSuccessMessage(`Hotel "${hotel.name}" was successfully deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadHotels();
    } else {
      setError(res.error || 'Failed to delete hotel.');
    }
  };

  const missingImageCount = useMemo(() => {
    return hotels.filter((h) => !h.image || !h.image.trim()).length;
  }, [hotels]);

  const filteredHotels = useMemo(() => {
    return hotels.filter((h) => {
      // Missing Image filter
      const hasImage = Boolean(h.image && h.image.trim());
      if (filterType === 'missing_image' && hasImage) {
        return false;
      }

      // Category filter
      if (filterType !== 'all' && filterType !== 'missing_image') {
        if ((h.category || '').toLowerCase() !== filterType.toLowerCase()) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = h.name?.toLowerCase().includes(q) || h.name_ta?.toLowerCase().includes(q);
        const matchesArea = h.area?.toLowerCase().includes(q);
        const matchesCategory = h.category?.toLowerCase().includes(q);
        const matchesAmenities = Array.isArray(h.amenities) && h.amenities.some((a) => a.toLowerCase().includes(q));
        return matchesName || matchesArea || matchesCategory || matchesAmenities;
      }

      return true;
    });
  }, [hotels, filterType, searchQuery]);

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'premium':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'mid_range':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
      case 'budget':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'lodge_dharamshala':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
      <TopBar active="admin" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Link to="/admin" className="hover:text-white transition-colors">Admin Portal</Link>
          <span>/</span>
          <span className="text-orange-400 font-semibold">Hotels & Stays</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">
                Accommodation Directory
              </span>
              <span className="text-xs text-slate-400">
                {hotels.length} Total Stays
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Manage Hotels & Stays
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage verified hotels, tariffs, pilgrim dharamshalas, and upload room/property photos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/hotels/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>+</span>
              <span>Add New Hotel</span>
            </Link>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search Box */}
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hotel name, area, or amenities..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-slate-900 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'all'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              All ({hotels.length})
            </button>
            <button
              onClick={() => setFilterType('missing_image')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                filterType === 'missing_image'
                  ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                  : 'bg-slate-900/80 text-amber-300/80 border-amber-400/20 hover:border-amber-400/50'
              }`}
            >
              <span>Missing Image</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
                {missingImageCount}
              </span>
            </button>
            <button
              onClick={() => setFilterType('budget')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'budget'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Budget
            </button>
            <button
              onClick={() => setFilterType('mid_range')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'mid_range'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Mid-range
            </button>
            <button
              onClick={() => setFilterType('premium')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'premium'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Premium
            </button>
            <button
              onClick={() => setFilterType('lodge_dharamshala')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'lodge_dharamshala'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Dharamshala
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-slate-400">Loading accommodations...</p>
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/10">
            <div className="text-3xl mb-2">🏨</div>
            <h3 className="text-sm font-bold text-white mb-1">No hotels found</h3>
            <p className="text-xs text-slate-400 mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search query or category filter.'
                : 'Get started by creating your first hotel or dharamshala entry.'}
            </p>
            <Link
              to="/admin/hotels/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
            >
              + Add Hotel
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Hotel Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Price / Night</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Verified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHotels.map((h) => {
                  const hasImg = Boolean(h.image && h.image.trim());
                  return (
                    <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Image Preview */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                          {hasImg ? (
                            <img
                              src={getImageUrl(h.image)}
                              alt={h.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-amber-400 font-bold">No Img</span>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{h.name}</div>
                        {h.name_ta && <div className="text-[11px] text-orange-400/80">{h.name_ta}</div>}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{h.id}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(h.category)}`}>
                          {(h.category || 'Standard').replace('_', ' ')}
                        </span>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-4 text-slate-300">
                        {h.area || '—'}
                      </td>

                      {/* Price Range */}
                      <td className="py-3 px-4 font-semibold text-amber-300">
                        {h.price_range_per_night || '—'}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                          ★ {h.rating || 4.0}
                        </span>
                      </td>

                      {/* Verified */}
                      <td className="py-3 px-4">
                        {h.verified ? (
                          <span className="text-emerald-400 font-bold text-[11px]">✓ Yes</span>
                        ) : (
                          <span className="text-amber-400 font-bold text-[11px]">Unverified</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/hotels/${h.id}/edit`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 hover:bg-sky-500/25 transition-all"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteModalItem(h)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-400/30 hover:bg-rose-500/25 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Hotel?</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deleteModalItem.name}"</span>? This will permanently remove the record and any uploaded image files from the database.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 text-slate-300 hover:bg-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => handleDelete(deleteModalItem)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
