import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import { getPlaces, getImageUrl } from '../../services/api';

export default function AdminPlacesList() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'missing_image', or category
  const [searchQuery, setSearchQuery] = useState('');

  const loadPlaces = async () => {
    setLoading(true);
    setError('');
    const res = await getPlaces();
    if (res.success && Array.isArray(res.data)) {
      setPlaces(res.data);
    } else {
      setError(res.error || 'Failed to load destinations.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  // Filter & Search Logic
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // Missing Image filter
      const hasImage = Boolean(p.image && p.image.trim());
      if (filterType === 'missing_image' && hasImage) {
        return false;
      }

      // Category filter (if filterType is a category)
      if (filterType !== 'all' && filterType !== 'missing_image') {
        if (p.category !== filterType) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name_en?.toLowerCase().includes(q) || p.name_ta?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        const matchesZone = p.zone?.toLowerCase().includes(q);
        return matchesName || matchesCategory || matchesZone;
      }

      return true;
    });
  }, [places, filterType, searchQuery]);

  const missingImageCount = useMemo(() => {
    return places.filter((p) => !p.image || !p.image.trim()).length;
  }, [places]);

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'temple':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      case 'beach':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
      case 'heritage':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'nature':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'church_dargah':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
      <TopBar active="admin" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header with Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-400/30">
                Admin Portal
              </span>
              <span className="text-xs text-slate-400">
                {places.length} Total Destinations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Manage Destinations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Add new tourist attractions, edit visiting rules, update coordinates, or replace photos.
            </p>
          </div>

          <Link
            to="/admin/places/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>+</span>
            <span>Add New Destination</span>
          </Link>
        </div>

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
              placeholder="Search by name, category, or zone..."
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
              All ({places.length})
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
              onClick={() => setFilterType('temple')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'temple'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Temples
            </button>
            <button
              onClick={() => setFilterType('beach')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'beach'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Beaches
            </button>
            <button
              onClick={() => setFilterType('heritage')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'heritage'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Heritage
            </button>
            <button
              onClick={() => setFilterType('nature')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterType === 'nature'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              Nature
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-400/50 text-red-200 text-xs">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading destinations table...</p>
          </div>
        )}

        {/* Places Table */}
        {!loading && !error && (
          <div className="bg-slate-900/70 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
            {filteredPlaces.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No destinations match your current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Destination</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Zone</th>
                      <th className="py-3.5 px-4">Image Status</th>
                      <th className="py-3.5 px-4">Verified</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPlaces.map((place) => {
                      const hasImage = Boolean(place.image && place.image.trim());
                      return (
                        <tr key={place.id} className="hover:bg-white/5 transition-colors">
                          
                          {/* Name & Thumbnail */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 border border-white/10">
                                {hasImage ? (
                                  <img
                                    src={getImageUrl(place.image)}
                                    alt={place.name_en}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-sky-950 to-blue-900 flex items-center justify-center text-xs">
                                    🌊
                                  </div>
                                )}
                              </div>
                              <div>
                                <Link
                                  to={`/place/${place.id}`}
                                  className="font-bold text-white hover:text-sky-300 transition-colors line-clamp-1"
                                >
                                  {place.name_en}
                                </Link>
                                {place.name_ta && (
                                  <p className="text-[10px] text-orange-300/80 line-clamp-1">
                                    {place.name_ta}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getCategoryBadgeClass(
                                place.category
                              )}`}
                            >
                              {place.category?.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Zone */}
                          <td className="py-3 px-4 text-[11px] text-slate-300 capitalize">
                            {place.zone ? place.zone.replace('_', ' ') : 'rameswaram town'}
                          </td>

                          {/* Image Status */}
                          <td className="py-3 px-4">
                            {hasImage ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                <span>✓</span> Has Cover
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                Missing Image
                              </span>
                            )}
                          </td>

                          {/* Verified */}
                          <td className="py-3 px-4">
                            {place.verified ? (
                              <span className="text-[10px] font-bold text-sky-400">Verified</span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Unverified</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/place/${place.id}`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                View
                              </Link>
                              <Link
                                to={`/admin/places/${place.id}/edit`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/25 border border-orange-400/20 transition-all"
                              >
                                ✏️ Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
