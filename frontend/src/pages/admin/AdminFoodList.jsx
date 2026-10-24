import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getFood, deleteFood, getImageUrl } from '../../services/api';

/**
 * AdminFoodList Component
 * Administrative view for managing eateries, mess halls, restaurants, and snack stalls.
 * Features:
 * - Filter by culinary type, diet (veg/non-veg), or "Missing Image"
 * - Instant search by name, area, or famous dishes
 * - Responsive table with image preview, dietary badge, rating, and actions
 * - Safe deletion with confirmation
 */
export default function AdminFoodList() {
  const navigate = useNavigate();
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'missing_image', or type slug
  const [filterDiet, setFilterDiet] = useState('all'); // 'all', 'veg', 'non-veg', 'both'
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadFood = async () => {
    setLoading(true);
    setError('');
    const res = await getFood();
    if (res.success && Array.isArray(res.data)) {
      setFoodItems(res.data);
    } else {
      setError(res.error || 'Failed to load food spots.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFood();
  }, []);

  const handleDelete = async (food) => {
    setDeletingId(food.id);
    const res = await deleteFood(food.id);
    setDeletingId(null);
    setDeleteModalItem(null);
    if (res.success) {
      setSuccessMessage(`Eatery "${food.name}" was successfully deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadFood();
    } else {
      setError(res.error || 'Failed to delete food spot.');
    }
  };

  const missingImageCount = useMemo(() => {
    return foodItems.filter((f) => !f.image || !f.image.trim()).length;
  }, [foodItems]);

  const filteredFood = useMemo(() => {
    return foodItems.filter((f) => {
      // Missing Image filter
      const hasImage = Boolean(f.image && f.image.trim());
      if (filterType === 'missing_image' && hasImage) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && filterType !== 'missing_image') {
        if ((f.type || '').toLowerCase() !== filterType.toLowerCase()) {
          return false;
        }
      }

      // Diet filter
      if (filterDiet !== 'all') {
        if ((f.veg_or_nonveg || '').toLowerCase() !== filterDiet.toLowerCase()) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name?.toLowerCase().includes(q) || f.name_ta?.toLowerCase().includes(q);
        const matchesArea = f.area?.toLowerCase().includes(q);
        const matchesType = f.type?.toLowerCase().includes(q);
        const matchesDishes = Array.isArray(f.famous_for) && f.famous_for.some((d) => d.toLowerCase().includes(q));
        return matchesName || matchesArea || matchesType || matchesDishes;
      }

      return true;
    });
  }, [foodItems, filterType, filterDiet, searchQuery]);

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'seafood':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
      case 'tiffin':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      case 'meals':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'snacks_sweets':
        return 'bg-rose-500/20 text-rose-300 border-rose-400/30';
      case 'cafe':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-white/10';
    }
  };

  const getDietBadgeClass = (diet) => {
    switch (diet) {
      case 'veg':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
      case 'non-veg':
        return 'bg-rose-500/15 text-rose-300 border-rose-400/30';
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
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
          <span className="text-orange-400 font-semibold">Food & Dining</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-400/30">
                Culinary Directory
              </span>
              <span className="text-xs text-slate-400">
                {foodItems.length} Total Food Spots
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Manage Food & Dining
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage seafood stalls, pure veg messes, halwa sweet shops, and upload photos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/food/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>+</span>
              <span>Add New Food Spot</span>
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
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search Box */}
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by restaurant name, dish, or area..."
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

          {/* Type Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'all'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              All ({foodItems.length})
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
              onClick={() => setFilterType('seafood')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'seafood'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Seafood
            </button>
            <button
              onClick={() => setFilterType('tiffin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'tiffin'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Tiffin
            </button>
            <button
              onClick={() => setFilterType('meals')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'meals'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Meals
            </button>
            <button
              onClick={() => setFilterType('snacks_sweets')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'snacks_sweets'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Snacks & Sweets
            </button>
          </div>
        </div>

        {/* Dietary Filter Bar */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Diet:</span>
          {['all', 'veg', 'non-veg', 'both'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDiet(d)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                filterDiet === d
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  : 'bg-slate-900/40 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {d === 'all' ? 'All Diets' : d === 'veg' ? 'Pure Veg' : d === 'non-veg' ? 'Non-Veg' : 'Veg & Non-Veg'}
            </button>
          ))}
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-slate-400">Loading food establishments...</p>
          </div>
        ) : filteredFood.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/10">
            <div className="text-3xl mb-2">🍽️</div>
            <h3 className="text-sm font-bold text-white mb-1">No food establishments found</h3>
            <p className="text-xs text-slate-400 mb-4">
              {searchQuery || filterType !== 'all' || filterDiet !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Get started by creating your first eatery or mess hall.'}
            </p>
            <Link
              to="/admin/food/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
            >
              + Add Food Spot
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Eatery Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Diet</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Price Range</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Verified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFood.map((f) => {
                  const hasImg = Boolean(f.image && f.image.trim());
                  return (
                    <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Image Preview */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                          {hasImg ? (
                            <img
                              src={getImageUrl(f.image)}
                              alt={f.name}
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
                        <div className="font-bold text-white text-xs">{f.name}</div>
                        {f.name_ta && <div className="text-[11px] text-orange-400/80">{f.name_ta}</div>}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{f.id}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTypeBadgeClass(f.type)}`}>
                          {(f.type || 'Eatery').replace('_', ' ')}
                        </span>
                      </td>

                      {/* Diet */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDietBadgeClass(f.veg_or_nonveg)}`}>
                          {f.veg_or_nonveg === 'veg' ? 'Veg 🌱' : f.veg_or_nonveg === 'non-veg' ? 'Non-Veg 🍗' : 'Both 🍽️'}
                        </span>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-4 text-slate-300">
                        {f.area || '—'}
                      </td>

                      {/* Price Range */}
                      <td className="py-3 px-4 font-semibold text-amber-300">
                        {f.price_range || '—'}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                          ★ {f.rating || 4.0}
                        </span>
                      </td>

                      {/* Verified */}
                      <td className="py-3 px-4">
                        {f.verified ? (
                          <span className="text-emerald-400 font-bold text-[11px]">✓ Yes</span>
                        ) : (
                          <span className="text-amber-400 font-bold text-[11px]">Unverified</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/food/${f.id}/edit`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 hover:bg-sky-500/25 transition-all"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteModalItem(f)}
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
            <h3 className="text-base font-bold text-white mb-2">Delete Food Spot?</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deleteModalItem.name}"</span>? This will permanently remove the eatery and any uploaded photos from the database.
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
